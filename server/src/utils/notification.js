const Settings = require("../models/Settings");
const { admin } = require("../config/firebase");
const nodemailer = require("nodemailer");

// Generic Email Sender
exports.sendEmail = async (to, subject, html) => {
    if (!to) return { success: false, error: "Recipient email missing" };
    try {
        const settings = await Settings.getSettings();
        if (!settings.email?.enabled) {
            console.log("[EMAIL DISABLED] Would send to:", to, "Subject:", subject);
            return { success: false, error: "Email service is disabled in settings" };
        }

        const transporter = nodemailer.createTransport({
            host: settings.email.host,
            port: settings.email.port,
            secure: settings.email.port === 465,
            auth: {
                user: settings.email.username,
                pass: settings.email.password,
            },
            tls: {
                // Do not fail on invalid certs (common for cPanel testing/self-signed)
                rejectUnauthorized: false
            },
            connectionTimeout: 10000, // 10 seconds
        });

        const mailOptions = {
            from: `"${settings.email.fromName || settings.site.siteName}" <${settings.email.fromEmail}>`,
            to,
            subject,
            html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SENT] To: ${to}, MsgID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Email Failed:", error.message);
        return { success: false, error: error.message };
    }
};

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

exports.sendWhatsApp = async (mobile, message, templateData = {}) => {
    try {
        const settings = await Settings.getSettings();
        
        if (!settings.whatsapp?.enabled) {
            console.log("[WHATSAPP DISABLED] Would send:", message);
            return false;
        }

        const provider = settings.whatsapp?.provider || "msg91";
        const apiKey = settings.whatsapp?.apiKey || settings.smsGateway?.apiKey; // Reuse SMS authkey if WhatsApp key not set

        console.log(`[WHATSAPP - ${provider.toUpperCase()}] To: ${mobile}, Msg: ${message}`);

        if (provider === "msg91" && apiKey) {
            const axios = require("axios");
            const integratedNumber = settings.whatsapp?.integratedNumber || "";
            const countryCode = mobile.startsWith("91") ? "" : "91";
            const num = `${countryCode}${mobile}`.replace(/\D/g, "");

            // Pre-flight validation
            if (!integratedNumber) {
                console.error("[MSG91 WhatsApp] MISSING integratedNumber in settings.whatsapp");
                return { success: false, error: "MSG91 Integrated WhatsApp Number is not configured in settings" };
            }

            console.log(`[MSG91 WhatsApp PRE-FLIGHT] apiKey: ${apiKey.substring(0, 6)}..., integratedNumber: ${integratedNumber}, to: ${num}`);

            const templateName = templateData.templateName;

            let payload;
            let templateParamsArray = [];

            if (templateName) {
                if (templateData.params) {
                    if (Array.isArray(templateData.params)) {
                        templateParamsArray = templateData.params;
                    } else if (typeof templateData.params === 'object') {
                        templateParamsArray = Object.values(templateData.params);
                    }
                }

                // MSG91 specific format based on user's template dump
                // Uses "messaging_product", "namespace", and "body_1" format
                // Namespace provided in your template: ab167d3c_3f7d_4c52_a77b_655d48530ea2
                const namespace = settings.whatsapp?.namespace || "ab167d3c_3f7d_4c52_a77b_655d48530ea2";
                
                // Map parameters to body_1, body_2, etc. as per MSG91 requirement
                const components = {};
                templateParamsArray.forEach((val, idx) => {
                    components[`body_${idx + 1}`] = {
                        type: "text",
                        value: String(val)
                    };
                });

                payload = {
                    integrated_number: integratedNumber,
                    content_type: "template",
                    payload: {
                        messaging_product: "whatsapp",
                        type: "template",
                        template: {
                            name: templateName,
                            namespace: namespace,
                            language: { code: "en", policy: "deterministic" },
                            to_and_components: [
                                {
                                    to: [num],
                                    components: components
                                }
                            ]
                        }
                    }
                };
            } else {
                // Plain text WhatsApp — uses messaging_product format
                payload = {
                    integrated_number: integratedNumber,
                    content_type: "text",
                    payload: {
                        messaging_product: "whatsapp",
                        type: "text",
                        to: num,
                        text: { body: message }
                    }
                };
            }

            console.log("[MSG91 WhatsApp REQUEST PAYLOAD]:", JSON.stringify(payload, null, 2));

            try {
                const response = await axios.post(
                    "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
                    payload,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "authkey": apiKey
                        }
                    }
                );
                
                const resBody = response.data;
                const resStr = JSON.stringify(resBody);
                console.log("[MSG91 WhatsApp RAW RESPONSE]:", resStr);

                // Detect all known MSG91 error patterns
                if (resBody && (
                    resBody.hasError === true ||
                    resBody.type === "error" ||
                    resBody.status === "error" ||
                    resBody.code === "error" ||
                    (typeof resBody.message === "string" && resBody.message.toLowerCase().includes("error")) ||
                    (typeof resBody.msg === "string" && resBody.msg.toLowerCase().includes("error"))
                )) {
                    console.error("[MSG91 WhatsApp REJECTED]:", resStr);
                    return { success: false, error: resBody.message || resBody.msg || resStr };
                }

                // Additional check: MSG91 sometimes returns empty or meaningless data
                if (!resBody || resStr === '{}' || resStr === '""' || resStr === 'null') {
                    console.error("[MSG91 WhatsApp EMPTY RESPONSE] — message likely not queued");
                    return { success: false, error: "MSG91 returned an empty response — message was not queued" };
                }

                return { success: true, data: resBody, rawResponse: resStr };
            } catch (waErr) {
                const errData = waErr?.response?.data;
                console.error("[MSG91 WhatsApp API ERROR]:", errData || waErr.message);
                console.error("[MSG91 WhatsApp HTTP Status]:", waErr?.response?.status);
                return { success: false, error: errData?.message || errData?.msg || JSON.stringify(errData) || waErr.message };
            }
        }

        // Other providers (Twilio, WATI, Gupshup) — TODO
        console.log(`[WHATSAPP - ${provider}] Provider not yet implemented`);
        return { success: false, error: "Provider not implemented" };
    } catch (error) {
        console.error("WhatsApp Error:", error.message);
        return { success: false, error: error.message };
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
            const { provider, apiKey, templateId } = settings.smsGateway;
            
            if (provider === "msg91" && apiKey && templateId) {
                // Use explicit MSG91 Send OTP V5 API (the best for OTP delivery in India)
                const axios = require("axios");
                const countryCode = mobile.startsWith("91") ? "" : "91";
                const num = `${countryCode}${mobile}`.replace(/\D/g, "");
                
                try {
                    const url = `https://control.msg91.com/api/v5/otp?template_id=${templateId}&mobile=${num}&authkey=${apiKey}&otp=${otp}`;
                    console.log(`[MSG91 OTP API] Sending OTP ${otp} to ${num}...`);
                    
                    const response = await axios.post(url, {}, {
                        headers: { "Content-Type": "application/json" }
                    });
                    
                    console.log("[MSG91 API Response]:", response.data);
                } catch (msg91Err) {
                    console.error("[MSG91 Error]:", msg91Err?.response?.data || msg91Err.message);
                }
            } else {
                // Generic Fallback
                const template = settings.smsGateway.templates?.otp || "Your OTP is {otp} for Stoi Milk login. Valid for 10 mins.";
                const message = formatMessage(template, data);
                await exports.sendSMS(mobile, message);
            }
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
            const templateName = settings.whatsapp.templates?.welcome;
            const message = formatMessage("Welcome to Stoi Milk {name}! We are excited to serve you fresh milk daily.", data);
            
            // Pass templateName explicitely so MSG91 knows to use the approved template
            await exports.sendWhatsApp(user.mobile, message, {
                 templateName: templateName,
                 params: [user.name] // Passing params as array for MSG91 mapping
            });
        }

        // Email
        console.log(`[DEBUG] Email Check for Welcome:`, {
            email: user.email,
            enabled: settings.email?.enabled,
            trigger: settings.email?.sendWelcomeEmail
        });
        if (user.email && settings.email?.enabled && settings.email?.sendWelcomeEmail) {
            const template = settings.email.templates?.welcome;
            const emailData = { 
                ...data, 
                name: user.name,
                mobile: user.mobile,
                walletBalance: user.walletBalance?.toFixed(2) || "0.00",
                siteName: settings.site.siteName, 
                primaryColor: settings.site.primaryColor || '#14b8a6' 
            };

            let subject = formatMessage(template?.subject, emailData) || `Welcome to ${settings.site.siteName}!`;
            let html = "";
            
            if (template?.body) {
                const body = formatMessage(template.body, emailData);
                const footer = formatMessage(template.footer, emailData) || `<p style="margin-top: 20px;">Best Regards,<br/>Team ${settings.site.siteName}</p>`;
                html = `<div style="font-family: sans-serif; padding: 20px; color: #333;">${body}${footer}</div>`;
            } else {
                html = `
                    <div style="font-family: sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: ${settings.site.primaryColor || '#14b8a6'};">Welcome, ${user.name}!</h2>
                        <p>We're thrilled to have you at <strong>${settings.site.siteName}</strong>.</p>
                        <p>Your journey to fresh, high-quality milk delivered daily starts here.</p>
                        <div style="margin: 20px 0; padding: 15px; background: #f0fdfa; border-radius: 8px;">
                            <strong>Next Steps:</strong>
                            <ul style="margin-top: 10px;">
                                <li>Explore our products</li>
                                <li>Start a subscription</li>
                                <li>Enjoy fresh milk daily!</li>
                            </ul>
                        </div>
                        <p>If you have any questions, feel free to reply to this email or contact us via our website.</p>
                        <p>Best Regards,<br/>Team ${settings.site.siteName}</p>
                    </div>
                `;
            }
            await exports.sendEmail(user.email, subject, html);
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

        // Email
        console.log(`[DEBUG] Email Check for Subscription:`, {
            email: user.email,
            enabled: settings.email?.enabled,
            trigger: settings.email?.sendSubscriptionEmail
        });
        if (user.email && settings.email?.enabled && settings.email?.sendSubscriptionEmail) {
            const template = settings.email.templates?.subscription;
            const emailData = { 
                ...data, 
                name: user.name,
                mobile: user.mobile,
                walletBalance: user.walletBalance?.toFixed(2) || "0.00",
                siteName: settings.site.siteName, 
                primaryColor: settings.site.primaryColor || '#14b8a6' 
            };

            let subject = formatMessage(template?.subject, emailData) || "Subscription Started - STOI Milk";
            let html = "";

            if (template?.body) {
                const body = formatMessage(template.body, emailData);
                const footer = formatMessage(template.footer, emailData) || `<p style="margin-top: 20px;">Best Regards,<br/>Team ${settings.site.siteName}</p>`;
                html = `<div style="font-family: sans-serif; padding: 20px; color: #333;">${body}${footer}</div>`;
            } else {
                html = `
                    <div style="font-family: sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: ${settings.site.primaryColor || '#14b8a6'};">Hello, ${user.name}!</h2>
                        <p>Exciting news! Your subscription for <strong>${data.product}</strong> has successfully started.</p>
                        <div style="margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
                            <p style="margin: 5px 0;"><strong>Product:</strong> ${data.product}</p>
                            <p style="margin: 5px 0;"><strong>Quantity:</strong> ${data.qty}</p>
                            <p style="margin: 5px 0;"><strong>Start Date:</strong> ${data.date}</p>
                        </div>
                        <p>Your fresh milk will be delivered according to your preference. Thank you for choosing us!</p>
                        <p>Best Regards,<br/>Team ${settings.site.siteName}</p>
                    </div>
                `;
            }
            await exports.sendEmail(user.email, subject, html);
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

        // Email
        if (user.email && settings.email?.enabled && settings.email?.sendPaymentEmail) {
            const template = settings.email.templates?.customerPayment;
            const emailData = { 
                ...data, 
                name: user.name,
                mobile: user.mobile,
                walletBalance: user.walletBalance?.toFixed(2) || amount,
                siteName: settings.site.siteName, 
                primaryColor: settings.site.primaryColor || '#14b8a6' 
            };

            let subject = formatMessage(template?.subject, emailData) || "Payment Success Confirmation";
            let html = "";

            if (template?.body) {
                const body = formatMessage(template.body, emailData);
                const footer = formatMessage(template.footer, emailData) || `<p style="margin-top: 20px;">Best Regards,<br/>Team ${settings.site.siteName}</p>`;
                html = `<div style="font-family: sans-serif; padding: 20px; color: #333;">${body}${footer}</div>`;
            } else {
                html = `
                    <div style="font-family: sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: ${settings.site.primaryColor || '#14b8a6'};">Payment Received!</h2>
                        <p>Dear ${user.name}, we have successfully received your payment of <strong>₹${amount}</strong>.</p>
                        <p style="font-size: 0.9em; color: #666;">Transaction ID: ${txnId || 'N/A'}</p>
                        <div style="margin: 20px 0; padding: 15px; background: #f0fdfa; border-radius: 8px; text-align: center;">
                            <h3 style="margin: 0; color: #0d9488;">New Wallet Balance: ₹${user.walletBalance?.toFixed(2) || amount}</h3>
                        </div>
                        <p>Thank you for your timely payment. It helps us continue providing you with the freshest milk!</p>
                        <p>Best Regards,<br/>Team ${settings.site.siteName}</p>
                    </div>
                `;
            }
            await exports.sendEmail(user.email, subject, html);
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

exports.sendInvoiceNotification = async (user, order) => {
    try {
        const settings = await Settings.getSettings();

        const data = {
            name: user.name,
            orderId: order.orderId || order._id,
            amount: order.totalAmount,
            date: new Date(order.deliveryDate).toLocaleDateString()
        };

        // SMS
        if (settings.smsGateway.enabled) {
            const message = `Dear ${data.name}, invoice for order ${data.orderId} of Rs.${data.amount} has been generated. - Stoi`;
            await exports.sendSMS(user.mobile, message);
        }

        // WhatsApp
        if (settings.whatsapp?.enabled) {
             const message = `Dear ${data.name}, invoice for order ${data.orderId} of Rs.${data.amount} has been generated. - Stoi`;
            await exports.sendWhatsApp(user.mobile, message);
        }

        // Email
        if (user.email && settings.email?.enabled && settings.email?.sendInvoiceEmail) {
            const template = settings.email.templates?.invoice;
            const emailData = { 
                ...data, 
                name: user.name,
                mobile: user.mobile,
                walletBalance: user.walletBalance?.toFixed(2) || "0.00",
                siteName: settings.site.siteName, 
                primaryColor: settings.site.primaryColor || '#14b8a6' 
            };

            let subject = formatMessage(template?.subject, emailData) || `Order Invoice - ${data.orderId}`;
            let html = "";

            if (template?.body) {
                const body = formatMessage(template.body, emailData);
                const footer = formatMessage(template.footer, emailData) || `<p style="margin-top: 20px;">Best Regards,<br/>Team ${settings.site.siteName}</p>`;
                html = `<div style="font-family: sans-serif; padding: 20px; color: #333;">${body}${footer}</div>`;
            } else {
                const itemsHtml = order.products?.map(p => `
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${p.product?.name || 'Item'}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${p.quantity}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${(p.price * p.quantity).toFixed(2)}</td>
                    </tr>
                `).join("") || "";

                html = `
                    <div style="font-family: sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: ${settings.site.primaryColor || '#14b8a6'};">New Invoice Generated</h2>
                        <p>Dear ${user.name}, an invoice has been generated for your order on <strong>${data.date}</strong>.</p>
                        
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <thead>
                                <tr style="background: #f9fafb;">
                                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Product</th>
                                    <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
                                    <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="2" style="padding: 15px 10px; text-align: right; font-weight: bold;">Grand Total:</td>
                                    <td style="padding: 15px 10px; text-align: right; font-weight: bold; color: #0d9488;">₹${data.amount.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <p>Order ID: <strong>${data.orderId}</strong></p>
                        <p>Thank you for choosing ${settings.site.siteName}!</p>
                        <p>Best Regards,<br/>Team ${settings.site.siteName}</p>
                    </div>
                `;
            }
            await exports.sendEmail(user.email, subject, html);
        }
    } catch (error) {
        console.error("Invoice Notification Error:", error.message);
    }
};

exports.sendMonthlyInvoiceNotification = async (user, invoice) => {
    try {
        const settings = await Settings.getSettings();

        const data = {
            name: user.name,
            statementNo: invoice.statementNo,
            period: invoice.period?.display,
            payable: invoice.totalPayable,
            closingBalance: invoice.walletSummary?.balanceAsOn
        };

        // SMS
        if (settings.smsGateway.enabled) {
            const message = `Dear ${data.name}, your monthly statement ${data.statementNo} for ${data.period} is generated. Closing Balance: Rs.${data.closingBalance}. - Stoi`;
            await exports.sendSMS(user.mobile, message);
        }

        // WhatsApp
        if (settings.whatsapp?.enabled) {
            const message = `Dear ${data.name}, your monthly statement ${data.statementNo} for ${data.period} is generated. Closing Balance: Rs.${data.closingBalance}. - Stoi`;
            await exports.sendWhatsApp(user.mobile, message);
        }

        // Email
        if (user.email && settings.email?.enabled && settings.email?.sendMonthlyInvoiceEmail) {
            const template = settings.email.templates?.monthlyInvoice;
            const emailData = { 
                ...data, 
                name: user.name,
                mobile: user.mobile,
                walletBalance: user.walletBalance?.toFixed(2) || "0.00",
                siteName: settings.site.siteName, 
                primaryColor: settings.site.primaryColor || '#14b8a6' 
            };

            let subject = formatMessage(template?.subject, emailData) || `Monthly Statement - ${data.statementNo}`;
            let html = "";

            if (template?.body) {
                const body = formatMessage(template.body, emailData);
                const footer = formatMessage(template.footer, emailData) || `<p style="margin-top: 20px;">Best Regards,<br/>Team ${settings.site.siteName}</p>`;
                html = `<div style="font-family: sans-serif; padding: 20px; color: #333;">${body}${footer}</div>`;
            } else {
                html = `
                    <div style="font-family: sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: ${settings.site.primaryColor || '#14b8a6'};">Monthly Statement Generated</h2>
                        <p>Dear ${user.name}, your monthly statement for <strong>${data.period}</strong> is now available.</p>
                        
                        <div style="margin: 20px 0; padding: 20px; background: #f9fafb; border-radius: 8px; border-left: 4px solid ${settings.site.primaryColor || '#14b8a6'};">
                            <p style="margin: 5px 0;"><strong>Statement No:</strong> ${data.statementNo}</p>
                            <p style="margin: 5px 0;"><strong>Period:</strong> ${data.period}</p>
                            <p style="margin: 5px 0;"><strong>Closing Balance:</strong> <span style="color: ${data.closingBalance >= 0 ? '#0d9488' : '#e11d48'}">₹${data.closingBalance?.toFixed(2)}</span></p>
                        </div>

                        <p>You can view the detailed breakdown and download the PDF by logging into your account.</p>
                        <p>Thank you for being a valued customer of ${settings.site.siteName}!</p>
                        <p>Best Regards,<br/>Team ${settings.site.siteName}</p>
                    </div>
                `;
            }
            await exports.sendEmail(user.email, subject, html);
        }
    } catch (error) {
        console.error("Monthly Invoice Notification Error:", error.message);
    }
};
