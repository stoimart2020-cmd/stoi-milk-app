const Order = require("../models/Order");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const mongoose = require("mongoose");

/**
 * Infer the reason why a delivery was REMOVED (present on date1, absent on date2)
 */
const inferRemovalReason = (customerSub, user) => {
    const reasons = [];

    // Check vacation / pause
    const now = new Date();
    const hasVacation = customerSub?.calendar?.some(entry => {
        const d = new Date(entry.date);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return d.toDateString() === tomorrow.toDateString() && entry.quantity === 0;
    });
    if (hasVacation) {
        reasons.push({ code: "VACATION", label: "Customer on Vacation / Paused delivery" });
    }

    // Check alternate-day subscription (every other day naturally)
    if (customerSub?.frequency === "ALTERNATE_DAYS") {
        reasons.push({ code: "ALTERNATE_DAY", label: "Alternate-day delivery schedule (off day)" });
    }

    // Check specific weekday exclusion
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDay = tomorrow.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
    const activeDays = customerSub?.activeDays || [];
    if (activeDays.length > 0 && !activeDays.includes(tomorrowDay)) {
        reasons.push({ code: "WEEKDAY_OFF", label: `Not a scheduled delivery day (${tomorrowDay})` });
    }

    // Check low wallet balance
    if (user?.walletBalance !== undefined && user.walletBalance < 50) {
        reasons.push({ code: "LOW_BALANCE", label: `Low wallet balance (₹${user.walletBalance?.toFixed(2)})` });
    }

    // Check if subscription is paused / cancelled
    if (customerSub?.status === "PAUSED") {
        reasons.push({ code: "SUBSCRIPTION_PAUSED", label: "Subscription is paused" });
    }
    if (customerSub?.status === "CANCELLED") {
        reasons.push({ code: "SUBSCRIPTION_CANCELLED", label: "Subscription was cancelled" });
    }

    // Check subscription end date
    if (customerSub?.endDate) {
        const endDate = new Date(customerSub.endDate);
        if (endDate <= tomorrow) {
            reasons.push({ code: "SUBSCRIPTION_ENDED", label: `Subscription expired on ${endDate.toLocaleDateString()}` });
        }
    }

    // Trial ended
    if (customerSub?.orderType === "TRIAL" || customerSub?.type === "TRIAL") {
        reasons.push({ code: "TRIAL_ENDED", label: "Trial period ended" });
    }

    // Custom calendar quantity = 0
    if (reasons.length === 0) {
        reasons.push({ code: "CUSTOMER_REQUEST", label: "Customer requested no delivery" });
    }

    return reasons;
};

/**
 * Infer the reason why a delivery was ADDED (absent on date1, present on date2)
 */
const inferAdditionReason = (customerSub, user) => {
    const reasons = [];

    // Back from vacation
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const wasOnVacation = customerSub?.calendar?.some(entry => {
        const d = new Date(entry.date);
        return d.toDateString() === yesterday.toDateString() && entry.quantity === 0;
    });
    if (wasOnVacation) {
        reasons.push({ code: "BACK_FROM_VACATION", label: "Customer returning from vacation / Resumed delivery" });
    }

    // Alternate day
    if (customerSub?.frequency === "ALTERNATE_DAYS") {
        reasons.push({ code: "ALTERNATE_DAY_ON", label: "Alternate-day delivery schedule (on day)" });
    }

    // Weekday inclusion
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDay = tomorrow.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
    const activeDays = customerSub?.activeDays || [];
    if (activeDays.length > 0 && activeDays.includes(tomorrowDay)) {
        reasons.push({ code: "SCHEDULED_DAY", label: `Scheduled delivery day (${tomorrowDay})` });
    }

    // Wallet recharged / sufficient balance
    if (user?.walletBalance !== undefined && user.walletBalance >= 50) {
        reasons.push({ code: "WALLET_TOPPED_UP", label: `Sufficient wallet balance (₹${user.walletBalance?.toFixed(2)})` });
    }

    // New subscription
    if (customerSub?.createdAt) {
        const createdAt = new Date(customerSub.createdAt);
        const daysSinceCreated = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
        if (daysSinceCreated <= 2) {
            reasons.push({ code: "NEW_SUBSCRIPTION", label: "New subscription / trial started recently" });
        }
    }

    // Subscription resumed
    if (customerSub?.status === "ACTIVE") {
        reasons.push({ code: "SUBSCRIPTION_ACTIVE", label: "Subscription is active" });
    }

    if (reasons.length === 0) {
        reasons.push({ code: "NEW_DELIVERY", label: "New delivery added" });
    }

    return reasons;
};

