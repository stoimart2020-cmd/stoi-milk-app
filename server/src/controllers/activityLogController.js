const ActivityLog = require("../models/ActivityLog");
const User = require("../models/User");

// Helper to log an action (can be used by other controllers)
exports.logAction = async (userId, role, action, description, metadata = {}, req = null) => {
    try {
        console.log(`[DEBUG] logAction called for User: ${userId}, Action: ${action}`);
        const log = await ActivityLog.create({
            user: userId,
            role,
            action,
            description,
            metadata,
            ipAddress: req?.ip || "",
            userAgent: req?.headers["user-agent"] || "",
        });
        console.log(`[DEBUG] ActivityLog created: ${log._id}`);
    } catch (error) {
        console.error("Failed to create activity log:", error);
    }
};

exports.getLogs = async (req, res) => {
    try {
        const { userId, roleType, startDate, endDate, limit = 50, page = 1, sortBy, sortOrder } = req.query;
        console.log(`[DEBUG] getLogs called with params:`, req.query);

        const query = {};

        // Filter by Specific User ID
        if (userId) {
            query.user = userId;
        }

        // Filter by Role Type (Customer vs Employee)
        if (roleType === "customer") {
            query.role = "CUSTOMER";
        } else if (roleType === "employee") {
            query.role = { $ne: "CUSTOMER" }; // All roles except CUSTOMER
        }

        // Date Range Filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        // Sorting Logic
        let sort = { createdAt: -1 }; // Default sort
        if (sortBy) {
            const order = sortOrder === "asc" ? 1 : -1;
            // Handle nested metadata fields if the sortBy key starts with "metadata."
            // Or if the frontend sends just the key, we might need to map it.
            // Assuming frontend sends full path like "metadata.customerName" or "createdAt"
            sort = { [sortBy]: order };
        }

        const logs = await ActivityLog.find(query)
            .populate("user", "name email mobile role")
            .sort(sort)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        console.log(`[DEBUG] getLogs found ${logs.length} logs for query:`, JSON.stringify(query));

        const total = await ActivityLog.countDocuments(query);

        res.status(200).json({
            success: true,
            result: logs,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Seeding function for demo
exports.seedLogs = async (req, res) => {
    try {
        // Ensure users exist
        let customer = await User.findOne({ role: "CUSTOMER" });
        let admin = await User.findOne({ role: "ADMIN" });

        if (!customer) {
            customer = await User.create({
                name: "Demo Customer",
                email: "demo@customer.com",
                mobile: "9999999999",
                role: "CUSTOMER",
                password: "password"
            });
        }

        if (!admin) {
            admin = await User.findOne({ role: { $ne: "CUSTOMER" } });
            if (!admin) {
                admin = await User.create({
                    name: "Demo Admin",
                    email: "admin@stoi.com",
                    mobile: "8888888888",
                    role: "ADMIN",
                    password: "password"
                });
            }
        }

        const logs = [];
        const hubs = ["Nagercoil", "Tirunelveli", "Kanyakumari"];
        const reasons = ["Low Wallet Balance", "Travelling", "Not Answering", "Quality Issue", "Price Issue"];
        const statuses = ["Active", "Suspended low balance", "Likely to churn", "Inactive"];

        // 1. Generate Change Status Logs (Customer Subscription Changes)
        // Columns: Created, Subscription Id, Customer Id, Name, Mobile, Start Date, New Status, Current Status, Previous Status, Suspend From, Hub name, Address, Resume From, Is Retained ...
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 30));

            const prevStatus = statuses[Math.floor(Math.random() * statuses.length)];
            const newStatus = statuses[Math.floor(Math.random() * statuses.length)];

            logs.push({
                user: customer._id,
                role: "CUSTOMER",
                action: "CHANGE_STATUS",
                entityType: "subscription",
                entityId: "SUB-" + (1000 + i),
                description: `Status changed from ${prevStatus} to ${newStatus}`,
                metadata: {
                    subscriptionId: 100 + i,
                    customerId: 400 + i,
                    customerName: customer.name,
                    mobile: customer.mobile,
                    startDate: new Date(date.getTime() - 1000000000).toISOString(),
                    newStatus: newStatus,
                    currentStatus: newStatus,
                    previousStatus: prevStatus,
                    suspendFrom: newStatus.includes("Suspended") ? date.toISOString() : null,
                    hubName: hubs[Math.floor(Math.random() * hubs.length)],
                    address: "123, Main St, Nagercoil",
                    resumeFrom: null,
                    isRetained: Math.random() > 0.8 ? "Yes" : "No",
                    isChurned: newStatus === "Inactive" ? "Yes" : "No",
                    retentionDate: null,
                    reason: reasons[Math.floor(Math.random() * reasons.length)],
                    note: "Auto-generated log",
                    adminUser: admin.name,
                    lastDeliveryDate: new Date(date.getTime() - 86400000).toISOString()
                },
                oldData: { status: prevStatus },
                newData: { status: newStatus },
                createdAt: date
            });
        }

        // 2. Generate Activity Logs (General / Employee Actions)
        // Columns: Id, Created, Actor Type, Changed by, Log, Entity Type, Entity Id, Actor Id, Customer Id, Old Data
        const actorTypes = ["admin", "delivery_boy", "system"];

        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 30));
            const actorType = actorTypes[Math.floor(Math.random() * actorTypes.length)];

            logs.push({
                user: admin._id,
                role: "ADMIN", // Or EMPLOYEE
                action: "GENERAL_LOG",
                entityType: ["payment_created", "mark_delivery_delivered", "order_update"][Math.floor(Math.random() * 3)],
                entityId: Math.floor(Math.random() * 10000).toString(),
                description: actorType === "delivery_boy"
                    ? `Rajesh delivered 1 pack of Fresh Cow milk - 500ML to Customer #${300 + i}`
                    : `Payment of Rs ${Math.floor(Math.random() * 1000)} done by ${customer.name} using Razorpay`,
                metadata: {
                    actorType: actorType,
                    changedBy: actorType === "delivery_boy" ? "Rajesh" : admin.name,
                    actorId: 9,
                    customerId: 300 + i,
                    logDetails: `Full detailed log message for transaction ${Math.random().toString(36).substring(7)}`
                },
                oldData: null,
                newData: { status: "delivered", amount: 500 },
                createdAt: date
            });
        }

        await ActivityLog.deleteMany({}); // Clear old logs for clean seed
        await ActivityLog.insertMany(logs);
        res.status(200).json({ success: true, message: `Seeded ${logs.length} logs.` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
