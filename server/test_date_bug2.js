const getDeliveryQuantity = (sub, targetDateStr) => {
    console.log('getting quantity for', targetDateStr);
};
const now = new Date('2026-03-01T13:30:00Z'); // 19:00 IST
const getISTDateObj = (date = new Date()) => {
    return new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
};

const tomorrowIST = getISTDateObj(now);
tomorrowIST.setUTCDate(tomorrowIST.getUTCDate() + 1);
tomorrowIST.setUTCHours(0, 0, 0, 0);

const tomorrowDateStr = tomorrowIST.toISOString().split('T')[0];
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const tomorrowDayName = days[tomorrowIST.getUTCDay()];

console.log('Str:', tomorrowDateStr);
console.log('Day:', tomorrowDayName);
