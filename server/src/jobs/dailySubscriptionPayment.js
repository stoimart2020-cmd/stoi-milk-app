const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const SubscriptionModification = require('../models/SubscriptionModification');
const User = require('../models/User');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const { createNotification } = require('../controllers/notificationController');

// Helper: Format Date as YYYY-MM-DD
const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};

// --- DAILY SUBSCRIPTION PAYMENT JOB ---
// Runs at 8:00 PM every day to process payments for NEXT DAY deliveries.
exports.dailySubscriptionPaymentJob = cron.schedule('0 20 * * *', async () => {
    console.log('[CRON] Starting Daily Subscription Payment Job...');

    try {
        // 1. Determine "Tomorrow's" Date
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const tomorrowDateStr = formatDate(tomorrow);
        const tomorrowDayName = tomorrow.toLocaleDateString('en-US', { weekday: 'long' }); // "Monday", "Tuesday"..

        console.log(`[CRON] Processing payments for delivery date: ${tomorrowDateStr} (${tomorrowDayName})`);

        // 2. Fetch Active Non-Trial Subscriptions
        const subscriptions = await Subscription.find({
            status: 'active',
            isTrial: false // Trials are pre-paid
        }).populate('product').populate('user');

        console.log(`[CRON] Found ${subscriptions.length} active subscriptions.`);

        let processedCount = 0;
        let skippedCount = 0; // No delivery tomorrow
        let paidCount = 0;
        let pausedCount = 0; // Insufficient funds

        for (const sub of subscriptions) {
            try {
                // If product or user is missing/inactive, skip or handle gracefully
                if (!sub.product || !sub.user) {
                    console.warn(`[CRON] Skipping subscription ${sub._id}: Missing Product or User`);
                    continue;
                }

                // Date Boundary Checks
                // 1. If tomorrow is before start date, skip
                if (new Date(tomorrowDateStr) < new Date(formatDate(sub.startDate))) {
                    // Start date is in future
                    skippedCount++;
                    continue;
                }

                // 2. If end date exists and tomorrow is after end date, skip (or maybe expire?)
                if (sub.endDate && new Date(tomorrowDateStr) > new Date(formatDate(sub.endDate))) {
                    // Subscription ended
                    skippedCount++;
                    continue;
                }

                // 3. Determine if Delivery is Scheduled for Tomorrow
                let quantity = 0;
                let isDeliveryScheduled = false;

                // A. Check Modifications First (Overrides everything)
                // Note: Schema stores date as String YYYY-MM-DD
                const modification = await SubscriptionModification.findOne({
                    subscription: sub._id,
                    date: tomorrowDateStr
                });

                if (modification) {
                    if (modification.status === 'skipped' || modification.quantity === 0) {
                        isDeliveryScheduled = false;
                        quantity = 0;
                        console.log(`[CRON] Sub ${sub._id}: Skipped by modification for ${tomorrowDateStr}`);
                    } else {
                        isDeliveryScheduled = true;
                        quantity = modification.quantity;
                        console.log(`[CRON] Sub ${sub._id}: Modified quantity ${quantity} for ${tomorrowDateStr}`);
                    }
                } else {
                    // B. Check Standard Schedule (No modification)
                    if (sub.frequency === 'Daily') {
                        isDeliveryScheduled = true;
                        quantity = sub.quantity;
                    } else if (sub.frequency === 'Alternate Days') {
                        // Complex Logic: Need to calculate from Start Date
                        // Days passed since start date
                        const start = new Date(sub.startDate);
                        // Reset time parts for accurate day diff
                        const startZero = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                        const tomorrowZero = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

                        const diffTime = Math.abs(tomorrowZero - startZero);
                        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                        // If diffDays is even (0, 2, 4...), it's "Day 1" (Standard Qty)
                        // If diffDays is odd (1, 3, 5...), it's "Day 2" (Alternate Qty)
                        // Wait, day 0 (start date) is delivery. Day 1 is alternate.

                        if (diffDays % 2 === 0) {
                            // Even days from start (0th, 2nd, 4th...) -> Standard Quantity
                            isDeliveryScheduled = true;
                            quantity = sub.quantity;
                        } else {
                            // Odd days -> Alternate Quantity
                            quantity = sub.alternateQuantity || 0;
                            if (quantity > 0) {
                                isDeliveryScheduled = true;
                            } else {
                                isDeliveryScheduled = false; // Alternate qty 0 means skip
                            }
                        }
                    } else if (sub.frequency === 'Weekdays') {
                        if (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(tomorrowDayName)) {
                            isDeliveryScheduled = true;
                            quantity = sub.quantity;
                        }
                    } else if (sub.frequency === 'Weekends') {
                        if (['Saturday', 'Sunday'].includes(tomorrowDayName)) {
                            isDeliveryScheduled = true;
                            quantity = sub.quantity;
                        }
                    } else if (sub.frequency === 'Custom') {
                        // Check customDays array OR customSchedule map
                        // Custom Schedule Map: { "Monday": 2, "Tuesday": 0 ... }
                        // User model might use Map, check Schema...
                        // Sub Schema: customSchedule: { type: Map, of: Number }
                        // Sub Schema: customDays: [String] (Legacy)

                        // Priority to customSchedule if present
                        if (sub.customSchedule && sub.customSchedule.get(tomorrowDayName) !== undefined) {
                            const qty = sub.customSchedule.get(tomorrowDayName);
                            if (qty > 0) {
                                isDeliveryScheduled = true;
                                quantity = qty;
                            }
                        } else if (sub.customDays && sub.customDays.includes(tomorrowDayName)) {
                            isDeliveryScheduled = true;
                            quantity = sub.quantity;
                        }
                    }
                }

                // If no delivery or 0 quantity, skip payment
                if (!isDeliveryScheduled || quantity <= 0) {
                    skippedCount++;
                    continue;
                }

                // 4. Calculate Amount
                // Use Product Price (TODO: Check if user has special price? For now use product.price)
                const price = sub.product.price;
                const totalAmount = price * quantity;

                // 5. Check Wallet Balance
                if (sub.user.walletBalance < totalAmount) {
                    // INSUFFICIENT FUNDS -> PAUSE SUBSCRIPTION
                    console.log(`[CRON] Sub ${sub._id}: Insufficient Funds (Req: ${totalAmount}, Bal: ${sub.user.walletBalance}). Pausing...`);

                    sub.status = 'paused';
                    sub.pauseReason = `Insufficient wallet balance. Required: ₹${totalAmount}`;
                    await sub.save();

                    // Create Notification
                    await createNotification({
                        recipient: sub.user._id,
                        title: "Subscription Paused",
                        message: `Your subscription for ${sub.product.name} has been paused due to low wallet balance. Please recharge ₹${totalAmount - sub.user.walletBalance} to resume.`,
                        type: "error",
                        link: "/customer/wallet"
                    });

                    pausedCount++;
                    continue;
                }

                // 6. Deduct Balance & Create Transaction
                sub.user.walletBalance -= totalAmount;
                await sub.user.save();

                await Transaction.create({
                    user: sub.user._id,
                    amount: totalAmount,
                    type: "DEBIT",
                    mode: "WALLET",
                    status: "SUCCESS",
                    description: `Subscription payment - ${sub.product.name} (${quantity} units)`,
                    // Link to subscription if schema supports, or metadata
                    // order field is usually for Order model... maybe add metadata or description is enough
                    performedBy: sub.user._id, // System/User
                    balanceAfter: sub.user.walletBalance
                });

                paidCount++;
                console.log(`[CRON] Sub ${sub._id}: Payment Successful. Deducted ₹${totalAmount}`);

            } catch (err) {
                console.error(`[CRON] Error processing sub ${sub._id}:`, err);
            }

            processedCount++;
        }

        console.log(`[CRON] Job Completed. Processed: ${processedCount}, Paid: ${paidCount}, Skipped: ${skippedCount}, Paused: ${pausedCount}`);

    } catch (error) {
        console.error('[CRON] Daily Job Fatal Error:', error);
    }
});
