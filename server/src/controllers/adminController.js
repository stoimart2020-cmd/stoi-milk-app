const User = require("../models/User");
const Employee = require("../models/Employee");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Subscription = require("../models/Subscription");
const Transaction = require("../models/Transaction");
const BottleTransaction = require("../models/BottleTransaction");
const Complaint = require("../models/Complaint");
const Lead = require("../models/Lead");
const Notification = require("../models/Notification");
const ActivityLog = require("../models/ActivityLog");

exports.clearData = async (req, res) => {
    const { type } = req.body; // type: 'all', 'customers', 'riders', 'orders', 'products'

    try {
        // Safety check: Ensure requester is SUPERADMIN
        // (Middleware should handle this, but double check if needed, or rely on protect+admin middleware)

        switch (type) {
            case 'all':
                // Clear all data except SUPERADMIN users
                await Promise.all([
                    User.deleteMany({ role: { $ne: 'SUPERADMIN' } }),
                    Employee.deleteMany({ role: { $ne: 'SUPERADMIN' } }),
                    Order.deleteMany({}),
                    Product.deleteMany({}),
                    Subscription.deleteMany({}),
                    Transaction.deleteMany({}),
                    BottleTransaction.deleteMany({}),
                    Complaint.deleteMany({}),
                    Lead.deleteMany({}),
                    Notification.deleteMany({}),
                    ActivityLog.deleteMany({})
                ]);
                break;

            case 'customers':
                // Delete customers and their related data (optional: cascade delete)
                // For now, just delete users with role CUSTOMER
                await User.deleteMany({ role: 'CUSTOMER' });
                // Optionally clear subscriptions/orders? User asked for "fresh application".
                // Let's clear related data to be safe and clean.
                await Promise.all([
                    Subscription.deleteMany({}), // Mostly customer related
                    Order.deleteMany({}),        // Mostly customer related
                    Complaint.deleteMany({}),
                    Transaction.deleteMany({}),
                    BottleTransaction.deleteMany({})
                ]);
                break;

            case 'riders':
                await Employee.deleteMany({ role: 'RIDER' });
                break;

            case 'orders':
                await Order.deleteMany({});
                await Transaction.deleteMany({}); // Payments usually linked to orders
                await BottleTransaction.deleteMany({});
                break;

            case 'products':
                await Product.deleteMany({});
                break;

            default:
                return res.status(400).json({ success: false, message: "Invalid clear type" });
        }

        res.status(200).json({ success: true, message: `Successfully cleared ${type} data` });

    } catch (error) {
        console.error("Clear Data Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
