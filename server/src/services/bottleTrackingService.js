/**
 * Advanced Bottle Tracking & Reverse Logistics Service
 * Comprehensive bottle management with deposits, QR codes, and analytics
 */

const BottleTransaction = require('../models/BottleTransaction');
const User = require('../models/User');
const Order = require('../models/Order');
const crypto = require('crypto');

class BottleTrackingService {
    constructor() {
        this.depositAmount = 20; // Default deposit per bottle (₹20)
        this.bottleLifecycle = {
            new: 0,
            good: 1,
            fair: 2,
            poor: 3,
            damaged: 4
        };
    }

    /**
     * Issue bottles with deposit collection
     */
    async issueBottlesWithDeposit(customerId, quantity, orderId, riderId, depositPaid = false) {
        try {
            const customer = await User.findById(customerId);
            if (!customer) {
                return { success: false, message: 'Customer not found' };
            }

            const depositAmount = quantity * this.depositAmount;

            // Create transaction
            const transaction = await BottleTransaction.create({
                customer: customerId,
                rider: riderId,
                order: orderId,
                type: 'issued',
                quantity,
                notes: `Issued ${quantity} bottles. Deposit: ₹${depositAmount}`,
                recordedBy: riderId
            });

            // Update customer bottle balance
            customer.remainingBottles = (customer.remainingBottles || 0) + quantity;

            // Handle deposit
            if (!depositPaid) {
                customer.bottleDeposit = (customer.bottleDeposit || 0) + depositAmount;
            }

            await customer.save();

            return {
                success: true,
                transaction,
                bottleBalance: customer.remainingBottles,
                depositBalance: customer.bottleDeposit || 0,
                message: `Issued ${quantity} bottles. Deposit: ₹${depositAmount}`
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Return bottles with deposit refund
     */
    async returnBottlesWithRefund(customerId, quantity, orderId, riderId, condition = 'good') {
        try {
            const customer = await User.findById(customerId);
            if (!customer) {
                return { success: false, message: 'Customer not found' };
            }

            if ((customer.remainingBottles || 0) < quantity) {
                return {
                    success: false,
                    message: `Customer only has ${customer.remainingBottles || 0} bottles outstanding`
                };
            }

            // Calculate refund based on condition
            let refundPerBottle = this.depositAmount;
            if (condition === 'damaged') {
                refundPerBottle = 0; // No refund for damaged bottles
            } else if (condition === 'poor') {
                refundPerBottle = this.depositAmount * 0.5; // 50% refund
            } else if (condition === 'fair') {
                refundPerBottle = this.depositAmount * 0.75; // 75% refund
            }

            const totalRefund = quantity * refundPerBottle;

            // Create transaction
            const transaction = await BottleTransaction.create({
                customer: customerId,
                rider: riderId,
                order: orderId,
                type: 'returned',
                quantity,
                notes: `Returned ${quantity} bottles (${condition}). Refund: ₹${totalRefund}`,
                recordedBy: riderId,
                bottleCondition: condition,
                refundAmount: totalRefund
            });

            // Update customer balances
            customer.remainingBottles = (customer.remainingBottles || 0) - quantity;
            customer.bottleDeposit = Math.max(0, (customer.bottleDeposit || 0) - totalRefund);

            // Add refund to wallet
            customer.walletBalance = (customer.walletBalance || 0) + totalRefund;

            await customer.save();

            return {
                success: true,
                transaction,
                bottleBalance: customer.remainingBottles,
                depositBalance: customer.bottleDeposit || 0,
                refundAmount: totalRefund,
                walletBalance: customer.walletBalance,
                message: `Returned ${quantity} bottles. Refund: ₹${totalRefund} added to wallet`
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Generate QR code for bottle tracking
     */
    generateBottleQRCode(customerId, bottleNumber) {
        const data = {
            customerId,
            bottleNumber,
            timestamp: Date.now(),
            hash: crypto.createHash('sha256')
                .update(`${customerId}-${bottleNumber}-${Date.now()}`)
                .digest('hex').substring(0, 8)
        };

        return {
            qrCode: Buffer.from(JSON.stringify(data)).toString('base64'),
            data
        };
    }

    /**
     * Scan QR code and process bottle
     */
    async scanBottleQRCode(qrCode, action = 'return') {
        try {
            const data = JSON.parse(Buffer.from(qrCode, 'base64').toString());

            const customer = await User.findById(data.customerId);
            if (!customer) {
                return { success: false, message: 'Invalid QR code' };
            }

            return {
                success: true,
                customer: {
                    id: customer._id,
                    name: customer.name,
                    mobile: customer.mobile,
                    remainingBottles: customer.remainingBottles || 0
                },
                bottleNumber: data.bottleNumber,
                action
            };
        } catch (error) {
            return { success: false, message: 'Invalid QR code format' };
        }
    }

    /**
     * Schedule automatic bottle collection
     */
    async scheduleBottleCollection(customerId, preferredDate = null, riderId = null, expectedQty = null) {
        try {
            const customer = await User.findById(customerId);
            if (!customer) {
                return { success: false, message: 'Customer not found' };
            }

            const bottlesToCollect = expectedQty !== null ? expectedQty : (customer.remainingBottles || 0);

            if (bottlesToCollect === 0) {
                return { success: false, message: 'No bottles to collect' };
            }

            // Check for existing pending request
            const existingOrder = await Order.findOne({
                customer: customerId,
                status: { $in: ["pending", "confirmed", "out_for_delivery"] },
                orderType: "BOTTLE_COLLECTION"
            });

            const collectionDate = preferredDate ? new Date(preferredDate) : new Date();

            if (existingOrder) {
                const existingQty = parseInt(existingOrder.notes) || (customer.remainingBottles || 0);

                if (existingQty === bottlesToCollect) {
                    return { success: false, message: 'Request pending' };
                }

                // Quantity changed -> Update the existing request
                existingOrder.notes = String(bottlesToCollect);
                existingOrder.deliveryDate = collectionDate;
                if (riderId) existingOrder.assignedRider = riderId;
                await existingOrder.save();

                return {
                    success: true,
                    collectionRequest: existingOrder,
                    message: `Updated pending collection request to ${bottlesToCollect} bottles.`
                };
            }

            // Create a new collection request
            const order = await Order.create({
                customer: customerId,
                products: [], // Empty products for bottle collection
                totalAmount: 0,
                deliveryDate: collectionDate,
                paymentMode: "CASH",
                status: riderId ? "confirmed" : "pending",
                paymentStatus: "paid",
                orderType: "BOTTLE_COLLECTION",
                assignedRider: riderId || null,
                notes: String(bottlesToCollect)
            });

            // Need to notify customer
            const { createNotification } = require('../controllers/notificationController');
            await createNotification({
                recipient: customerId,
                title: "Bottle Collection Request",
                message: `A bottle collection has been scheduled for ${collectionDate.toLocaleDateString()}. Please keep your empty bottles ready!`,
                type: "info",
                link: "/dashboard/orders"
            });

            return {
                success: true,
                collectionRequest: order,
                message: `Collection scheduled for ${collectionDate.toLocaleDateString()}`
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Get bottle analytics
     */
    async getBottleAnalytics(startDate, endDate) {
        try {
            const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const end = endDate ? new Date(endDate) : new Date();

            // Total bottles in circulation
            const totalInCirculation = await User.aggregate([
                { $match: { role: 'CUSTOMER' } },
                { $group: { _id: null, total: { $sum: '$remainingBottles' } } }
            ]);

            // Bottles issued in period
            const issued = await BottleTransaction.aggregate([
                {
                    $match: {
                        type: 'issued',
                        createdAt: { $gte: start, $lte: end }
                    }
                },
                { $group: { _id: null, total: { $sum: '$quantity' } } }
            ]);

            // Bottles returned in period
            const returned = await BottleTransaction.aggregate([
                {
                    $match: {
                        type: 'returned',
                        createdAt: { $gte: start, $lte: end }
                    }
                },
                { $group: { _id: null, total: { $sum: '$quantity' } } }
            ]);

            // Return rate
            const issuedCount = issued[0]?.total || 0;
            const returnedCount = returned[0]?.total || 0;
            const returnRate = issuedCount > 0 ? (returnedCount / issuedCount * 100).toFixed(2) : 0;

            // Top customers with most bottles
            const topCustomers = await User.find({ role: 'CUSTOMER' })
                .sort({ remainingBottles: -1 })
                .limit(10)
                .select('name mobile remainingBottles');

            // Daily trend
            const dailyTrend = await BottleTransaction.aggregate([
                {
                    $match: {
                        createdAt: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            type: '$type'
                        },
                        count: { $sum: '$quantity' }
                    }
                },
                { $sort: { '_id.date': 1 } }
            ]);

            return {
                success: true,
                analytics: {
                    totalInCirculation: totalInCirculation[0]?.total || 0,
                    issuedInPeriod: issuedCount,
                    returnedInPeriod: returnedCount,
                    returnRate: `${returnRate}%`,
                    netChange: issuedCount - returnedCount,
                    topCustomers,
                    dailyTrend
                }
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Get customers needing bottle collection
     */
    async getCollectionAlerts(threshold = 5) {
        try {
            const customers = await User.find({
                role: 'CUSTOMER',
                remainingBottles: { $gte: threshold }
            })
                .select('name mobile address remainingBottles')
                .sort({ remainingBottles: -1 });

            const alerts = customers.map(customer => ({
                customerId: customer._id,
                name: customer.name,
                mobile: customer.mobile,
                address: customer.address?.fullAddress,
                bottleCount: customer.remainingBottles,
                priority: customer.remainingBottles >= 10 ? 'high' : 'medium',
                estimatedValue: customer.remainingBottles * this.depositAmount
            }));

            return {
                success: true,
                alerts,
                totalCustomers: alerts.length,
                totalBottles: alerts.reduce((sum, a) => sum + a.bottleCount, 0)
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Bulk bottle adjustment (for inventory reconciliation)
     */
    async bulkBottleAdjustment(adjustments, reason, recordedBy) {
        try {
            const results = [];

            for (const adj of adjustments) {
                const { customerId, adjustment } = adj;

                const customer = await User.findById(customerId);
                if (!customer) continue;

                const transaction = await BottleTransaction.create({
                    customer: customerId,
                    type: 'adjustment',
                    quantity: Math.abs(adjustment),
                    notes: `Bulk adjustment: ${reason}. ${adjustment > 0 ? 'Added' : 'Removed'} ${Math.abs(adjustment)} bottles`,
                    recordedBy
                });

                customer.remainingBottles = (customer.remainingBottles || 0) + adjustment;
                await customer.save();

                results.push({
                    customerId,
                    adjustment,
                    newBalance: customer.remainingBottles
                });
            }

            return {
                success: true,
                results,
                totalAdjusted: results.length,
                message: `Adjusted bottles for ${results.length} customers`
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Get bottle lifecycle report
     */
    async getBottleLifecycleReport() {
        try {
            const transactions = await BottleTransaction.find({
                type: 'returned',
                bottleCondition: { $exists: true }
            });

            const conditionStats = {
                good: 0,
                fair: 0,
                poor: 0,
                damaged: 0
            };

            transactions.forEach(t => {
                if (conditionStats.hasOwnProperty(t.bottleCondition)) {
                    conditionStats[t.bottleCondition] += t.quantity;
                }
            });

            const total = Object.values(conditionStats).reduce((a, b) => a + b, 0);

            return {
                success: true,
                report: {
                    conditionStats,
                    percentages: {
                        good: total > 0 ? ((conditionStats.good / total) * 100).toFixed(2) : 0,
                        fair: total > 0 ? ((conditionStats.fair / total) * 100).toFixed(2) : 0,
                        poor: total > 0 ? ((conditionStats.poor / total) * 100).toFixed(2) : 0,
                        damaged: total > 0 ? ((conditionStats.damaged / total) * 100).toFixed(2) : 0
                    },
                    totalReturned: total,
                    replacementNeeded: conditionStats.damaged + conditionStats.poor
                }
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

// Singleton instance
const bottleTrackingService = new BottleTrackingService();

module.exports = bottleTrackingService;
