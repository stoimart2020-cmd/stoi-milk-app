const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/User");
const Order = require("../models/Order");
const Complaint = require("../models/Complaint");
const Transaction = require("../models/Transaction");
const Vendor = require("../models/Vendor");
const Subscription = require("../models/Subscription");
const Product = require("../models/Product");

// Setup Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "fallback_if_empty");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// ═══════════════════════════════════════════════════════════════
// DB TOOL FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function searchCustomers(args) {
    let query = { role: { $in: ["CUSTOMER"] } };
    if (args.name) query.name = new RegExp(args.name, "i");
    if (args.mobile) query.mobile = new RegExp(args.mobile, "i");
    if (args.isActive !== undefined) query.isActive = args.isActive;
    if (args.balanceLessThan !== undefined || args.balanceGreaterThan !== undefined) {
        query.walletBalance = {};
        if (args.balanceLessThan !== undefined) query.walletBalance.$lt = args.balanceLessThan;
        if (args.balanceGreaterThan !== undefined) query.walletBalance.$gt = args.balanceGreaterThan;
    }
    const count = await User.countDocuments(query);
    const users = await User.find(query).select("name mobile walletBalance isActive customerId").limit(25).lean();
    return { totalMatches: count, showing: users.length, data: users };
}

async function getTodayOperations() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const orders = await Order.find({ deliveryDate: { $gte: today, $lt: tomorrow } }).select("status amount").lean();
    return {
        totalOrders: orders.length,
        delivered: orders.filter(o => o.status === "delivered").length,
        pending: orders.filter(o => o.status === "pending").length,
        cancelled: orders.filter(o => o.status === "cancelled").length,
        outForDelivery: orders.filter(o => o.status === "out_for_delivery").length,
        totalExpectedRevenue: orders.reduce((sum, o) => sum + (o.amount || 0), 0)
    };
}

async function getComplaints(args) {
    let query = {};
    if (args.status) query.status = args.status;
    if (args.category) query.category = args.category;
    if (args.priority) query.priority = args.priority;
    const count = await Complaint.countDocuments(query);
    const complaints = await Complaint.find(query)
        .populate("user", "name mobile customerId")
        .select("subject category status priority createdAt resolution")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
    // Format dates for readability
    const formatted = complaints.map(c => ({
        subject: c.subject,
        category: c.category,
        status: c.status,
        priority: c.priority,
        customerName: c.user?.name || "Unknown",
        customerMobile: c.user?.mobile || "",
        createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : "",
        resolution: c.resolution || "Pending"
    }));
    return { totalMatches: count, showing: formatted.length, data: formatted };
}

async function getPaymentTransactions(args) {
    let query = {};
    if (args.type) query.type = args.type; // CREDIT or DEBIT
    if (args.mode) query.mode = args.mode; // CASH, ONLINE, UPI, etc.
    if (args.status) query.status = args.status; // SUCCESS, PENDING, FAILED
    if (args.customerName) {
        const users = await User.find({ name: new RegExp(args.customerName, "i"), role: "CUSTOMER" }).select("_id").lean();
        query.user = { $in: users.map(u => u._id) };
    }
    // Date range
    if (args.daysBack) {
        const since = new Date(); since.setDate(since.getDate() - args.daysBack); since.setHours(0, 0, 0, 0);
        query.createdAt = { $gte: since };
    }
    const count = await Transaction.countDocuments(query);
    const txns = await Transaction.find(query)
        .populate("user", "name mobile customerId")
        .select("amount type mode status description createdAt")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
    const totalAmount = txns.reduce((s, t) => s + (t.amount || 0), 0);
    const formatted = txns.map(t => ({
        customerName: t.user?.name || "Unknown",
        amount: t.amount,
        type: t.type,
        mode: t.mode,
        status: t.status,
        description: t.description || "",
        date: t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN') : ""
    }));
    return { totalMatches: count, showing: formatted.length, totalAmountShown: totalAmount, data: formatted };
}

