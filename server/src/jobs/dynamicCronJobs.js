const cron = require('node-cron');
const Settings = require('../models/Settings');
const Subscription = require('../models/Subscription');
const SubscriptionModification = require('../models/SubscriptionModification');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const Employee = require('../models/Employee');
const Product = require('../models/Product');
const { createNotification } = require('../controllers/notificationController');
const { sendInvoiceNotification } = require('../utils/notification');

// Store active cron jobs
let activePaymentJob = null;
let activeAssignmentJob = null;

// Helper: Format Date as YYYY-MM-DD in IST
const formatDate = (date) => {
    // Use IST explicitly to avoid UTC date drift issues
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(date);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    return `${year}-${month}-${day}`;
};

// Helper: Get absolute timestamp 24h from now
const getTomorrowDate = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

// Helper: Determine delivery quantity for a subscription on a given date
const getDeliveryQuantity = async (sub, targetDateStr, targetDayName) => {
    // 1. Check Customer Vacation (Universal Skip)
    const user = sub.user;
    if (user && user.vacation && user.vacation.isActive) {
        const targetDate = new Date(targetDateStr + 'T00:00:00.000Z');
        const vacationStart = new Date(user.vacation.startDate);
        const vacationEnd = user.vacation.endDate ? new Date(user.vacation.endDate) : null;

        // If it's an indefinite vacation, or within the start/end range
        const isOnVacation = targetDate >= vacationStart && (!vacationEnd || targetDate <= vacationEnd);
        
        if (isOnVacation) {
            console.log(`[SUBSCRIPTION] Skipping for ${user.name}: User on Vacation`);
            return 0;
        }
    }

    // 2. Check Modifications First (Overrides everything)
    const modification = await SubscriptionModification.findOne({
        subscription: sub._id,
        date: targetDateStr
    });

    if (modification) {
        if (modification.status === 'skipped' || modification.quantity === 0) {
            return 0;
        }
        return modification.quantity;
    }

    // 3. Check Standard Schedule
    if (sub.frequency === 'Daily') {
        return sub.quantity;
    } else if (sub.frequency === 'Alternate Days') {
        const startStr = formatDate(sub.startDate);
        const startZero = new Date(startStr + 'T00:00:00.000Z');
        const targetZero = new Date(targetDateStr + 'T00:00:00.000Z');
        const diffTime = Math.abs(targetZero - startZero);
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays % 2 === 0) {
            return sub.quantity;
        } else {
            return sub.alternateQuantity || 0;
        }
    } else if (sub.frequency === 'Weekdays') {
        if (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(targetDayName)) {
            return sub.quantity;
        }
    } else if (sub.frequency === 'Weekends') {
        if (['Saturday', 'Sunday'].includes(targetDayName)) {
            return sub.quantity;
        }
    } else if (sub.frequency === 'Custom') {
        if (sub.customSchedule && sub.customSchedule.get(targetDayName) !== undefined) {
            const qty = sub.customSchedule.get(targetDayName);
            return qty > 0 ? qty : 0;
        } else if (sub.customDays && sub.customDays.includes(targetDayName)) {
            return sub.quantity;
        }
    }

    return 0;
};

