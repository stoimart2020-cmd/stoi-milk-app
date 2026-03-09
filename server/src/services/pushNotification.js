/**
 * Push Notification Service
 * Handles sending push notifications to mobile devices
 */

const axios = require('axios');

class PushNotificationService {
    constructor() {
        this.fcmServerKey = process.env.FCM_SERVER_KEY;
        this.fcmUrl = 'https://fcm.googleapis.com/fcm/send';
        this.notificationQueue = [];
        this.maxRetries = 3;
    }

    /**
     * Send push notification to a single device
     * @param {String} deviceToken - FCM device token
     * @param {Object} notification - { title, body, data }
     */
    async sendToDevice(deviceToken, notification) {
        if (!this.fcmServerKey) {
            console.warn('FCM Server Key not configured');
            return { success: false, message: 'FCM not configured' };
        }

        try {
            const payload = {
                to: deviceToken,
                notification: {
                    title: notification.title,
                    body: notification.body,
                    sound: 'default',
                    badge: notification.badge || 1,
                    click_action: notification.clickAction || 'FLUTTER_NOTIFICATION_CLICK'
                },
                data: notification.data || {},
                priority: notification.priority || 'high'
            };

            const response = await axios.post(this.fcmUrl, payload, {
                headers: {
                    'Authorization': `key=${this.fcmServerKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return {
                success: response.data.success === 1,
                messageId: response.data.results?.[0]?.message_id,
                error: response.data.results?.[0]?.error
            };
        } catch (error) {
            console.error('Push notification error:', error.message);
            return { success: false, message: error.message };
        }
    }

    /**
     * Send to multiple devices
     */
    async sendToMultipleDevices(deviceTokens, notification) {
        if (!this.fcmServerKey) {
            return { success: false, message: 'FCM not configured' };
        }

        try {
            const payload = {
                registration_ids: deviceTokens,
                notification: {
                    title: notification.title,
                    body: notification.body,
                    sound: 'default'
                },
                data: notification.data || {},
                priority: 'high'
            };

            const response = await axios.post(this.fcmUrl, payload, {
                headers: {
                    'Authorization': `key=${this.fcmServerKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return {
                success: response.data.success > 0,
                successCount: response.data.success,
                failureCount: response.data.failure,
                results: response.data.results
            };
        } catch (error) {
            console.error('Bulk push notification error:', error.message);
            return { success: false, message: error.message };
        }
    }

    /**
     * Send to topic (for broadcast messages)
     */
    async sendToTopic(topic, notification) {
        if (!this.fcmServerKey) {
            return { success: false, message: 'FCM not configured' };
        }

        try {
            const payload = {
                to: `/topics/${topic}`,
                notification: {
                    title: notification.title,
                    body: notification.body,
                    sound: 'default'
                },
                data: notification.data || {}
            };

            const response = await axios.post(this.fcmUrl, payload, {
                headers: {
                    'Authorization': `key=${this.fcmServerKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return {
                success: response.data.message_id !== undefined,
                messageId: response.data.message_id
            };
        } catch (error) {
            console.error('Topic notification error:', error.message);
            return { success: false, message: error.message };
        }
    }

    // ============ Predefined Notification Templates ============

    /**
     * Order placed notification
     */
    async notifyOrderPlaced(user, order) {
        if (!user.fcmToken) return { success: false, message: 'No FCM token' };

        return await this.sendToDevice(user.fcmToken, {
            title: '🛒 Order Placed Successfully',
            body: `Your order #${order.orderId} has been placed. Total: ₹${order.totalAmount}`,
            data: {
                type: 'ORDER_PLACED',
                orderId: order._id.toString(),
                screen: 'OrderDetails'
            }
        });
    }

    /**
     * Order confirmed notification
     */
    async notifyOrderConfirmed(user, order) {
        if (!user.fcmToken) return { success: false, message: 'No FCM token' };

        return await this.sendToDevice(user.fcmToken, {
            title: '✅ Order Confirmed',
            body: `Order #${order.orderId} confirmed! Delivery on ${new Date(order.deliveryDate).toLocaleDateString()}`,
            data: {
                type: 'ORDER_CONFIRMED',
                orderId: order._id.toString(),
                screen: 'OrderDetails'
            }
        });
    }

    /**
     * Out for delivery notification
     */
    async notifyOutForDelivery(user, order, rider) {
        if (!user.fcmToken) return { success: false, message: 'No FCM token' };

        return await this.sendToDevice(user.fcmToken, {
            title: '🚚 Out for Delivery',
            body: `Your order #${order.orderId} is out for delivery. ${rider?.name || 'Rider'} is on the way!`,
            data: {
                type: 'OUT_FOR_DELIVERY',
                orderId: order._id.toString(),
                riderId: rider?._id?.toString(),
                screen: 'TrackOrder'
            }
        });
    }

    /**
     * Order delivered notification
     */
    async notifyOrderDelivered(user, order) {
        if (!user.fcmToken) return { success: false, message: 'No FCM token' };

        return await this.sendToDevice(user.fcmToken, {
            title: '✨ Order Delivered',
            body: `Order #${order.orderId} has been delivered successfully!`,
            data: {
                type: 'ORDER_DELIVERED',
                orderId: order._id.toString(),
                screen: 'OrderHistory'
            }
        });
    }

    /**
     * Payment reminder notification
     */
    async notifyPaymentReminder(user, amount) {
        if (!user.fcmToken) return { success: false, message: 'No FCM token' };

        return await this.sendToDevice(user.fcmToken, {
            title: '💰 Payment Reminder',
            body: `You have a pending payment of ₹${amount}. Please recharge your wallet.`,
            data: {
                type: 'PAYMENT_REMINDER',
                amount: amount.toString(),
                screen: 'Wallet'
            }
        });
    }

    /**
     * Low wallet balance notification
     */
    async notifyLowBalance(user, balance) {
        if (!user.fcmToken) return { success: false, message: 'No FCM token' };

        return await this.sendToDevice(user.fcmToken, {
            title: '⚠️ Low Wallet Balance',
            body: `Your wallet balance is ₹${balance}. Recharge now to avoid delivery interruptions.`,
            data: {
                type: 'LOW_BALANCE',
                balance: balance.toString(),
                screen: 'Wallet'
            }
        });
    }

    /**
     * Subscription renewal notification
     */
    async notifySubscriptionRenewal(user, subscription) {
        if (!user.fcmToken) return { success: false, message: 'No FCM token' };

        return await this.sendToDevice(user.fcmToken, {
            title: '🔄 Subscription Renewed',
            body: `Your subscription has been renewed successfully!`,
            data: {
                type: 'SUBSCRIPTION_RENEWED',
                subscriptionId: subscription._id.toString(),
                screen: 'Subscriptions'
            }
        });
    }

    /**
     * Subscription paused notification
     */
    async notifySubscriptionPaused(user, subscription, pausedUntil) {
        if (!user.fcmToken) return { success: false, message: 'No FCM token' };

        return await this.sendToDevice(user.fcmToken, {
            title: '⏸️ Subscription Paused',
            body: `Your subscription is paused until ${new Date(pausedUntil).toLocaleDateString()}`,
            data: {
                type: 'SUBSCRIPTION_PAUSED',
                subscriptionId: subscription._id.toString(),
                screen: 'Subscriptions'
            }
        });
    }

    /**
     * Referral reward notification
     */
    async notifyReferralReward(user, amount) {
        if (!user.fcmToken) return { success: false, message: 'No FCM token' };

        return await this.sendToDevice(user.fcmToken, {
            title: '🎉 Referral Reward!',
            body: `You earned ₹${amount} for referring a friend!`,
            data: {
                type: 'REFERRAL_REWARD',
                amount: amount.toString(),
                screen: 'Wallet'
            }
        });
    }

    /**
     * Complaint resolved notification
     */
    async notifyComplaintResolved(user, complaint) {
        if (!user.fcmToken) return { success: false, message: 'No FCM token' };

        return await this.sendToDevice(user.fcmToken, {
            title: '✅ Complaint Resolved',
            body: `Your complaint has been resolved. Thank you for your patience!`,
            data: {
                type: 'COMPLAINT_RESOLVED',
                complaintId: complaint._id.toString(),
                screen: 'Complaints'
            }
        });
    }

    /**
     * Promotional notification
     */
    async notifyPromotion(user, promotion) {
        if (!user.fcmToken) return { success: false, message: 'No FCM token' };

        return await this.sendToDevice(user.fcmToken, {
            title: promotion.title || '🎁 Special Offer',
            body: promotion.body,
            data: {
                type: 'PROMOTION',
                promotionId: promotion.id || '',
                screen: promotion.screen || 'Home'
            }
        });
    }

    /**
     * Rider assignment notification (for riders)
     */
    async notifyRiderAssignment(rider, orders) {
        if (!rider.fcmToken) return { success: false, message: 'No FCM token' };

        return await this.sendToDevice(rider.fcmToken, {
            title: '📦 New Deliveries Assigned',
            body: `You have ${orders.length} new deliveries assigned for today.`,
            data: {
                type: 'RIDER_ASSIGNMENT',
                orderCount: orders.length.toString(),
                screen: 'DeliveryList'
            }
        });
    }

    /**
     * Broadcast notification to all users
     */
    async broadcastToAllUsers(notification) {
        return await this.sendToTopic('all_users', notification);
    }

    /**
     * Broadcast to specific user segment
     */
    async broadcastToSegment(segment, notification) {
        return await this.sendToTopic(segment, notification);
    }

    /**
     * Schedule notification (store in queue for later sending)
     */
    scheduleNotification(deviceToken, notification, sendAt) {
        this.notificationQueue.push({
            deviceToken,
            notification,
            sendAt: new Date(sendAt),
            retries: 0
        });

        return { success: true, message: 'Notification scheduled' };
    }

    /**
     * Process scheduled notifications (run periodically)
     */
    async processQueue() {
        const now = new Date();
        const toSend = this.notificationQueue.filter(item => item.sendAt <= now);

        for (const item of toSend) {
            const result = await this.sendToDevice(item.deviceToken, item.notification);

            if (!result.success && item.retries < this.maxRetries) {
                item.retries++;
                item.sendAt = new Date(Date.now() + 5 * 60 * 1000); // Retry in 5 minutes
            } else {
                // Remove from queue
                const index = this.notificationQueue.indexOf(item);
                if (index > -1) {
                    this.notificationQueue.splice(index, 1);
                }
            }
        }

        return {
            success: true,
            processed: toSend.length,
            remaining: this.notificationQueue.length
        };
    }
}

// Singleton instance
const pushNotificationService = new PushNotificationService();

// Process queue every minute
setInterval(() => {
    pushNotificationService.processQueue();
}, 60 * 1000);

module.exports = pushNotificationService;
