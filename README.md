# Stock Exchange Matching Engine

A full-stack simulation of a stock exchange matching engine — the component responsible for matching buy and sell orders, executing trades, and maintaining order books in real time.

**Live Demo:** https://stock-exchange-l3cxloeuq-siyas-projects-cd30e234.vercel.app/

---

## Dashboard

*Add dashboard screenshot here*
<img width="1918" height="1023" alt="image" src="https://github.com/user-attachments/assets/4610836e-958b-45fa-ab13-efeb313a4301" />


---

## Performance

<img width="342" height="215" alt="image" src="https://github.com/user-attachments/assets/2821552c-bc88-4dc1-8e15-2350b379b2dd" />


Sample benchmark result:

* Processed **100,000 orders** in **~218 ms**
* Achieved throughput of **458,716 orders/sec**

---

## Features

| Feature                      | 
| ---------------------------- | 
| Price-Time Priority Matching | 
| Multiple Stock Symbols       |
| Limit Orders                 | 
| Market Orders                | 
| Order Cancellation           |
| Trade History                | 
| Live Order Book Dashboard    | 
| Trade Price Visualization    |
| Throughput Benchmarking      |

---

## Dashboard

The project includes a React + TypeScript dashboard that communicates with the backend through a FastAPI REST API.

Users can:

* Place buy and sell orders directly from the browser
* Switch between stock symbols
* View live order books for each symbol
* Inspect executed trades
* Visualize trade prices through an interactive chart
* Run performance benchmarks against the matching engine


---

## Benchmarking

The matching engine includes a built-in benchmark mode that generates large volumes of random orders and measures matching throughput under load.

Benchmarking helps evaluate the efficiency of the matching algorithm and the underlying data structures when processing realistic trading workloads.


---

## How It Works

The system consists of three layers:

```text
┌─────────────────────┐
│ React Dashboard     │
│ (Vercel)            │
└─────────┬───────────┘
          │ HTTP / JSON
          ▼
┌─────────────────────┐
│ FastAPI Bridge      │
│ (Render + Docker)   │
└─────────┬───────────┘
          │ stdin/stdout
          ▼
┌─────────────────────┐
│ C++ Matching Engine │
└─────────────────────┘
```

### 1. C++ Matching Engine

The core matching logic is implemented in C++ for performance.

Each stock symbol maintains its own order book containing:

* Buy orders stored in a max-heap (highest price first)
* Sell orders stored in a min-heap (lowest price first)
* FIFO ordering preserved using timestamps

Orders are matched using the same price-time priority principle used by real exchanges:

1. Better prices receive priority
2. If prices are equal, earlier orders execute first

The engine supports:

* Limit orders
* Market orders
* Order cancellation
* Trade history tracking
* Throughput benchmarking

### 2. FastAPI Bridge

The matching engine runs as a long-lived C++ subprocess.

A FastAPI service acts as a bridge between the web dashboard and the engine:

* Receives HTTP requests
* Translates requests into the engine's command protocol
* Communicates with the C++ process through stdin/stdout
* Returns structured JSON responses


### 3. React Dashboard

The frontend is built with React and TypeScript.

The dashboard provides:

* Live order book visualization
* Trade history tracking
* Interactive trade-price charts
* Order entry forms
* Stock switching
* Benchmark execution and result display

```
```


---

## Technology Stack

### Backend

* C++17
* Priority Queues (Order Books)
* FastAPI
* Docker

### Frontend

* React
* TypeScript
* Recharts

### Deployment

* Render (Backend)
* Vercel (Frontend)

---



---

## Running Locally

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Deployment Notes

The backend is hosted on a free Render instance and may spin down after periods of inactivity.

If the dashboard initially shows a connection error, wait approximately 30–60 seconds for the backend to wake up and refresh the page.

```
```
