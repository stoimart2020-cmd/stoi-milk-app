const Vendor = require("../models/Vendor");
const MilkCollection = require("../models/MilkCollection");
const VendorPayment = require("../models/VendorPayment");
const { sendCollectionNotification } = require("../utils/notification");
const { scopeVendorFilter, scopeCollectionFilter } = require("../middleware/scope");

// --- Vendor Management ---

exports.createVendor = async (req, res) => {
    try {
        const vendor = await Vendor.create(req.body);
        res.status(201).json({ success: true, result: vendor });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getVendors = async (req, res) => {
    try {
        let query = {};
        query = scopeVendorFilter(req.scope, query);
        const vendors = await Vendor.find(query).populate('factory', 'name').sort({ createdAt: -1 });
        res.status(200).json({ success: true, result: vendors });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });
        res.status(200).json({ success: true, result: vendor });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.deleteVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findByIdAndDelete(req.params.id);
        if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });
        res.status(200).json({ success: true, message: "Vendor deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- Milk Collection ---

exports.addMilkCollection = async (req, res) => {
    try {
        const collection = await MilkCollection.create(req.body);

        // Trigger Notification
        try {
            const vendor = await Vendor.findById(req.body.vendor);
            if (vendor) {
                await sendCollectionNotification(vendor, collection);
            }
        } catch (notifyErr) {
            console.error("Failed to send collection notification:", notifyErr.message);
        }

        res.status(201).json({ success: true, result: collection });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getMilkCollectionHistory = async (req, res) => {
    try {
        const { startDate, endDate, vendorId } = req.query;
        let query = {};

        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            query.date = {
                $gte: start,
                $lte: end
            };
        } else if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(startDate);
            end.setHours(23, 59, 59, 999);
            query.date = { $gte: start, $lte: end };
        }

        if (vendorId) {
            query.vendor = vendorId;
        }

        // Apply Scope Filter
        if (!req.scope?.fullAccess) {
            const vendorQuery = scopeVendorFilter(req.scope, {});
            const validVendors = await Vendor.find(vendorQuery).select("_id").lean();
            const validVendorIds = validVendors.map(v => v._id);
            query = scopeCollectionFilter(req.scope, query, validVendorIds);
        }

        const history = await MilkCollection.find(query)
            .populate("vendor", "name code")
            .sort({ date: -1 });

        const totalQuantity = history.reduce((acc, curr) => acc + curr.quantity, 0);
        const totalAmount = history.reduce((acc, curr) => acc + curr.totalAmount, 0);

        res.status(200).json({
            success: true,
            result: history,
            analytics: { totalQuantity, totalAmount, count: history.length }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- Payment Summary (per vendor & overall) ---

exports.getVendorPaymentSummary = async (req, res) => {
    try {
        const { startDate, endDate, vendorId } = req.query;

        // Date range — default to current month
        const now = new Date();
        const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);

        // Build match for collections
        let collectionMatch = { date: { $gte: start, $lte: end } };
        if (vendorId) collectionMatch.vendor = new (require("mongoose").Types.ObjectId)(vendorId);

        // Payment match
        let paymentMatch = { date: { $gte: start, $lte: end } };
        if (vendorId) paymentMatch.vendor = new (require("mongoose").Types.ObjectId)(vendorId);

        // Apply Scope Filter
        if (!req.scope?.fullAccess) {
            const vendorQuery = scopeVendorFilter(req.scope, {});
            const validVendors = await Vendor.find(vendorQuery).select("_id").lean();
            const validVendorIds = validVendors.map(v => v._id);
            collectionMatch = scopeCollectionFilter(req.scope, collectionMatch, validVendorIds);
            paymentMatch = scopeCollectionFilter(req.scope, paymentMatch, validVendorIds);
        }

        // Aggregate milk collections per vendor
        const collectionAgg = await MilkCollection.aggregate([
            { $match: collectionMatch },
            {
                $group: {
                    _id: "$vendor",
                    totalQuantity: { $sum: "$quantity" },
                    totalAmount: { $sum: "$totalAmount" },
                    collectionCount: { $sum: 1 },
                    avgFat: { $avg: "$fat" },
                    avgSNF: { $avg: "$snf" },
                    avgRate: { $avg: "$rate" },
                }
            }
        ]);

        // Aggregate payments per vendor
        const paymentAgg = await VendorPayment.aggregate([
            { $match: paymentMatch },
            {
                $group: {
                    _id: "$vendor",
                    totalPaid: { $sum: "$amount" },
                    paymentCount: { $sum: 1 }
                }
            }
        ]);

        // Map payments by vendor
        const paymentMap = {};
        paymentAgg.forEach(p => { paymentMap[p._id.toString()] = p; });

        // Get vendor details
        const vendorIds = [...new Set([
            ...collectionAgg.map(c => c._id.toString()),
            ...paymentAgg.map(p => p._id.toString())
        ])];
        const vendors = await Vendor.find({ _id: { $in: vendorIds } }).select("name code mobile ratePerLiter factory").populate("factory", "name");
        const vendorMap = {};
        vendors.forEach(v => { vendorMap[v._id.toString()] = v; });

        // Build per-vendor summary
        const vendorSummaries = collectionAgg.map(c => {
            const vid = c._id.toString();
            const payment = paymentMap[vid] || { totalPaid: 0, paymentCount: 0 };
            const vendor = vendorMap[vid] || {};
            return {
                vendorId: vid,
                vendorName: vendor.name || "Unknown",
                vendorCode: vendor.code || "",
                vendorMobile: vendor.mobile || "",
                factory: vendor.factory?.name || "",
                ratePerLiter: vendor.ratePerLiter || 0,
                totalQuantity: Math.round(c.totalQuantity * 100) / 100,
                totalAmount: Math.round(c.totalAmount * 100) / 100,
                collectionCount: c.collectionCount,
                avgFat: Math.round((c.avgFat || 0) * 100) / 100,
                avgSNF: Math.round((c.avgSNF || 0) * 100) / 100,
                avgRate: Math.round((c.avgRate || 0) * 100) / 100,
                totalPaid: Math.round((payment.totalPaid || 0) * 100) / 100,
                paymentCount: payment.paymentCount || 0,
                balanceDue: Math.round((c.totalAmount - (payment.totalPaid || 0)) * 100) / 100,
            };
        });

        // Overall summary
        const overallSummary = {
            totalQuantity: vendorSummaries.reduce((a, v) => a + v.totalQuantity, 0),
            totalAmount: vendorSummaries.reduce((a, v) => a + v.totalAmount, 0),
            totalPaid: vendorSummaries.reduce((a, v) => a + v.totalPaid, 0),
            balanceDue: vendorSummaries.reduce((a, v) => a + v.balanceDue, 0),
            vendorCount: vendorSummaries.length,
            totalCollections: vendorSummaries.reduce((a, v) => a + v.collectionCount, 0),
        };

        res.status(200).json({
            success: true,
            period: { start, end },
            overall: overallSummary,
            vendors: vendorSummaries.sort((a, b) => b.totalAmount - a.totalAmount)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- Record Payment to Vendor ---

exports.recordVendorPayment = async (req, res) => {
    try {
        const { vendor, amount, method, reference, notes, date } = req.body;

        if (!vendor || !amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Vendor and a positive amount are required" });
        }

        const vendorDoc = await Vendor.findById(vendor);
        if (!vendorDoc) return res.status(404).json({ success: false, message: "Vendor not found" });

        const payment = await VendorPayment.create({
            vendor,
            amount: Number(amount),
            method: method || "Bank Transfer",
            reference: reference || "",
            notes: notes || "",
            date: date ? new Date(date) : new Date(),
            recordedBy: req.user?._id || null
        });

        res.status(201).json({ success: true, result: payment });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// --- Get Payments for a Vendor ---

exports.getVendorPayments = async (req, res) => {
    try {
        const { vendorId, startDate, endDate } = req.query;
        let query = {};
        if (vendorId) query.vendor = vendorId;
        if (startDate || endDate) {
            query.date = {};
            if (startDate) { const s = new Date(startDate); s.setHours(0, 0, 0, 0); query.date.$gte = s; }
            if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); query.date.$lte = e; }
        }

        // Apply Scope Filter
        if (!req.scope?.fullAccess) {
            const vendorQuery = scopeVendorFilter(req.scope, {});
            const validVendors = await Vendor.find(vendorQuery).select("_id").lean();
            const validVendorIds = validVendors.map(v => v._id);
            query = scopeCollectionFilter(req.scope, query, validVendorIds);
        }

        const payments = await VendorPayment.find(query)
            .populate("vendor", "name code")
            .sort({ date: -1 });

        const totalPaid = payments.reduce((a, p) => a + p.amount, 0);

        res.status(200).json({
            success: true,
            result: payments,
            analytics: { totalPaid, count: payments.length }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- Milk Collection Summary (flexible grouping) ---

exports.getMilkCollectionSummary = async (req, res) => {
    try {
        const { groupBy, startDate, endDate, shift, vendorId } = req.query;
        // groupBy: "yearly" | "monthly" | "weekly" | "daily" (default: daily)
        // shift: "Morning" | "Evening" | "" (all)

        // Build date range
        const now = new Date();
        let start, end;

        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
        } else if (groupBy === "yearly") {
            start = new Date(now.getFullYear() - 4, 0, 1); // last 5 years
            end = new Date(now.getFullYear(), 11, 31);
        } else if (groupBy === "monthly") {
            start = new Date(now.getFullYear(), 0, 1); // current year
            end = new Date(now.getFullYear(), 11, 31);
        } else if (groupBy === "weekly") {
            start = new Date(now.getFullYear(), now.getMonth(), 1); // current month
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else {
            // daily — default to current month
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // Build match
        let match = { date: { $gte: start, $lte: end } };
        if (shift && (shift === "Morning" || shift === "Evening")) {
            match.shift = shift;
        }
        if (vendorId) {
            match.vendor = new (require("mongoose").Types.ObjectId)(vendorId);
        }

        // Apply Scope Filter
        if (!req.scope?.fullAccess) {
            const vendorQuery = scopeVendorFilter(req.scope, {});
            const validVendors = await Vendor.find(vendorQuery).select("_id").lean();
            const validVendorIds = validVendors.map(v => v._id);
            match = scopeCollectionFilter(req.scope, match, validVendorIds);
        }

        // Build group key based on groupBy
        let groupKey;
        if (groupBy === "yearly") {
            groupKey = { year: { $year: "$date" } };
        } else if (groupBy === "monthly") {
            groupKey = { year: { $year: "$date" }, month: { $month: "$date" } };
        } else if (groupBy === "weekly") {
            groupKey = { year: { $year: "$date" }, week: { $isoWeek: "$date" } };
        } else {
            // daily
            groupKey = {
                year: { $year: "$date" },
                month: { $month: "$date" },
                day: { $dayOfMonth: "$date" }
            };
        }

        // ─── Period-wise aggregation ───
        const periodAgg = await MilkCollection.aggregate([
            { $match: match },
            {
                $group: {
                    _id: groupKey,
                    totalQuantity: { $sum: "$quantity" },
                    totalAmount: { $sum: "$totalAmount" },
                    avgFat: { $avg: "$fat" },
                    avgSNF: { $avg: "$snf" },
                    avgRate: { $avg: "$rate" },
                    avgCLR: { $avg: "$clr" },
                    collectionCount: { $sum: 1 },
                    morningQty: {
                        $sum: { $cond: [{ $eq: ["$shift", "Morning"] }, "$quantity", 0] }
                    },
                    eveningQty: {
                        $sum: { $cond: [{ $eq: ["$shift", "Evening"] }, "$quantity", 0] }
                    },
                    morningAmt: {
                        $sum: { $cond: [{ $eq: ["$shift", "Morning"] }, "$totalAmount", 0] }
                    },
                    eveningAmt: {
                        $sum: { $cond: [{ $eq: ["$shift", "Evening"] }, "$totalAmount", 0] }
                    }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1, "_id.week": -1, "_id.day": -1 } }
        ]);

        // Build human-readable labels
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const periods = periodAgg.map(p => {
            let label;
            if (groupBy === "yearly") label = `${p._id.year}`;
            else if (groupBy === "monthly") label = `${months[p._id.month - 1]} ${p._id.year}`;
            else if (groupBy === "weekly") label = `Week ${p._id.week}, ${p._id.year}`;
            else label = `${p._id.day} ${months[p._id.month - 1]} ${p._id.year}`;

            return {
                label,
                key: p._id,
                totalQuantity: Math.round(p.totalQuantity * 100) / 100,
                totalAmount: Math.round(p.totalAmount * 100) / 100,
                avgFat: Math.round((p.avgFat || 0) * 100) / 100,
                avgSNF: Math.round((p.avgSNF || 0) * 100) / 100,
                avgRate: Math.round((p.avgRate || 0) * 100) / 100,
                avgCLR: Math.round((p.avgCLR || 0) * 100) / 100,
                collectionCount: p.collectionCount,
                morningQty: Math.round(p.morningQty * 100) / 100,
                eveningQty: Math.round(p.eveningQty * 100) / 100,
                morningAmt: Math.round(p.morningAmt * 100) / 100,
                eveningAmt: Math.round(p.eveningAmt * 100) / 100,
            };
        });

        // ─── Vendor-wise aggregation ───
        const vendorAgg = await MilkCollection.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$vendor",
                    totalQuantity: { $sum: "$quantity" },
                    totalAmount: { $sum: "$totalAmount" },
                    avgFat: { $avg: "$fat" },
                    avgSNF: { $avg: "$snf" },
                    avgRate: { $avg: "$rate" },
                    collectionCount: { $sum: 1 },
                    morningQty: {
                        $sum: { $cond: [{ $eq: ["$shift", "Morning"] }, "$quantity", 0] }
                    },
                    eveningQty: {
                        $sum: { $cond: [{ $eq: ["$shift", "Evening"] }, "$quantity", 0] }
                    }
                }
            },
            { $sort: { totalQuantity: -1 } }
        ]);

        // Get vendor names
        const vendorIds = vendorAgg.map(v => v._id);
        const vendorDocs = await Vendor.find({ _id: { $in: vendorIds } }).select("name code").lean();
        const vendorMap = {};
        vendorDocs.forEach(v => { vendorMap[v._id.toString()] = v; });

        const vendorBreakdown = vendorAgg.map(v => ({
            vendorId: v._id?.toString(),
            vendorName: vendorMap[v._id?.toString()]?.name || "Unknown",
            vendorCode: vendorMap[v._id?.toString()]?.code || "",
            totalQuantity: Math.round(v.totalQuantity * 100) / 100,
            totalAmount: Math.round(v.totalAmount * 100) / 100,
            avgFat: Math.round((v.avgFat || 0) * 100) / 100,
            avgSNF: Math.round((v.avgSNF || 0) * 100) / 100,
            avgRate: Math.round((v.avgRate || 0) * 100) / 100,
            collectionCount: v.collectionCount,
            morningQty: Math.round(v.morningQty * 100) / 100,
            eveningQty: Math.round(v.eveningQty * 100) / 100,
        }));

        // ─── Overall totals ───
        const overall = {
            totalQuantity: periods.reduce((a, p) => a + p.totalQuantity, 0),
            totalAmount: periods.reduce((a, p) => a + p.totalAmount, 0),
            totalCollections: periods.reduce((a, p) => a + p.collectionCount, 0),
            morningQty: periods.reduce((a, p) => a + p.morningQty, 0),
            eveningQty: periods.reduce((a, p) => a + p.eveningQty, 0),
            avgFat: periods.length > 0 ? Math.round((periods.reduce((a, p) => a + p.avgFat, 0) / periods.length) * 100) / 100 : 0,
            avgSNF: periods.length > 0 ? Math.round((periods.reduce((a, p) => a + p.avgSNF, 0) / periods.length) * 100) / 100 : 0,
            avgRate: periods.length > 0 ? Math.round((periods.reduce((a, p) => a + p.avgRate, 0) / periods.length) * 100) / 100 : 0,
            vendorCount: vendorBreakdown.length,
        };

        // Round overall
        overall.totalQuantity = Math.round(overall.totalQuantity * 100) / 100;
        overall.totalAmount = Math.round(overall.totalAmount * 100) / 100;
        overall.morningQty = Math.round(overall.morningQty * 100) / 100;
        overall.eveningQty = Math.round(overall.eveningQty * 100) / 100;

        res.status(200).json({
            success: true,
            groupBy: groupBy || "daily",
            period: { start, end },
            shift: shift || "All",
            overall,
            periods,
            vendors: vendorBreakdown
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