/**
 * Infer the reason why the QUANTITY changed for a returning customer
 */
const inferQuantityChangeReason = (delta, customerSub, user) => {
    if (delta < 0) {
        const reasons = [];
        if (Math.abs(delta) < (customerSub?.quantity || 1)) {
            reasons.push({ code: "PARTIAL_PAUSE", label: "Customer reduced quantity temporarily" });
        }
        if (user?.walletBalance !== undefined && user.walletBalance < 100) {
            reasons.push({ code: "LOW_BALANCE_QTY", label: "Reduced due to low wallet balance" });
        }
        if (customerSub?.frequency === "ALTERNATE_DAYS") {
            reasons.push({ code: "ALT_DAY_QTY", label: "Alternate-day quantity adjustment" });
        }
        reasons.push({ code: "CUSTOMER_MODIFIED_QTY", label: "Customer modified delivery quantity" });
        return reasons;
    } else {
        return [
            { code: "INCREASED_QTY", label: "Customer increased delivery quantity" },
            { code: "RECHARGED", label: "Customer may have recharged wallet" }
        ];
    }
};

/**
 * GET /api/analytics/delivery-comparison/filter-options
 * Returns riders, hubs, and service areas for dropdown lists
 */
exports.getFilterOptions = async (req, res) => {
    try {
        const Employee = require("../models/Employee");
        const Hub = require("../models/Hub");
        const ServiceArea = require("../models/ServiceArea");

        const [riders, hubs, serviceAreas] = await Promise.all([
            Employee.find({ role: "RIDER" }).select("name _id").sort("name"),
            Hub.find({}).select("name _id").sort("name"),
            ServiceArea.find({}).select("name _id").sort("name"),
        ]);

        res.json({ success: true, result: { riders, hubs, serviceAreas } });
    } catch (error) {
        console.error("Filter options error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/analytics/delivery-comparison
 * Query params:
 *   date1, date2      — dates to compare (default: today vs tomorrow)
 *   filterType        — "rider" | "hub" | "serviceArea" (optional)
 *   filterId          — ObjectId of the selected rider/hub/serviceArea (optional)
 */
exports.getDeliveryComparison = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const date1Start = req.query.date1 ? new Date(req.query.date1) : today;
        const date2Start = req.query.date2 ? new Date(req.query.date2) : tomorrow;
        date1Start.setHours(0, 0, 0, 0);
        date2Start.setHours(0, 0, 0, 0);

        const date1End = new Date(date1Start);
        date1End.setHours(23, 59, 59, 999);
        const date2End = new Date(date2Start);
        date2End.setHours(23, 59, 59, 999);

        const filterType = req.query.filterType || null; // "rider" | "hub" | "serviceArea"
        const filterId = req.query.filterId || null;

        // ── Build extra filter on orders / customers ──────────────────────────
        let orderFilter = {};
        let customerIdSet = null; // if set, we only look at these customer IDs

        if (filterId && filterType) {
            const oid = new mongoose.Types.ObjectId(filterId);

            if (filterType === "rider") {
                // Filter orders by assignedRider OR deliveryBoy on order
                orderFilter = {
                    $or: [
                        { assignedRider: oid },
                        { deliveryBoy: oid }
                    ]
                };
                // Also include customers whose default deliveryBoy matches
                const riderCustomers = await User.find({ deliveryBoy: oid }).select("_id").lean();
                if (riderCustomers.length > 0 && !Object.keys(orderFilter).length) {
                    customerIdSet = riderCustomers.map(u => u._id.toString());
                }
            } else if (filterType === "hub") {
                // Customers belonging to this hub
                const hubCustomers = await User.find({ hub: oid }).select("_id").lean();
                customerIdSet = hubCustomers.map(u => u._id.toString());
            } else if (filterType === "serviceArea") {
                // Customers in this service area
                const saCustomers = await User.find({ serviceArea: oid }).select("_id").lean();
                customerIdSet = saCustomers.map(u => u._id.toString());
            }
        }

        // If filtering by hub or serviceArea, add customer constraint to orders
        const buildOrderQuery = (dateStart, dateEnd) => {
            const q = {
                deliveryDate: { $gte: dateStart, $lte: dateEnd },
                status: { $nin: ["cancelled"] },
                orderType: "DELIVERY",
                ...orderFilter
            };
            if (customerIdSet) {
                q.customer = { $in: customerIdSet.map(id => new mongoose.Types.ObjectId(id)) };
            }
            return q;
        };

        const [orders1, orders2] = await Promise.all([
            Order.find(buildOrderQuery(date1Start, date1End))
                .populate("customer", "name mobile customerId walletBalance hub serviceArea")
                .populate("products.product", "name")
                .populate("assignedRider", "name")
                .lean(),
            Order.find(buildOrderQuery(date2Start, date2End))
                .populate("customer", "name mobile customerId walletBalance hub serviceArea")
                .populate("products.product", "name")
                .populate("assignedRider", "name")
                .lean()
        ]);

        // Build customer → orders map
        const mapOrders = (orders) => {
            const map = {};
            orders.forEach(order => {
                if (order.customer) {
                    const cid = order.customer._id.toString();
                    if (!map[cid]) map[cid] = [];
                    map[cid].push(order);
                }
            });
            return map;
        };

        const map1 = mapOrders(orders1);
        const map2 = mapOrders(orders2);
        const allCustomerIds = new Set([...Object.keys(map1), ...Object.keys(map2)]);

        // Fetch subscriptions and user records in bulk
        const subMap = {};
        const subs = await Subscription.find({
            customer: { $in: [...allCustomerIds] },
            status: { $in: ["ACTIVE", "PAUSED", "CANCELLED"] }
        }).lean();
        subs.forEach(sub => {
            const cid = sub.customer.toString();
            if (!subMap[cid]) subMap[cid] = sub;
        });

        const userMap = {};
        const users = await User.find({ _id: { $in: [...allCustomerIds] } }).lean();
        users.forEach(u => { userMap[u._id.toString()] = u; });

        const added = [], removed = [], modified = [], unchanged = [];

        allCustomerIds.forEach(cid => {
            const in1 = map1[cid];
            const in2 = map2[cid];
            const sub = subMap[cid] || null;
            const user = userMap[cid] || null;
            const customer = (in1?.[0]?.customer || in2?.[0]?.customer) || null;

            const totalQty = (orders) =>
                (orders || []).reduce((sum, o) =>
                    sum + o.products.reduce((s, p) => s + p.quantity, 0), 0);

            const productSummary = (orders) =>
                (orders || []).flatMap(o =>
                    o.products.map(p => ({
                        name: p.product?.name || "Unknown",
                        quantity: p.quantity,
                        price: p.price
                    }))
                );

            const riderName = (in1?.[0]?.assignedRider?.name || in2?.[0]?.assignedRider?.name || "—");

            const baseCustomer = {
                _id: cid,
                name: customer?.name || "Unknown",
                mobile: customer?.mobile || "",
                customerId: customer?.customerId || "",
                walletBalance: user?.walletBalance || 0,
                hub: customer?.hub || null,
                serviceArea: customer?.serviceArea || null,
                rider: riderName
            };

            const qty1 = totalQty(in1);
            const qty2 = totalQty(in2);

            if (!in1 && in2) {
                added.push({ customer: baseCustomer, qty2, products: productSummary(in2), reasons: inferAdditionReason(sub, user) });
            } else if (in1 && !in2) {
                removed.push({ customer: baseCustomer, qty1, products: productSummary(in1), reasons: inferRemovalReason(sub, user) });
            } else if (in1 && in2) {
                const delta = qty2 - qty1;
                if (delta !== 0) {
                    modified.push({
                        customer: baseCustomer, qty1, qty2, delta,
                        products1: productSummary(in1),
                        products2: productSummary(in2),
                        reasons: inferQuantityChangeReason(delta, sub, user)
                    });
                } else {
                    unchanged.push({ customer: baseCustomer, qty: qty1, products: productSummary(in1) });
                }
            }
        });

        const summary = {
            date1: date1Start.toISOString().split("T")[0],
            date2: date2Start.toISOString().split("T")[0],
            filterType: filterType || "all",
            filterId: filterId || null,
            totalDate1: orders1.length,
            totalDate2: orders2.length,
            added: added.length,
            removed: removed.length,
            modified: modified.length,
            unchanged: unchanged.length,
            netChange: orders2.length - orders1.length
        };

        res.json({ success: true, result: { summary, added, removed, modified, unchanged } });

    } catch (error) {
        console.error("Delivery comparison error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
