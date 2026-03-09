const cron = require('node-cron');
const now = new Date();
const nextMin = new Date(now.getTime() + 65 * 1000); 
const [second, minute, hour] = [nextMin.getSeconds(), nextMin.getMinutes(), nextMin.getHours()];
const exp = `${second} ${minute} ${hour} * * *`;
console.log('Expression:', exp);
cron.schedule(exp, () => {
    console.log('Cron triggered at', new Date().toISOString());
}, { timezone: 'Asia/Kolkata' });
// let it run for a bit
setTimeout(() => process.exit(0), 1000 * 90);