// --- PROCESS SUBSCRIPTION PAYMENTS & GENERATE ORDERS ---
const processSubscriptionPayments = async (targetDateOverride = null) => {
    console.log('[CRON] Starting Daily Subscription Payment & Order Generation Job...');

    try {
        // 1. Determine "Tomorrow's" Date
        const tomorrow = targetDateOverride ? new Date(targetDateOverride) : getTomorrowDate();
        const tomorrowDateStr = formatDate(tomorrow);
        const tomorrowDayName = tomorrow.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' });

        console.log(`[CRON] Processing for delivery date: ${tomorrowDateStr} (${tomorrowDayName})`);

        // 2. Auto-Resume Check: Find subscriptions paused due to 'Insufficient wallet balance'
        // If they now have enough money, mark them as 'active' again
        const pausedSubs = await Subscription.find({ 
            status: 'paused', 
            pauseReason: /Insufficient wallet balance/i 
        }).populate('product').populate('user');

        console.log(`[CRON] Checking ${pausedSubs.length} paused subscriptions for auto-resume...`);
        for (const pSub of pausedSubs) {
            const qty = await getDeliveryQuantity(pSub, tomorrowDateStr, tomorrowDayName);
            const needed = (pSub.product?.price || 0) * qty;
            if (qty > 0 && pSub.user?.walletBalance >= needed) {
                pSub.status = 'active';
                pSub.pauseReason = '';
                await pSub.save();
                console.log(`[CRON] Auto-resumed Sub ${pSub._id} for customer ${pSub.user.name}`);
            }
        }

        // 3. Fetch ALL Active Subscriptions
        const subscriptions = await Subscription.find({
            status: 'active'
        }).populate('product').populate('user');

        console.log(`[CRON] Found ${subscriptions.length} active subscriptions.`);

        // Build customer → rider map from Employee routes
        const riders = await Employee.find({ role: 'RIDER', isActive: true }).select('_id route');
        const customerRiderMap = {};
        for (const rider of riders) {
            if (rider.route && rider.route.length > 0) {
                for (const customerId of rider.route) {
                    customerRiderMap[customerId.toString()] = rider._id;
                }
            }
        }
        console.log(`[CRON] Built rider map for ${Object.keys(customerRiderMap).length} customers`);

        let processedCount = 0;
        let skippedCount = 0;
        let paidCount = 0;
        let pausedCount = 0;
        let ordersCreated = 0;
        let trialOrdersCreated = 0;

        for (const sub of subscriptions) {
            try {
                if (!sub.product || !sub.user) {
                    console.warn(`[CRON] Skipping subscription ${sub._id}: Missing Product or User`);
                    continue;
                }

                // Date Boundary Checks
                if (new Date(tomorrowDateStr) < new Date(formatDate(sub.startDate))) {
                    skippedCount++;
                    continue;
                }

                if (sub.endDate && new Date(tomorrowDateStr) > new Date(formatDate(sub.endDate))) {
                    skippedCount++;
                    continue;
                }

                // Determine delivery quantity for tomorrow
                const quantity = await getDeliveryQuantity(sub, tomorrowDateStr, tomorrowDayName);

                if (quantity <= 0) {
                    skippedCount++;
                    continue;
                }

                // --- Safeguard: Check if User is Active ---
                if (sub.user.isActive === false) {
                    console.log(`[CRON] Skipping sub ${sub._id}: User ${sub.user.name} is DEACTIVATED`);
                    skippedCount++;
                    continue;
                }

                // --- Safeguard: Check Product Stock ---
                if (sub.product.trackInventory) {
                    if (sub.product.stock < quantity) {
                        console.warn(`[CRON] Insufficient stock for ${sub.product.name}. Required: ${quantity}, Available: ${sub.product.stock}. Skipping sub ${sub._id}`);
                        skippedCount++;
                        continue;
                    }
                    // Deduct stock (we will save the product later if needed, or save here)
                    const Product = require("../models/Product");
                    await Product.findByIdAndUpdate(sub.product._id, { $inc: { stock: -quantity } });
                }

                // Calculate Amount
                const price = sub.product.price;
                const totalAmount = price * quantity;

                // --- Payment Processing (only for non-trial subscriptions) ---
                if (!sub.isTrial) {
                    // Check Wallet Balance
                    if (sub.user.walletBalance < totalAmount) {
                        console.log(`[CRON] Sub ${sub._id}: Insufficient Funds. Pausing...`);

                        sub.status = 'paused';
                        sub.pauseReason = `Insufficient wallet balance. Required: ₹${totalAmount}`;
                        await sub.save();

                        await createNotification({
                            recipient: sub.user._id,
                            title: "Subscription Paused",
                            message: `Subscription for ${sub.product.name} paused due to low balance. Required: ₹${totalAmount}.`,
                            type: "error",
                            link: "/customer/wallet"
                        });

                        pausedCount++;
                        continue;
                    }

                    // Deduct Balance & Create Transaction
                    sub.user.walletBalance -= totalAmount;
                    await sub.user.save();

                    await Transaction.create({
                        user: sub.user._id,
                        amount: totalAmount,
                        type: "DEBIT",
                        mode: "WALLET",
                        status: "SUCCESS",
                        description: `Subscription: ${sub.product.name} (${quantity} units)`,
                        performedBy: sub.user._id,
                        balanceAfter: sub.user.walletBalance
                    });

                    paidCount++;
                    console.log(`[CRON] Sub ${sub._id}: Payment Successful. Deducted ₹${totalAmount}`);
                }

                // --- Order Generation (for BOTH regular and trial subscriptions) ---
                // Check if order already exists for this subscription + delivery date (prevent duplicates)
                const existingOrder = await Order.findOne({
                    customer: sub.user._id,
                    'products.product': sub.product._id,
                    deliveryDate: {
                        $gte: new Date(tomorrowDateStr + 'T00:00:00.000Z'),
                        $lte: new Date(tomorrowDateStr + 'T23:59:59.999Z')
                    },
                    orderType: 'DELIVERY',
                    status: { $ne: 'cancelled' }
                });

                if (existingOrder) {
                    console.log(`[CRON] Sub ${sub._id}: Order already exists for ${tomorrowDateStr}, skipping order creation.`);
                } else {
                    // Determine bottle tracking
                    const bottlesIssued = sub.product.reverseLogistic ? quantity : 0;

                    // Determine rider: subscription's assignedRider → customer's deliveryBoy → rider route map
                    const riderId = sub.assignedRider || sub.user.deliveryBoy || customerRiderMap[sub.user._id.toString()] || null;

                    const order = await Order.create({
                        customer: sub.user._id,
                        products: [{
                            product: sub.product._id,
                            quantity: quantity,
                            price: price
                        }],
                        totalAmount: totalAmount,
                        deliveryDate: new Date(tomorrowDateStr + 'T00:00:00.000Z'),
                        paymentMode: 'WALLET',
                        status: riderId ? 'confirmed' : 'pending',
                        paymentStatus: 'paid',
                        orderType: 'DELIVERY',
                        assignedRider: riderId,
                        bottlesIssued: bottlesIssued,
                        notes: sub.isTrial ? 'Trial delivery' : 'Subscription delivery'
                    });

                    if (sub.isTrial) {
                        trialOrdersCreated++;
                    } else {
                        ordersCreated++;
                    }
                    console.log(`[CRON] Sub ${sub._id}: Order #${order.orderId || order._id} created for ${tomorrowDateStr}`);
                    
                    // Send Invoice Notification
                    try {
                        // Populate product info for the notification if needed, 
                        // but Order already has products with ids. Notification helper populates it.
                        await sendInvoiceNotification(sub.user, order);
                    } catch (notifErr) {
                        console.error(`[CRON] Failed to notify customer for sub ${sub._id}:`, notifErr);
                    }
                }

            } catch (err) {
                console.error(`[CRON] Error processing sub ${sub._id}:`, err);
            }

            processedCount++;
        }

        console.log(`[CRON] Job Completed. Processed: ${processedCount}, Paid: ${paidCount}, Skipped: ${skippedCount}, Paused: ${pausedCount}, Orders Created: ${ordersCreated}, Trial Orders: ${trialOrdersCreated}`);

    } catch (error) {
        console.error('[CRON] Daily Payment & Order Generation Job Fatal Error:', error);
    }
};

