const Razorpay = require('razorpay');
const Setting = require('../models/Setting');

const getRazorpayInstance = async () => {
    const settings = await Setting.getSettings();
    const { keyId, keySecret } = settings.paymentGateway || {};

    console.log("Razorpay Init - Key ID:", keyId ? "Present" : "MISSING");
    console.log("Razorpay Init - Key Secret:", keySecret ? "Present" : "MISSING");

    if (!keyId || !keySecret) {
        throw new Error('Razorpay keys not configured in settings. Check Admin Panel > Settings > Payment Gateway.');
    }

    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });
};

module.exports = { getRazorpayInstance };