async function getVendors(args) {
    let query = {};
    if (args.name) query.name = new RegExp(args.name, "i");
    if (args.isActive !== undefined) query.isActive = args.isActive;
    const vendors = await Vendor.find(query).select("name code mobile ratePerLiter isActive").sort({ name: 1 }).limit(20).lean();
    return { totalVendors: vendors.length, data: vendors };
}

async function getSubscriptions(args) {
    let query = {};
    if (args.status) query.status = args.status; // active, paused, cancelled, pending
    if (args.isTrial !== undefined) query.isTrial = args.isTrial;
    if (args.customerName) {
        const users = await User.find({ name: new RegExp(args.customerName, "i"), role: "CUSTOMER" }).select("_id").lean();
        query.user = { $in: users.map(u => u._id) };
    }
    const count = await Subscription.countDocuments(query);
    const subs = await Subscription.find(query)
        .populate("user", "name mobile customerId")
        .populate("product", "name price")
        .select("frequency quantity status isTrial startDate endDate")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
    const formatted = subs.map(s => ({
        customerName: s.user?.name || "Unknown",
        product: s.product?.name || "Unknown",
        price: s.product?.price || 0,
        quantity: s.quantity,
        frequency: s.frequency,
        status: s.status,
        isTrial: s.isTrial,
        startDate: s.startDate ? new Date(s.startDate).toLocaleDateString('en-IN') : ""
    }));
    return { totalMatches: count, showing: formatted.length, data: formatted };
}

async function getProductInfo(args) {
    let query = {};
    if (args.name) query.name = new RegExp(args.name, "i");
    if (args.isActive !== undefined) query.isActive = args.isActive;
    if (args.lowStock) query.$expr = { $lte: ["$stock", "$lowStockThreshold"] };
    const products = await Product.find(query)
        .select("name price stock lowStockThreshold isActive totalSold category unit")
        .populate("category", "name")
        .sort({ name: 1 })
        .limit(20)
        .lean();
    const formatted = products.map(p => ({
        name: p.name,
        price: p.price,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
        isActive: p.isActive,
        totalSold: p.totalSold,
        category: p.category?.name || "Uncategorized",
        unit: p.unit
    }));
    return { totalProducts: formatted.length, data: formatted };
}

async function getRevenueAnalytics(args) {
    const daysBack = args.daysBack || 30;
    const since = new Date(); since.setDate(since.getDate() - daysBack); since.setHours(0, 0, 0, 0);

    const txns = await Transaction.find({ type: "CREDIT", status: "SUCCESS", createdAt: { $gte: since } }).select("amount mode createdAt").lean();
    const totalRevenue = txns.reduce((s, t) => s + (t.amount || 0), 0);
    
    // Group by mode
    const byMode = {};
    txns.forEach(t => { byMode[t.mode] = (byMode[t.mode] || 0) + (t.amount || 0); });

    // Group by day
    const byDay = {};
    txns.forEach(t => {
        const day = new Date(t.createdAt).toLocaleDateString('en-IN');
        byDay[day] = (byDay[day] || 0) + (t.amount || 0);
    });

    return {
        periodDays: daysBack,
        totalRevenue,
        totalTransactions: txns.length,
        averagePerTransaction: txns.length > 0 ? Math.round(totalRevenue / txns.length) : 0,
        revenueByMode: byMode,
        revenueByDay: byDay
    };
}

async function getDeliveryList(args) {
    // Parse date: accept "today", "yesterday", "2026-04-02", or daysAgo number
    let targetDate = new Date();
    if (args.date === 'yesterday') {
        targetDate.setDate(targetDate.getDate() - 1);
    } else if (args.date === 'today') {
        // already today
    } else if (args.daysAgo && typeof args.daysAgo === 'number') {
        targetDate.setDate(targetDate.getDate() - args.daysAgo);
    } else if (args.date) {
        targetDate = new Date(args.date);
    }
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    let query = { deliveryDate: { $gte: targetDate, $lt: nextDay } };
    if (args.status) query.status = args.status;

    const orders = await Order.find(query)
        .populate("customer", "name mobile customerId")
        .populate("products.product", "name")
        .select("customer products status totalAmount deliveryDate orderId")
        .lean();

    const formatted = orders.map(o => ({
        orderId: o.orderId,
        customerName: o.customer?.name || "Unknown",
        customerMobile: o.customer?.mobile || "",
        customerId: o.customer?.customerId || "",
        products: (o.products || []).map(p => `${p.product?.name || 'Product'} x${p.quantity}`).join(", "),
        status: o.status,
        amount: o.totalAmount
    }));

    return {
        date: targetDate.toLocaleDateString('en-IN'),
        totalOrders: formatted.length,
        data: formatted
    };
}

