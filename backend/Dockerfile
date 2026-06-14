

FROM gcc:13 AS builder

WORKDIR /build

# Copy only the C++ source files needed to build the engine
COPY main.cpp Matchingengine.cpp Matchingengine.h Order.h Orderbook.h Trade.h ./

RUN g++ -std=c++17 -O2 main.cpp Matchingengine.cpp -o exchange


FROM python:3.11-slim AS runtime

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the compiled engine binary from the builder stage
COPY --from=builder /build/exchange ./exchange
RUN chmod +x ./exchange

# Copy the FastAPI bridge
COPY server.py .

# Environment for the bridge: binary path and working dir (both ./)
ENV ENGINE_BINARY=./exchange
ENV ENGINE_CWD=.

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
