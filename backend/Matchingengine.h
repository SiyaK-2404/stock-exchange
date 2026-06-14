#pragma once

#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <string>

#include "Order.h"
#include "Trade.h"
#include "Orderbook.h"

class MatchingEngine
{
private:
    std::unordered_map<std::string, OrderBook> orderBooks;
    std::vector<Trade> tradeHistory;
    std::unordered_set<int> cancelledOrders;

    bool canMatch(
        const Order& buyOrder,
        const Order& sellOrder
    );

    Trade executeTrade(
        Order& buyOrder,
        Order& sellOrder,
        int tradePrice
    );

public:
    void addOrder(Order order);

    void matchOrders(
        const std::string& symbol
    );

    void printBooks(
        const std::string& symbol
    );

    void printTrades();

    void executeMarketBuy(
        const std::string& symbol,
        int quantity
    );

    void executeMarketSell(
        const std::string& symbol,
        int quantity
    );

    void cancelOrder(
        int orderId
    );

    void runBenchmark(
        int numOrders
    );

    void exportOrderBook(
    const std::string& symbol
    );
};