async function compareDeliveryLists(args) {
    // Get two dates
    let date1 = new Date();
    let date2 = new Date();

    if (args.date1 === 'yesterday') { date1.setDate(date1.getDate() - 1); }
    else if (args.date1 === 'today') { /* already today */ }
    else if (args.date1) { date1 = new Date(args.date1); }
    else { date1.setDate(date1.getDate() - 1); } // default: yesterday

    if (args.date2 === 'today') { /* already today */ }
    else if (args.date2 === 'yesterday') { date2.setDate(date2.getDate() - 1); }
    else if (args.date2) { date2 = new Date(args.date2); }
    // default date2: today

    date1.setHours(0, 0, 0, 0);
    date2.setHours(0, 0, 0, 0);
    const nextDay1 = new Date(date1); nextDay1.setDate(nextDay1.getDate() + 1);
    const nextDay2 = new Date(date2); nextDay2.setDate(nextDay2.getDate() + 1);

    const [orders1, orders2] = await Promise.all([
        Order.find({ deliveryDate: { $gte: date1, $lt: nextDay1 } }).populate("customer", "name mobile customerId").select("customer").lean(),
        Order.find({ deliveryDate: { $gte: date2, $lt: nextDay2 } }).populate("customer", "name mobile customerId").select("customer").lean()
    ]);

    const set1 = new Map();
    orders1.forEach(o => { if (o.customer) set1.set(o.customer._id.toString(), { name: o.customer.name, mobile: o.customer.mobile, customerId: o.customer.customerId }); });
    const set2 = new Map();
    orders2.forEach(o => { if (o.customer) set2.set(o.customer._id.toString(), { name: o.customer.name, mobile: o.customer.mobile, customerId: o.customer.customerId }); });

    const onlyInDate1 = []; // Were on date1 but NOT on date2
    const onlyInDate2 = []; // Were on date2 but NOT on date1

    for (const [id, cust] of set1) {
        if (!set2.has(id)) onlyInDate1.push(cust);
    }
    for (const [id, cust] of set2) {
        if (!set1.has(id)) onlyInDate2.push(cust);
    }

    return {
        date1: date1.toLocaleDateString('en-IN'),
        date2: date2.toLocaleDateString('en-IN'),
        totalCustomersOnDate1: set1.size,
        totalCustomersOnDate2: set2.size,
        droppedFromDate1: { count: onlyInDate1.length, customers: onlyInDate1 },
        newOnDate2: { count: onlyInDate2.length, customers: onlyInDate2 }
    };
}

// ═══════════════════════════════════════════════════════════════
// TOOL MAP & DECLARATIONS
// ═══════════════════════════════════════════════════════════════

const toolsMap = {
    searchCustomers,
    getTodayOperations,
    getComplaints,
    getPaymentTransactions,
    getVendors,
    getSubscriptions,
    getProductInfo,
    getRevenueAnalytics,
    getDeliveryList,
    compareDeliveryLists
};

