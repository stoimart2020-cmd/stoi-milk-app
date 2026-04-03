const MilkCollection = require("../models/MilkCollection");
const ProductionLog = require("../models/ProductionLog");
const Subscription = require("../models/Subscription");
const Order = require("../models/Order");
const Product = require("../models/Product");

// --- Helper: Get Daily Demand (Projected) ---
const getDailyDemand = async (date) => {
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

// --- Advanced: Logistics Forecast 4-Tier Breakdown (Rider -> Hub -> Truck -> Factory) ---
exports.getLogisticsForecast = async (req, res) => {
    try {
        const dateStr = req.query.date || new Date(Date.now() + 86400000).toISOString().split('T')[0]; // Default: Tomorrow
        const targetDate = new Date(dateStr);
        targetDate.setHours(0, 0, 0, 0);
        const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][targetDate.getDay()];

        const Employee = require("../models/Employee");
        const truckDrivers = await Employee.find({ role: "TRUCK_DRIVER", isActive: true });
        
        // Map Hubs to Truck Drivers
        const hubToDriverMap = {}; // hubId -> { _id, name }
        truckDrivers.forEach(d => {
            if (d.hubs && d.hubs.length > 0) {
                d.hubs.forEach(h => {
                    hubToDriverMap[h.toString()] = { _id: d._id.toString(), name: d.name };
                });
            }
        });

        const forecastData = {
            totalLiters: 0,
            trucks: {}, // truckId -> { name, hubs: {}, products: {} }
            factoryProducts: {} // Factor total aggregates
        };
        
        const getStructures = (hubId, hubName, riderId, riderName) => {
            const driver = hubToDriverMap[hubId] || { _id: 'unassigned_truck', name: 'Unassigned Truck' };
            const did = driver._id;
            
            if (!forecastData.trucks[did]) {
                forecastData.trucks[did] = { name: driver.name, hubs: {}, products: {} };
            }
            if (!forecastData.trucks[did].hubs[hubId]) {
                forecastData.trucks[did].hubs[hubId] = { name: hubName, riders: {}, products: {} };
            }
            if (!forecastData.trucks[did].hubs[hubId].riders[riderId]) {
                forecastData.trucks[did].hubs[hubId].riders[riderId] = { name: riderName, products: {} };
            }
            
            return {
                truckNode: forecastData.trucks[did],
                hubNode: forecastData.trucks[did].hubs[hubId],
                riderNode: forecastData.trucks[did].hubs[hubId].riders[riderId]
            };
        };
        
        const addProductData = (nodes, p, qty) => {
            const pid = p._id.toString();
            let vol = 0;
            if (p.unit === "litre" || p.unit === "l") vol = p.unitValue || 1;
            else if (p.unit === "ml") vol = (p.unitValue || 500) / 1000;
            const liters = qty * vol;
            
            const baseProduct = { name: p.name, units: 0, liters: 0, unit: p.unit, unitValue: p.unitValue, unitsPerCrate: p.unitsPerCrate || 12 };

            // 1. Factory aggregate
            if (!forecastData.factoryProducts[pid]) forecastData.factoryProducts[pid] = { ...baseProduct };
            forecastData.factoryProducts[pid].units += qty;
            forecastData.factoryProducts[pid].liters += liters;

            // 2. Truck aggregate
            if (!nodes.truckNode.products[pid]) nodes.truckNode.products[pid] = { ...baseProduct };
            nodes.truckNode.products[pid].units += qty;
            nodes.truckNode.products[pid].liters += liters;

            // 3. Hub aggregate
            if (!nodes.hubNode.products[pid]) nodes.hubNode.products[pid] = { ...baseProduct };
            nodes.hubNode.products[pid].units += qty;
            nodes.hubNode.products[pid].liters += liters;

            // 4. Rider aggregate
            if (!nodes.riderNode.products[pid]) nodes.riderNode.products[pid] = { ...baseProduct };
            nodes.riderNode.products[pid].units += qty;
            nodes.riderNode.products[pid].liters += liters;

            forecastData.totalLiters += liters;
        };

        // 1. Check if Orders already exist for this date
        const existingOrders = await Order.find({
            deliveryDate: { 
                $gte: new Date(targetDate), 
                $lte: new Date(targetDate.getTime() + 86399999) 
            },
            status: { $ne: "cancelled" }
        }).populate({
            path: "customer",
            select: "name hub",
            populate: { path: "hub", select: "name" }
        }).populate("products.product").populate("assignedRider", "name").lean();

        if (existingOrders.length > 0) {
            console.log(`[Logistics] Using ${existingOrders.length} actual orders for ${dateStr}`);
            
            for (const order of existingOrders) {
                const hub = order.customer?.hub;
                const hubId = hub?._id?.toString() || "unassigned_hub";
                const hubName = hub?.name || "Unassigned Hub";
                
                const rider = order.assignedRider;
                const riderId = rider?._id?.toString() || "unassigned_rider";
                const riderName = rider?.name || "Unassigned Rider";

                const nodes = getStructures(hubId, hubName, riderId, riderName);

                for (const item of order.products) {
                    if (item.product) {
                        addProductData(nodes, item.product, item.quantity);
                    }
                }
            }
        } else {
            console.log(`[Logistics] Projecting subscriptions for ${dateStr}`);
            const subscriptions = await Subscription.find({
                status: "active",
                startDate: { $lte: targetDate },
                $or: [{ endDate: { $exists: false } }, { endDate: { $gte: targetDate } }]
            }).populate({
                path: "user",
                select: "name hub deliveryBoy",
                populate: { path: "hub", select: "name" }
            }).populate("product").populate("assignedRider", "name").lean();

            // Pre-fetch all riders for fallback mapping (avoid findById in loop)
            const allRiders = await Employee.find({ role: { $in: ["RIDER", "TRUCK_DRIVER"] } }).select("name").lean();
            const riderMap = {};
            allRiders.forEach(r => riderMap[r._id.toString()] = r.name);
            
            for (const sub of subscriptions) {
                let qty = 0;
                if (sub.frequency === "Daily") qty = sub.quantity;
                else if (sub.frequency === "Alternate Days") {
                    const diff = Math.floor((targetDate - new Date(sub.startDate).setHours(0,0,0,0)) / 86400000);
                    qty = (diff % 2 === 0) ? sub.quantity : (sub.alternateQuantity || 0);
                }
                else if (sub.frequency === "Weekdays" && targetDate.getDay() >= 1 && targetDate.getDay() <= 5) qty = sub.quantity;
                else if (sub.frequency === "Weekends" && (targetDate.getDay() === 0 || targetDate.getDay() === 6)) qty = sub.quantity;
                else if (sub.frequency === "Custom") {
                    qty = (sub.customSchedule && sub.customSchedule.get(dayName)) || 
                          (sub.customDays && sub.customDays.includes(dayName) ? sub.quantity : 0);
                }

                if (qty <= 0) continue;

                // Resolve Hub & Rider Hierarchy
                const hub = sub.user?.hub;
                const hubId = hub?._id?.toString() || (sub.user?.hub ? sub.user.hub.toString() : "unassigned_hub");
                const hubName = hub?.name || "Unassigned Hub";

                // Rider priority: Subscription explicit rider -> Customer explicit rider -> unassigned
                let riderId = "unassigned_rider";
                let riderName = "Unassigned Rider";
                
                if (sub.assignedRider) {
                    riderId = sub.assignedRider._id?.toString() || sub.assignedRider.toString();
                    riderName = sub.assignedRider.name || "Assigned Rider";
                } else if (sub.user?.deliveryBoy) {
                    const dboyId = sub.user.deliveryBoy.toString();
                    riderId = dboyId;
                    riderName = riderMap[dboyId] || "Assigned Rider";
                }

                const nodes = getStructures(hubId, hubName, riderId, riderName);
                if (sub.product) addProductData(nodes, sub.product, qty);
            }
        }

        res.status(200).json({
            success: true,
            date: dateStr,
            totalLiters: forecastData.totalLiters.toFixed(2),
            hierarchy: {
                trucks: forecastData.trucks,
                factoryProducts: forecastData.factoryProducts
            }
        });

    } catch (error) {
        console.error("Logistics Forecast Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

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
        const orders = await Order.find({
            deliveryDate: { $gte: startOfDay, $lte: endOfDay },
            status: { $ne: "cancelled" }
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

        const variance = totalCollected - (totalPacked + totalWasted);
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
                variance: variance,
                surplus: inventorySurplus
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

        let totalMilkUsed = 0;
        for (let item of productsProduced) {
            const product = await Product.findById(item.product);
            if (product) {
                let vol = 0;
                if (product.unit === "litre" || product.unit === "l") vol = product.unitValue || 1;
                else if (product.unit === "ml") vol = (product.unitValue || 500) / 1000;
                totalMilkUsed += (item.quantityProduced * vol);
                item.unitVolume = vol;
            }
        }

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

