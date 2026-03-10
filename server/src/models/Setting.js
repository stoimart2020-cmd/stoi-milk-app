const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    site: {
        companyName: String,
        companyAddress: String,
        companyWelcomeNote: String,
        gstin: String,
        siteName: String,
        websiteLink: String,
        domainName: String,
        tagline: String,
        customerCareNumber: String,
        customerCareWhatsapp: String,
        customerCareEmail: String,
        logo: String,
        logoSecondary: String,
        favicon: String,
        primaryColor: String,
        secondaryColor: String,
        countryCode: String,
        defaultHub: String,
        defaultOtp: String,
        defaultOtpMobileNumbers: String
    },
    header: {
        showLogo: Boolean,
        showSearch: Boolean,
        showNotifications: Boolean,
        phone: String,
        showAppLinks: Boolean,
        playStoreLink: String,
        appStoreLink: String
    },
    footer: {
        copyrightText: String,
        address: String,
        phone: String,
        email: String,
        showSocialLinks: Boolean,
        socialLinks: {
            facebook: String,
            twitter: String,
            instagram: String,
            youtube: String
        }
    },
    adminFooter: {
        copyrightText: String,
        address: String,
        phone: String,
        email: String,
        showSocialLinks: Boolean,
        socialLinks: {
            facebook: String,
            twitter: String,
            instagram: String,
            youtube: String
        }
    },
    smsGateway: {
        enabled: Boolean,
        provider: String,
        apiKey: String,
        senderId: String,
        templateId: String
    },
    paymentGateway: {
        enabled: Boolean,
        provider: String,
        keyId: String,
        keySecret: String,
        testMode: Boolean
    },
    maps: {
        enabled: Boolean,
        provider: String,
        apiKey: String,
        defaultLat: Number,
        defaultLng: Number,
        defaultZoom: Number
    },
    email: {
        enabled: Boolean,
        provider: String,
        host: String,
        port: Number,
        username: String,
        fromEmail: String,
        fromName: String
    },
    whatsapp: {
        enabled: Boolean,
        provider: String,
        apiKey: String,
        phoneNumberId: String
    },
    order: {
        customerCutoffTime: String,
        customerCutoffDay: Number,
        adminCutoffTime: String,
        adminCutoffDay: Number,
        deliveryCharge: Number,
        minOrderValue: Number
    },
    referral: {
        enabled: Boolean,
        referrerReward: Number,
        refereeReward: Number,
        minOrdersForReward: Number,
        maxReferralsPerUser: Number,
        rewardType: String,
        expiryDays: Number,
        shareMessage: String
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

// Ensure only one settings document exists
settingSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model('Setting', settingSchema);
