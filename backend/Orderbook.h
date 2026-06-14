#pragma once

#include <queue>
#include <vector>

#include "Order.h"

struct BuyComparator
{
    bool operator()(const Order& a, const Order& b) const
    {
        if(a.price==b.price){
            return a.timestamp>b.timestamp;
        }
        
        return a.price < b.price;
    }
};

struct SellComparator
{
    bool operator()(const Order& a, const Order& b) const
    {
        if(a.price == b.price)
        {
            return a.timestamp > b.timestamp;
        }

        return a.price > b.price;
    }
};


struct OrderBook
{
    std::priority_queue<
        Order,
        std::vector<Order>,
        BuyComparator
    > buyBook;

    std::priority_queue<
        Order,
        std::vector<Order>,
        SellComparator
    > sellBook;
};