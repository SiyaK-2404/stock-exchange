#include <iostream>
#include "Matchingengine.h"

int main()
{
    std::cout.setf(std::ios::unitbuf);

    MatchingEngine engine;

    int nextOrderId = 1;
    long long timestamp = 1;

    std::string command;

    while (true)
    {
        if (!(std::cin >> command))
        {
            break; // stdin closed
        }

        if (command == "EXIT")
        {
            std::cout << "OK EXIT" << std::endl;
            break;
        }

        if (command == "PRINT")
        {
            std::string symbol;
            std::cin >> symbol;
            engine.printBooks(symbol);
            std::cout << "OK PRINT" << std::endl;
            continue;
        }
        if (command == "CANCEL")
        {
            int orderId;
            std::cin >> orderId;

            engine.cancelOrder(orderId);
            std::cout << "OK CANCEL" << std::endl;

            continue;
        }

        if (command == "BUY" || command == "SELL")
        {
            std::string symbol;
            int quantity;
            int price;

            std::cin >> symbol >> quantity >> price;

            Side side =
                (command == "BUY")
                ? Side::BUY
                : Side::SELL;

            engine.addOrder({
                nextOrderId++,
                symbol,
                side,
                price,
                quantity,
                timestamp++
            });

            std::cout << "OK " << command << " id=" << (nextOrderId - 1) << std::endl;
            continue;
        }
        if (command == "TRADES")
        {
            engine.printTrades();
            std::cout << "OK TRADES" << std::endl;
            continue;
        }
        if (command == "MARKET_BUY")
        {
            std::string symbol;
            int quantity;
            std::cin >> symbol >> quantity;

            engine.executeMarketBuy(symbol, quantity);
            std::cout << "OK MARKET_BUY" << std::endl;
            continue;
        }
        if (command == "MARKET_SELL")
        {
            std::string symbol;
            int quantity;
            std::cin >> symbol >> quantity;

            engine.executeMarketSell(symbol, quantity);
            std::cout << "OK MARKET_SELL" << std::endl;
            continue;
        }
        if (command == "BENCHMARK")
        {
            int numOrders;
            std::cin >> numOrders;

            engine.runBenchmark(numOrders);
            std::cout << "OK BENCHMARK" << std::endl;

            continue;
        }
        if (command == "EXPORT")
        {
            std::string symbol;

            std::cin >> symbol;

            engine.exportOrderBook(symbol);
            std::cout << "OK EXPORT" << std::endl;
            continue;
        }
    }

    return 0;
}