// --- AUTO-ASSIGN ORDERS TO RIDERS ---
const autoAssignOrders = async (targetDateOverride = null) => {
    console.log('[CRON] Starting Auto-Assignment Job...');

    try {
        const tomorrow = targetDateOverride ? new Date(targetDateOverride) : getTomorrowDate();
        const tomorrowDateStr = formatDate(tomorrow);

        console.log(`[CRON] Auto-assigning orders for delivery date: ${tomorrowDateStr}`);

        // Find unassigned orders for tomorrow (using date range for reliability)
        const dayStart = new Date(tomorrowDateStr + 'T00:00:00.000Z');
        const dayEnd = new Date(tomorrowDateStr + 'T23:59:59.999Z');

        const orders = await Order.find({
            deliveryDate: { $gte: dayStart, $lte: dayEnd },
            $or: [
                { assignedRider: null },
                { assignedRider: { $exists: false } }
            ],
            status: { $in: ['pending', 'confirmed'] }
        }).populate('customer', 'name mobile address deliveryBoy');

        console.log(`[CRON] Found ${orders.length} unassigned orders.`);

        let assignedCount = 0;
        let failedCount = 0;

        // Get available riders (must be active AND not on leave/absent for tomorrow)
        const allRiders = await Employee.find({ role: 'RIDER', isActive: true });
        const riders = allRiders.filter(rider => {
            // Check if rider has attendance entry for tomorrow
            if (rider.attendance && rider.attendance.length > 0) {
                const tomorrowAttendance = rider.attendance.find(a => 
                    formatDate(new Date(a.date)) === tomorrowDateStr
                );
                // If marked Absent or Leave, they are unavailable
                if (tomorrowAttendance && ['Absent', 'Leave'].includes(tomorrowAttendance.status)) {
                    console.log(`[CRON] Rider ${rider.name} is UNAVAILABLE (${tomorrowAttendance.status})`);
                    return false;
                }
            }
            return true;
        });

        if (riders.length === 0) {
            console.warn('[CRON] No available riders for assignment on ' + tomorrowDateStr);
            return;
        }

        let riderIndex = 0; // Round-robin assignment

        for (const order of orders) {
            try {
                // First check if the customer has a deliveryBoy assigned
                const customer = order.customer;
                let rider = null;
                if (customer && customer.deliveryBoy) {
                    rider = riders.find(r => r._id.toString() === customer.deliveryBoy.toString());
                }
                // Fallback to round-robin if no customer-specific rider
                if (!rider) {
                    rider = riders[riderIndex % riders.length];
                    riderIndex++;
                }

                order.assignedRider = rider._id;
                if (order.status === 'pending') {
                    order.status = 'confirmed';
                }
                await order.save();

                // Notify Rider
                await createNotification({
                    recipient: rider._id,
                    title: "New Order Assigned",
                    message: `Order #${order.orderId || order._id} assigned for tomorrow's delivery.`,
                    type: "info",
                    link: "/rider/dashboard"
                });

                assignedCount++;
                riderIndex++;

                console.log(`[CRON] Order ${order._id} assigned to rider ${rider.name}`);

            } catch (err) {
                console.error(`[CRON] Error assigning order ${order._id}:`, err);
                failedCount++;
            }
        }

        console.log(`[CRON] Auto-Assignment Completed. Assigned: ${assignedCount}, Failed: ${failedCount}`);

    } catch (error) {
        console.error('[CRON] Auto-Assignment Job Fatal Error:', error);
    }
};