const SYSTEM_INSTRUCTION = `You are an intelligent, helpful AI assistant built for the STOI Milk Administrator Dashboard.
Your job is to answer the admin's questions regarding business data confidently by querying the live database.
You have access to 10 powerful tools:
1. searchCustomers - Find customers by name, mobile, or wallet balance filters
2. getTodayOperations - Today's order summary statistics
3. getComplaints - Search tickets/complaints by status (Open, In Progress, Resolved, Closed), category, priority
4. getPaymentTransactions - Search payments by type, mode, status, customer name, or recent days
5. getVendors - List milk vendors
6. getSubscriptions - Search subscriptions by status, trial flag, or customer name
7. getProductInfo - Product details, stock, pricing. Use lowStock=true for low stock alerts
8. getRevenueAnalytics - Revenue breakdown by payment mode and day
9. getDeliveryList - Get the delivery order list for any specific date (today, yesterday, or a specific date). Returns customer names, products, and statuses.
10. compareDeliveryLists - Compare delivery lists between two dates. Shows which customers dropped off and which are new. IMPORTANT: Use this tool when the user asks "who was on yesterday's delivery but not today's" or similar comparison questions. Set date1=yesterday and date2=today.

Format your responses nicely in Markdown. Use bullet points, **bold** for emphasis, and tables when showing lists of data. Be concise and professional. Never expose raw MongoDB ObjectIDs. Use ₹ symbol for currency amounts.`;

// ═══════════════════════════════════════════════════════════════
// GEMINI TOOLS DECLARATION
// ═══════════════════════════════════════════════════════════════

const geminiTools = [{
    functionDeclarations: [
        {
            name: "searchCustomers",
            description: "Search for customers by name, mobile, or wallet balance. Find customers with low/negative balances or specific statuses.",
            parameters: {
                type: "OBJECT",
                properties: {
                    name: { type: "STRING", description: "Partial match for customer name" },
                    mobile: { type: "STRING", description: "Partial match for mobile number" },
                    balanceLessThan: { type: "NUMBER", description: "Filter wallet balance strictly less than this amount" },
                    balanceGreaterThan: { type: "NUMBER", description: "Filter wallet balance strictly greater than this amount" },
                    isActive: { type: "BOOLEAN", description: "Filter active vs inactive customers" }
                }
            }
        },
        {
            name: "getTodayOperations",
            description: "Get today's order statistics: total, delivered, pending, cancelled, out for delivery, and expected revenue.",
            parameters: { type: "OBJECT", properties: {} }
        },
        {
            name: "getComplaints",
            description: "Search complaints/tickets. Filter by status (Open, In Progress, Resolved, Closed), category (Quality, Delivery, Billing, Other), or priority (Low, Medium, High).",
            parameters: {
                type: "OBJECT",
                properties: {
                    status: { type: "STRING", description: "Complaint status: Open, In Progress, Resolved, or Closed" },
                    category: { type: "STRING", description: "Category: Quality, Delivery, Billing, or Other" },
                    priority: { type: "STRING", description: "Priority: Low, Medium, or High" }
                }
            }
        },
        {
            name: "getPaymentTransactions",
            description: "Search payment/wallet transactions. Filter by type (CREDIT/DEBIT), mode (CASH, ONLINE, UPI, CHEQUE), status, customer name, or recent days.",
            parameters: {
                type: "OBJECT",
                properties: {
                    type: { type: "STRING", description: "Transaction type: CREDIT or DEBIT" },
                    mode: { type: "STRING", description: "Payment mode: CASH, ONLINE, UPI, CHEQUE, WALLET, ADJUSTMENT" },
                    status: { type: "STRING", description: "Status: SUCCESS, PENDING, or FAILED" },
                    customerName: { type: "STRING", description: "Filter by customer name (partial match)" },
                    daysBack: { type: "NUMBER", description: "Only show transactions from the last N days" }
                }
            }
        },
        {
            name: "getVendors",
            description: "List milk vendors/suppliers. Filter by name or active status.",
            parameters: {
                type: "OBJECT",
                properties: {
                    name: { type: "STRING", description: "Partial match for vendor name" },
                    isActive: { type: "BOOLEAN", description: "Filter active vs inactive vendors" }
                }
            }
        },
        {
            name: "getSubscriptions",
            description: "Search customer subscriptions. Filter by status (active, paused, cancelled), whether it's a trial, or customer name.",
            parameters: {
                type: "OBJECT",
                properties: {
                    status: { type: "STRING", description: "Subscription status: active, paused, cancelled, pending" },
                    isTrial: { type: "BOOLEAN", description: "Filter trial subscriptions only" },
                    customerName: { type: "STRING", description: "Filter by customer name (partial match)" }
                }
            }
        },
        {
            name: "getProductInfo",
            description: "Search products by name, check stock levels, pricing. Use lowStock=true to find items running low.",
            parameters: {
                type: "OBJECT",
                properties: {
                    name: { type: "STRING", description: "Partial match for product name" },
                    isActive: { type: "BOOLEAN", description: "Filter active vs inactive products" },
                    lowStock: { type: "BOOLEAN", description: "Set true to find products with stock at or below their threshold" }
                }
            }
        },
        {
            name: "getRevenueAnalytics",
            description: "Get revenue analytics with breakdown by payment mode and by day. Default period is 30 days.",
            parameters: {
                type: "OBJECT",
                properties: {
                    daysBack: { type: "NUMBER", description: "Analysis period in days (default 30)" }
                }
            }
        },
        {
            name: "getDeliveryList",
            description: "Get the full delivery order list for a specific date, showing all customer names, products ordered, status and amounts. Use date='today' or date='yesterday' or a specific date string.",
            parameters: {
                type: "OBJECT",
                properties: {
                    date: { type: "STRING", description: "Date to query: 'today', 'yesterday', or a date string like '2026-04-02'" },
                    daysAgo: { type: "NUMBER", description: "Alternative: number of days ago (1=yesterday, 2=day before)" },
                    status: { type: "STRING", description: "Optional filter: pending, confirmed, out_for_delivery, delivered, cancelled" }
                }
            }
        },
        {
            name: "compareDeliveryLists",
            description: "Compare delivery lists between two dates. Returns customers who were on date1 but NOT on date2 (dropped), and customers on date2 but NOT on date1 (new). Use this when asked 'who was on yesterday delivery but not today' — set date1='yesterday', date2='today'.",
            parameters: {
                type: "OBJECT",
                properties: {
                    date1: { type: "STRING", description: "First date: 'today', 'yesterday', or specific date string" },
                    date2: { type: "STRING", description: "Second date: 'today', 'yesterday', or specific date string" }
                }
            }
        }
    ]
}];

