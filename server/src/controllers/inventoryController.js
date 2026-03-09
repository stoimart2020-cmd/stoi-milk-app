const MilkCollection = require("../models/MilkCollection");
const ProductionLog = require("../models/ProductionLog");
const Subscription = require("../models/Subscription");
const Order = require("../models/Order");
const Product = require("../models/Product");

// --- Helper: Get Daily Demand (Projected) ---
const getDailyDemand = async (date) => {
    // 1. Get Active Subscriptions for the date
    // 2. Sum up quantities based on Product Volume
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][checkDate.getDay()];

    const subscriptions = await Subscription.find({
        status: "active",
        startDate: { $lte: checkDate },
        $or: [{ endDate: { $exists: false } }, { endDate: { $gte: checkDate } }]
    }).populate("product");

    let totalLitersDemand = 0;

    subscriptions.forEach(sub => {
        let quantity = 0;
        // Frequency Logic (Simplified duplication from dashboardController)
        if (sub.frequency === "Daily") quantity = sub.quantity;
        else if (sub.frequency === "Alternate Days") {
            const start = new Date(sub.startDate); start.setHours(0, 0, 0, 0);
            const diff = Math.floor((checkDate - start) / (1000 * 60 * 60 * 24));
            if (diff % 2 === 0) quantity = sub.quantity;
            else quantity = sub.alternateQuantity || 0;
        }
        else if (sub.frequency === "Weekdays" && checkDate.getDay() >= 1 && checkDate.getDay() <= 5) quantity = sub.quantity;
        else if (sub.frequency === "Weekends" && (checkDate.getDay() === 0 || checkDate.getDay() === 6)) quantity = sub.quantity;
        else if (sub.frequency === "Custom") {
            if (sub.customSchedule && sub.customSchedule.get(dayName)) quantity = sub.customSchedule.get(dayName);
            else if (sub.customDays && sub.customDays.includes(dayName)) quantity = sub.quantity;
        }

        // Convert to Liters
        if (quantity > 0 && sub.product) {
            let volume = 0.5; // Default 500ml?
            // Use Product Unit Value
            if (sub.product.unit === "litre" || sub.product.unit === "l") volume = sub.product.unitValue || 1;
            else if (sub.product.unit === "ml") volume = (sub.product.unitValue || 500) / 1000;

            totalLitersDemand += (quantity * volume);
        }
    });

    return totalLitersDemand;
};

// --- Inventory Status ---

exports.getDailyStockStatus = async (req, res) => {
    try {
        const dateStr = req.query.date || new Date().toISOString().split('T')[0];
        const date = new Date(dateStr);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        // 1. Total Collected
        const collections = await MilkCollection.find({
            date: { $gte: startOfDay, $lte: endOfDay }
        });
        const totalCollected = collections.reduce((sum, c) => sum + c.quantity, 0);

        // 2. Total Demand (Forecast)
        const totalDemand = await getDailyDemand(dateStr);

        // 3. Production Log (Packed)
        const productionLog = await ProductionLog.findOne({
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        const totalPacked = productionLog ? productionLog.totalMilkUsed : 0;
        const totalWasted = productionLog ? productionLog.wastage : 0;

        // 4. Sold (Actual Orders)
        // If past date, use Orders. If today/future, strictly use Demand?
        // Let's use Orders for accuracy if date <= today
        const orders = await Order.find({
            deliveryDate: { $gte: startOfDay, $lte: endOfDay },
            status: { $ne: "cancelled" } // Include delivered, pending
        }).populate("products.product");

        let totalSoldLiters = 0;
        orders.forEach(order => {
            order.products.forEach(item => {
                const p = item.product;
                if (!p) return;
                let vol = 0;
                if (p.unit === "litre" || p.unit === "l") vol = p.unitValue || 1;
                else if (p.unit === "ml") vol = (p.unitValue || 500) / 1000;

                totalSoldLiters += (item.quantity * vol);
            });
        });

        // 5. Remaining / Surplus
        // Remaining Raw Milk = Collected - Packed - Wasted (If packed includes wasted? No usually Packed is output, Wasted is loss)
        // Let's say Input = Output + Waste
        // Variance = Collected - (Packed + Wasted)
        const variance = totalCollected - (totalPacked + totalWasted);

        // Remaining Packed Inventory = Packed - Sold
        const inventorySurplus = totalPacked - totalSoldLiters;

        res.status(200).json({
            success: true,
            date: dateStr,
            metrics: {
                collected: totalCollected,
                demand: totalDemand,
                packed: totalPacked,
                sold: totalSoldLiters,
                wasted: totalWasted,
                variance: variance, // Raw milk unaccounted
                surplus: inventorySurplus // Packed milk unsold
            },
            details: {
                collections: collections.length,
                productionLogId: productionLog?._id
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.addProductionLog = async (req, res) => {
    try {
        const { date, productsProduced, wastage, notes } = req.body;

        // Calculate total milk used
        let totalMilkUsed = 0;
        // Look up products to get volumes
        for (let item of productsProduced) {
            const product = await Product.findById(item.product);
            if (product) {
                let vol = 0;
                if (product.unit === "litre" || product.unit === "l") vol = product.unitValue || 1;
                else if (product.unit === "ml") vol = (product.unitValue || 500) / 1000;

                // Accumulate volume used
                totalMilkUsed += (item.quantityProduced * vol);

                // Save unitVolume in log for reference
                item.unitVolume = vol;
            }
        }

        // Check if log exists for date, update or create
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        let log = await ProductionLog.findOne({ date: { $gte: checkDate, $lte: dayEnd } });

        if (log) {
            log.totalMilkUsed = totalMilkUsed;
            log.productsProduced = productsProduced;
            log.wastage = wastage || 0;
            log.notes = notes;
            await log.save();
        } else {
            log = await ProductionLog.create({
                date,
                totalMilkUsed,
                productsProduced,
                wastage,
                notes
            });
        }

        res.status(200).json({ success: true, result: log });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
