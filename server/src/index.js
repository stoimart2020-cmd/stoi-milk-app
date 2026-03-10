const app = require("./app");
const seedData = require("./utils/seeder");
const cron = require('node-cron');
const invoiceController = require('./controllers/invoiceController');
const { initializeCronJobs } = require('./jobs/dynamicCronJobs');
const { initializeFirebase } = require('./config/firebase');



const PORT = process.env.PORT || 4000;

// Schedule Monthly Invoice Generation: 1st of every month at 00:00:01 AM IST
cron.schedule('1 0 1 * *', async () => {
    console.log('[Cron] Running Monthly Invoice Generation for previous month...');
    try {
        await invoiceController.processMonthlyGeneration();
    } catch (error) {
        console.error('[Cron] Monthly Invoice Generation Failed:', error);
    }
}, { timezone: 'Asia/Kolkata' });

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);

    // Initialize Firebase (async)
    await initializeFirebase();

    await seedData();


    // Initialize dynamic cron jobs (subscription payments & auto-assignment)
    // These run 1 second after the cutoff time configured in settings
    await initializeCronJobs();
});
