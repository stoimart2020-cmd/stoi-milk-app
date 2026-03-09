const Settings = require("../models/Settings");
const { admin } = require("../config/firebase");

// Push Notifications via FCM
exports.sendPushNotification = async (fcmToken, title, body, data = {}) => {
    if (!fcmToken) return false;
    try {
        const message = {
            notification: { title, body },
            data: { ...data, click_action: "FLUTTER_NOTIFICATION_CLICK" }, // Common for mobile
            token: fcmToken
        };
        const response = await admin.messaging().send(message);
        console.log(`[PUSH - FCM] To: ${fcmToken.substring(0, 10)}..., Resp: ${response}`);
        return true;
    } catch (error) {
        console.error("FCM Failed:", error.message);
        return false;
    }
};


// Helper to replace placeholders
const formatMessage = (template, data) => {
    if (!template) return "";
    return template.replace(/{(\w+)}/g, (_, key) => data[key] !== undefined ? data[key] : "");
};

exports.sendSMS = async (mobile, message) => {
    try {
        const settings = await Settings.getSettings();

        // Check if SMS is enabled globally
        if (!settings.smsGateway.enabled) {
            console.log("[SMS DISABLED] Would send:", message);
            return false;
        }

        const { provider, apiKey, senderId, baseUrl } = settings.smsGateway;

        console.log(`[SMS - ${provider.toUpperCase()}] To: ${mobile}, Msg: ${message}`);

        // Implementation for providers
        if (provider === "msg91" && apiKey) {
            // flow_id logic or standard SMS API
            // content-type: application/json
            // authkey: apiKey
            /*
            await axios.post("https://api.msg91.com/api/v5/flow/", {
                template_id: settings.smsGateway.templateId, 
                sender: senderId,
                mobiles: mobile,
                // var1: ... (Need to map variables if using flow)
                // For direct message if allowed (Transactional):
                // route: 4, message: message, sender: senderId, mob: mobile
            }, { headers: { authkey: apiKey } });
            */
        }
        else if (provider === "twilio" && apiKey) {
            // Twilio usage
        }
        else if (provider === "textlocal" && apiKey) {
            // Textlocal usage
        }

        return true;
    } catch (error) {
        console.error("SMS Failed:", error.message);
        return false;
    }
};

exports.sendWhatsApp = async (mobile, message) => {
    try {
        const settings = await Settings.getSettings();
        const provider = settings.whatsapp?.provider || "twilio";

        console.log(`[WHATSAPP - ${provider.toUpperCase()}] To: ${mobile}, Msg: ${message}`);

        // TODO: Implement actual API call based on provider and apiKey
        // const apiKey = settings.whatsapp?.apiKey;

        return true;
    } catch (error) {
        console.error("WhatsApp Error:", error.message);
        return false;
    }
};

exports.sendCollectionNotification = async (vendor, collection) => {
    try {
        const settings = await Settings.getSettings();

        const dateStr = new Date(collection.date).toLocaleDateString();
        const data = {
            vendor: vendor.name,
            qty: collection.quantity,
            shift: collection.shift || "",
            date: dateStr,
            rate: collection.rate,
            amount: collection.totalAmount.toFixed(2)
        };

        // SMS
        if (settings.smsGateway.enabled) {
            const template = settings.smsGateway.templates?.collection ||
                "Dear {vendor}, {qty}L milk collected ({shift}) on {date}. Rate: Rs.{rate}/L. Amount: Rs.{amount}. - Stoi";
            const message = formatMessage(template, data);
            await exports.sendSMS(vendor.mobile, message);
        }

        // WhatsApp
        if (settings.whatsapp?.enabled) {
            const template = settings.whatsapp.templates?.collection ||
                "Dear {vendor}, {qty}L milk collected ({shift}) on {date}. Rate: Rs.{rate}/L. Amount: Rs.{amount}. - Stoi";
            const message = formatMessage(template, data);
            await exports.sendWhatsApp(vendor.mobile, message);
        }

        return true;
    } catch (error) {
        console.error("Collection Notification Error:", error.message);
    }
};

exports.sendVendorPaymentNotification = async (vendor, amount) => {
    try {
        const settings = await Settings.getSettings();

        const data = {
            vendor: vendor.name,
            amount: amount,
            date: new Date().toLocaleDateString()
        };

        // SMS
        if (settings.smsGateway.enabled) {
            const template = settings.smsGateway.templates?.vendorPayment ||
                settings.smsGateway.templates?.payment ||
                "Dear {vendor}, payment of Rs.{amount} has been processed. - Stoi";
            const message = formatMessage(template, data);
            await exports.sendSMS(vendor.mobile, message);
        }

        // WhatsApp
        if (settings.whatsapp?.enabled) {
            const template = settings.whatsapp.templates?.vendorPayment ||
                settings.whatsapp.templates?.payment ||
                "Dear {vendor}, payment of Rs.{amount} has been processed. - Stoi";
            const message = formatMessage(template, data);
            await exports.sendWhatsApp(vendor.mobile, message);
        }

    } catch (error) {
        console.error("Vendor Payment Notification Error:", error.message);
    }
};

