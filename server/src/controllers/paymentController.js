const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { createNotification } = require("./notificationController");
const { logAction } = require("./activityLogController");
const { getRazorpayInstance } = require("../utils/razorpay");
const crypto = require("crypto");
const Setting = require("../models/Setting");
const { sendCustomerPaymentSuccess } = require("../utils/notification");

exports.addPayment = async (req, res) => {
    try {
        const {
            userId,
            amount,
            type,
            mode,
            description,
            adjustmentNote,
            deliveryBoy,
            invoice
        } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        // Update Wallet Balance
        // Safeguard: Ensure walletBalance is a number
        if (typeof user.walletBalance !== 'number' || isNaN(user.walletBalance)) {
            console.warn(`User ${userId} had invalid walletBalance: ${user.walletBalance}. Resetting to 0.`);
            user.walletBalance = 0;
        }

        const oldBalance = user.walletBalance;

        if (type === "CREDIT") {
            user.walletBalance += numAmount;

            // HANDLE RIDER CASH COLLECTION
            if (mode === "CASH" && deliveryBoy) {
                const Employee = require("../models/Employee"); // Lazy load to avoid circular dep if any
                const rider = await Employee.findById(deliveryBoy);
                if (rider) {
                    rider.walletBalance = (rider.walletBalance || 0) + numAmount;
                    await rider.save();
                    console.log(`Rider ${rider.name} wallet incremented by ${numAmount} (Cash Recharge)`);
                }
            }

        } else if (type === "DEBIT") {
            user.walletBalance -= numAmount;
        }

        console.log(`User ${userId} wallet update: ${oldBalance} -> ${user.walletBalance} (${type} ${numAmount})`);

        await user.save();

        // Create Transaction Record
        const transaction = await Transaction.create({
            user: userId,
            amount: numAmount,
            type,
            mode,
            description,
            adjustmentNote,
            deliveryBoy,
            invoice,
            performedBy: req.user.id,
            balanceAfter: user.walletBalance,
            status: "SUCCESS"
        });

        // Notify User if Credit
        if (type === "CREDIT") {
            await createNotification({
                recipient: userId,
                title: "Wallet Credited",
                message: `Your wallet has been credited with ₹${numAmount}. ${description || ''}`,
                type: "success",
                link: "/dashboard/wallet-history"
            });

            // --- AUTOMATIC PAYMENT NOTIFICATION ---
            try {
                await sendCustomerPaymentSuccess(user, numAmount, transaction._id);
            } catch (notifErr) {
                console.error("Failed to send payment notification", notifErr);
            }
        }

        // Log Activity
        await logAction(
            userId,
            "ADMIN", // Usually added by admin manually or system
            "ADD_PAYMENT",
            `Payment of ${numAmount} added (${type})`,
            {
                transactionId: transaction._id,
                amount: numAmount,
                type,
                mode,
                newBalance: user.walletBalance
            },
            req
        );

        res.status(201).json({
            success: true,
            message: "Payment added successfully",
            result: transaction,
            newBalance: user.walletBalance
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.addPaymentPublic = async (req, res) => {
    try {
        const {
            userId,
            amount,
            type,
            mode,
            description,
            adjustmentNote,
            deliveryBoy,
            invoice
        } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        // Update Wallet Balance
        if (typeof user.walletBalance !== 'number' || isNaN(user.walletBalance)) {
            user.walletBalance = 0;
        }

        const oldBalance = user.walletBalance;

        if (type === "CREDIT") {
            user.walletBalance += numAmount;
        } else if (type === "DEBIT") {
            return res.status(400).json({ success: false, message: "Public debit not allowed" });
        }

        await user.save();

        // Create Transaction Record
        const transaction = await Transaction.create({
            user: userId,
            amount: numAmount,
            type,
            mode,
            description,
            adjustmentNote,
            deliveryBoy,
            invoice,
            performedBy: null, // System / Self
            balanceAfter: user.walletBalance,
            status: "SUCCESS"
        });

        // Notify User if Credit
        if (type === "CREDIT") {
            await createNotification({
                recipient: userId,
                title: "Wallet Credited",
                message: `Your wallet has been credited with ₹${numAmount} via Online Recharge.`,
                type: "success",
                link: "/dashboard/wallet-history"
            });

            // --- AUTOMATIC PAYMENT NOTIFICATION ---
            try {
                await sendCustomerPaymentSuccess(user, numAmount, transaction._id);
            } catch (notifErr) {
                console.error("Failed to send payment notification", notifErr);
            }
        }

        // Log Activity
        await logAction(
            userId,
            "CUSTOMER",
            "ADD_PAYMENT",
            `Public Payment of ${numAmount} added (${type})`,
            {
                transactionId: transaction._id,
                amount: numAmount,
                type,
                mode,
                newBalance: user.walletBalance
            },
            req
        );

        res.status(201).json({
            success: true,
            message: "Payment added successfully",
            result: transaction,
            newBalance: user.walletBalance
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createOrderPublic = async (req, res) => {
    try {
        const { amount, userId } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ status: 'error', message: 'Invalid amount' });
        }
        if (!userId) {
            return res.status(400).json({ status: 'error', message: 'User ID is required' });
        }

        const instance = await getRazorpayInstance();

        const options = {
            amount: Math.round(amount * 100),
            currency: "INR",
            receipt: `rcpt_${Date.now()}_${userId.slice(-6)}`,
            notes: { userId: userId, purpose: "public_recharge" }
        };

        const order = await instance.orders.create(options);
        const settings = await Setting.getSettings();
        const keyId = settings.paymentGateway?.keyId;

        res.json({
            status: 'success',
            result: {
                order_id: order.id,
                currency: order.currency,
                amount: order.amount,
                key_id: keyId
            }
        });
    } catch (error) {
        console.error("Razorpay Order Error:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.verifyPaymentPublic = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const settings = await Setting.getSettings();
        const { keySecret } = settings.paymentGateway || {};

        if (!keySecret) {
            return res.status(500).json({ status: 'error', message: 'Payment configuration missing' });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", keySecret)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            const instance = await getRazorpayInstance();
            const order = await instance.orders.fetch(razorpay_order_id);
            const userId = order.notes?.userId;

            if (!userId) {
                return res.status(400).json({ status: 'error', message: 'User reference missing in order' });
            }

            const amountInRupees = order.amount / 100;
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({ status: 'error', message: 'User not found' });
            }

            user.walletBalance = (user.walletBalance || 0) + amountInRupees;
            await user.save();

            // Check if transaction already exists to avoid duplicates (idempotency)
            const existingTx = await Transaction.findOne({ pgOrderId: razorpay_order_id });
            if (!existingTx) {
                await Transaction.create({
                    user: user._id,
                    type: 'CREDIT',
                    amount: amountInRupees,
                    description: `Online Wallet Recharge`,
                    status: 'SUCCESS',
                    mode: 'ONLINE',
                    pgOrderId: razorpay_order_id,
                    pgPaymentId: razorpay_payment_id,
                    gateway: 'Razorpay',
                    balanceAfter: user.walletBalance,
                    responseText: 'payment_captured',
                    performedBy: null // System/Self
                });

                await createNotification({
                    recipient: user._id,
                    title: "Payment Successful",
                    message: `Your wallet has been credited with ₹${amountInRupees}.`,
                    type: "success",
                    link: "/dashboard/wallet-history"
                });

                // Send SMS Notification
                const { sendCustomerPaymentSuccess } = require("../utils/notification");
                try {
                    await sendCustomerPaymentSuccess(user, amountInRupees, razorpay_payment_id);
                } catch (smsErr) {
                    console.error("Payment SMS failed", smsErr);
                }

                await logAction(
                    user._id,
                    "CUSTOMER",
                    "WALLET_RECHARGE",
                    `Recharged wallet with ₹${amountInRupees} (Public)`,
                    {
                        transactionId: razorpay_payment_id,
                        amount: amountInRupees,
                        newBalance: user.walletBalance
                    },
                    req
                );
            }

            res.json({
                status: 'success',
                message: 'Payment verified and wallet updated',
                newBalance: user.walletBalance
            });
        } else {
            res.status(400).json({ status: 'error', message: 'Invalid signature' });
        }
    } catch (error) {
        console.error("Razorpay Verify Error:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const buildTransactionQuery = async (params) => {
    const {
        userId,
        pgOrderId,
        pgPaymentId,
        gateway,
        status,
        date,
        customerName
    } = params;

    const query = {};
    if (userId) query.user = userId;

    if (pgOrderId) query.pgOrderId = { $regex: pgOrderId, $options: "i" };
    if (pgPaymentId) query.pgPaymentId = { $regex: pgPaymentId, $options: "i" };
    if (gateway) query.gateway = { $regex: gateway, $options: "i" };
    if (status) query.status = status;

    if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    if (customerName) {
        const users = await User.find({ name: { $regex: customerName, $options: "i" } }).select("_id");
        const userIds = users.map(u => u._id);
        if (query.user) {
            query.user = { $in: userIds.filter(id => id.toString() === query.user) };
        } else {
            query.user = { $in: userIds };
        }
    }
    return query;
};

exports.getTransactions = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        // If user is a customer, force them to see only their own transactions
        if (req.user.role === "CUSTOMER") {
            req.query.userId = req.user._id;
        }

        const query = await buildTransactionQuery(req.query);

        const transactions = await Transaction.find(query)
            .populate({
                path: "user",
                select: "name mobile hub customerId",
                populate: { path: "hub", select: "name" }
            })
            .populate("performedBy", "name")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Transaction.countDocuments(query);

        res.status(200).json({
            success: true,
            result: transactions,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.exportTransactions = async (req, res) => {
    try {
        const XLSX = require("xlsx");
        const query = await buildTransactionQuery(req.query);
        const transactions = await Transaction.find(query)
            .populate({
                path: "user",
                select: "name mobile hub customerId",
                populate: { path: "hub", select: "name" }
            })
            .sort({ createdAt: -1 });

        // Prepare data for Excel
        const data = transactions.map(tx => ({
            "Id": tx._id.toString(),
            "Order Id": tx.order || "",
            "PG Order Id": tx.pgOrderId || "",
            "Hub Name": tx.user?.hub?.name || "",
            "Customer Id": tx.user?.customerId || "",
            "Customer Name": tx.user?.name || "",
            "Payment Gateway": tx.gateway || "",
            "Amount": tx.amount,
            "Refund Amount": tx.refundAmount || 0,
            "Type": tx.type,
            "Status": tx.status,
            "Response Text": tx.responseText || "",
            "Transaction Ref Id": tx.pgPaymentId || "",
            "Created At": new Date(tx.createdAt).toLocaleString()
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        res.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.attachment("transactions.xlsx");
        res.send(buffer);

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.seedTransactions = async (req, res) => {
    try {
        let user = await User.findOne({ role: "CUSTOMER" });
        if (!user) {
            // Create a dummy customer
            user = await User.create({
                name: "Dummy Customer",
                mobile: "9999999999",
                role: "CUSTOMER",
                walletBalance: 1000
            });
        }

        const transactions = [];
        const gateways = ["RazorpayGateway", "Stripe", "Paytm"];

        for (let i = 0; i < 10; i++) {
            const amount = Math.floor(Math.random() * 5000) + 100;
            const status = Math.random() > 0.2 ? "SUCCESS" : "FAILED";

            transactions.push({
                user: user._id,
                amount: amount,
                type: "CREDIT",
                mode: "ONLINE",
                status: status,
                description: `Topup via Gateway`,
                pgOrderId: `order_${Math.random().toString(36).substring(2, 15)}`,
                pgPaymentId: `pay_${Math.random().toString(36).substring(2, 15)}`,
                gateway: gateways[Math.floor(Math.random() * gateways.length)],
                refundAmount: status === "SUCCESS" && Math.random() > 0.9 ? 100 : 0,
                responseText: "payment_captured",
                balanceAfter: user.walletBalance,
                createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000000000))
            });
        }

        await Transaction.insertMany(transactions);
        res.json({ success: true, message: "10 dummy transactions added" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createPaymentLink = async (req, res) => {
    try {
        const { userId, amount, description } = req.body;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        // STUB: In a real scenario, call Razorpay Payment Link API here
        // const instance = await getRazorpayInstance();
        // const link = await instance.paymentLink.create({ ... });

        const mockLinkId = `plink_${Math.random().toString(36).substring(7)}`;
        const mockShortUrl = `https://rzp.io/i/${mockLinkId}`;

        // Log Activity
        await logAction(userId, "ADMIN", "CREATE_PAYMENT_LINK", `Created payment link for ₹${numAmount}`, { amount: numAmount, linkId: mockLinkId }, req);

        res.status(200).json({
            success: true,
            message: "Payment link created successfully (Simulated)",
            result: {
                id: mockLinkId,
                short_url: mockShortUrl,
                amount: numAmount,
                status: "created"
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
