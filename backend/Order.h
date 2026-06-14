#pragma once

#include <string>

enum class Side
{
    BUY,
    SELL
};

struct Order
{
    int id;
    std::string symbol;
    Side side;
    int price;
    int quantity;
    long long timestamp;
};