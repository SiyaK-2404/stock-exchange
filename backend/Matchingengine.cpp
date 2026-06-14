#include "Matchingengine.h"

#include <iostream>
#include <chrono>
#include <random>
#include <climits>
#include <algorithm>
#include <fstream>

bool MatchingEngine::canMatch(
    const Order& buyOrder,
    const Order& sellOrder
)
{
    return buyOrder.price >= sellOrder.price;
}

Trade MatchingEngine::executeTrade(
    Order& buyOrder,
    Order& sellOrder,
    int tradePrice
)
{
    int tradeQuantity = std::min(
        buyOrder.quantity,
        sellOrder.quantity
    );

    Trade trade;

    trade.buyOrderId = buyOrder.id;
    trade.sellOrderId = sellOrder.id;
    trade.quantity = tradeQuantity;
    trade.price = tradePrice;

    buyOrder.quantity -= tradeQuantity;
    sellOrder.quantity -= tradeQuantity;

    return trade;
}

void MatchingEngine::addOrder(Order order)
{
    if(order.side == Side::BUY)
    {
        orderBooks[order.symbol]
            .buyBook
            .push(order);
    }
    else
    {
        orderBooks[order.symbol]
            .sellBook
            .push(order);
    }

    matchOrders(order.symbol);
}

void MatchingEngine::matchOrders(const std::string& symbol)
{
    auto& book = orderBooks[symbol];

    while (!book.buyBook.empty() &&
           cancelledOrders.count(book.buyBook.top().id))
    {
        book.buyBook.pop();
    }

    while (!book.sellBook.empty() &&
           cancelledOrders.count(book.sellBook.top().id))
    {
        book.sellBook.pop();
    }

    while (!book.buyBook.empty() &&
           !book.sellBook.empty())
    {
        Order buyOrder = book.buyBook.top();
        Order sellOrder = book.sellBook.top();

        if (!canMatch(buyOrder, sellOrder))
        {
            break;
        }

        book.buyBook.pop();
        book.sellBook.pop();

        Trade trade = executeTrade(
            buyOrder,
            sellOrder,
            sellOrder.price
        );

        tradeHistory.push_back(trade);

        if (buyOrder.quantity > 0)
        {
            book.buyBook.push(buyOrder);
        }

        if (sellOrder.quantity > 0)
        {
            book.sellBook.push(sellOrder);
        }
    }
}

void MatchingEngine::printTrades()
{
    std::cout << "\nTrade History:\n";

    for(const auto& trade : tradeHistory)
    {
        std::cout
            << trade.quantity
            << " @ "
            << trade.price
            << "\n";
    }
}

void MatchingEngine::printBooks(
    const std::string& symbol
)
{
    auto& book = orderBooks[symbol];

    std::cout << "\nSymbol: "
              << symbol
              << "\n";

    std::cout
        << "\nRemaining Buy Orders:\n";

    auto tempBuyBook = book.buyBook;

    while (!tempBuyBook.empty())
    {
        Order order = tempBuyBook.top();

        if(cancelledOrders.count(order.id))
        {
            tempBuyBook.pop();
            continue;
        }

        std::cout
            << order.price
            << " x "
            << order.quantity
            << "\n";

        tempBuyBook.pop();
    }

    std::cout
        << "\nRemaining Sell Orders:\n";

    auto tempSellBook = book.sellBook;

    while (!tempSellBook.empty())
    {
        Order order = tempSellBook.top();

        if(cancelledOrders.count(order.id))
        {
            tempSellBook.pop();
            continue;
        }

        std::cout
            << order.price
            << " x "
            << order.quantity
            << "\n";

        tempSellBook.pop();
    }
}

void MatchingEngine::executeMarketBuy(
    const std::string& symbol,
    int quantity
)
{
    auto& book = orderBooks[symbol];

    Order marketBuy = {
        -1,
        "MARKET",
        Side::BUY,
        INT_MAX,
        quantity,
        0
    };

    while (marketBuy.quantity > 0 &&
           !book.sellBook.empty())
    {
        Order sellOrder = book.sellBook.top();
        book.sellBook.pop();

        Trade trade = executeTrade(
            marketBuy,
            sellOrder,
            sellOrder.price
        );

        tradeHistory.push_back(trade);

        if (sellOrder.quantity > 0)
        {
            book.sellBook.push(sellOrder);
        }
    }
}

