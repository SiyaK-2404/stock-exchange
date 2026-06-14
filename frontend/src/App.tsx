import React, { useEffect, useState, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./App.css";

interface Order {
  price: number;
  quantity: number;
}

interface Trade {
  price: number;
  quantity: number;
}

interface MarketData {
  symbol: string;
  buyOrders: Order[];
  sellOrders: Order[];
  trades: Trade[];
}

interface BenchmarkStats {
  orders: number | null;
  timeMs: number | null;
  tradesExecuted: number | null;
  ordersPerSec: number | null;
}

const API_BASE = "http://localhost:8000";
const POLL_INTERVAL_MS = 2000;

const OrderTable: React.FC<{
  title: string;
  orders: Order[];
  type: "buy" | "sell";
}> = ({ title, orders, type }) => (
  <div className="table-card">
    <h2 className={`table-title ${type}`}>{title}</h2>
    <table>
      <thead>
        <tr>
          <th>Price</th>
          <th>Quantity</th>
        </tr>
      </thead>
      <tbody>
        {orders.length === 0 ? (
          <tr>
            <td colSpan={2} className="empty-row">
              No orders
            </td>
          </tr>
        ) : (
          orders.map((order, idx) => (
            <tr key={idx}>
              <td className={type}>{order.price.toFixed(2)}</td>
              <td>{order.quantity}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

const TradeTable: React.FC<{ trades: Trade[] }> = ({ trades }) => {
  const chartData = trades.map((trade, idx) => ({
    index: idx + 1,
    price: trade.price,
  }));

  return (
    <div className="table-card">
      <h2 className="table-title trade">Trade History</h2>

      {trades.length > 1 && (
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="index"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                label={{ value: "Trade #", position: "insideBottom", fontSize: 11, fill: "#6b7280", dy: 10 }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
                domain={["auto", "auto"]}
              />
              <Tooltip
                formatter={(value) => [Number(value).toFixed(2), "Price"]}
                labelFormatter={(label) => `Trade #${label}`}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Price</th>
            <th>Quantity</th>
          </tr>
        </thead>
        <tbody>
          {trades.length === 0 ? (
            <tr>
              <td colSpan={2} className="empty-row">
                No trades
              </td>
            </tr>
          ) : (
            trades.map((trade, idx) => (
              <tr key={idx}>
                <td>{trade.price.toFixed(2)}</td>
                <td>{trade.quantity}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

const OrderForm: React.FC<{
  symbol: string;
  onOrderPlaced: () => void;
}> = ({ symbol, onOrderPlaced }) => {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const qty = parseInt(quantity, 10);
    const px = parseInt(price, 10);

    if (!qty || qty <= 0 || !px || px <= 0) {
      setMessage("Enter a valid price and quantity");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE}/api/order/${side}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, quantity: qty, price: px }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setMessage(`${side === "buy" ? "Buy" : "Sell"} order placed`);
      setPrice("");
      setQuantity("");
      onOrderPlaced();
    } catch (err) {
      setMessage(
        err instanceof Error ? `Error: ${err.message}` : "Failed to place order"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="order-form-card">
      <h2 className="table-title order-form">Place Order</h2>
      <form onSubmit={handleSubmit} className="order-form">
        <div className="side-toggle">
          <button
            type="button"
            className={`side-btn buy ${side === "buy" ? "active" : ""}`}
            onClick={() => setSide("buy")}
          >
            Buy
          </button>
          <button
            type="button"
            className={`side-btn sell ${side === "sell" ? "active" : ""}`}
            onClick={() => setSide("sell")}
          >
            Sell
          </button>
        </div>

        <label>
          Price
          <input
            type="number"
            min="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 105"
          />
        </label>

        <label>
          Quantity
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 100"
          />
        </label>

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? "Placing..." : `Place ${side === "buy" ? "Buy" : "Sell"} Order`}
        </button>

        {message && <div className="form-message">{message}</div>}
      </form>
    </div>
  );
};

const BenchmarkPanel: React.FC = () => {
  const [numOrders, setNumOrders] = useState("1000");
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<BenchmarkStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseBenchmarkOutput = (lines: string[]): BenchmarkStats => {
    const result: BenchmarkStats = {
      orders: null,
      timeMs: null,
      tradesExecuted: null,
      ordersPerSec: null,
    };

    for (const line of lines) {
      let match = line.match(/Orders:\s*(\d+)/);
      if (match) result.orders = parseInt(match[1], 10);

      match = line.match(/Time:\s*([\d.]+)\s*ms/);
      if (match) result.timeMs = parseFloat(match[1]);

      match = line.match(/Trades Executed:\s*(\d+)/);
      if (match) result.tradesExecuted = parseInt(match[1], 10);

      match = line.match(/Orders\/sec:\s*([\d.]+)/);
      if (match) result.ordersPerSec = parseFloat(match[1]);
    }

    return result;
  };

  const handleRun = async () => {
    const n = parseInt(numOrders, 10);
    if (!n || n <= 0) {
      setError("Enter a valid number of orders");
      return;
    }

    setRunning(true);
    setError(null);
    setStats(null);

    try {
      const res = await fetch(`${API_BASE}/api/benchmark/${n}`, {
        method: "POST",
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: { engine_output: string[] } = await res.json();
      setStats(parseBenchmarkOutput(data.engine_output));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to run benchmark"
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="table-card">
      <h2 className="table-title benchmark">Engine Benchmark</h2>
      <div className="benchmark-body">
        <p className="benchmark-description">
          Floods the engine with randomly generated orders (always against
          AAPL's order book, regardless of the symbol selected above) to
          measure raw matching throughput. Note: this will add extra orders
          and trades to AAPL's book.
        </p>

        <label>
          Number of orders
          <input
            type="number"
            min="1"
            value={numOrders}
            onChange={(e) => setNumOrders(e.target.value)}
            placeholder="e.g. 1000"
          />
        </label>

        <button
          type="button"
          className="submit-btn benchmark-btn"
          onClick={handleRun}
          disabled={running}
        >
          {running ? "Running..." : "Run Benchmark"}
        </button>

        {error && <div className="form-message error-text">{error}</div>}

        {stats && (
          <div className="benchmark-stats">
            <div className="stat-row">
              <span className="stat-label">Orders processed</span>
              <span className="stat-value">{stats.orders ?? "-"}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Time taken</span>
              <span className="stat-value">
                {stats.timeMs !== null ? `${stats.timeMs} ms` : "-"}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Trades executed</span>
              <span className="stat-value">{stats.tradesExecuted ?? "-"}</span>
            </div>
            <div className="stat-row highlight">
              <span className="stat-label">Throughput</span>
              <span className="stat-value">
                {stats.ordersPerSec !== null
                  ? `${stats.ordersPerSec.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })} orders/sec`
                  : "-"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("AAPL");
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSymbols = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/symbols`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { symbols: string[] } = await res.json();
      setSymbols(data.symbols);
    } catch {
      // non-fatal; symbol list is just a convenience
    }
  }, []);

  const fetchOrderBook = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/orderbook/${selectedSymbol}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: MarketData = await res.json();
      setMarketData(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch order book"
      );
    }
  }, [selectedSymbol]);

  useEffect(() => {
    fetchSymbols();
  }, [fetchSymbols]);

  useEffect(() => {
    setMarketData(null);
    fetchOrderBook();
    const interval = setInterval(fetchOrderBook, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchOrderBook]);

  return (
    <div className="app">
      <header className="header">
        <h1>Matching Engine Dashboard</h1>

        <div className="symbol-selector">
          <label htmlFor="symbol-select">Symbol</label>
          <select
            id="symbol-select"
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
          >
            {symbols.length === 0 ? (
              <option value={selectedSymbol}>{selectedSymbol}</option>
            ) : (
              symbols.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))
            )}
          </select>
          <span className="symbol-badge">{selectedSymbol}</span>
        </div>
      </header>

      {error && <div className="error-banner">⚠ {error}</div>}

      {!marketData ? (
        <div className="loading">Loading order book...</div>
      ) : (
        <main className="grid">
          <OrderTable
            title="Buy Orders"
            orders={marketData.buyOrders}
            type="buy"
          />
          <OrderTable
            title="Sell Orders"
            orders={marketData.sellOrders}
            type="sell"
          />
          <TradeTable trades={marketData.trades} />
          <OrderForm
            symbol={selectedSymbol}
            onOrderPlaced={() => {
              fetchSymbols();
              fetchOrderBook();
            }}
          />
          <BenchmarkPanel />
        </main>
      )}
    </div>
  );
};

export default App;

