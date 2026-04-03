const Subscription = require("../models/Subscription");
const Product = require("../models/Product");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { logAction } = require("./activityLogController");
const { resolveHubs } = require("../utils/logisticsHelper");

// Create a new subscription
exports.createSubscription = async (req, res) => {
    try {
        const { product: productId, quantity, frequency, alternateQuantity, customDays, customSchedule, startDate, isTrial, userId: targetUserId } = req.body;

        console.log('[DEBUG] createSubscription Body:', JSON.stringify(req.body));
        console.log('[DEBUG] Admin User:', req.user._id);
        console.log('[DEBUG] Target User:', targetUserId);

        // Use targetUserId if provided (Admin/Field Sales case), otherwise logged in user
        const userId = targetUserId || req.user._id;
        console.log('[DEBUG] Final User ID for check:', userId);

        // Detect if this is a Field Sales request (pending approval flow)
        const isFieldSalesRequest = req.user.role === "FIELD_MARKETING";

        // 1. Get User
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // 1b. Service Area Check — skip for Field Sales (admin will verify)
        if (!isFieldSalesRequest && !user.serviceArea) {
            // Attempt real-time geo-lookup in case serviceArea wasn't set during address save
            const ServiceArea = require("../models/ServiceArea");
            const coords = user.address?.location?.coordinates;
            console.log('[createSubscription] No serviceArea on user, checking coordinates:', coords);

            if (coords && coords.length === 2) {
                const matchedArea = await ServiceArea.findOne({
                    isActive: true,
                    polygon: {
                        $geoIntersects: {
                            $geometry: { type: "Point", coordinates: coords }
                        }
                    }
                });

                if (matchedArea) {
                    // Auto-fix: assign the service area to the user
                    console.log('[createSubscription] Found service area via geo-lookup:', matchedArea.name || matchedArea._id);
                    user.serviceArea = matchedArea._id;
                    await user.save();
                } else {
                    console.log('[createSubscription] No matching service area found for coords:', coords);
                    return res.status(400).json({
                        success: false,
                        message: "Your location is currently outside our active service areas. Subscriptions and trials are only available within serviceable zones."
                    });
                }
            } else {
                console.log('[createSubscription] User has no location coordinates');
                return res.status(400).json({
                    success: false,
                    message: "Your location is currently outside our active service areas. Subscriptions and trials are only available within serviceable zones."
                });
            }
        }

        // 2. Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // 3. TRIAL PACK LOGIC (Wallet Check & Deduction) — skip for Field Sales
        let trialPaidAmount = 0;
        if (isTrial && !isFieldSalesRequest) {
            // Subcategory-level trial restriction:
            // If customer has ANY trial or active subscription in the same subcategory, block trial
            const subcategoryId = product.subcategory;
            if (subcategoryId) {
                // Find all products in the same subcategory
                const subcategoryProducts = await Product.find({ subcategory: subcategoryId }).select("_id");
                const subcategoryProductIds = subcategoryProducts.map(p => p._id);

                const existingSubcategorySub = await Subscription.findOne({
                    user: userId,
                    product: { $in: subcategoryProductIds },
                    status: { $in: ["active", "paused"] }
                });

                if (existingSubcategorySub) {
                    const existingProduct = await Product.findById(existingSubcategorySub.product).select("name");
                    return res.status(400).json({
                        success: false,
                        message: `Trial is not available. You already have an active ${existingSubcategorySub.isTrial ? "trial" : "subscription"} for "${existingProduct?.name || "a product"}" in this category.`
                    });
                }

                // Also check cancelled/expired trials (one trial per subcategory ever, unless admin re-enables)
                const pastTrial = await Subscription.findOne({
                    user: userId,
                    product: { $in: subcategoryProductIds },
                    isTrial: true
                });

                if (pastTrial) {
                    return res.status(400).json({
                        success: false,
                        message: "You have already availed a trial pack for a product in this category. Please contact support for assistance."
                    });
                }
            } else {
                // Fallback: per-product check if no subcategory set
                const existingTrial = await Subscription.findOne({
                    user: userId,
                    product: productId,
                    isTrial: true
                });

                if (existingTrial) {
                    return res.status(400).json({
                        success: false,
                        message: "You have already availed a trial pack for this product."
                    });
                }
            }

            // WALLET CHECK FOR TRIAL PACKS
            const trialPrice = product.trialEnabled && product.trialPrice
                ? product.trialPrice
                : product.price;
            const trialDuration = product.trialDuration || 7;
            const totalTrialCost = trialPrice * trialDuration * 1;

            if (user.walletBalance < totalTrialCost) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient wallet balance. Trial requires ₹${totalTrialCost}. Current balance: ₹${user.walletBalance}. Please recharge your wallet.`,
                    requiredAmount: totalTrialCost,
                    currentBalance: user.walletBalance,
                    shortfall: totalTrialCost - user.walletBalance
                });
            }

            // Deduct amount from wallet
            user.walletBalance -= totalTrialCost;
            await user.save();
            trialPaidAmount = totalTrialCost;

            // Create transaction record
            await Transaction.create({
                user: userId,
                type: "DEBIT",
                amount: totalTrialCost,
                mode: "WALLET",
                status: "SUCCESS",
                description: `Trial pack subscription - ${product.name} (${trialDuration} days)`,
                performedBy: req.user._id,
                balanceAfter: user.walletBalance,
            });
        }

        // 4. Check for existing active subscription for this product
        if (!isFieldSalesRequest) {
            const existingSubscription = await Subscription.findOne({
                user: userId,
                product: productId,
                status: { $in: ["active", "paused"] }
            });

            if (existingSubscription) {
                return res.status(400).json({
                    success: false,
                    message: "You already have an active subscription for this product. Please edit the existing one."
                });
            }
        }

        // 5. Create Subscription
        // Field Sales → "pending" (admin must approve), normal flow → "active"
        const subscription = await Subscription.create({
            user: userId,
            product: productId,
            quantity: isTrial ? 1 : quantity,
            frequency: isTrial ? "Daily" : frequency,
            alternateQuantity: (!isTrial && alternateQuantity) ? alternateQuantity : 0,
            customDays: (!isTrial && customDays) ? customDays : [],
            customSchedule: (!isTrial && customSchedule) ? customSchedule : {},
            startDate,
            isTrial: isTrial || false,
            trialPaidAmount: trialPaidAmount,
            status: isFieldSalesRequest ? "pending" : "active"
        });

        // Log Activity
        await logAction(
            userId,
            isFieldSalesRequest ? "FIELD_SALES" : (req.user.role === "CUSTOMER" ? "CUSTOMER" : "ADMIN"),
            "CREATE_SUBSCRIPTION",
            isFieldSalesRequest
                ? `Field Sales request: ${isTrial ? "Trial" : "Subscription"} for ${product.name} (Pending Approval)`
                : `Subscription created for ${product.name}`,
            {
                subscriptionId: subscription._id,
                productName: product.name,
                quantity: isTrial ? 1 : quantity,
                frequency: isTrial ? "Daily" : frequency,
                startDate,
                isTrial,
                isFieldSalesRequest
            },
            req
        );

        // Send SMS Notification (only for direct subscriptions, not pending)
        if (!isFieldSalesRequest) {
            const { sendSubscriptionStart } = require("../utils/notification");
            try {
                await sendSubscriptionStart(user, product, isTrial ? 1 : quantity, startDate);
            } catch (subErr) {
                console.error("Failed to send subscription SMS", subErr);
            }
        }

        res.status(201).json({
            success: true,
            message: isFieldSalesRequest
                ? `${isTrial ? "Trial" : "Subscription"} request submitted for admin approval.`
                : (isTrial
                    ? `Trial subscription created! ₹${trialPaidAmount} deducted from wallet.`
                    : "Subscription added successfully"),
            result: subscription,
            walletBalance: user.walletBalance
        });

    } catch (error) {
        console.error("Create Subscription Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get user's subscriptions
exports.getSubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.find({ user: req.user._id })
            .populate("product")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            result: subscriptions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update subscription (Edit quantity, frequency, etc.)
exports.updateSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, frequency, alternateQuantity, customDays, customSchedule, startDate, endDate, status, note } = req.body;

        let query = { _id: id };
        // If not admin, restrict to own subscriptions
        if (req.user.role === "CUSTOMER") {
            query.user = req.user._id;
        }

        const subscription = await Subscription.findOne(query);
        if (!subscription) {
            return res.status(404).json({ success: false, message: "Subscription not found" });
        }

        if (subscription.status === "cancelled" && status !== 'active') { // Allow reactivation
            return res.status(400).json({ success: false, message: "Cannot edit a cancelled subscription" });
        }

        const changes = [];

        if (quantity && quantity != subscription.quantity) {
            changes.push(`Quantity: ${subscription.quantity} -> ${quantity}`);
            subscription.quantity = quantity;
        }
        if (frequency && frequency !== subscription.frequency) {
            changes.push(`Frequency: ${subscription.frequency} -> ${frequency}`);
            subscription.frequency = frequency;
        }
        if (alternateQuantity !== undefined && alternateQuantity !== subscription.alternateQuantity) {
            changes.push(`Alt Qty: ${subscription.alternateQuantity} -> ${alternateQuantity}`);
            subscription.alternateQuantity = alternateQuantity;
        }
        if (customDays !== undefined) {
            const oldDays = subscription.customDays || [];
            const newDays = customDays || [];
            if (JSON.stringify(oldDays.sort()) !== JSON.stringify([...newDays].sort())) {
                changes.push(`Custom Days: [${oldDays.join(',')}] -> [${newDays.join(',')}]`);
                subscription.customDays = newDays;
            }
        }
        if (customSchedule !== undefined) {
            // Convert existing Map to plain object for comparison
            const oldSchedule = subscription.customSchedule instanceof Map
                ? Object.fromEntries(subscription.customSchedule)
                : (subscription.customSchedule || {});
            const newSchedule = customSchedule || {};
            if (JSON.stringify(oldSchedule) !== JSON.stringify(newSchedule)) {
                changes.push(`Custom Schedule updated`);
                subscription.customSchedule = newSchedule;
            }
        }
        if (status && status !== subscription.status) {
            changes.push(`Status: ${subscription.status} -> ${status}`);
            subscription.status = status;
        }
        if (startDate && startDate !== new Date(subscription.startDate).toISOString().split('T')[0]) {
            changes.push(`Start Date: ${subscription.startDate} -> ${startDate}`);
            subscription.startDate = startDate;
        }
        if (endDate !== undefined && endDate !== (subscription.endDate ? new Date(subscription.endDate).toISOString().split('T')[0] : null)) {
            changes.push(`End Date: ${subscription.endDate} -> ${endDate}`);
            subscription.endDate = endDate;
        }
        if (note !== undefined && note !== subscription.note) {
            // changes.push(`Note updated`);
            subscription.note = note;
        }

        await subscription.save();

        if (changes.length > 0) {
            // Log Activity
            await logAction(
                subscription.user,
                req.user.role === "CUSTOMER" ? "CUSTOMER" : "ADMIN",
                "UPDATE_SUBSCRIPTION",
                `Subscription updated: ${changes.join(", ")}`,
                {
                    subscriptionId: subscription._id,
                    changes
                },
                req
            );
        }

        res.status(200).json({
            success: true,
            message: "Subscription updated successfully",
            result: subscription
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Toggle Pause/Resume
exports.togglePauseSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const { paused } = req.body; // true to pause, false to resume

        let query = { _id: id };
        if (req.user.role === "CUSTOMER") {
            query.user = req.user._id;
        }

        const subscription = await Subscription.findOne(query);
        if (!subscription) {
            return res.status(404).json({ success: false, message: "Subscription not found" });
        }

        if (subscription.status === "cancelled") {
            return res.status(400).json({ success: false, message: "Cannot update a cancelled subscription" });
        }

        subscription.status = paused ? "paused" : "active";
        await subscription.save();

        // Log Activity
        await logAction(
            subscription.user,
            req.user.role === "CUSTOMER" ? "CUSTOMER" : "ADMIN",
            paused ? "PAUSE_SUBSCRIPTION" : "RESUME_SUBSCRIPTION",
            `Subscription ${paused ? "paused" : "resumed"}`,
            { subscriptionId: subscription._id },
            req
        );

        res.status(200).json({
            success: true,
            message: `Subscription ${paused ? "paused" : "resumed"} successfully`,
            result: subscription
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Cancel Subscription
exports.cancelSubscription = async (req, res) => {
    try {
        const { id } = req.params;

        let query = { _id: id };
        if (req.user.role === "CUSTOMER") {
            query.user = req.user._id;
        }

        const subscription = await Subscription.findOne(query);
        if (!subscription) {
            return res.status(404).json({ success: false, message: "Subscription not found" });
        }

        subscription.status = "cancelled";
        await subscription.save();

        // Log Activity
        await logAction(
            subscription.user,
            req.user.role === "CUSTOMER" ? "CUSTOMER" : "ADMIN",
            "CANCEL_SUBSCRIPTION",
            "Subscription cancelled",
            { subscriptionId: subscription._id },
            req
        );

        res.status(200).json({
            success: true,
            message: "Subscription cancelled successfully",
            result: subscription
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Calendar Data (Subscriptions + Modifications + Vacation)
exports.getCalendarData = async (req, res) => {
    try {
        const { year, month } = req.query;
        const userId = req.user._id;

        if (!year || !month) {
            return res.status(400).json({ success: false, message: "Year and month are required" });
        }

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of month

        // Format dates as YYYY-MM-DD strings for string comparison
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        // 1. Get Active Subscriptions
        const subscriptions = await Subscription.find({
            user: userId,
            status: { $ne: "cancelled" },
            startDate: { $lte: endDate }
        }).populate("product", "name image price");

        // 2. Get Modifications for this month
        const SubscriptionModification = require("../models/SubscriptionModification");
        const modifications = await SubscriptionModification.find({
            user: userId,
            date: { $gte: startStr, $lte: endStr } // String comparison works for YYYY-MM-DD
        });

        // 3. Get Vacation Status
        const user = await User.findById(userId).select("vacation");
        const vacation = user.vacation || {};

        // 4. Get Manual Orders for this month
        const Order = require("../models/Order");
        const orders = await Order.find({
            customer: userId,
            deliveryDate: { $gte: startStr, $lte: endStr },
            status: { $ne: "cancelled" }
        }).populate("products.product", "name image price");

        res.status(200).json({
            success: true,
            result: {
                subscriptions,
                modifications,
                vacation,
                orders // Added orders to customer calendar response
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Daily Modification (Skip or Change Quantity)
exports.updateDailyModification = async (req, res) => {
    try {
        const { subscriptionId, date, quantity } = req.body;
        const userId = req.user._id;

        const SubscriptionModification = require("../models/SubscriptionModification");

        // Check if subscription belongs to user
        const subscription = await Subscription.findOne({ _id: subscriptionId, user: userId });
        if (!subscription) {
            return res.status(404).json({ success: false, message: "Subscription not found" });
        }

        // Upsert modification - date is already YYYY-MM-DD string
        const modification = await SubscriptionModification.findOneAndUpdate(
            { user: userId, subscription: subscriptionId, date: date },
            {
                quantity,
                status: quantity === 0 ? "skipped" : "modified"
            },
            { new: true, upsert: true }
        );

        // Log Activity
        await logAction(
            userId,
            "CUSTOMER",
            quantity === 0 ? "SKIP_DELIVERY" : "MODIFY_DELIVERY",
            quantity === 0 ? `Delivery skipped for ${date}` : `Quantity changed to ${quantity} for ${date}`,
            {
                subscriptionId,
                date,
                quantity
            },
            req
        );

        res.status(200).json({
            success: true,
            message: quantity === 0 ? "Delivery skipped for this date" : "Quantity updated for this date",
            result: modification
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- ADMIN CONTROLLERS ---

// Get Subscriptions for a specific user (Admin)
exports.getAdminCustomerSubscriptions = async (req, res) => {
    try {
        const { userId } = req.params;
        console.log(`[DEBUG] getAdminCustomerSubscriptions called for userId: ${userId}`);

        const subscriptions = await Subscription.find({ user: userId })
            .populate("product")
            .sort({ createdAt: -1 });

        console.log(`[DEBUG] Found ${subscriptions.length} subscriptions`);

        res.status(200).json({
            success: true,
            result: subscriptions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Calendar Data for a specific user (Admin)
exports.getAdminCalendarData = async (req, res) => {
    try {
        const { userId } = req.params;
        const { year, month } = req.query;

        if (!year || !month) {
            return res.status(400).json({ success: false, message: "Year and month are required" });
        }

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of month

        // Format dates as YYYY-MM-DD strings for string comparison
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        // 1. Get Active Subscriptions
        const subscriptions = await Subscription.find({
            user: userId,
            status: { $ne: "cancelled" },
            startDate: { $lte: endDate }
        }).populate("product", "name image price");

        // 2. Get Modifications for this month
        const SubscriptionModification = require("../models/SubscriptionModification");
        const modifications = await SubscriptionModification.find({
            user: userId,
            date: { $gte: startStr, $lte: endStr }
        });

        // 3. Get Vacation Status
        const user = await User.findById(userId).select("vacation");
        const vacation = user.vacation || {};

        // 4. Get Manual Orders for this month
        const Order = require("../models/Order");
        const orders = await Order.find({
            customer: userId,
            deliveryDate: { $gte: startStr, $lte: endStr },
            status: { $ne: "cancelled" }
        }).populate("products.product", "name image price");

        res.status(200).json({
            success: true,
            result: {
                subscriptions,
                modifications,
                vacation,
                orders
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Daily Modification (Admin)
exports.updateAdminDailyModification = async (req, res) => {
    try {
        const { subscriptionId, date, quantity } = req.body;

        const SubscriptionModification = require("../models/SubscriptionModification");

        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ success: false, message: "Subscription not found" });
        }

        const modification = await SubscriptionModification.findOneAndUpdate(
            { user: subscription.user, subscription: subscriptionId, date: date }, // Use subscription's user
            {
                quantity,
                status: quantity === 0 ? "skipped" : "modified"
            },
            { new: true, upsert: true }
        );

        res.status(200).json({
            success: true,
            message: quantity === 0 ? "Delivery skipped" : "Quantity updated",
            result: modification
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// Get ALL Subscriptions (Admin) - Filter by type
exports.getAllSubscriptions = async (req, res) => {
    try {
        console.log('=== getAllSubscriptions CALLED ===');
        console.log('req.params:', req.params);
        console.log('req.query:', req.query);

        const { type, factory, district, city, hub, stockPoint, area } = req.query; // 'trial', 'regular', 'subscription', or 'all'

        let query = {};

        if (type === 'trial') {
            query.isTrial = true;
        } else if (type === 'regular' || type === 'subscription') {
            // For regular subscriptions, explicitly filter for non-trial
            // This handles both isTrial: false and null/undefined cases
            query.$or = [
                { isTrial: false },
                { isTrial: { $exists: false } },
                { isTrial: null }
            ];
        }

        // Logistical Filters (handled by resolving hubs first)
        const hubIds = await resolveHubs({ factory, district, city, area, hub });

        let customerQuery = { role: "CUSTOMER" };
        if (hubIds) customerQuery.hub = { $in: hubIds };
        if (stockPoint) customerQuery.deliveryPoints = stockPoint;

        if (req.scope) {
            const { scopeCustomerFilter } = require("../middleware/scope");
            customerQuery = scopeCustomerFilter(req.scope, customerQuery);
        }

        if (hubIds || stockPoint || (req.scope && !req.scope.fullAccess)) {
            const matchingCustomers = await User.find(customerQuery).select("_id");
            const customerIds = matchingCustomers.map(c => c._id);
            query.user = { $in: customerIds };
        }
        // If type is 'all' or undefined, query remains empty (fetch all) unless scoped

        console.log('getAllSubscriptions query:', JSON.stringify(query), 'type:', type);

        // Add sorting by createdAt desc
        const subscriptions = await Subscription.find(query)
            .populate("user", "name mobile email address customerId walletBalance")
            .populate("product", "name price image") // Removed category to prevent potential missing model error
            .populate("assignedRider", "name mobile")
            .sort({ createdAt: -1 })
            .lean();

        console.log(`Found ${subscriptions.length} subscriptions for type: ${type}`);
        if (subscriptions.length > 0) {
            console.log('Sample subscription:', {
                id: subscriptions[0]._id,
                user: subscriptions[0].user?.name,
                product: subscriptions[0].product?.name,
                isTrial: subscriptions[0].isTrial,
                status: subscriptions[0].status
            });
        }

        res.status(200).json({
            success: true,
            result: subscriptions
        });
    } catch (error) {
        console.error('Error in getAllSubscriptions:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get trial eligibility for current customer
// Returns list of subcategory IDs where trial is blocked
exports.getTrialEligibility = async (req, res) => {
    try {
        const userId = req.user._id;

        // Get all subscriptions (any status) for this user that are trials,
        // or active/paused subscriptions
        const userSubscriptions = await Subscription.find({
            user: userId,
            $or: [
                { isTrial: true }, // Any trial ever taken
                { status: { $in: ["active", "paused"] } } // Any active subscription
            ]
        }).select("product");

        if (userSubscriptions.length === 0) {
            return res.status(200).json({ success: true, result: { blockedSubcategories: [] } });
        }

        // Get the product details for each subscription to find subcategories
        const productIds = [...new Set(userSubscriptions.map(s => s.product.toString()))];
        const products = await Product.find({ _id: { $in: productIds } }).select("subcategory");

        // Collect blocked subcategory IDs
        const blockedSubcategories = [...new Set(
            products
                .filter(p => p.subcategory)
                .map(p => p.subcategory.toString())
        )];

        res.status(200).json({
            success: true,
            result: { blockedSubcategories }
        });
    } catch (error) {
        console.error('Error in getTrialEligibility:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Reset trial eligibility for a customer in a specific subcategory
exports.resetTrialEligibility = async (req, res) => {
    try {
        const { userId, subcategoryId } = req.body;

        if (!userId || !subcategoryId) {
            return res.status(400).json({
                success: false,
                message: "userId and subcategoryId are required"
            });
        }

        // Find all products in the subcategory
        const subcategoryProducts = await Product.find({ subcategory: subcategoryId }).select("_id name");
        const subcategoryProductIds = subcategoryProducts.map(p => p._id);

        // Find and delete any trial subscriptions (cancelled or otherwise) so user can re-trial
        const result = await Subscription.updateMany(
            {
                user: userId,
                product: { $in: subcategoryProductIds },
                isTrial: true,
                status: { $in: ["cancelled", "active", "paused"] }
            },
            { $set: { isTrial: false } } // Unmark as trial so it no longer blocks future trials
        );

        res.status(200).json({
            success: true,
            message: `Trial eligibility reset for ${result.modifiedCount} subscription(s). Customer can now take a trial in this subcategory.`,
            result: { modifiedCount: result.modifiedCount }
        });
    } catch (error) {
        console.error('Error in resetTrialEligibility:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