exports.sendOtp = async (mobile, otp) => {
    try {
        const settings = await Settings.getSettings();
        const data = { otp };

        // SMS
        if (settings.smsGateway.enabled) {
            const template = settings.smsGateway.templates?.otp || "Your OTP is {otp} for Stoi Milk login. Valid for 10 mins.";
            const message = formatMessage(template, data);
            await exports.sendSMS(mobile, message);
        }

        // WhatsApp
        if (settings.whatsapp?.enabled) {
            const template = settings.whatsapp.templates?.otp || "Your OTP is {otp} for Stoi Milk login. Valid for 10 mins.";
            const message = formatMessage(template, data);
            await exports.sendWhatsApp(mobile, message);
        }

    } catch (error) {
        console.error("OTP Error:", error.message);
    }
};

exports.sendWelcome = async (user) => {
    try {
        const settings = await Settings.getSettings();
        const data = { name: user.name };

        // SMS
        if (settings.smsGateway.enabled) {
            const template = settings.smsGateway.templates?.welcome || "Welcome to Stoi Milk {name}! We are excited to serve you fresh milk daily.";
            const message = formatMessage(template, data);
            await exports.sendSMS(user.mobile, message);
        }

        // WhatsApp
        if (settings.whatsapp?.enabled) {
            const template = settings.whatsapp.templates?.welcome || "Welcome to Stoi Milk {name}! We are excited to serve you fresh milk daily.";
            const message = formatMessage(template, data);
            await exports.sendWhatsApp(user.mobile, message);
        }

    } catch (error) {
        console.error("Welcome Notification Error:", error.message);
    }
};

exports.sendSubscriptionStart = async (user, product, qty, startDate) => {
    try {
        const settings = await Settings.getSettings();

        const data = {
            name: user.name,
            product: product.name || "Product", // Handle population
            qty: qty,
            date: new Date(startDate).toLocaleDateString()
        };

        // SMS
        if (settings.smsGateway.enabled) {
            const template = settings.smsGateway.templates?.subscription || "Dear {name}, subscription for {product} ({qty}) started from {date}. - Stoi";
            const message = formatMessage(template, data);
            await exports.sendSMS(user.mobile, message);
        }

        // WhatsApp
        if (settings.whatsapp?.enabled) {
            const template = settings.whatsapp.templates?.subscription || "Dear {name}, subscription for {product} ({qty}) started from {date}. - Stoi";
            const message = formatMessage(template, data);
            await exports.sendWhatsApp(user.mobile, message);
        }

    } catch (error) {
        console.error("Subscription Notification Error:", error.message);
    }
};

exports.sendCustomerPaymentSuccess = async (user, amount, txnId) => {
    try {
        const settings = await Settings.getSettings();

        const data = {
            name: user.name,
            amount: amount,
            txnId: txnId || "N/A"
        };

        // SMS
        if (settings.smsGateway.enabled) {
            const template = settings.smsGateway.templates?.customerPayment || "Dear {name}, payment of Rs.{amount} received successfully. Txn ID: {txnId}. - Stoi";
            const message = formatMessage(template, data);
            await exports.sendSMS(user.mobile, message);
        }

        // WhatsApp
        if (settings.whatsapp?.enabled) {
            const template = settings.whatsapp.templates?.customerPayment || "Dear {name}, payment of Rs.{amount} received successfully. Txn ID: {txnId}. - Stoi";
            const message = formatMessage(template, data);
            await exports.sendWhatsApp(user.mobile, message);
        }

    } catch (error) {
        console.error("Customer Payment Notification Error:", error.message);
    }
};

exports.sendDeliveryNotification = async (user, order) => {
    try {
        const settings = await Settings.getSettings();

        const data = {
            name: user.name,
            time: new Date().toLocaleTimeString(),
            items: order.products?.map(p => `${p.product?.name || 'Item'} (${p.quantity})`).join(", ") || "Order"
        };

        // SMS
        if (settings.smsGateway.enabled) {
            const template = settings.smsGateway.templates?.delivery || "Dear {name}, your milk order was delivered at {time}. Enjoy! - Stoi";
            const message = formatMessage(template, data);
            await exports.sendSMS(user.mobile, message);
        }

        // WhatsApp
        if (settings.whatsapp?.enabled) {
            const template = settings.whatsapp.templates?.delivery || "Dear {name}, your milk order was delivered at {time}. Enjoy! - Stoi";
            const message = formatMessage(template, data);
            await exports.sendWhatsApp(user.mobile, message);
        }

    } catch (error) {
        console.error("Delivery Notification Error:", error.message);
    }
};
