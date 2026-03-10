require('dotenv').config();
const mongoose = require('mongoose');
const { processSubscriptionPayments, autoAssignOrders } = require('./src/jobs/dynamicCronJobs');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    try {
        console.log("Triggering for today: 2026-03-08");
        // We pass today's date so that it generates for "tomorrow" relative to yesterday... wait
        // The script generates for `targetDateOverride`. 
        // If targetDateOverride is passed, it uses that exactly as 'tomorrow'.
        // So passing '2026-03-08' will make it generate orders with deliveryDate = 2026-03-08.
        const todayStr = '2026-03-08T12:00:00.000Z'; // Midday today
        
        await processSubscriptionPayments(todayStr);
        await autoAssignOrders(todayStr);
        console.log("Done generating for today.");
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});
