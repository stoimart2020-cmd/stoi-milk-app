const User = require("../models/User");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Subscription = require("../models/Subscription");
const Category = require("../models/Category");
const Complaint = require("../models/Complaint");
const Transaction = require("../models/Transaction");
const { resolveHubs } = require("../utils/logisticsHelper");

exports.getDashboardStats = async (req, res) => {
    try {
        const { factory, district, city, area, hub, stockPoint } = req.query;

        // Build User Filter
        let userFilter = { role: "CUSTOMER" };

        const hubIds = await resolveHubs({ factory, district, city, area, hub });
        if (hubIds) {
            userFilter.hub = { $in: hubIds };
        }
        if (stockPoint) userFilter.deliveryPoints = stockPoint;

        const hasFilters = Boolean(factory || district || city || area || hub || stockPoint);
        let userIds = [];

        // If filters are active, fetch matching User IDs to scope other queries
        if (hasFilters) {
            const users = await User.find(userFilter).select('_id');
            userIds = users.map(u => u._id);
        }

        // Scopes for queries
        const userScope = hasFilters ? { user: { $in: userIds } } : {};
        const customerScope = hasFilters ? { customer: { $in: userIds } } : {};

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // 1. Total Customers
        const totalCustomers = await User.countDocuments(userFilter);
        const newCustomersToday = await User.countDocuments({
            ...userFilter,
            createdAt: { $gte: today, $lt: tomorrow },
        });

        // 2. Active Subscriptions
        const activeSubDocs = await Subscription.find({
            ...userScope,
            status: { $in: ["active", "paused"] }, // Include paused (vacation)
            isTrial: false, // Exclude trial
        });

        const activeSubscriptions = activeSubDocs.length;

        // 3. New Subscribers (within last 7 days)
        const newSubscribers = await Subscription.countDocuments({
            ...userScope,
            status: { $in: ["active", "paused"] },
            isTrial: false,
            createdAt: { $gte: sevenDaysAgo },
        });

        // 4. Inactive Subscribers
        const inactiveSubscribers = await Subscription.countDocuments({
            ...userScope,
            status: "cancelled",
            isTrial: false,
        });

        // 5. Re-activations (Users with both cancelled and active)
        // Note: Logic simplified for filtered view
        const reactivatedUsers = await Subscription.aggregate([
            {
                $match: {
                    ...userScope,
                    isTrial: false,
                }
            },
            {
                $group: {
                    _id: "$user",
                    statuses: { $addToSet: "$status" },
                }
            },
            {
                $match: {
                    statuses: { $all: ["cancelled", "active"] }
                }
            },
            {
                $count: "reactivations"
            }
        ]);
        const reactivations = reactivatedUsers.length > 0 ? reactivatedUsers[0].reactivations : 0;

        // 6. Trial Customers
        const trialCustomers = await Subscription.countDocuments({
            ...userScope,
            status: "active",
            isTrial: true,
        });

        // 7. Today's Revenue & Deliveries
        const todaysOrders = await Order.find({
            ...customerScope,
            deliveryDate: { $gte: today, $lt: tomorrow },
            status: { $ne: "cancelled" },
        });

        const todayRevenue = todaysOrders.reduce((sum, order) => sum + (order.status === "delivered" ? order.totalAmount : 0), 0);
        const todayDeliveries = todaysOrders.length;
        const pendingDeliveries = todaysOrders.filter(o => o.status !== "delivered" && o.status !== "cancelled").length;
        const completedDeliveries = todaysOrders.filter(o => o.status === "delivered").length;
        const failedDeliveries = todaysOrders.filter(o => o.status === "cancelled").length;

        // 8. Monthly Revenue
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthlyOrders = await Order.find({
            ...customerScope,
            deliveryDate: { $gte: startOfMonth },
            status: "delivered",
        });
        const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + order.totalAmount, 0);

        // 9. Recent Orders
        const recentOrders = await Order.find(customerScope)
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("customer", "name")
            .lean();

        const formattedRecentOrders = recentOrders.map(order => ({
            id: order._id,
            customer: order.customer?.name || "Unknown",
            amount: order.totalAmount,
            status: order.status,
            time: order.createdAt,
        }));

        // 10. Low Stock ("Global" for now as product doesn't track location stock in this model)
        const lowStockProducts = await Product.find({
            $expr: { $lt: ["$stock", "$lowStockThreshold"] }
        }).limit(5);

        // 11. Top Selling Products (Filtered by Area)
        const topProducts = await Order.aggregate([
            { $match: { status: "delivered", ...customerScope } },
            { $unwind: "$products" },
            {
                $group: {
                    _id: "$products.product",
                    sold: { $sum: "$products.quantity" },
                    revenue: { $sum: { $multiply: ["$products.quantity", "$products.price"] } },
                },
            },
            { $sort: { revenue: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },
            { $unwind: "$productDetails" },
            {
                $project: {
                    name: "$productDetails.name",
                    sold: 1,
                    revenue: 1,
                },
            },
        ]);

        res.status(200).json({
            success: true,
            result: {
                stats: {
                    totalCustomers,
                    newCustomersToday,
                    activeSubscriptions,
                    newSubscribers,
                    inactiveSubscribers,
                    reactivations,
                    trialCustomers,
                    todayRevenue,
                    todayDeliveries,
                    monthlyRevenue,
                    pendingPayments: 0,
                    churnedCustomers: inactiveSubscribers,
                },
                deliveryStats: {
                    total: todayDeliveries,
                    completed: completedDeliveries,
                    pending: pendingDeliveries,
                    failed: failedDeliveries,
                },
                recentOrders: formattedRecentOrders,
                topProducts,
                lowStockItems: lowStockProducts.map(p => ({
                    name: p.name,
                    stock: p.stock,
                    threshold: p.lowStockThreshold || 10,
                })),
                salesAnalytics: await getSalesAnalytics(customerScope),
                categorySplit: await getCategorySplit(customerScope),
                comparisonData: await getComparisonData(customerScope),
                salesForecast: await getSalesForecast(userScope),
                customerGrowth: await getCustomerGrowthData(userScope),
                deliveryPerformance7Day: await getDeliveryPerformance7Day(customerScope),
                walletSummary: await getWalletSummary(),
                complaintStats: await getComplaintStats(),
                frequencySplit: await getFrequencySplit(userScope),
            },
        });
    } catch (error) {
        console.error("Dashboard stats error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- Helper Aggregations ---

async function getSalesAnalytics(matchStage) {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1); // Start of that month

    const pipeline = [
        {
            $match: {
                ...matchStage,
                status: "delivered",
                deliveryDate: { $gte: twelveMonthsAgo }
            }
        },
        {
            $group: {
                _id: {
                    month: { $month: "$deliveryDate" },
                    year: { $year: "$deliveryDate" }
                },
                total: { $sum: "$totalAmount" }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ];

    const results = await Order.aggregate(pipeline);

    // Format for Recharts: "M-YYYY"
    // We want to fill in missing months with 0
    const analytics = [];
    let current = new Date(twelveMonthsAgo);
    const now = new Date();

    while (current <= now) {
        const m = current.getMonth() + 1;
        const y = current.getFullYear();
        const found = results.find(r => r._id.month === m && r._id.year === y);

        analytics.push({
            name: `${m}-${y}`,
            value: found ? found.total : 0
        });

        current.setMonth(current.getMonth() + 1);
    }

    return analytics;
}

async function getCategorySplit(matchStage) {
    // Default to current month for split
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const pipeline = [
        {
            $match: {
                ...matchStage,
                status: "delivered",
                deliveryDate: { $gte: startOfMonth }
            }
        },
        { $unwind: "$products" },
        {
            $lookup: {
                from: "products",
                localField: "products.product",
                foreignField: "_id",
                as: "productDetails"
            }
        },
        { $unwind: "$productDetails" },
        {
            $group: {
                _id: "$productDetails.category",
                value: { $sum: "$products.quantity" } // Or revenue
            }
        },
        {
            $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "_id",
                as: "categoryDetails"
            }
        },
        { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                name: { $ifNull: ["$categoryDetails.name", "Uncategorized"] },
                value: 1
            }
        }
    ];

    const results = await Order.aggregate(pipeline);

    // Assign colors (simple rotation)
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#FF9F1C'];
    return results.map((r, i) => ({
        ...r,
        color: colors[i % colors.length]
    }));
}

async function getComparisonData(matchStage) {
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const currentMonthCount = await Order.countDocuments({
        ...matchStage,
        createdAt: { $gte: currentMonthStart }
    });

    const lastMonthCount = await Order.countDocuments({
        ...matchStage,
        createdAt: { $gte: lastMonthStart, $lt: currentMonthStart }
    });

    // Format Month Names
    const currentMonthName = currentMonthStart.toLocaleString('default', { month: 'long', year: 'numeric' });
    const lastMonthName = lastMonthStart.toLocaleString('default', { month: 'long', year: 'numeric' });

    return [
        {
            name: currentMonthName,
            current: currentMonthCount,
            last: lastMonthCount
        }
    ];
}

async function getSalesForecast(matchStage) {
    // Get all active subscriptions with product prices
    const subscriptions = await Subscription.find({
        ...matchStage,
        status: "active",
    }).populate("product", "price name");

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const forecast = [];

    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        date.setHours(0, 0, 0, 0);

        const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
        const dayName = dayNames[dayOfWeek];
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        let expectedRevenue = 0;
        let expectedOrders = 0;
        let expectedQuantity = 0;

        for (const sub of subscriptions) {
            if (!sub.product || !sub.product.price) continue;
            if (sub.startDate && date < new Date(sub.startDate)) continue;
            if (sub.endDate && date > new Date(sub.endDate)) continue;

            let qty = 0;

            switch (sub.frequency) {
                case "Daily":
                    qty = sub.quantity;
                    break;

                case "Alternate Days": {
                    // Calculate if this date is an "on" day
                    const startDate = new Date(sub.startDate);
                    startDate.setHours(0, 0, 0, 0);
                    const diffDays = Math.round((date - startDate) / (1000 * 60 * 60 * 24));
                    if (diffDays % 2 === 0) {
                        qty = sub.quantity;
                    } else {
                        qty = sub.alternateQuantity || 0;
                    }
                    break;
                }

                case "Weekdays":
                    if (!isWeekend) qty = sub.quantity;
                    break;

                case "Weekends":
                    if (isWeekend) qty = sub.quantity;
                    break;

                case "Custom": {
                    // Check customSchedule map first, then customDays array
                    if (sub.customSchedule && sub.customSchedule.size > 0) {
                        const dayQty = sub.customSchedule.get(dayName);
                        if (dayQty && dayQty > 0) qty = dayQty;
                    } else if (sub.customDays && sub.customDays.includes(dayName)) {
                        qty = sub.quantity;
                    }
                    break;
                }
            }

            if (qty > 0) {
                expectedRevenue += qty * sub.product.price;
                expectedOrders += 1;
                expectedQuantity += qty;
            }
        }

        forecast.push({
            date: date.toISOString().split("T")[0],
            day: i === 0 ? "Today" : i === 1 ? "Tomorrow" : dayName.slice(0, 3),
            dayFull: dayName,
            expectedRevenue: Math.round(expectedRevenue * 100) / 100,
            expectedOrders,
            expectedQuantity,
        });
    }

    return forecast;
}

// Customer Growth Data (last 6 months: new customers vs cancelled subs)
async function getCustomerGrowthData(matchStage) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // New customers by month
    const newCustomers = await User.aggregate([
        { $match: { role: "CUSTOMER", createdAt: { $gte: sixMonthsAgo } } },
        {
            $group: {
                _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                count: { $sum: 1 }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Cancelled subscriptions by month
    const cancelled = await Subscription.aggregate([
        { $match: { ...matchStage, status: "cancelled", updatedAt: { $gte: sixMonthsAgo } } },
        {
            $group: {
                _id: { month: { $month: "$updatedAt" }, year: { $year: "$updatedAt" } },
                count: { $sum: 1 }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const months = [];
    const now = new Date();
    let cursor = new Date(sixMonthsAgo);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    while (cursor <= now) {
        const m = cursor.getMonth() + 1;
        const y = cursor.getFullYear();
        const nc = newCustomers.find(r => r._id.month === m && r._id.year === y);
        const cc = cancelled.find(r => r._id.month === m && r._id.year === y);
        months.push({
            name: `${monthNames[m - 1]} ${y}`,
            newCustomers: nc ? nc.count : 0,
            churned: cc ? cc.count : 0,
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
}

// 7-Day Delivery Performance
async function getDeliveryPerformance7Day(matchStage) {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const result = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const next = new Date(date);
        next.setDate(next.getDate() + 1);

        const orders = await Order.find({
            ...matchStage,
            deliveryDate: { $gte: date, $lt: next },
            status: { $ne: "pending" },
        }).select("status").lean();

        const total = orders.length;
        const delivered = orders.filter(o => o.status === "delivered").length;
        const cancelled = orders.filter(o => o.status === "cancelled").length;
        const pending = orders.filter(o => o.status !== "delivered" && o.status !== "cancelled").length;
        const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

        result.push({
            day: dayNames[date.getDay()],
            date: date.toISOString().split("T")[0],
            total,
            delivered,
            cancelled,
            pending,
            successRate,
        });
    }
    return result;
}

// Wallet Summary (current month)
async function getWalletSummary() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const credits = await Transaction.aggregate([
        { $match: { type: "CREDIT", status: "SUCCESS", createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]);

    const debits = await Transaction.aggregate([
        { $match: { type: "DEBIT", status: "SUCCESS", createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]);

    const modeSplit = await Transaction.aggregate([
        { $match: { type: "CREDIT", status: "SUCCESS", createdAt: { $gte: startOfMonth } } },
        { $group: { _id: "$mode", total: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
    ]);

    return {
        totalCredits: credits[0]?.total || 0,
        creditCount: credits[0]?.count || 0,
        totalDebits: debits[0]?.total || 0,
        debitCount: debits[0]?.count || 0,
        netFlow: (credits[0]?.total || 0) - (debits[0]?.total || 0),
        modeSplit: modeSplit.map(m => ({ mode: m._id || "Unknown", amount: m.total, count: m.count })),
    };
}

// Complaint Stats
async function getComplaintStats() {
    const statuses = ["Open", "In Progress", "Resolved", "Closed"];
    const result = {};
    for (const s of statuses) {
        result[s.toLowerCase().replace(/ /g, "_")] = await Complaint.countDocuments({ status: s });
    }
    result.total = Object.values(result).reduce((a, b) => a + b, 0);
    return result;
}

// Subscription Frequency Split
async function getFrequencySplit(matchStage) {
    const split = await Subscription.aggregate([
        { $match: { ...matchStage, status: { $in: ["active", "paused"] } } },
        { $group: { _id: "$frequency", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);
    return split.map(s => ({ name: s._id, value: s.count }));
}