// --- INITIALIZE DYNAMIC CRON JOBS ---
const initializeCronJobs = async () => {
    try {
        const settings = await Settings.getSettings();
        const cutoffTime = settings?.order?.customerCutoffTime || '19:00';

        // Parse cutoff time (format: "HH:MM")
        const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number);

        // Calculate cron time (cutoff + 1 second)
        const cronSecond = 1;
        const cronMinute = cutoffMinute;
        const cronHour = cutoffHour;

        // Cron format: second minute hour day month dayOfWeek
        const cronExpression = `${cronSecond} ${cronMinute} ${cronHour} * * *`;

        console.log(`[CRON] Initializing jobs with cutoff time: ${cutoffTime}`);
        console.log(`[CRON] Jobs will run at: ${cronHour}:${cronMinute}:${cronSecond} (${cronExpression})`);

        // Cancel existing jobs if any
        if (activePaymentJob) {
            activePaymentJob.stop();
            console.log('[CRON] Stopped previous payment job');
        }
        if (activeAssignmentJob) {
            activeAssignmentJob.stop();
            console.log('[CRON] Stopped previous assignment job');
        }

        // Schedule new jobs with IST timezone
        const cronOptions = {
            timezone: 'Asia/Kolkata'
        };

        activePaymentJob = cron.schedule(cronExpression, processSubscriptionPayments, cronOptions);

        // Auto-assign orders 30 seconds after payment processing starts
        const assignCronSecond = 31;
        const assignCronExpression = `${assignCronSecond} ${cronMinute} ${cronHour} * * *`;
        activeAssignmentJob = cron.schedule(assignCronExpression, autoAssignOrders, cronOptions);

        console.log(`✅ [CRON] Jobs scheduled successfully at ${cutoffTime}:01 IST (timezone: Asia/Kolkata)`);

    } catch (error) {
        console.error('[CRON] Failed to initialize cron jobs:', error);
    }
};

// Export functions
module.exports = {
    initializeCronJobs,
    processSubscriptionPayments,
    autoAssignOrders
};
