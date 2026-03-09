const Notification = require("../models/Notification");

// Helper function to create notification (internal use)
exports.createNotification = async ({ recipient, title, message, type, link }) => {
    try {
        await Notification.create({ recipient, title, message, type, link });

        // Trigger Push Notification if user has fcmToken
        const User = require("../models/User");
        const user = await User.findById(recipient);
        if (user && user.fcmToken) {
            const { sendPushNotification } = require("../utils/notification");
            await sendPushNotification(user.fcmToken, title, message, { link });
        }
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};


exports.getNotifications = async (req, res) => {
    try {
        const { type, search, read, sort = "newest" } = req.query;
        let query = { recipient: req.user._id };

        if (type) query.type = type;
        if (read !== undefined) query.read = read === "true";
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { message: { $regex: search, $options: "i" } }
            ];
        }

        // Safety Filter: Customers should NEVER see admin links
        if (req.user.role === "CUSTOMER") {
            query.link = { $not: /^\/administrator/ };
        }

        let sortOption = { createdAt: -1 };
        if (sort === "oldest") sortOption = { createdAt: 1 };
        if (sort === "unread") sortOption = { read: 1, createdAt: -1 }; // Unread first

        const notifications = await Notification.find(query)
            .sort(sortOption)
            .limit(100); // Increased limit

        const unreadCount = await Notification.countDocuments({ recipient: req.user._id, read: false });

        res.status(200).json({
            success: true,
            result: notifications,
            unreadCount
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        // Mark all as read or specific one
        const { id } = req.body;
        const query = { recipient: req.user._id };
        if (id) query._id = id;

        await Notification.updateMany(query, { read: true });

        res.status(200).json({ success: true, message: "Marked as read" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.broadcastNotification = async (req, res) => {
    try {
        const { target, role, recipientId, title, message, link } = req.body;
        const User = require("../models/User");

        let users = [];
        if (target === 'all') {
            users = await User.find({ isActive: true });
        } else if (target === 'role') {
            users = await User.find({ role, isActive: true });
        } else if (target === 'user') {
            users = await User.find({ _id: recipientId });
        }

        const notifications = users.map(user => ({
            recipient: user._id,
            title,
            message,
            type: 'info',
            link,
            read: false
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        res.status(200).json({ success: true, message: `Sent to ${notifications.length} users` });
    } catch (error) {
        console.error("Error broadcasting notification:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
