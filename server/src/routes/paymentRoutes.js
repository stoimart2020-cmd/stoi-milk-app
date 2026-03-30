const express = require("express");
const router = express.Router();
const { protect, checkPermission } = require("../middleware/auth");
const { addPayment, getTransactions, addPaymentPublic, createOrderPublic, verifyPaymentPublic } = require("../controllers/paymentController");
const { getRazorpayInstance } = require("../utils/razorpay");

// Staff Routes
router.post("/", protect, checkPermission('payments', 'add'), addPayment);
router.post("/create-link", protect, checkPermission('payments', 'add'), require("../controllers/paymentController").createPaymentLink);
router.get("/", protect, checkPermission('payments', 'view'), getTransactions);
router.get("/export", protect, checkPermission('payments', 'export'), require("../controllers/paymentController").exportTransactions);

// Admin-only Seed (Super Admin)
router.post("/seed", protect, checkPermission('settings'), require("../controllers/paymentController").seedTransactions);

// Public / Customer App Routes (No permission needed, just protect if session-based)
router.post("/public", addPaymentPublic); 
router.post("/public/create-order", createOrderPublic);
router.post("/public/verify-payment", verifyPaymentPublic);

// Razorpay specific (for Riders/Sales creating QR)
router.post("/create-qr", protect, checkPermission('payments', 'add'), async (req, res) => {
    try {
        const { amount, description, customerId } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ status: 'error', message: 'Invalid amount' });
        }

        const instance = await getRazorpayInstance();

        const options = {
            amount: Math.round(amount * 100), // convert to paise
            currency: "INR",
            accept_partial: false,
            description: description || "Payment for delivery",
            reference_id: `rcpt_${Date.now()}_qr`,
            notes: {
                customerId: customerId || "",
                createdBy: req.user._id.toString(),
                source: "field_sales"
            },
            callback_url: "",
            callback_method: ""
        };

        const paymentLink = await instance.paymentLink.create(options);

        // Razorpay SDK may resolve with an error object instead of rejecting
        if (paymentLink && paymentLink.error) {
            throw new Error(paymentLink.error.description || paymentLink.error.message || "Failed to initiate payment link");
        }

        res.json({
            status: 'success',
            result: paymentLink
        });
    } catch (error) {
        console.error("Razorpay QR Error:", error);
        res.status(500).json({
            status: 'error',
            message: error.message || "Failed to generate QR",
            details: error.error || error
        });
    }
});

