require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./src/models/Order');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    try {
        const today = new Date();
        const start = new Date(today);
        start.setHours(0,0,0,0);
        const end = new Date(today);
        end.setHours(23,59,59,999);
        
        console.log("Looking for orders between:", start, "and", end);
        
        const ordersToday = await Order.find({
            deliveryDate: { $gte: start, $lte: end }
        });
        
        console.log("Orders found for today:", ordersToday.length);
        
        const allOrders = await Order.find().sort({ deliveryDate: -1 }).limit(10);
        console.log("Latest 10 orders dates:");
        allOrders.forEach(o => console.log(o.deliveryDate, o.orderType, o.status));

        const startTomo = new Date(start);
        startTomo.setDate(startTomo.getDate() + 1);
        const endTomo = new Date(end);
        endTomo.setDate(endTomo.getDate() + 1);
        const ordersTomo = await Order.find({ deliveryDate: { $gte: startTomo, $lte: endTomo } });
        console.log("Orders found for tomorrow:", ordersTomo.length);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});