// ═══════════════════════════════════════════════════════════════
// CHAT HANDLER
// ═══════════════════════════════════════════════════════════════

exports.chat = async (req, res) => {
    try {
        const { message, history } = req.body;
        
        if (!process.env.GEMINI_API_KEY) {
             return res.status(500).json({ success: false, message: "GEMINI_API_KEY is missing in server environment variables." });
        }

        const chatSession = model.startChat({
            history: history || [],
            tools: geminiTools,
            systemInstruction: { role: "system", parts: [{ text: SYSTEM_INSTRUCTION }] }
        });

        // 1. Send the user's message
        let result = await chatSession.sendMessage(message);

        // 2. Handle function calls (loop for multi-step tool use)
        let functionCalls = result.response.functionCalls();
        let maxToolRounds = 5;
        while (functionCalls && functionCalls.length > 0 && maxToolRounds > 0) {
            maxToolRounds--;
            const toolResponses = [];
            
            for (const call of functionCalls) {
                const toolName = call.name;
                const toolArgs = call.args;
                
                if (toolsMap[toolName]) {
                    try {
                        const dbResult = await toolsMap[toolName](toolArgs);
                        toolResponses.push({
                            functionResponse: { name: toolName, response: dbResult }
                        });
                    } catch (toolErr) {
                        toolResponses.push({
                            functionResponse: { name: toolName, response: { error: toolErr.message } }
                        });
                    }
                }
            }
            
            result = await chatSession.sendMessage(toolResponses);
            functionCalls = result.response.functionCalls();
        }

        // 3. Safely extract text
        let finalResponseText;
        try {
            finalResponseText = result.response.text();
        } catch (e) {
            const parts = result.response.candidates?.[0]?.content?.parts || [];
            finalResponseText = parts.filter(p => p.text).map(p => p.text).join("\n") || "I processed your request but couldn't generate a text response.";
        }

        res.status(200).json({ success: true, result: finalResponseText });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
