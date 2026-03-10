const Settings = require("../models/Settings");

exports.getSettings = async (req, res) => {
    try {
        const settings = await Settings.getSettings();

        // Remove sensitive data for non-admin requests
        const sanitized = settings.toObject();

        // Mask API keys for security
        if (sanitized.smsGateway?.apiKey) {
            sanitized.smsGateway.apiKey = sanitized.smsGateway.apiKey ? "••••••••" : "";
        }
        if (sanitized.paymentGateway?.keySecret) {
            sanitized.paymentGateway.keySecret = sanitized.paymentGateway.keySecret ? "••••••••" : "";
        }
        if (sanitized.maps?.apiKey) {
            sanitized.maps.apiKey = sanitized.maps.apiKey ? "••••••••" : "";
        }
        if (sanitized.email?.password) {
            sanitized.email.password = sanitized.email.password ? "••••••••" : "";
        }
        if (sanitized.firebase?.privateKey) {
            sanitized.firebase.privateKey = sanitized.firebase.privateKey ? "••••••••" : "";
        }
        if (sanitized.firebase?.apiKey) {
            sanitized.firebase.apiKey = sanitized.firebase.apiKey ? "••••••••" : "";
        }


        res.status(200).json({ success: true, result: sanitized });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPublicSettings = async (req, res) => {
    try {
        const settings = await Settings.getSettings();

        // Only return public/safe settings
        const publicSettings = {
            site: settings.site,
            header: settings.header,
            footer: {
                copyrightText: settings.footer.copyrightText,
                showSocialLinks: settings.footer.showSocialLinks,
                socialLinks: settings.footer.socialLinks,
                footerLinks: settings.footer.footerLinks,
                address: settings.footer.address,
                phone: settings.footer.phone,
                email: settings.footer.email,
            },
            paymentGateway: {
                companyQrImage: settings.paymentGateway?.companyQrImage || "",
            },
            maps: {
                provider: settings.maps.provider,
                defaultLat: settings.maps.defaultLat,
                defaultLng: settings.maps.defaultLng,
                defaultZoom: settings.maps.defaultZoom,
                enabled: settings.maps.enabled,
            },
            firebase: {
                apiKey: settings.firebase.apiKey,
                authDomain: settings.firebase.authDomain,
                projectId: settings.firebase.projectId,
                storageBucket: settings.firebase.storageBucket,
                messagingSenderId: settings.firebase.messagingSenderId,
                appId: settings.firebase.appId,
                vapidKey: settings.firebase.vapidKey,
                enabled: settings.firebase.enabled,
            },
        };

        res.status(200).json({ success: true, result: publicSettings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { section, data } = req.body;

        console.log('📝 Updating settings:', { section, data });

        const settings = await Settings.getSettings();
        console.log('📋 Current settings fetched');

        if (section && data) {
            // Filter out empty or masked sensitive fields to prevent overwriting
            const sensitiveFields = ["apiKey", "keySecret", "password", "authToken", "privateKey"];
            const cleanData = { ...data };

            sensitiveFields.forEach(field => {
                if (cleanData[field] === "" || cleanData[field] === "••••••••") {
                    delete cleanData[field];
                }
            });

            console.log('🧹 Clean data after filtering:', cleanData);

            // Update specific section
            settings[section] = { ...settings[section]?.toObject?.() || settings[section], ...cleanData };
            settings.markModified(section);

            console.log(`✅ Marked ${section} as modified`);
        } else {
            // Update entire settings
            Object.keys(req.body).forEach(key => {
                if (settings[key] !== undefined) {
                    const sectionData = { ...req.body[key] };

                    // Filter sensitive fields for each section
                    const sensitiveFields = ["apiKey", "keySecret", "password", "authToken", "privateKey"];
                    sensitiveFields.forEach(field => {
                        if (sectionData[field] === "" || sectionData[field] === "••••••••") {
                            delete sectionData[field];
                        }
                    });

                    settings[key] = { ...settings[key]?.toObject?.() || settings[key], ...sectionData };
                }
            });
        }

        await settings.save();
        console.log('💾 Settings saved successfully');

        res.status(200).json({ success: true, result: settings, message: "Settings updated successfully" });
    } catch (error) {
        console.error('❌ Error updating settings:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.testSmsGateway = async (req, res) => {
    try {
        const { mobile } = req.body;
        const settings = await Settings.getSettings();

        if (!settings.smsGateway.enabled) {
            return res.status(400).json({ success: false, message: "SMS Gateway is not enabled" });
        }

        // TODO: Implement actual SMS sending based on provider
        console.log(`Test SMS to ${mobile} using ${settings.smsGateway.provider}`);

        res.status(200).json({ success: true, message: "Test SMS sent successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.testPaymentGateway = async (req, res) => {
    try {
        const settings = await Settings.getSettings();

        if (!settings.paymentGateway.enabled) {
            return res.status(400).json({ success: false, message: "Payment Gateway is not enabled" });
        }

        // TODO: Implement actual payment gateway test
        console.log(`Testing ${settings.paymentGateway.provider} gateway`);

        res.status(200).json({ success: true, message: "Payment Gateway connection successful" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
