#include <iostream>
#include "Matchingengine.h"

int main()
{
    MatchingEngine engine;

    int nextOrderId = 1;
    long long timestamp = 1;

    std::string command;

    while (true)
    {
        std::cin >> command;

        if (command == "EXIT")
        {
            break;
        }

        if (command == "PRINT")
        {   
            std::string symbol;
            std::cin>>symbol;
            engine.printBooks(symbol);
            continue;
        }
        if(command == "CANCEL")
        {
            int orderId;
            std::cin >> orderId;

            engine.cancelOrder(orderId);

            continue;
        }

        if (command == "BUY" || command == "SELL")
        {
            std::string symbol;
            int quantity;
            int price;

            std::cin >>symbol>> quantity >> price;

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
        }
        if(command == "TRADES")
        {
            engine.printTrades();
            continue;
        }
        if(command == "MARKET_BUY")
        {   
            std::string symbol;
            int quantity;
            std::cin >>symbol>> quantity;

            engine.executeMarketBuy(symbol,quantity);
            continue;
        }
        if(command == "MARKET_SELL")
        {   
            std::string symbol;
            int quantity;
            std::cin >>symbol>> quantity;

            engine.executeMarketSell(symbol,quantity);
            continue;
        }
        if(command == "BENCHMARK")
        {
            int numOrders;
            std::cin >> numOrders;

            engine.runBenchmark(numOrders);

            continue;
        }
        if(command == "EXPORT")
        {
            std::string symbol;

            std::cin >> symbol;

            engine.exportOrderBook(symbol);

            continue;
        }
    }

    return 0;
}