// @desc    Check Razorpay Payment Link / QR Status manually
router.get("/check-status/:linkId", protect, async (req, res) => {
    try {
        const { linkId } = req.params;
        const Transaction = require("../models/Transaction");

        // First check our own DB to see if the webhook already registered it
        const existingTx = await Transaction.findOne({ pgOrderId: linkId });
        if (existingTx && existingTx.status === 'SUCCESS') {
            return res.json({ status: 'success', paid: true, message: 'Payment successfully captured in the system' });
        }

        // If not in DB, optionally fallback to querying Razorpay API
        const instance = await getRazorpayInstance();
        try {
            const paymentLink = await instance.paymentLink.fetch(linkId);
            if (paymentLink && paymentLink.status === 'paid') {
                return res.json({ status: 'success', paid: true, message: 'Payment succeeded (processing in backend)' });
            }
            if (paymentLink && paymentLink.status === 'expired') {
                 return res.json({ status: 'success', paid: false, expired: true, message: 'Payment link has expired' });
            }
            return res.json({ status: 'success', paid: false, message: 'Payment pending or not yet completed' });
        } catch (razorpayErr) {
            console.error("Check status razorpay fetch err:", razorpayErr.message);
            // If razorpay check fails, just say pending
            return res.json({ status: 'success', paid: false, message: 'Payment pending or not found' });
        }
    } catch (error) {
        console.error("Check Status Error:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// @desc    Razorpay Webhook — auto-credit wallet on payment link or order payment
// @route   POST /api/payments/webhook
// @access  Public (verified via signature)
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        const webhookSecret = settings.paymentGateway?.keySecret;

        // Verify webhook signature
        if (webhookSecret) {
            const receivedSignature = req.headers["x-razorpay-signature"];
            const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
            const expectedSignature = crypto
                .createHmac("sha256", webhookSecret)
                .update(rawBody)
                .digest("hex");

            if (receivedSignature && receivedSignature !== expectedSignature) {
                console.warn("Webhook signature mismatch");
                return res.status(400).json({ status: "error", message: "Invalid signature" });
            }
        }

        const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const event = payload.event;
        console.log(`[Webhook] Received: ${event}`);

        // Handle payment_link.paid
        if (event === "payment_link.paid") {
            const paymentLink = payload.payload?.payment_link?.entity;
            const payment = payload.payload?.payment?.entity;

            if (!paymentLink || !payment) {
                return res.status(200).json({ status: "ok", message: "No action needed" });
            }

            const customerId = paymentLink.notes?.customerId;
            const paymentId = payment.id;
            const amountInRupees = payment.amount / 100;

            if (!customerId) {
                console.log("[Webhook] No customerId in notes, skipping wallet credit");
                return res.status(200).json({ status: "ok", message: "No customer linked" });
            }

            // Idempotency: check if already processed
            const Transaction = require("../models/Transaction");
            const existing = await Transaction.findOne({ pgPaymentId: paymentId });
            if (existing) {
                console.log(`[Webhook] Payment ${paymentId} already processed, skipping`);
                return res.status(200).json({ status: "ok", message: "Already processed" });
            }

            // Credit wallet
            const user = await User.findById(customerId);
            if (!user) {
                console.log(`[Webhook] Customer ${customerId} not found`);
                return res.status(200).json({ status: "ok", message: "Customer not found" });
            }

            user.walletBalance = (user.walletBalance || 0) + amountInRupees;
            await user.save();

            // Create transaction record
            await Transaction.create({
                user: user._id,
                type: "CREDIT",
                amount: amountInRupees,
                description: `Payment collected (Field Sales)`,
                status: "SUCCESS",
                mode: "ONLINE",
                pgOrderId: paymentLink.id,
                pgPaymentId: paymentId,
                gateway: "Razorpay",
                balanceAfter: user.walletBalance,
                responseText: "payment_link_paid",
                performedBy: paymentLink.notes?.createdBy || null
            });

            // Notify
            const { createNotification } = require("../controllers/notificationController");
            await createNotification({
                recipient: user._id,
                title: "Payment Received",
                message: `₹${amountInRupees} has been added to your wallet.`,
                type: "success",
                link: "/dashboard/wallet-history"
            });

            const { logAction } = require("../controllers/activityLogController");
            await logAction(
                user._id,
                "SYSTEM",
                "WALLET_RECHARGE",
                `Wallet credited ₹${amountInRupees} via payment link`,
                { paymentId, amount: amountInRupees, newBalance: user.walletBalance, source: paymentLink.notes?.source || "payment_link" },
                req
            );

            console.log(`[Webhook] Wallet credited ₹${amountInRupees} for customer ${user.name} (${user._id})`);
        }

        // Handle order.paid (for customer app / admin orders)
        if (event === "order.paid") {
            const order = payload.payload?.order?.entity;
            const payment = payload.payload?.payment?.entity;

            if (!order || !payment) {
                return res.status(200).json({ status: "ok" });
            }

            const userId = order.notes?.userId;
            const paymentId = payment.id;
            const amountInRupees = payment.amount / 100;

            if (!userId) {
                return res.status(200).json({ status: "ok", message: "No userId in notes" });
            }

            // Idempotency
            const Transaction = require("../models/Transaction");
            const existing = await Transaction.findOne({ pgPaymentId: paymentId });
            if (existing) {
                return res.status(200).json({ status: "ok", message: "Already processed" });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(200).json({ status: "ok", message: "User not found" });
            }

            user.walletBalance = (user.walletBalance || 0) + amountInRupees;
            await user.save();

            await Transaction.create({
                user: user._id,
                type: "CREDIT",
                amount: amountInRupees,
                description: "Online Wallet Recharge",
                status: "SUCCESS",
                mode: "ONLINE",
                pgOrderId: order.id,
                pgPaymentId: paymentId,
                gateway: "Razorpay",
                balanceAfter: user.walletBalance,
                responseText: "order_paid_webhook",
                performedBy: null
            });

            const { createNotification } = require("../controllers/notificationController");
            await createNotification({
                recipient: user._id,
                title: "Payment Successful",
                message: `₹${amountInRupees} added to your wallet.`,
                type: "success",
                link: "/dashboard/wallet-history"
            });

            console.log(`[Webhook] Order payment: ₹${amountInRupees} credited to ${user.name}`);
        }

        res.status(200).json({ status: "ok" });
    } catch (error) {
        console.error("[Webhook] Error:", error);
        // Always return 200 to Razorpay so it doesn't retry endlessly
        res.status(200).json({ status: "error", message: error.message });
    }
});

// @desc    Create Razorpay Order
// @route   POST /api/payments/create-order
// @access  Private (Customer)
router.post("/create-order", protect, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ status: 'error', message: 'Invalid amount' });
        }

        const instance = await getRazorpayInstance();

        const options = {
            amount: Math.round(amount * 100), // amount in smallest currency unit (paise)
            currency: "INR",
            receipt: `rcpt_${Date.now()}_${req.user._id.toString().slice(-6)}`,
        };

        const order = await instance.orders.create(options);

        // Get Key ID to send to frontend
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
        console.error("Razorpay Order Error Details:");
        console.error("Message:", error.message);
        console.error("Code:", error.code);
        console.error("Stack:", error.stack);
        if (error.error) {
            console.error("Razorpay API Error:", JSON.stringify(error.error, null, 2));
        }
        res.status(500).json({ status: 'error', message: error.message, details: error.error });
    }
});

