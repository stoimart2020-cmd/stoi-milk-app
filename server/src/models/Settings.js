const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
    {
        // Site Customization
        site: {
            // Company Details
            companyName: { type: String, default: "Jefvi Agro Products Private Limited" },
            companyAddress: { type: String, default: "" },
            companyWelcomeNote: { type: String, default: "Welcome to Stoi Milk's Web App" },
            gstin: { type: String, default: "" },

            // Website Info
            siteName: { type: String, default: "STOI Milk" },
            websiteLink: { type: String, default: "https://stoimilk.com" },
            domainName: { type: String, default: "www.stoimilk.com" },
            tagline: { type: String, default: "Fresh Milk Delivered Daily" },

            // Contact Info
            customerCareNumber: { type: String, default: "" },
            customerCareWhatsapp: { type: String, default: "" },
            customerCareEmail: { type: String, default: "" },

            // Logos & Branding
            logo: { type: String, default: "" }, // Header Logo
            logoSecondary: { type: String, default: "" },
            favicon: { type: String, default: "" },
            primaryColor: { type: String, default: "#14b8a6" },
            secondaryColor: { type: String, default: "#0d9488" },

            // Other Settings
            countryCode: { type: String, default: "91" },
            defaultHub: { type: String, default: "" },
            defaultOtp: { type: String, default: "7777" },
            defaultOtpMobileNumbers: { type: String, default: "" }, // Comma separated
        },

        // Header
        header: {
            showLogo: { type: Boolean, default: true },
            showSearch: { type: Boolean, default: true },
            showNotifications: { type: Boolean, default: true },
            menuItems: [{ label: String, url: String, enabled: Boolean }],
        },

        // Footer
        footer: {
            copyrightText: { type: String, default: "© 2024 STOI Milk. All rights reserved." },
            showSocialLinks: { type: Boolean, default: true },
            socialLinks: {
                facebook: { type: String, default: "" },
                twitter: { type: String, default: "" },
                instagram: { type: String, default: "" },
                youtube: { type: String, default: "" },
            },
            footerLinks: [{ label: String, url: String }],
            address: { type: String, default: "" },
            phone: { type: String, default: "" },
            email: { type: String, default: "" },
        },

        // Admin Footer
        adminFooter: {
            copyrightText: { type: String, default: "© 2024 STOI Admin. All rights reserved." },
            showSocialLinks: { type: Boolean, default: false },
            socialLinks: {
                facebook: { type: String, default: "" },
                twitter: { type: String, default: "" },
                instagram: { type: String, default: "" },
                youtube: { type: String, default: "" },
            },
            footerLinks: [{ label: String, url: String }],
            address: { type: String, default: "" },
            phone: { type: String, default: "" },
            email: { type: String, default: "" },
        },

        // SMS Gateway
        smsGateway: {
            provider: { type: String, enum: ["msg91", "twilio", "textlocal", "custom"], default: "msg91" },
            apiKey: { type: String, default: "" },
            senderId: { type: String, default: "" },
            templateId: { type: String, default: "" },
            templates: {
                // Vendor Side
                collection: { type: String, default: "Dear {vendor}, {qty}L milk collected ({shift}) on {date}. Rate: Rs.{rate}/L. Amount: Rs.{amount}. - Stoi" },
                vendorPayment: { type: String, default: "Dear {vendor}, payment of Rs.{amount} has been processed. - Stoi" },

                // Customer Side
                otp: { type: String, default: "Your OTP is {otp} for Stoi Milk login. Valid for 10 mins." },
                welcome: { type: String, default: "Welcome to Stoi Milk {name}! We are excited to serve you fresh milk daily." },
                subscription: { type: String, default: "Dear {name}, subscription for {product} ({qty}) started from {date}. - Stoi" },
                customerPayment: { type: String, default: "Dear {name}, payment of Rs.{amount} received successfully. Txn ID: {txnId}. - Stoi" },
                delivery: { type: String, default: "Dear {name}, your milk order was delivered at {time}. Enjoy! - Stoi" }
            },
            baseUrl: { type: String, default: "" },
            enabled: { type: Boolean, default: false },
        },

        // Payment Gateway
        paymentGateway: {
            provider: { type: String, enum: ["razorpay", "paytm", "stripe", "phonepe"], default: "razorpay" },
            keyId: { type: String, default: "" },
            keySecret: { type: String, default: "" },
            webhookSecret: { type: String, default: "" },
            testMode: { type: Boolean, default: true },
            enabled: { type: Boolean, default: false },
            companyQrImage: { type: String, default: "" }, // Static company QR code image URL for field sales
        },

        // Map Settings
        maps: {
            provider: { type: String, enum: ["google", "mapbox", "openstreetmap"], default: "google" },
            apiKey: { type: String, default: "" },
            defaultLat: { type: Number, default: 8.1833 },
            defaultLng: { type: Number, default: 77.4119 },
            defaultZoom: { type: Number, default: 13 },
            enabled: { type: Boolean, default: false },
        },

        // Email Settings
        email: {
            provider: { type: String, enum: ["smtp", "sendgrid", "mailgun", "ses"], default: "smtp" },
            host: { type: String, default: "" },
            port: { type: Number, default: 587 },
            username: { type: String, default: "" },
            password: { type: String, default: "" },
            fromEmail: { type: String, default: "" },
            fromName: { type: String, default: "" },
            enabled: { type: Boolean, default: false },
        },

        // WhatsApp Settings
        whatsapp: {
            provider: { type: String, enum: ["twilio", "wati", "gupshup"], default: "twilio" },
            apiKey: { type: String, default: "" },
            phoneNumberId: { type: String, default: "" },
            businessAccountId: { type: String, default: "" },
            enabled: { type: Boolean, default: false },
            templates: {
                collection: { type: String, default: "" },
                vendorPayment: { type: String, default: "" },
                otp: { type: String, default: "" },
                welcome: { type: String, default: "" },
                subscription: { type: String, default: "" },
                customerPayment: { type: String, default: "" },
                delivery: { type: String, default: "" }
            }
        },

        // Firebase Settings
        firebase: {
            // Admin SDK (Server)
            projectId: { type: String, default: "" },
            clientEmail: { type: String, default: "" },
            privateKey: { type: String, default: "" },

            // Client SDK (Web/Mobile)
            apiKey: { type: String, default: "" },
            authDomain: { type: String, default: "" },
            storageBucket: { type: String, default: "" },
            messagingSenderId: { type: String, default: "" },
            appId: { type: String, default: "" },
            vapidKey: { type: String, default: "" },

            enabled: { type: Boolean, default: false },
        },


        // Order & Delivery Settings
        order: {
            customerCutoffTime: { type: String, default: "19:00" },
            customerCutoffDay: { type: Number, default: -1 }, // -1 = Previous Day, 0 = Same Day
            adminCutoffTime: { type: String, default: "04:00" },
            adminCutoffDay: { type: Number, default: 0 }, // -1 = Previous Day, 0 = Same Day
            deliveryCharge: { type: Number, default: 0 },
            minOrderValue: { type: Number, default: 0 },
            deliverySlots: [{
                label: { type: String, required: true },      // e.g. "Morning", "Evening"
                startTime: { type: String, required: true },  // e.g. "05:00"
                endTime: { type: String, required: true },    // e.g. "07:00"
                isActive: { type: Boolean, default: true },
            }],
        },

        // Referral Settings
        referral: {
            enabled: { type: Boolean, default: true },
            referrerReward: { type: Number, default: 50 }, // Amount in ₹ for referrer
            refereeReward: { type: Number, default: 50 }, // Amount in ₹ for new user
            minOrdersForReward: { type: Number, default: 1 }, // Orders required before reward
            maxReferralsPerUser: { type: Number, default: -1 }, // -1 = unlimited
            rewardType: { type: String, enum: ["wallet", "discount"], default: "wallet" },
            expiryDays: { type: Number, default: 30 }, // Days before pending referral expires
            shareMessage: { type: String, default: "🥛 Join STOI Milk and get ₹{{REFEREE_REWARD}} on your first order! Use my referral code: {{CODE}}\n\n{{LINK}}" },
        },
    },
    { timestamps: true }
);

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model("Settings", settingsSchema);
