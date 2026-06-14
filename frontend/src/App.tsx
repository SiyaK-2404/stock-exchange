import { useEffect, useState } from "react";
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

const OrderTable = ({
  title,
  orders,
  type,
}: {
  title: string;
  orders: Order[];
  type: "buy" | "sell";
}) => (
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
              <td className={type}>
                {order.price.toFixed(2)}
              </td>
              <td>{order.quantity}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

const TradeTable = ({
  trades,
}: {
  trades: Trade[];
}) => (
  <div className="table-card">
    <h2 className="table-title trade">
      Trade History
    </h2>

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
              <td>
                {trade.price.toFixed(2)}
              </td>
              <td>{trade.quantity}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

const App = () => {
  const [selectedSymbol, setSelectedSymbol] =
    useState("AAPL");

  const [marketData, setMarketData] =
    useState<MarketData | null>(null);

  useEffect(() => {
    const fetchData = () => {
      fetch(`/${selectedSymbol}.json?t=${Date.now()}`)
        .then((response) => response.json())
        .then((data) => setMarketData(data));
    };

    fetchData();

    const interval = setInterval(
      fetchData,
      2000
    );

    return () => clearInterval(interval);
  }, [selectedSymbol]);

  if (!marketData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="app">
      <header className="header">
        <h1>
          Matching Engine Dashboard
          <span className="symbol-badge">
            {marketData.symbol}
          </span>
        </h1>

        <select
          className="symbol-select"
          value={selectedSymbol}
          onChange={(e) =>
            setSelectedSymbol(e.target.value)
          }
        >
          <option value="AAPL">AAPL</option>
          <option value="TSLA">TSLA</option>
          <option value="MSFT">MSFT</option>
        </select>
      </header>

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

        <TradeTable
          trades={marketData.trades}
        />
      </main>
    </div>
  );
};

export default App;