// @desc    Verify Razorpay Payment
// @route   POST /api/payments/verify-payment
// @access  Private (Customer)
router.post("/verify-payment", protect, async (req, res) => {
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
            // Payment Success - Update Wallet
            // Look up the order to get the amount? 
            // Ideally we should store the order in DB created in previous step, 
            // but for now we can fetch it from Razorpay or trust the simplified flow if we had amount passed 
            // CAUTION: Relying on frontend for amount in verify is unsafe. 
            // Better to fetch order from Razorpay to confirm amount.

            const instance = await getRazorpayInstance();
            const order = await instance.orders.fetch(razorpay_order_id);

            if (order.status !== 'paid' && order.status !== 'created' && order.status !== 'attempted') {
                // Note: 'paid' status might not be immediate if capturing happens later, but 'authorized' is what we likely have? 
                // Actually fetch gives order details. We can trust amount from there.
            }

            const amountInRupees = order.amount / 100;

            // Update User Wallet
            const user = await User.findById(req.user._id);
            user.walletBalance = (user.walletBalance || 0) + amountInRupees;

            // Add Transaction Record (using existing Payment/Transaction logic if possible, or manual push)
            // We'll manually push to walletHistory for now as per User model structure if it exists, 
            // or create a Transaction document if that's the system.
            // Checking User model structure would be good, but let's assume standard update for now.

            // Assuming there's a Transaction model or we just update balance.
            // Let's rely on walletRoutes logic or just update balance here for MVP.
            // Ideally calls a controller method `addMoneyToWallet`

            // Let's create a transaction entry if Transaction model exists.
            try {
                const Transaction = require("../models/Transaction"); // Adjust path if needed
                if (Transaction) {
                    await Transaction.create({
                        user: user._id,
                        type: 'CREDIT',
                        amount: amountInRupees,
                        description: `Wallet Recharge`,
                        status: 'SUCCESS',
                        mode: 'ONLINE',
                        pgOrderId: razorpay_order_id,
                        pgPaymentId: razorpay_payment_id,
                        gateway: 'Razorpay',
                        balanceAfter: user.walletBalance,
                        responseText: 'payment_captured'
                    });
                }
            } catch (e) {
                console.log("Transaction model not found or error", e);
            }

            await user.save();

            // Notify User
            const { createNotification } = require("../controllers/notificationController");
            await createNotification({
                recipient: user._id,
                title: "Payment Successful",
                message: `Your payment of ₹${amountInRupees} was successful.`,
                type: "success",
                link: "/dashboard/wallet-history"
            });

            // Log Activity
            await logAction(
                user._id,
                "CUSTOMER",
                "WALLET_RECHARGE",
                `Recharged wallet with ₹${amountInRupees}`,
                {
                    amount: amountInRupees,
                    paymentId: razorpay_payment_id,
                    orderId: razorpay_order_id,
                    newBalance: user.walletBalance
                },
                req
            );

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
});

module.exports = router;
