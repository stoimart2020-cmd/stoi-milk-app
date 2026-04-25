const Order = require("../models/Order");
const Employee = require("../models/Employee");
const Hub = require("../models/Hub");
const Area = require("../models/Area");
const Subscription = require("../models/Subscription");
const SubscriptionModification = require("../models/SubscriptionModification");

// ========================
// DELIVERY DASHBOARD STATS
// ========================
exports.getDeliveryDashboard = async (req, res) => {
    try {
        const { date, hub, city, area } = req.query;
        const targetDate = date ? new Date(date) : new Date();

        // Normalize to day start/end
        const dayStart = new Date(targetDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(23, 59, 59, 999);

        const dateFilter = { deliveryDate: { $gte: dayStart, $lte: dayEnd } };

        // Handle structural filters
        let customerMatch = {};
        if (hub || city || area) {
            const User = require("../models/User");
            const filterMap = {};
            if (hub) filterMap.hub = hub;
            if (city) filterMap.city = city;
            if (area) filterMap.area = area;

            const customers = await User.find(filterMap).select("_id");
            const customerIds = customers.map(c => c._id);
            customerMatch = { customer: { $in: customerIds } };
        }

        const baseMatch = { ...dateFilter, ...customerMatch };

        // --- Counts by Status ---
        const statusCounts = await Order.aggregate([
            { $match: baseMatch },
            { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$totalAmount" } } }
        ]);

        const stats = {
            total: 0,
            pending: 0,
            confirmed: 0,
            out_for_delivery: 0,
            delivered: 0,
            cancelled: 0,
            revenue: 0,
            deliveredRevenue: 0,
        };

        statusCounts.forEach(s => {
            stats[s._id] = s.count;
            stats.total += s.count;
            stats.revenue += s.total;
            if (s._id === "delivered") stats.deliveredRevenue = s.total;
        });

        // --- Unassigned orders count ---
        const unassigned = await Order.countDocuments({
            ...baseMatch,
            status: { $nin: ["cancelled", "delivered"] },
            assignedRider: null
        });
        stats.unassigned = unassigned;

        // --- Rider Performance ---
        const riderPerformance = await Order.aggregate([
            { $match: { ...baseMatch, assignedRider: { $ne: null } } },
            {
                $group: {
                    _id: "$assignedRider",
                    total: { $sum: 1 },
                    delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
                    pending: { $sum: { $cond: [{ $in: ["$status", ["pending", "confirmed"]] }, 1, 0] } },
                    out: { $sum: { $cond: [{ $eq: ["$status", "out_for_delivery"] }, 1, 0] } },
                    revenue: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, "$totalAmount", 0] } },
                    cashCollected: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$status", "delivered"] }, { $in: ["$paymentMode", ["CASH", "Cash"]] }] },
                                "$totalAmount", 0
                            ]
                        }
                    }
                }
            },
            { $sort: { delivered: -1 } }
        ]);

        // Populate rider details
        const riderIds = riderPerformance.map(r => r._id);
        const riders = await Employee.find({ _id: { $in: riderIds } })
            .select("name mobile hub areas")
            .populate("hub", "name")
            .lean();
        const riderMap = {};
        riders.forEach(r => { riderMap[r._id.toString()] = r; });

        const riderStats = riderPerformance.map(r => ({
            ...r,
            rider: riderMap[r._id.toString()] || { name: "Unknown" }
        }));

        // --- Hub-wise Breakdown ---
        // Get orders with customer → area → hub info
        const hubBreakdown = await Order.aggregate([
            { $match: baseMatch },
            {
                $lookup: {
                    from: "users",
                    localField: "customer",
                    foreignField: "_id",
                    as: "customerData"
                }
            },
            { $unwind: "$customerData" },
            {
                $group: {
                    _id: "$customerData.area",
                    total: { $sum: 1 },
                    delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
                    pending: { $sum: { $cond: [{ $in: ["$status", ["pending", "confirmed"]] }, 1, 0] } },
                    revenue: { $sum: "$totalAmount" }
                }
            }
        ]);

        // Map areas to get names
        const areaIds = hubBreakdown.map(h => h._id).filter(Boolean);
        const areas = await Area.find({ _id: { $in: areaIds } }).select("name hub").populate({
            path: "hub",
            select: "name city",
            populate: { path: "city", select: "name" }
        }).lean();
        const areaMap = {};
        areas.forEach(a => { areaMap[a._id.toString()] = a; });

        const areaStats = hubBreakdown.filter(h => h._id).map(h => ({
            ...h,
            area: areaMap[h._id?.toString()] || { name: "Unassigned" }
        }));

        // --- Payment Breakdown ---
        const paymentBreakdown = await Order.aggregate([
            { $match: { ...baseMatch, status: "delivered" } },
            { $group: { _id: "$paymentMode", count: { $sum: 1 }, total: { $sum: "$totalAmount" } } }
        ]);

        // --- Hourly Distribution ---
        const hourly = await Order.aggregate([
            { $match: { ...baseMatch, status: "delivered" } },
            {
                $group: {
                    _id: { $hour: "$updatedAt" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // --- Product Breakdown ---
        const productBreakdown = await Order.aggregate([
            { $match: baseMatch },
            { $unwind: "$products" },
            {
                $group: {
                    _id: "$products.product",
                    scheduled: { $sum: 1 },
                    unitCount: { $sum: "$products.quantity" },
                    pending: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["pending", "confirmed"]] }, 1, 0]
                        }
                    },
                    pendingUnits: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["pending", "confirmed"]] }, "$products.quantity", 0]
                        }
                    },
                    delivered: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "delivered"] }, 1, 0]
                        }
                    },
                    deliveredUnits: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "delivered"] }, "$products.quantity", 0]
                        }
                    },
                    cancelled: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0]
                        }
                    },
                    cancelledUnits: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "cancelled"] }, "$products.quantity", 0]
                        }
                    }
                }
            }
        ]);

        const productIds = productBreakdown.map(p => p._id);
        const products = await require("../models/Product").find({ _id: { $in: productIds } }).select("name unit category");

        const productStats = productBreakdown.map(pb => {
            const prod = products.find(p => p._id.toString() === pb._id.toString());
            return {
                ...pb,
                product: prod || { name: "Unknown Product" }
            };
        });

        // --- Bottle Stats ---
        const bottleStats = await Order.aggregate([
            { $match: { ...baseMatch, status: { $ne: "cancelled" } } },
            {
                $group: {
                    _id: null,
                    issued: { $sum: "$bottlesIssued" },
                    returned: { $sum: "$bottlesReturned" }
                }
            }
        ]);
        const bottles = bottleStats[0] || { issued: 0, returned: 0 };
        bottles.pending = (bottles.issued || 0) - (bottles.returned || 0);

        // --- Total Payment Collected ---
        const totalPaymentCollected = riderStats.reduce((sum, r) => sum + (r.cashCollected || 0), 0);

        res.status(200).json({
            success: true,
            result: {
                date: dayStart.toISOString().split("T")[0],
                stats,
                riderStats,
                areaStats,
                productStats,
                paymentBreakdown,
                hourlyDeliveries: hourly,
                bottleStats: bottles,
                totalPaymentCollected
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// DELIVERY ORDERS LIST (with filters)
// ========================
exports.getDeliveryOrders = async (req, res) => {
    try {
        const { date, status, rider, unassigned, page = 1, limit = 50, hub, city, area } = req.query;
        const targetDate = date ? new Date(date) : new Date();

        const dayStart = new Date(targetDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(23, 59, 59, 999);

        const query = { deliveryDate: { $gte: dayStart, $lte: dayEnd } };

        if (hub || city || area) {
            const User = require("../models/User");
            const filterMap = {};
            if (hub) filterMap.hub = hub;
            if (city) filterMap.city = city;
            if (area) filterMap.area = area;

            const customers = await User.find(filterMap).select("_id");
            query.customer = { $in: customers.map(c => c._id) };
        }

        if (status) query.status = { $in: status.split(',') };
        if (rider) query.assignedRider = rider;
        if (unassigned === "true") query.assignedRider = null;

        const orders = await Order.find(query)
            .populate("customer", "name mobile address area serviceArea")
            .populate("products.product", "name price unit unitsPerCrate")
            .populate("assignedRider", "name mobile")
            .sort({ status: 1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Order.countDocuments(query);

        res.status(200).json({
            success: true,
            result: orders,
            pagination: { total, page: Number(page), pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// BULK ASSIGN RIDER
// ========================
exports.bulkAssignRider = async (req, res) => {
    try {
        const { orderIds, riderId, assignmentType, endDate, date } = req.body;

        if (!orderIds?.length || !riderId) {
            return res.status(400).json({ success: false, message: "orderIds and riderId required" });
        }

        const User = require("../models/User");

        // 1. Update selected orders (Always applies for the selected date)
        await Order.updateMany(
            { _id: { $in: orderIds } },
            { $set: { assignedRider: riderId } }
        );

        const orders = await Order.find({ _id: { $in: orderIds } }).select("customer deliveryDate");
        const customerIds = [...new Set(orders.map(o => o.customer.toString()))];

        if (assignmentType === "permanent") {
            // Update User default rider
            await User.updateMany(
                { _id: { $in: customerIds } },
                { $set: { deliveryBoy: riderId } }
            );

            // Update Subscription default rider
            await Subscription.updateMany(
                { user: { $in: customerIds } },
                { $set: { assignedRider: riderId } }
            );

            // Update Employee routes
            // Remove from all other riders
            await Employee.updateMany(
                { role: "RIDER" },
                { $pull: { route: { $in: customerIds } } }
            );
            // Add to new rider
            await Employee.findByIdAndUpdate(riderId, {
                $addToSet: { route: { $each: customerIds } }
            });
        } 
        else if (assignmentType === "temporary" && endDate && date) {
            const start = new Date(date);
            const end = new Date(endDate);
            
            // Loop through each date in the range
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dStr = d.toISOString().split('T')[0];
                const dStart = new Date(dStr + 'T00:00:00.000Z');
                const dEnd = new Date(dStr + 'T23:59:59.999Z');

                // Update existing orders in this range
                await Order.updateMany(
                    { customer: { $in: customerIds }, deliveryDate: { $gte: dStart, $lte: dEnd } },
                    { $set: { assignedRider: riderId } }
                );

                // Create/Update modifications for future generations
                const subscriptions = await Subscription.find({ user: { $in: customerIds }, status: 'active' });
                for (const sub of subscriptions) {
                    await SubscriptionModification.findOneAndUpdate(
                        { subscription: sub._id, date: dStr },
                        { 
                            user: sub.user, 
                            subscription: sub._id, 
                            date: dStr, 
                            assignedRider: riderId,
                            status: 'modified'
                        },
                        { upsert: true }
                    );
                }
            }
        }

        res.status(200).json({ 
            success: true, 
            message: `${orderIds.length} orders updated ${assignmentType === 'today' ? 'for today' : assignmentType}` 
        });
    } catch (error) {
        console.error('[BULK_ASSIGN] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// BULK UPDATE STATUS
// ========================
exports.bulkUpdateStatus = async (req, res) => {
    try {
        const { orderIds, status } = req.body;

        if (!orderIds?.length || !status) {
            return res.status(400).json({ success: false, message: "orderIds and status required" });
        }

        await Order.updateMany(
            { _id: { $in: orderIds } },
            { $set: { status } }
        );

        res.status(200).json({ success: true, message: `${orderIds.length} orders updated to ${status}` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// GENERATE ORDERS FOR DATE (Manual Trigger)
// Creates orders from active subscriptions for a specific date
// ========================
exports.generateOrdersForDate = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();

        // Normalize to YYYY-MM-DD
        const targetDateStr = targetDate.toISOString().split('T')[0];
        const targetDayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

        console.log(`[GENERATE] Generating orders for: ${targetDateStr} (${targetDayName})`);

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
        console.log(`[GENERATE] Built rider map for ${Object.keys(customerRiderMap).length} customers`);

        // Fetch ALL active subscriptions (regular + trial)
        const subscriptions = await Subscription.find({
            status: 'active'
        }).populate('product').populate('user');

        let ordersCreated = 0;
        let skipped = 0;
        let alreadyExists = 0;

        for (const sub of subscriptions) {
            try {
                if (!sub.product || !sub.user) continue;

                // Date Boundary Checks
                const startDateStr = sub.startDate.toISOString().split('T')[0];
                if (targetDateStr < startDateStr) { skipped++; continue; }

                if (sub.endDate) {
                    const endDateStr = sub.endDate.toISOString().split('T')[0];
                    if (targetDateStr > endDateStr) { skipped++; continue; }
                }

                // Determine delivery quantity
                let quantity = 0;

                // Check Modifications First
                const modification = await SubscriptionModification.findOne({
                    subscription: sub._id,
                    date: targetDateStr
                });

                if (modification && modification.quantity !== undefined) {
                    if (modification.status === 'skipped' || modification.quantity === 0) {
                        skipped++;
                        continue;
                    }
                    quantity = modification.quantity;
                } else {
                    // Standard Schedule
                    if (sub.frequency === 'Daily') {
                        quantity = sub.quantity;
                    } else if (sub.frequency === 'Alternate Days') {
                        const start = new Date(sub.startDate);
                        const startZero = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                        const targetZero = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
                        const diffTime = Math.abs(targetZero - startZero);
                        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays % 2 === 0) {
                            quantity = sub.quantity;
                        } else {
                            quantity = sub.alternateQuantity || 0;
                        }
                    } else if (sub.frequency === 'Weekdays') {
                        if (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(targetDayName)) {
                            quantity = sub.quantity;
                        }
                    } else if (sub.frequency === 'Weekends') {
                        if (['Saturday', 'Sunday'].includes(targetDayName)) {
                            quantity = sub.quantity;
                        }
                    } else if (sub.frequency === 'Custom') {
                        if (sub.customSchedule && sub.customSchedule.get(targetDayName) !== undefined) {
                            quantity = sub.customSchedule.get(targetDayName);
                        } else if (sub.customDays && sub.customDays.includes(targetDayName)) {
                            quantity = sub.quantity;
                        }
                    }
                }

                if (quantity <= 0) { skipped++; continue; }

                // Check if order already exists (prevent duplicates)
                const existingOrder = await Order.findOne({
                    customer: sub.user._id,
                    'products.product': sub.product._id,
                    deliveryDate: {
                        $gte: new Date(targetDateStr + 'T00:00:00.000Z'),
                        $lte: new Date(targetDateStr + 'T23:59:59.999Z')
                    },
                    orderType: 'DELIVERY',
                    status: { $ne: 'cancelled' }
                });

                if (existingOrder) {
                    alreadyExists++;
                    continue;
                }

                const price = sub.product.price;
                const totalAmount = price * quantity;
                const bottlesIssued = sub.product.reverseLogistic ? quantity : 0;

                // Determine rider: modification's assignedRider → subscription's assignedRider → customer's deliveryBoy → rider route map
                const riderId = modification?.assignedRider || sub.assignedRider || sub.user.deliveryBoy || customerRiderMap[sub.user._id.toString()] || null;

                await Order.create({
                    customer: sub.user._id,
                    products: [{
                        product: sub.product._id,
                        quantity: quantity,
                        price: price
                    }],
                    totalAmount: totalAmount,
                    deliveryDate: new Date(targetDateStr + 'T00:00:00.000Z'),
                    paymentMode: 'WALLET',
                    status: riderId ? 'confirmed' : 'pending',
                    paymentStatus: 'paid',
                    orderType: 'DELIVERY',
                    assignedRider: riderId,
                    bottlesIssued: bottlesIssued,
                    notes: sub.isTrial ? 'Trial delivery (manual)' : 'Subscription delivery (manual)'
                });

                ordersCreated++;
            } catch (err) {
                console.error(`[GENERATE] Error for sub ${sub._id}:`, err.message);
            }
        }

        console.log(`[GENERATE] Done. Created: ${ordersCreated}, Skipped: ${skipped}, Already Existed: ${alreadyExists}`);

        res.status(200).json({
            success: true,
            message: `Orders generated for ${targetDateStr}`,
            result: {
                date: targetDateStr,
                ordersCreated,
                skipped,
                alreadyExists
            }
        });
    } catch (error) {
        console.error('[GENERATE] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
