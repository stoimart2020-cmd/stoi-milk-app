const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Subscription = require("../models/Subscription");
const VendorPayment = require("../models/VendorPayment");
const MilkCollection = require("../models/MilkCollection");

const getDateRange = (period, query) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (period === 'week') start.setDate(now.getDate() - 7);
    else if (period === 'month') start.setDate(now.getDate() - 30);
    else if (period === 'this_month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
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

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

// ─── PRODUCT (ITEM) REPORTS ──────────────────────────────────────────────────

// Product Sales Summary - sales per product with qty sold, revenue, cost, profit
exports.getProductSalesSummary = async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        const { start, end } = getDateRange(period, req.query);

        const productSales = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    status: { $in: ["confirmed", "delivered", "out_for_delivery"] }
                }
            },
            { $unwind: "$products" },
            {
                $group: {
                    _id: "$products.product",
                    totalQty: { $sum: "$products.quantity" },
                    totalRevenue: { $sum: { $multiply: ["$products.price", "$products.quantity"] } },
                    orderCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $project: {
                    name: "$product.name",
                    image: "$product.image",
                    category: "$product.category",
                    subcategory: "$product.subcategory",
                    price: "$product.price",
                    costPrice: "$product.costPrice",
                    totalQty: 1,
                    totalRevenue: 1,
                    orderCount: 1,
                    totalCost: { $multiply: [{ $ifNull: ["$product.costPrice", 0] }, "$totalQty"] },
                    profit: { $subtract: ["$totalRevenue", { $multiply: [{ $ifNull: ["$product.costPrice", 0] }, "$totalQty"] }] }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        res.status(200).json({ success: true, result: productSales });
    } catch (error) {
        console.error("Error in getProductSalesSummary:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Rate List - All products with current pricing
exports.getRateList = async (req, res) => {
    try {
        const products = await Product.find({ isActive: true })
            .populate("category", "name")
            .populate("subcategory", "name")
            .select("name price mrp costPrice trialPrice oneTimePrice unit image category subcategory stock")
            .sort({ name: 1 });

        res.status(200).json({ success: true, result: products });
    } catch (error) {
        console.error("Error in getRateList:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Stock Summary - All products with current stock levels
exports.getStockSummary = async (req, res) => {
    try {
        const products = await Product.find()
            .populate("category", "name")
            .select("name stock price costPrice image category isActive")
            .sort({ stock: 1 });

        const totalProducts = products.length;
        const totalStockValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.costPrice || p.price || 0)), 0);
        const lowStockCount = products.filter(p => (p.stock || 0) <= 10).length;
        const outOfStockCount = products.filter(p => (p.stock || 0) === 0).length;

        res.status(200).json({
            success: true,
            result: {
                products,
                summary: { totalProducts, totalStockValue, lowStockCount, outOfStockCount }
            }
        });
    } catch (error) {
        console.error("Error in getStockSummary:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── CUSTOMER (PARTY) REPORTS ────────────────────────────────────────────────

// Customer Outstanding / Receivable - customers with negative wallet
exports.getCustomerOutstanding = async (req, res) => {
    try {
        const customers = await User.find({
            role: "CUSTOMER",
            walletBalance: { $lt: 0 }
        })
            .select("name mobile customerId walletBalance creditLimit address")
            .sort({ walletBalance: 1 });

        const totalOutstanding = customers.reduce((sum, c) => sum + Math.abs(c.walletBalance), 0);

        // Ageing: group by how long they've been negative
        // We'll use last transaction date as proxy
        const customerIds = customers.map(c => c._id);
        const lastTransactions = await Transaction.aggregate([
            {
                $match: {
                    user: { $in: customerIds },
                    type: "DEBIT"
                }
            },
            {
                $group: {
                    _id: "$user",
                    lastDebit: { $max: "$createdAt" }
                }
            }
        ]);

        const lastDebitMap = {};
        lastTransactions.forEach(t => { lastDebitMap[t._id.toString()] = t.lastDebit; });

        const now = new Date();
        const result = customers.map(c => {
            const lastDebit = lastDebitMap[c._id.toString()];
            const daysSince = lastDebit ? Math.floor((now - new Date(lastDebit)) / (1000 * 60 * 60 * 24)) : 999;
            let ageingBucket = "0-7 days";
            if (daysSince > 30) ageingBucket = "30+ days";
            else if (daysSince > 14) ageingBucket = "15-30 days";
            else if (daysSince > 7) ageingBucket = "8-14 days";

            return {
                _id: c._id,
                name: c.name,
                mobile: c.mobile,
                customerId: c.customerId,
                outstanding: Math.abs(c.walletBalance),
                creditLimit: c.creditLimit || 0,
                ageingBucket,
                daysSince,
                lastDebitDate: lastDebit
            };
        });

        res.status(200).json({
            success: true,
            result: {
                customers: result,
                totalOutstanding,
                count: customers.length
            }
        });
    } catch (error) {
        console.error("Error in getCustomerOutstanding:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Customer Ledger/Statement - transaction history for a specific customer
exports.getCustomerLedger = async (req, res) => {
    try {
        const { userId } = req.params;
        const { period = 'month' } = req.query;
        const { start, end } = getDateRange(period, req.query);

        const customer = await User.findById(userId).select("name mobile customerId walletBalance");
        if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });

        const transactions = await Transaction.find({
            user: userId,
            createdAt: { $gte: start, $lte: end }
        })
            .sort({ createdAt: 1 })
            .lean();

        // Running balance calculation
        let balance = 0;
        const ledger = transactions.map(t => {
            if (t.type === "CREDIT") balance += t.amount;
            else balance -= t.amount;
            return {
                ...t,
                runningBalance: balance
            };
        });

        const totalCredits = transactions.filter(t => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
        const totalDebits = transactions.filter(t => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);

        res.status(200).json({
            success: true,
            result: {
                customer,
                transactions: ledger,
                summary: { totalCredits, totalDebits, netBalance: totalCredits - totalDebits, currentBalance: customer.walletBalance }
            }
        });
    } catch (error) {
        console.error("Error in getCustomerLedger:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Customer-wise Sales Summary
exports.getCustomerSalesSummary = async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        const { start, end } = getDateRange(period, req.query);

        const sales = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    status: { $in: ["confirmed", "delivered", "out_for_delivery"] }
                }
            },
            {
                $group: {
                    _id: "$customer",
                    totalAmount: { $sum: "$totalAmount" },
                    orderCount: { $sum: 1 },
                    lastOrder: { $max: "$createdAt" }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "customer"
                }
            },
            { $unwind: "$customer" },
            {
                $project: {
                    name: "$customer.name",
                    mobile: "$customer.mobile",
                    customerId: "$customer.customerId",
                    walletBalance: "$customer.walletBalance",
                    totalAmount: 1,
                    orderCount: 1,
                    lastOrder: 1,
                    avgOrderValue: { $divide: ["$totalAmount", "$orderCount"] }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        res.status(200).json({ success: true, result: sales });
    } catch (error) {
        console.error("Error in getCustomerSalesSummary:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── TRANSACTION REPORTS ─────────────────────────────────────────────────────

// Payment Collection Report
exports.getPaymentCollectionReport = async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        const { start, end } = getDateRange(period, req.query);

        // Wallet recharges (CREDIT transactions)
        const collections = await Transaction.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    type: "CREDIT",
                    status: "SUCCESS"
                }
            },
            {
                $group: {
                    _id: "$mode",
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Daily collection trend
        const dailyCollections = await Transaction.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    type: "CREDIT",
                    status: "SUCCESS"
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const totalCollected = collections.reduce((s, c) => s + c.total, 0);

        res.status(200).json({
            success: true,
            result: {
                byMode: collections,
                dailyTrend: dailyCollections,
                totalCollected,
                totalTransactions: collections.reduce((s, c) => s + c.count, 0)
            }
        });
    } catch (error) {
        console.error("Error in getPaymentCollectionReport:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Daybook - All transactions chronologically
exports.getDaybook = async (req, res) => {
    try {
        const { period = 'week', page = 1, limit = 100 } = req.query;
        const { start, end } = getDateRange(period, req.query);

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const transactions = await Transaction.find({
            createdAt: { $gte: start, $lte: end }
        })
            .populate("user", "name mobile customerId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await Transaction.countDocuments({
            createdAt: { $gte: start, $lte: end }
        });

        // Summary
        const summary = await Transaction.aggregate([
            {
                $match: { createdAt: { $gte: start, $lte: end } }
            },
            {
                $group: {
                    _id: "$type",
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalCredits = summary.find(s => s._id === "CREDIT")?.total || 0;
        const totalDebits = summary.find(s => s._id === "DEBIT")?.total || 0;

        res.status(200).json({
            success: true,
            result: {
                transactions,
                totalRecords: total,
                page: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                summary: { totalCredits, totalDebits, net: totalCredits - totalDebits }
            }
        });
    } catch (error) {
        console.error("Error in getDaybook:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Purchase Summary (Vendor Payments + Milk Collections)
exports.getPurchaseSummary = async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        const { start, end } = getDateRange(period, req.query);

        // Vendor payments
        const vendorPayments = await VendorPayment.aggregate([
            { $match: { date: { $gte: start, $lte: end } } },
            {
                $lookup: {
                    from: "vendors",
                    localField: "vendor",
                    foreignField: "_id",
                    as: "vendorInfo"
                }
            },
            { $unwind: { path: "$vendorInfo", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$vendor",
                    vendorName: { $first: "$vendorInfo.name" },
                    totalPaid: { $sum: "$amount" },
                    paymentCount: { $sum: 1 },
                    lastPayment: { $max: "$date" }
                }
            },
            { $sort: { totalPaid: -1 } }
        ]);

        // Milk collections
        const milkCollections = await MilkCollection.aggregate([
            { $match: { date: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: "$vendor",
                    totalQuantity: { $sum: "$quantity" },
                    totalAmount: { $sum: "$totalAmount" },
                    collections: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "vendors",
                    localField: "_id",
                    foreignField: "_id",
                    as: "vendorInfo"
                }
            },
            { $unwind: { path: "$vendorInfo", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    vendorName: "$vendorInfo.name",
                    totalQuantity: 1,
                    totalAmount: 1,
                    collections: 1
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        const totalVendorPayments = vendorPayments.reduce((s, v) => s + v.totalPaid, 0);
        const totalMilkCost = milkCollections.reduce((s, m) => s + m.totalAmount, 0);

        res.status(200).json({
            success: true,
            result: {
                vendorPayments,
                milkCollections,
                summary: {
                    totalVendorPayments,
                    totalMilkCost,
                    totalPurchases: totalVendorPayments + totalMilkCost
                }
            }
        });
    } catch (error) {
        console.error("Error in getPurchaseSummary:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Subscription Report - active subscriptions by product
exports.getSubscriptionReport = async (req, res) => {
    try {
        const subscriptionsByProduct = await Subscription.aggregate([
            { $match: { status: "active" } },
            {
                $group: {
                    _id: "$product",
                    activeCount: { $sum: 1 },
                    totalDailyQty: { $sum: "$quantity" },
                    trialCount: { $sum: { $cond: ["$isTrial", 1, 0] } }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $project: {
                    name: "$product.name",
                    price: "$product.price",
                    activeCount: 1,
                    totalDailyQty: 1,
                    trialCount: 1,
                    dailyRevenue: { $multiply: ["$product.price", "$totalDailyQty"] }
                }
            },
            { $sort: { activeCount: -1 } }
        ]);

        const totals = {
            totalActiveSubscriptions: subscriptionsByProduct.reduce((s, p) => s + p.activeCount, 0),
            totalDailyQuantity: subscriptionsByProduct.reduce((s, p) => s + p.totalDailyQty, 0),
            estimatedDailyRevenue: subscriptionsByProduct.reduce((s, p) => s + p.dailyRevenue, 0),
            totalTrials: subscriptionsByProduct.reduce((s, p) => s + p.trialCount, 0)
        };

        res.status(200).json({
            success: true,
            result: { products: subscriptionsByProduct, totals }
        });
    } catch (error) {
        console.error("Error in getSubscriptionReport:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