void MatchingEngine::executeMarketSell(
    const std::string& symbol,
    int quantity
)
{
    auto& book = orderBooks[symbol];

    Order marketSell = {
        -1,
        "MARKET",
        Side::SELL,
        0,
        quantity,
        0
    };

    while (marketSell.quantity > 0 &&
           !book.buyBook.empty())
    {
        Order buyOrder = book.buyBook.top();
        book.buyBook.pop();

        Trade trade = executeTrade(
            buyOrder,
            marketSell,
            buyOrder.price
        );

        tradeHistory.push_back(trade);

        if (buyOrder.quantity > 0)
        {
            book.buyBook.push(buyOrder);
        }
    }
}

void MatchingEngine::runBenchmark(
    int numOrders
)
{
    std::mt19937 rng(std::random_device{}());

    std::uniform_int_distribution<int> sideDist(0, 1);
    std::uniform_int_distribution<int> priceDist(90, 110);
    std::uniform_int_distribution<int> qtyDist(1, 100);

    size_t startTradeCount = tradeHistory.size();

    auto start =
        std::chrono::high_resolution_clock::now();

    int nextOrderId = 1000000;
    long long timestamp = 1000000;

    for(int i = 0; i < numOrders; i++)
    {
        Side side =
            sideDist(rng) == 0
            ? Side::BUY
            : Side::SELL;

        Order order = {
            nextOrderId++,
            "AAPL",
            side,
            priceDist(rng),
            qtyDist(rng),
            timestamp++
        };

        addOrder(order);
    }

    auto end =
        std::chrono::high_resolution_clock::now();

    auto duration =
        std::chrono::duration_cast<
            std::chrono::milliseconds
        >(end - start);

    size_t tradesExecuted =
        tradeHistory.size() - startTradeCount;

    double ordersPerSecond =
        (numOrders * 1000.0)
        / std::max<long long>(1LL, duration.count());

    std::cout
        << "\n===== BENCHMARK =====\n";

    std::cout
        << "Orders: "
        << numOrders
        << "\n";

    std::cout
        << "Time: "
        << duration.count()
        << " ms\n";

    std::cout
        << "Trades Executed: "
        << tradesExecuted
        << "\n";

    std::cout
        << "Orders/sec: "
        << ordersPerSecond
        << "\n";
}
void MatchingEngine::exportOrderBook(
    const std::string& symbol
)
{
    std::ofstream file(
        symbol + ".json"
    );

    if(!file)
    {
        std::cout
            << "Could not create file\n";
        return;
    }

    auto& book = orderBooks[symbol];

    file << "{\n";

    file << "\"symbol\":\""
         << symbol
         << "\",\n";

    // BUY ORDERS

    file << "\"buyOrders\":[\n";

    auto tempBuyBook = book.buyBook;

    bool first = true;

    while(!tempBuyBook.empty())
    {
        Order order = tempBuyBook.top();
        tempBuyBook.pop();

        if(!first)
        {
            file << ",\n";
        }

        first = false;

        file
            << "{"
            << "\"price\":"
            << order.price
            << ","
            << "\"quantity\":"
            << order.quantity
            << "}";
    }

    file << "\n],\n";

    // SELL ORDERS

    file << "\"sellOrders\":[\n";

    auto tempSellBook = book.sellBook;

    first = true;

    while(!tempSellBook.empty())
    {
        Order order = tempSellBook.top();
        tempSellBook.pop();

        if(!first)
        {
            file << ",\n";
        }

        first = false;

        file
            << "{"
            << "\"price\":"
            << order.price
            << ","
            << "\"quantity\":"
            << order.quantity
            << "}";
    }

    file << "\n],\n";

    // TRADES

    file << "\"trades\":[\n";

    bool firstTrade = true;

    for(const auto& trade : tradeHistory)
    {
        if(!firstTrade)
        {
            file << ",\n";
        }

        firstTrade = false;

        file
            << "{"
            << "\"price\":"
            << trade.price
            << ","
            << "\"quantity\":"
            << trade.quantity
            << "}";
    }

    file << "\n]\n";

    file << "}\n";

    std::cout
        << symbol
        << ".json exported\n";
}
void MatchingEngine::cancelOrder(int orderId)
{
    cancelledOrders.insert(orderId);

    std::cout
        << "Order "
        << orderId
        << " cancelled\n";
}
