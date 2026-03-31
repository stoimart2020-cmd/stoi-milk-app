// --- Advanced: Logistics Forecast (Hub & Product Breakdown) ---
exports.getLogisticsForecast = async (req, res) => {
    try {
        const dateStr = req.query.date || new Date(Date.now() + 86400000).toISOString().split('T')[0]; // Default: Tomorrow
        const targetDate = new Date(dateStr);
        targetDate.setHours(0, 0, 0, 0);
        const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][targetDate.getDay()];

        // 1. Check if Orders already exist for this date
        const existingOrders = await Order.find({
            deliveryDate: { 
                $gte: new Date(targetDate), 
                $lte: new Date(targetDate.getTime() + 86399999) 
            },
            status: { $ne: "cancelled" }
        }).populate("customer products.product");

        const forecastData = {}; // { hubId: { hubName: "", products: { productId: { name: "", qty: 0, liters: 0 } } } }
        let totalLiters = 0;

        if (existingOrders.length > 0) {
            // USE ACTUAL ORDERS (Already generated/edited)
            console.log(`[Logistics] Using ${existingOrders.length} actual orders for ${dateStr}`);
            
            for (const order of existingOrders) {
                const hub = order.customer?.hub;
                const hubId = hub?._id?.toString() || "unassigned";
                const hubName = hub?.name || "Unassigned Hub";

                if (!forecastData[hubId]) {
                    forecastData[hubId] = { name: hubName, products: {} };
                }

                for (const item of order.products) {
                    const p = item.product;
                    if (!p) continue;

                    const pid = p._id.toString();
                    if (!forecastData[hubId].products[pid]) {
                        forecastData[hubId].products[pid] = { 
                            name: p.name, units: 0, liters: 0, 
                            unit: p.unit, unitValue: p.unitValue, 
                            unitsPerCrate: p.unitsPerCrate || 12 
                        };
                    }

                    forecastData[hubId].products[pid].units += item.quantity;
                    
                    // Liters conversion
                    let vol = 0;
                    if (p.unit === "litre" || p.unit === "l") vol = p.unitValue || 1;
                    else if (p.unit === "ml") vol = (p.unitValue || 500) / 1000;
                    
                    const liters = (item.quantity * vol);
                    forecastData[hubId].products[pid].liters += liters;
                    totalLiters += liters;
                }
            }
        } else {
            // PROJECT SUBSCRIPTIONS (For future dates)
            console.log(`[Logistics] Projecting subscriptions for ${dateStr}`);
            const subscriptions = await Subscription.find({
                status: "active",
                startDate: { $lte: targetDate },
                $or: [{ endDate: { $exists: false } }, { endDate: { $gte: targetDate } }]
            }).populate("user product");

            for (const sub of subscriptions) {
                // Check frequency logic
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

                const hub = sub.user?.hub;
                const hubId = hub?._id?.toString() || (sub.user?.hub ? sub.user.hub.toString() : "unassigned");
                const hubName = hub?.name || "Unassigned Hub"; // Note: might need better hub resolution if not populated deep enough

                if (!forecastData[hubId]) {
                    forecastData[hubId] = { name: hubName, products: {} };
                }

                const p = sub.product;
                if (!p) continue;

                const pid = p._id.toString();
                if (!forecastData[hubId].products[pid]) {
                    forecastData[hubId].products[pid] = { 
                        name: p.name, units: 0, liters: 0, 
                        unit: p.unit, unitValue: p.unitValue, 
                        unitsPerCrate: p.unitsPerCrate || 12 
                    };
                }

                forecastData[hubId].products[pid].units += qty;
                
                let vol = 0;
                if (p.unit === "litre" || p.unit === "l") vol = p.unitValue || 1;
                else if (p.unit === "ml") vol = (p.unitValue || 500) / 1000;
                
                const liters = (qty * vol);
                forecastData[hubId].products[pid].liters += liters;
                totalLiters += liters;
            }
        }

        // Return structured result for UI
        res.status(200).json({
            success: true,
            date: dateStr,
            totalLiters: totalLiters.toFixed(2),
            hubs: forecastData
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

