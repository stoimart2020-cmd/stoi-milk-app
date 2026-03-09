const BottleTransaction = require("../models/BottleTransaction");
const User = require("../models/User");
const Order = require("../models/Order");

// Record a bottle transaction (issue, return, or adjustment)
exports.recordBottleTransaction = async (req, res) => {
    try {
        const { customerId, orderId, productId, type, quantity, notes } = req.body;

        if (!customerId || !type || !quantity) {
            return res.status(400).json({
                success: false,
                message: "customerId, type, and quantity are required",
            });
        }

        // Create the transaction
        const transaction = await BottleTransaction.create({
            customer: customerId,
            rider: req.user.role === "RIDER" ? req.user._id : null,
            order: orderId || null,
            product: productId || null,
            type,
            quantity,
            notes: notes || "",
            recordedBy: req.user._id,
        });

        // Update customer's remainingBottles
        const customer = await User.findById(customerId);
        if (customer) {
            if (type === "issued") {
                customer.remainingBottles = (customer.remainingBottles || 0) + quantity;
            } else if (type === "returned") {
                customer.remainingBottles = (customer.remainingBottles || 0) - quantity;
            } else if (type === "adjustment") {
                // For adjustments, quantity can be positive or negative based on notes
                // Positive adjustment = add bottles, Negative = subtract
                customer.remainingBottles = (customer.remainingBottles || 0) + quantity;
            }
            await customer.save();
        }

        res.status(201).json({
            success: true,
            result: transaction,
            message: "Bottle transaction recorded",
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get bottle transactions with filters
exports.getBottleTransactions = async (req, res) => {
    try {
        let { customerId, riderId, type, startDate, endDate, page = 1, limit = 20 } = req.query;

        // If user is a customer, force them to see only their own transactions
        if (req.user.role === "CUSTOMER") {
            customerId = req.user._id;
        }

        const query = {};
        if (customerId) query.customer = customerId;
        if (riderId) query.rider = riderId;
        if (type) query.type = type;

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const transactions = await BottleTransaction.find(query)
            .populate("customer", "name mobile")
            .populate("rider", "name mobile")
            .populate("order", "_id deliveryDate")
            .populate("product", "name")
            .populate("recordedBy", "name")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await BottleTransaction.countDocuments(query);

        res.status(200).json({
            success: true,
            result: transactions,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get a specific customer's bottle balance and transaction history
exports.getCustomerBottleBalance = async (req, res) => {
    try {
        const { id } = req.params;

        const customer = await User.findById(id).select("name mobile remainingBottles");
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        // Get recent transactions for this customer
        const recentTransactions = await BottleTransaction.find({ customer: id })
            .populate("rider", "name")
            .populate("recordedBy", "name")
            .sort({ createdAt: -1 })
            .limit(10);

        res.status(200).json({
            success: true,
            result: {
                customer: {
                    _id: customer._id,
                    name: customer.name,
                    mobile: customer.mobile,
                    remainingBottles: customer.remainingBottles || 0,
                },
                recentTransactions,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get dashboard statistics for bottles
exports.getBottleStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Total outstanding bottles (sum of all customers' remainingBottles)
        const outstandingResult = await User.aggregate([
            { $match: { role: "CUSTOMER", remainingBottles: { $gt: 0 } } },
            { $group: { _id: null, total: { $sum: "$remainingBottles" } } },
        ]);
        const totalOutstanding = outstandingResult[0]?.total || 0;

        // Bottles collected today
        const collectedTodayResult = await BottleTransaction.aggregate([
            {
                $match: {
                    type: "returned",
                    createdAt: { $gte: today, $lt: tomorrow },
                },
            },
            { $group: { _id: null, total: { $sum: "$quantity" } } },
        ]);
        const collectedToday = collectedTodayResult[0]?.total || 0;

        // Bottles issued today
        const issuedTodayResult = await BottleTransaction.aggregate([
            {
                $match: {
                    type: "issued",
                    createdAt: { $gte: today, $lt: tomorrow },
                },
            },
            { $group: { _id: null, total: { $sum: "$quantity" } } },
        ]);
        const issuedToday = issuedTodayResult[0]?.total || 0;

        // Customers with pending returns (more than X bottles)
        const customersWithPending = await User.countDocuments({
            role: "CUSTOMER",
            remainingBottles: { $gt: 0 },
        });

        res.status(200).json({
            success: true,
            result: {
                totalOutstanding,
                collectedToday,
                issuedToday,
                customersWithPending,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all customers with their bottle counts (paginated, searchable)
exports.getCustomerBottles = async (req, res) => {
    try {
        const { search = "", page = 1, limit = 20, filter = "all", sortBy = "remainingBottles", sortOrder = "desc" } = req.query;

        const query = { role: "CUSTOMER" };

        // Filter options
        if (filter === "with_bottles") {
            query.remainingBottles = { $gt: 0 };
        } else if (filter === "no_bottles") {
            query.$or = [
                { remainingBottles: { $exists: false } },
                { remainingBottles: 0 },
            ];
        }

        // Search by name or mobile
        if (search) {
            const searchRegex = new RegExp(search, "i");
            if (query.$or) {
                // Already have $or from filter, use $and
                query.$and = [
                    { $or: query.$or },
                    { $or: [{ name: searchRegex }, { mobile: searchRegex }] },
                ];
                delete query.$or;
            } else {
                query.$or = [{ name: searchRegex }, { mobile: searchRegex }];
            }
        }

        const total = await User.countDocuments(query);

        // Build sort object with allowed fields
        const allowedSortFields = ["name", "mobile", "remainingBottles"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "remainingBottles";
        const sortDir = sortOrder === "asc" ? 1 : -1;

        const customers = await User.find(query)
            .select("name mobile address remainingBottles")
            .sort({ [sortField]: sortDir })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.status(200).json({
            success: true,
            result: customers.map((c) => ({
                _id: c._id,
                name: c.name,
                mobile: c.mobile,
                area: c.address?.fullAddress || "-",
                remainingBottles: c.remainingBottles || 0,
            })),
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Rider: Get bottles to collect for assigned deliveries
exports.getRiderBottleStats = async (req, res) => {
    try {
        // Get all customers from assigned orders
        const assignedOrders = await Order.find({
            assignedRider: req.user._id,
            status: { $in: ["pending", "confirmed", "out_for_delivery"] },
        }).populate("customer", "remainingBottles");

        let totalToCollect = 0;
        assignedOrders.forEach((order) => {
            if (order.customer?.remainingBottles) {
                totalToCollect += order.customer.remainingBottles;
            }
        });

        res.status(200).json({
            success: true,
            result: {
                bottlesToCollect: totalToCollect,
                ordersCount: assignedOrders.length,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
