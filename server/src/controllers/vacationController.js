const User = require("../models/User");
const { logAction } = require("./activityLogController");

// Get vacation status
const getVacationStatus = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const user = await User.findById(userId).select("vacation");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Check if vacation is currently active
        const now = new Date();
        const vacation = user.vacation || {};
        const isCurrentlyOnVacation = vacation.isActive &&
            vacation.startDate &&
            vacation.endDate &&
            new Date(vacation.startDate) <= now &&
            new Date(vacation.endDate) >= now;

        res.json({
            success: true,
            result: {
                ...vacation.toObject?.() || vacation,
                isCurrentlyOnVacation,
            },
        });
    } catch (error) {
        console.error("Error getting vacation status:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Set vacation mode
const setVacation = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { startDate, endDate, reason } = req.body;

        if (!startDate) {
            return res.status(400).json({ success: false, message: "Start date is required" });
        }

        const start = new Date(startDate);
        let end = endDate ? new Date(endDate) : null;
        let days = null;

        // If end date is provided, validate it
        if (end) {
            if (end <= start) {
                return res.status(400).json({ success: false, message: "End date must be after start date" });
            }
            days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        }

        const user = await User.findByIdAndUpdate(
            userId,
            {
                vacation: {
                    isActive: true,
                    startDate: start,
                    endDate: end,
                    reason: reason || "",
                    createdAt: new Date(),
                    createdBy: "customer",
                },
            },
            { new: true }
        );

        // Generate custom message based on vacation duration
        let customMessage;
        if (!end) {
            customMessage = "🏖️ Taking an indefinite break? We understand! We'll be here when you're ready to return. See you soon! 💚";
        } else if (days <= 3) {
            customMessage = "🌴 Quick getaway! Enjoy your short break. We'll be ready when you're back!";
        } else if (days <= 7) {
            customMessage = "✈️ A week of relaxation! Have an amazing time. Your fresh milk will be waiting!";
        } else if (days <= 14) {
            customMessage = "🌊 Two weeks of adventure! That sounds wonderful. We'll miss your morning orders!";
        } else if (days <= 30) {
            customMessage = "🏝️ A month-long escape! Wow, that's quite a journey. Enjoy every moment. We'll be here!";
        } else {
            customMessage = "😢 Aww, that's quite long! We'll really miss you. Have an incredible time, and we can't wait to see you again! 💕";
        }

        // Log Activity
        await logAction(
            userId,
            "CUSTOMER", // Or context based
            "CREATE_VACATION",
            `Vacation scheduled from ${start.toLocaleDateString()} to ${end ? end.toLocaleDateString() : 'Indefinite'}`,
            {
                startDate: start,
                endDate: end,
                reason,
                days
            },
            req
        );

        res.json({
            success: true,
            message: customMessage,
            result: user.vacation,
            days: days,
        });
    } catch (error) {
        console.error("Error setting vacation:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


// Cancel vacation mode
const cancelVacation = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        const user = await User.findByIdAndUpdate(
            userId,
            {
                "vacation.isActive": false,
            },
            { new: true }
        );

        // Log Activity
        await logAction(
            userId,
            "CUSTOMER",
            "CANCEL_VACATION",
            "Vacation mode cancelled",
            {},
            req
        );

        res.json({
            success: true,
            message: "Vacation mode cancelled",
            result: user.vacation,
        });
    } catch (error) {
        console.error("Error cancelling vacation:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Admin: Set vacation for a customer
const adminSetVacation = async (req, res) => {
    try {
        const { customerId, startDate, endDate, reason } = req.body;

        if (!customerId) {
            return res.status(400).json({ success: false, message: "Customer ID is required" });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, message: "Start and end dates are required" });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
            return res.status(400).json({ success: false, message: "End date must be after start date" });
        }

        const user = await User.findByIdAndUpdate(
            customerId,
            {
                vacation: {
                    isActive: true,
                    startDate: start,
                    endDate: end,
                    reason: reason || "",
                    createdAt: new Date(),
                    createdBy: "admin",
                },
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        // Log Activity
        await logAction(
            customerId,
            "ADMIN",
            "ADMIN_SET_VACATION",
            `Admin set vacation from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
            {
                startDate: start,
                endDate: end,
                reason,
                adminId: req.user._id
            },
            req
        );

        res.json({
            success: true,
            message: `Vacation set for customer from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
            result: user.vacation,
        });
    } catch (error) {
        console.error("Error setting vacation (admin):", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Admin: Cancel vacation for a customer
const adminCancelVacation = async (req, res) => {
    try {
        const { customerId } = req.body;

        if (!customerId) {
            return res.status(400).json({ success: false, message: "Customer ID is required" });
        }

        const user = await User.findByIdAndUpdate(
            customerId,
            {
                "vacation.isActive": false,
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        res.json({
            success: true,
            message: "Vacation cancelled for customer",
            result: user.vacation,
        });
    } catch (error) {
        console.error("Error cancelling vacation (admin):", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Get customers on vacation (for admin/rider)
const getCustomersOnVacation = async (req, res) => {
    try {
        const now = new Date();
        const { date } = req.query;
        const checkDate = date ? new Date(date) : now;

        const customers = await User.find({
            role: "customer",
            "vacation.isActive": true,
            "vacation.startDate": { $lte: checkDate },
            "vacation.endDate": { $gte: checkDate },
        }).select("name mobile address vacation hub");

        res.json({
            success: true,
            result: customers,
            count: customers.length,
        });
    } catch (error) {
        console.error("Error getting customers on vacation:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Check if a customer is on vacation for a specific date
const isCustomerOnVacation = async (customerId, date = new Date()) => {
    const user = await User.findById(customerId).select("vacation");
    if (!user || !user.vacation?.isActive) return false;

    const checkDate = new Date(date);
    const start = new Date(user.vacation.startDate);
    const end = new Date(user.vacation.endDate);

    return checkDate >= start && checkDate <= end;
};

module.exports = {
    getVacationStatus,
    setVacation,
    cancelVacation,
    adminSetVacation,
    adminCancelVacation,
    getCustomersOnVacation,
    isCustomerOnVacation,
};
