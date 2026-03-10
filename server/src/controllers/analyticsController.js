const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const mongoose = require("mongoose");

const getDateRange = (period, query) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (period === 'week') {
        start.setDate(now.getDate() - 7);
    } else if (period === 'month') {
        start.setDate(now.getDate() - 30);
    } else if (period === 'this_month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of month
    } else if (period === 'last_month') {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (period === 'this_year') {
        start = new Date(now.getFullYear(), 0, 1);
    } else if (period === 'this_quarter') {
        const qMonth = Math.floor(now.getMonth() / 3) * 3;
        start = new Date(now.getFullYear(), qMonth, 1);
        end = new Date(now.getFullYear(), qMonth + 3, 0);
    } else if (period === 'custom' && query.startDate && query.endDate) {
        start = new Date(query.startDate);
        end = new Date(query.endDate);
    }

    // Ensure start is start of day, end is end of day
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

exports.getSalesReport = async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        const { start, end } = getDateRange(period, req.query);

        const sales = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    status: { $in: ['confirmed', 'delivered', 'out_for_delivery'] }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    totalSales: { $sum: "$totalAmount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json({ success: true, result: sales });
    } catch (error) {
        console.error("Error in getSalesReport:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getProfitLoss = async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        const { start, end } = getDateRange(period, req.query);

        // 1. Get all valid orders in period
        const orders = await Order.find({
            createdAt: { $gte: start, $lte: end },
            status: { $in: ['confirmed', 'delivered', 'out_for_delivery'] }
        }).populate('products.product', 'costPrice price');

        let totalRevenue = 0;
        let totalCost = 0;

        orders.forEach(order => {
            totalRevenue += order.totalAmount;

            // Calculate Cost of Goods Sold
            if (order.products) {
                order.products.forEach(item => {
                    const costPrice = item.product?.costPrice || 0;
                    totalCost += costPrice * item.quantity;
                });
            }
        });

        const grossProfit = totalRevenue - totalCost;
        const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        res.status(200).json({
            success: true,
            result: {
                revenue: totalRevenue,
                cost: totalCost,
                profit: grossProfit,
                margin: margin.toFixed(2)
            }
        });
    } catch (error) {
        console.error("Error in getProfitLoss:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Comprehensive Financial Report ───────────────────────────────────────────
exports.getFinancialReport = async (req, res) => {
    try {
        const { period = 'this_month' } = req.query;
        const { start, end } = getDateRange(period, req.query);

        const VendorPayment = require("../models/VendorPayment");
        const MilkCollection = require("../models/MilkCollection");
        const Transaction = require("../models/Transaction");
        const Employee = require("../models/Employee");

        // ═══════════════════════════════════════════════════════════════════════
        //  REVENUE
        // ═══════════════════════════════════════════════════════════════════════

        // 1. Order Sales Revenue (delivered / confirmed / out_for_delivery)
        const orderRevAgg = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    status: { $in: ["confirmed", "delivered", "out_for_delivery"] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalAmount" },
                    count: { $sum: 1 },
                    cashCollected: { $sum: "$cashCollected" },
                    chequeCollected: { $sum: "$chequeCollected" }
                }
            }
        ]);
        const orderRevenue = orderRevAgg[0]?.total || 0;
        const orderCount = orderRevAgg[0]?.count || 0;
        const cashCollected = orderRevAgg[0]?.cashCollected || 0;
        const chequeCollected = orderRevAgg[0]?.chequeCollected || 0;

        // 2. Wallet Recharges (CREDIT transactions - money flowing in)
        const walletRechargeAgg = await Transaction.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    type: "CREDIT",
                    status: "SUCCESS",
                    mode: { $in: ["ONLINE", "UPI", "CASH", "CHEQUE", "NET BANKING"] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);
        const walletRecharges = walletRechargeAgg[0]?.total || 0;

        const totalRevenue = orderRevenue;

        // ═══════════════════════════════════════════════════════════════════════
        //  COST OF GOODS SOLD (COGS)
        // ═══════════════════════════════════════════════════════════════════════

        // Product cost price from delivered orders
        const cogsOrders = await Order.find({
            createdAt: { $gte: start, $lte: end },
            status: { $in: ["confirmed", "delivered", "out_for_delivery"] }
        }).populate("products.product", "costPrice price");

        let totalCOGS = 0;
        cogsOrders.forEach(order => {
            if (order.products) {
                order.products.forEach(item => {
                    const costPrice = item.product?.costPrice || 0;
                    totalCOGS += costPrice * item.quantity;
                });
            }
        });

        const grossProfit = totalRevenue - totalCOGS;
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        // ═══════════════════════════════════════════════════════════════════════
        //  OPERATING EXPENSES
        // ═══════════════════════════════════════════════════════════════════════

        // 3. Vendor Payments (Milk Procurement Cost)
        const vendorPaymentAgg = await VendorPayment.aggregate([
            { $match: { date: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);
        const vendorPayments = vendorPaymentAgg[0]?.total || 0;

        // 4. Total Milk Collection Value (amount owed to vendors)
        const milkCollectionAgg = await MilkCollection.aggregate([
            { $match: { date: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$totalAmount" },
                    totalQuantity: { $sum: "$quantity" },
                    count: { $sum: 1 }
                }
            }
        ]);
        const milkProcurementCost = milkCollectionAgg[0]?.totalAmount || 0;
        const milkQuantity = milkCollectionAgg[0]?.totalQuantity || 0;

        // 5. Employee Salary Expenses (monthly estimate based on active employees)
        const employees = await Employee.find({ isActive: true }).select("salaryDetails.salary salaryDetails.salaryType").lean();
        let totalMonthlySalaryBurden = 0;
        employees.forEach(emp => {
            const salary = emp.salaryDetails?.salary || 0;
            const type = emp.salaryDetails?.salaryType || "Monthly";
            if (type === "Daily") totalMonthlySalaryBurden += salary * 30;
            else if (type === "Weekly") totalMonthlySalaryBurden += salary * 4;
            else if (type === "Biweekly") totalMonthlySalaryBurden += salary * 2;
            else totalMonthlySalaryBurden += salary; // Monthly
        });

        // Pro-rate salary to the selected period
        const periodDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        const salaryExpense = Math.round((totalMonthlySalaryBurden / 30) * periodDays);

        const totalOperatingExpenses = milkProcurementCost + salaryExpense;
        const totalExpenses = totalCOGS + totalOperatingExpenses;

        const operatingProfit = grossProfit - totalOperatingExpenses;
        const netProfit = totalRevenue - totalExpenses;
        const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
        const operatingMargin = totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0;

        // ═══════════════════════════════════════════════════════════════════════
        //  MONTHLY TREND (for charts)
        // ═══════════════════════════════════════════════════════════════════════

        const revenueByMonth = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    status: { $in: ["confirmed", "delivered", "out_for_delivery"] }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: "$totalAmount" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const expenseByMonth = await VendorPayment.aggregate([
            { $match: { date: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    expense: { $sum: "$amount" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Merge into trend data
        const trendMap = {};
        revenueByMonth.forEach(r => {
            trendMap[r._id] = { date: r._id, revenue: r.revenue, orders: r.orders, expense: 0 };
        });
        expenseByMonth.forEach(e => {
            if (!trendMap[e._id]) trendMap[e._id] = { date: e._id, revenue: 0, orders: 0, expense: 0 };
            trendMap[e._id].expense += e.expense;
        });
        const trend = Object.values(trendMap)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(d => ({ ...d, profit: d.revenue - d.expense }));

        // ═══════════════════════════════════════════════════════════════════════
        //  COLLECTIONS BREAKDOWN (for payment mode split)
        // ═══════════════════════════════════════════════════════════════════════

        const paymentModeSplit = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    status: { $in: ["confirmed", "delivered", "out_for_delivery"] }
                }
            },
            {
                $group: {
                    _id: "$paymentMode",
                    total: { $sum: "$totalAmount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            result: {
                period: { start, end, days: periodDays },

                // Income Statement
                revenue: {
                    orderSales: orderRevenue,
                    walletRecharges,
                    totalRevenue,
                    orderCount,
                },

                costOfGoods: {
                    productCOGS: totalCOGS,
                    totalCOGS,
                },

                grossProfit: {
                    amount: grossProfit,
                    margin: Math.round(grossMargin * 100) / 100,
                },

                operatingExpenses: {
                    milkProcurement: milkProcurementCost,
                    vendorPaymentsMade: vendorPayments,
                    salaryExpense,
                    totalOperatingExpenses,
                    employeeCount: employees.length,
                    milkQuantityLiters: milkQuantity,
                },

                operatingProfit: {
                    amount: operatingProfit,
                    margin: Math.round(operatingMargin * 100) / 100,
                },

                netProfit: {
                    amount: netProfit,
                    margin: Math.round(netMargin * 100) / 100,
                },

                totalExpenses,

                collections: {
                    cashCollected,
                    chequeCollected,
                    paymentModeSplit,
                },

                trend,
            }
        });
    } catch (error) {
        console.error("Error in getFinancialReport:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getForecast = async (req, res) => {
    try {
        // Simple Moving Average (SMA) of last 4 weeks
        const weeks = 4;
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - (weeks * 7));

        const weeklySales = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: now },
                    status: { $in: ['confirmed', 'delivered'] }
                }
            },
            {
                $group: {
                    _id: { $week: "$createdAt" },
                    total: { $sum: "$totalAmount" }
                }
            }
        ]);

        const totalSales = weeklySales.reduce((acc, curr) => acc + curr.total, 0);
        const averageWeeklySales = weeklySales.length > 0 ? totalSales / weeklySales.length : 0;

        // Forecast next week
        const forecast = {
            predictedRevenue: averageWeeklySales,
            confidence: "Medium (Based on 4-week SMA)"
        };

        res.status(200).json({ success: true, result: forecast });
    } catch (error) {
        console.error("Error in getForecast:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        // 1. Total Revenue (Lifetime)
        const revenueResult = await Order.aggregate([
            { $match: { status: { $in: ['confirmed', 'delivered'] } } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);
        const totalRevenue = revenueResult[0]?.total || 0;

        // 2. Active Customers
        const totalCustomers = await User.countDocuments({ role: "CUSTOMER", isActive: true });

        // 3. Pending Orders
        const pendingOrders = await Order.countDocuments({ status: "pending" });

        // 4. Low Stock Products
        const lowStockCount = await Product.countDocuments({ stock: { $lte: 10 } });

        res.status(200).json({
            success: true,
            result: {
                totalRevenue,
                totalCustomers,
                pendingOrders,
                lowStockCount
            }
        });
    } catch (error) {
        console.error("Error in getDashboardStats:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getCustomerAnalytics = async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        const { start, end } = getDateRange(period, req.query);

        // New customers over time
        const stats = await User.aggregate([
            {
                $match: {
                    role: "CUSTOMER",
                    createdAt: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json({ success: true, result: stats });
    } catch (error) {
        console.error("Error in getCustomerAnalytics:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getInventoryAnalytics = async (req, res) => {
    try {
        // 1. Low Stock Products
        const lowStock = await Product.find({ stock: { $lte: 20 } })
            .select("name stock price")
            .sort({ stock: 1 })
            .limit(10);

        // 2. Top Selling Products
        const topSelling = await Order.aggregate([
            { $match: { status: { $in: ['confirmed', 'delivered'] } } },
            { $unwind: "$products" },
            {
                $group: {
                    _id: "$products.product",
                    totalSold: { $sum: "$products.quantity" },
                    revenue: { $sum: { $multiply: ["$products.price", "$products.quantity"] } }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $project: {
                    name: "$productDetails.name",
                    totalSold: 1,
                    revenue: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            result: {
                lowStock,
                topSelling
            }
        });
    } catch (error) {
        console.error("Error in getInventoryAnalytics:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.seedAnalyticsData = async (req, res) => {
    try {
        const User = require("../models/User");

        // Ensure a customer exists
        let user = await User.findOne({ role: "CUSTOMER" });
        if (!user) {
            user = await User.create({
                name: "Test Customer",
                email: "customer@test.com",
                password: "password123",
                role: "CUSTOMER",
                mobile: "1234567890"
            });
        }

        // Ensure a product exists
        let product = await Product.findOne();
        if (!product) {
            product = await Product.create({
                name: "Full Cream Milk",
                price: 60,
                costPrice: 40,
                description: "Fresh milk",
                stock: 100
            });
        }

        // Generate orders
        const orders = [];
        const statuses = ["delivered", "confirmed", "out_for_delivery", "cancelled"];

        for (let i = 0; i < 50; i++) {
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Random date in last 30 days

            const quantity = Math.floor(Math.random() * 5) + 1;
            const totalAmount = product.price * quantity;

            orders.push({
                customer: user._id,
                products: [{
                    product: product._id,
                    quantity: quantity,
                    price: product.price
                }],
                totalAmount: totalAmount,
                status: statuses[Math.floor(Math.random() * statuses.length)],
                paymentStatus: "paid",
                deliveryDate: date,
                createdAt: date,
                updatedAt: date
            });
        }

        await Order.insertMany(orders);
        res.status(200).json({ success: true, message: `Seeded ${orders.length} orders.` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
