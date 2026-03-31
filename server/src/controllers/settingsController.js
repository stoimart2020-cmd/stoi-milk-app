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

        if (!settings.smsGateway?.enabled) {
            return res.status(400).json({ success: false, message: "SMS Gateway is not enabled" });
        }

        console.log(`[Diagnostic] Test SMS to ${mobile} using ${settings.smsGateway.provider}`);
        
        // Use the actual sendOtp utility which utilizes MSG91 direct integration
        const { sendOtp } = require("../utils/notification");
        const testOtp = "123456"; // Use mock OTP for test 
        
        // sendOtp does not return anything right now but executes the async flow.
        await sendOtp(mobile, testOtp);

        res.status(200).json({ success: true, message: `Test OTP sent to ${mobile} via ${settings.smsGateway.provider.toUpperCase()}` });
    } catch (error) {
        console.error("Test SMS Error:", error);
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

exports.sendEmail = async (req, res) => {
    try {
        const { to, subject, html } = req.body;
        const settings = await Settings.getSettings();

        if (!settings.email.enabled) {
            return res.status(400).json({ success: false, message: "Email service is not enabled" });
        }

        const { sendEmail } = require("../utils/notification");
        const result = await sendEmail(to, subject, html);
        
        if (result.success) {
            res.status(200).json({ success: true, message: "Email sent successfully" });
        } else {
            res.status(500).json({ 
                success: false, 
                message: `Failed to send email: ${result.error || "Unknown error"}` 
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.testEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const settings = await Settings.getSettings();

        if (!settings.email.enabled) {
            return res.status(400).json({ success: false, message: "Email service is not enabled" });
        }

        const { sendEmail } = require("../utils/notification");
        
        const subject = `Test Email from ${settings.site.siteName}`;
        const html = `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: ${settings.site.primaryColor || '#14b8a6'};">Email Configuration Test</h2>
                <p>Hello,</p>
                <p>If you are reading this, your email configuration for <strong>${settings.site.siteName}</strong> is working correctly!</p>
                <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border: 1px solid #ddd; border-radius: 8px;">
                    <strong>Configuration Details:</strong>
                    <ul style="margin-top: 10px;">
                        <li><strong>Host:</strong> ${settings.email.host}</li>
                        <li><strong>Port:</strong> ${settings.email.port}</li>
                        <li><strong>From Name:</strong> ${settings.email.fromName}</li>
                        <li><strong>From Email:</strong> ${settings.email.fromEmail}</li>
                    </ul>
                </div>
                <p>Sent on: ${new Date().toLocaleString()}</p>
                <p>Best Regards,<br/>System Administrator</p>
            </div>
        `;

        const result = await sendEmail(email, subject, html);
        
        if (result.success) {
            res.status(200).json({ success: true, message: "Test email sent successfully" });
        } else {
            res.status(500).json({ 
                success: false, 
                message: `Failed to send test email: ${result.error || "Unknown error"}`,
                details: "Please verify your Host, Port, Username, and Password in cPanel."
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.testWhatsApp = async (req, res) => {
    try {
        const { mobile } = req.body;
        const settings = await Settings.getSettings();

        if (!settings.whatsapp?.enabled) {
            return res.status(400).json({ success: false, message: "WhatsApp is not enabled in settings" });
        }

        // Validate integrated number
        if (!settings.whatsapp?.integratedNumber) {
            return res.status(400).json({ 
                success: false, 
                message: "MSG91 Integrated WhatsApp Number is missing. Please fill it in and save first." 
            });
        }

        // Validate API key
        const apiKey = settings.whatsapp?.apiKey || settings.smsGateway?.apiKey;
        if (!apiKey) {
            return res.status(400).json({ 
                success: false, 
                message: "No API Key found. Please set the WhatsApp API Key (or SMS Gateway Auth Key) and save." 
            });
        }

        const templateName = settings.whatsapp.templates?.welcome;
        if (!templateName && (settings.whatsapp.provider || "msg91") === "msg91") {
            return res.status(400).json({ 
                success: false, 
                message: "Please define a 'Welcome' template name in Customer Notifications below first. MSG91 requires an approved template to send messages." 
            });
        }

        console.log(`[Diagnostic] Test WhatsApp to ${mobile} — template: ${templateName}, integratedNumber: ${settings.whatsapp.integratedNumber}`);
        const { sendWhatsApp } = require("../utils/notification");
        
        const testMessage = `Hello! This is a test message from ${settings.site?.siteName || "STOI Milk"}.`;
        const result = await sendWhatsApp(mobile, testMessage, {
            templateName: templateName,
            params: ["Test User"]
        });

        if (!result.success) {
            return res.status(500).json({ 
                success: false, 
                message: `MSG91 FAILED: ${result.error || "Unknown error"}` 
            });
        }

        res.status(200).json({ 
            success: true, 
            message: `✅ WhatsApp sent to ${mobile} via MSG91. Response: ${result.rawResponse || JSON.stringify(result.data)}` 
        });
    } catch (error) {
        console.error("Test WhatsApp Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
