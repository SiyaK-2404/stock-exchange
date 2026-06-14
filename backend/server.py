"""
FastAPI bridge for the C++ matching engine.

Architecture
------------
- On startup, launches the compiled C++ engine binary (exchange.exe / exchange)
  as a single long-lived subprocess.
- Commands are written to its stdin in the same text format the engine's
  REPL already understands (BUY, SELL, CANCEL, EXPORT, etc).
- After each command, the engine prints "OK <COMMAND> ..." to stdout
  (this requires the patched main.cpp with std::cout.setf(std::ios::unitbuf)
  and "OK ..." markers after every command).
- For order book / trade data, we send "EXPORT <symbol>", wait for the "OK EXPORT"
  marker, then read the <symbol>.json file the engine writes to disk.

Run with:
    pip install fastapi uvicorn
    uvicorn server:app --reload --port 8000
"""

import asyncio
import json
import os
import subprocess
import time
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Path to the compiled matching engine binary.
# On Windows this is typically "exchange.exe", on Linux/Mac just "./exchange".
ENGINE_BINARY = os.environ.get("ENGINE_BINARY", "./exchange.exe")

# Directory where the engine writes <SYMBOL>.json export files.
# This should be the working directory the engine binary runs in.
ENGINE_CWD = os.environ.get("ENGINE_CWD", ".")

# How long (seconds) to wait for the engine to respond before giving up.
COMMAND_TIMEOUT = 5.0


# ---------------------------------------------------------------------------
# Engine process wrapper
# ---------------------------------------------------------------------------

class EngineProcess:
    """Manages the long-lived C++ engine subprocess and serializes access to it."""

    def __init__(self, binary_path: str, cwd: str):
        self.binary_path = binary_path
        self.cwd = cwd
        self.process: Optional[subprocess.Popen] = None
        self.lock = asyncio.Lock()

    def start(self):
        self.process = subprocess.Popen(
            [self.binary_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=self.cwd,
            text=True,
            bufsize=1,  # line-buffered
        )

    def stop(self):
        if self.process and self.process.poll() is None:
            try:
                self._write("EXIT\n")
            except Exception:
                pass
            self.process.terminate()

    def _write(self, line: str):
        assert self.process and self.process.stdin
        self.process.stdin.write(line)
        self.process.stdin.flush()

    def _read_until_ok(self, timeout: float = COMMAND_TIMEOUT) -> list[str]:
        """Read stdout lines until we see a line starting with 'OK '."""
        assert self.process and self.process.stdout
        lines: list[str] = []

        loop_end = time.monotonic() + timeout
        while True:
            line = self.process.stdout.readline()
            if line == "":
                # process exited
                break
            stripped = line.rstrip("\n")
            lines.append(stripped)
            if stripped.startswith("OK "):
                break
            if time.monotonic() > loop_end:
                break
        return lines

    async def send_command(self, command_line: str) -> list[str]:
        """Send a command (e.g. 'BUY AAPL 100 105') and wait for the OK response."""
        if not self.process or self.process.poll() is not None:
            self.start()

        async with self.lock:
            # subprocess pipe I/O is blocking; run it in a thread
            def _do():
                self._write(command_line + "\n")
                return self._read_until_ok()

            return await asyncio.get_event_loop().run_in_executor(None, _do)


engine = EngineProcess(ENGINE_BINARY, ENGINE_CWD)

# The C++ engine doesn't expose a "list all symbols" command, so we track
# every symbol that's ever had an order placed on the Python side.
# Seeded with a default set so the frontend has something to show immediately.
known_symbols: set[str] = {"AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"}


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="Matching Engine Bridge")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    engine.start()


@app.on_event("shutdown")
def on_shutdown():
    engine.stop()


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class OrderRequest(BaseModel):
    symbol: str
    quantity: int
    price: int


class MarketOrderRequest(BaseModel):
    symbol: str
    quantity: int


class CancelRequest(BaseModel):
    order_id: int


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.post("/api/order/buy")
async def place_buy_order(order: OrderRequest):
    known_symbols.add(order.symbol.upper())
    lines = await engine.send_command(
        f"BUY {order.symbol} {order.quantity} {order.price}"
    )
    return {"status": "ok", "engine_output": lines}


@app.post("/api/order/sell")
async def place_sell_order(order: OrderRequest):
    known_symbols.add(order.symbol.upper())
    lines = await engine.send_command(
        f"SELL {order.symbol} {order.quantity} {order.price}"
    )
    return {"status": "ok", "engine_output": lines}


@app.post("/api/order/market-buy")
async def market_buy(order: MarketOrderRequest):
    known_symbols.add(order.symbol.upper())
    lines = await engine.send_command(
        f"MARKET_BUY {order.symbol} {order.quantity}"
    )
    return {"status": "ok", "engine_output": lines}


@app.post("/api/order/market-sell")
async def market_sell(order: MarketOrderRequest):
    known_symbols.add(order.symbol.upper())
    lines = await engine.send_command(
        f"MARKET_SELL {order.symbol} {order.quantity}"
    )
    return {"status": "ok", "engine_output": lines}


@app.post("/api/order/cancel")
async def cancel_order(req: CancelRequest):
    lines = await engine.send_command(f"CANCEL {req.order_id}")
    return {"status": "ok", "engine_output": lines}


@app.get("/api/orderbook/{symbol}")
async def get_orderbook(symbol: str):
    """
    Triggers the engine to export <symbol>.json, then reads and returns it.
    Matches the shape:
        {
          "symbol": "AAPL",
          "buyOrders": [{"price": 105, "quantity": 100}, ...],
          "sellOrders": [...],
          "trades": [...]
        }
    """
    await engine.send_command(f"EXPORT {symbol}")

    export_path = Path(ENGINE_CWD) / f"{symbol}.json"

    if not export_path.exists():
        raise HTTPException(status_code=404, detail=f"No data exported for {symbol}")

    try:
        with open(export_path, "r") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse export: {e}")

    return data


@app.post("/api/benchmark/{num_orders}")
async def run_benchmark(num_orders: int):
    lines = await engine.send_command(f"BENCHMARK {num_orders}")
    return {"status": "ok", "engine_output": lines}


@app.get("/api/symbols")
async def get_symbols():
    """Returns the list of known/traded symbols for the frontend selector."""
    return {"symbols": sorted(known_symbols)}


@app.get("/api/health")
async def health():
    alive = engine.process is not None and engine.process.poll() is None
    return {"engine_running": alive}