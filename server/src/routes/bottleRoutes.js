/**
 * Enhanced Bottle Tracking & Reverse Logistics Routes
 */

const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const bottleTrackingService = require('../services/bottleTrackingService');
const bottleController = require('../controllers/bottleController');

// ============ Existing Routes (from bottleController) ============

/**
 * @route   POST /api/bottles/transaction
 * @desc    Record a bottle transaction
 * @access  Private (Rider/Admin)
 */
router.post('/transaction', protect, bottleController.recordBottleTransaction);

/**
 * @route   GET /api/bottles/transactions
 * @desc    Get bottle transactions with filters
 * @access  Private
 */
router.get('/transactions', protect, bottleController.getBottleTransactions);

/**
 * @route   GET /api/bottles/balance/:id
 * @desc    Get customer bottle balance
 * @access  Private
 */
router.get('/balance/:id', protect, bottleController.getCustomerBottleBalance);

/**
 * @route   GET /api/bottles/stats
 * @desc    Get bottle statistics
 * @access  Private (Admin)
 */
router.get('/stats', protect, adminOnly, bottleController.getBottleStats);

/**
 * @route   GET /api/bottles/customers
 * @desc    Get all customers with their bottle counts
 * @access  Private (Admin)
 */
router.get('/customers', protect, adminOnly, bottleController.getCustomerBottles);

/**
 * @route   GET /api/bottles/rider-stats
 * @desc    Get rider bottle statistics
 * @access  Private (Rider)
 */
router.get('/rider-stats', protect, bottleController.getRiderBottleStats);

// ============ New Enhanced Routes ============

/**
 * @route   POST /api/bottles/issue-with-deposit
 * @desc    Issue bottles with deposit collection
 * @access  Private (Rider/Admin)
 */
router.post('/issue-with-deposit', protect, async (req, res) => {
    try {
        const { customerId, quantity, orderId, depositPaid } = req.body;
        const riderId = req.user._id;

        const result = await bottleTrackingService.issueBottlesWithDeposit(
            customerId,
            quantity,
            orderId,
            riderId,
            depositPaid
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   POST /api/bottles/return-with-refund
 * @desc    Return bottles with deposit refund
 * @access  Private (Rider/Admin)
 */
router.post('/return-with-refund', protect, async (req, res) => {
    try {
        const { customerId, quantity, orderId, condition } = req.body;
        const riderId = req.user._id;

        const result = await bottleTrackingService.returnBottlesWithRefund(
            customerId,
            quantity,
            orderId,
            riderId,
            condition || 'good'
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   POST /api/bottles/generate-qr
 * @desc    Generate QR code for bottle tracking
 * @access  Private
 */
router.post('/generate-qr', protect, async (req, res) => {
    try {
        const { customerId, bottleNumber } = req.body;

        const result = bottleTrackingService.generateBottleQRCode(customerId, bottleNumber);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   POST /api/bottles/scan-qr
 * @desc    Scan bottle QR code
 * @access  Private (Rider/Admin)
 */
router.post('/scan-qr', protect, async (req, res) => {
    try {
        const { qrCode, action } = req.body;

        const result = await bottleTrackingService.scanBottleQRCode(qrCode, action);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   POST /api/bottles/schedule-collection
 * @desc    Schedule bottle collection
 * @access  Private
 */
router.post('/schedule-collection', protect, async (req, res) => {
    try {
        const { customerId, preferredDate, riderId, expectedQty } = req.body;

        const result = await bottleTrackingService.scheduleBottleCollection(
            customerId || req.user._id,
            preferredDate,
            riderId,
            expectedQty
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   GET /api/bottles/analytics
 * @desc    Get bottle analytics
 * @access  Private (Admin)
 */
router.get('/analytics', protect, adminOnly, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const result = await bottleTrackingService.getBottleAnalytics(startDate, endDate);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   GET /api/bottles/collection-alerts
 * @desc    Get customers needing bottle collection
 * @access  Private (Admin/Rider)
 */
router.get('/collection-alerts', protect, async (req, res) => {
    try {
        const threshold = parseInt(req.query.threshold) || 5;

        const result = await bottleTrackingService.getCollectionAlerts(threshold);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   POST /api/bottles/bulk-adjustment
 * @desc    Bulk bottle adjustment for inventory reconciliation
 * @access  Private (Admin)
 */
router.post('/bulk-adjustment', protect, adminOnly, async (req, res) => {
    try {
        const { adjustments, reason } = req.body;

        if (!adjustments || !Array.isArray(adjustments)) {
            return res.status(400).json({
                success: false,
                message: 'Adjustments array is required'
            });
        }

        const result = await bottleTrackingService.bulkBottleAdjustment(
            adjustments,
            reason || 'Manual adjustment',
            req.user._id
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   GET /api/bottles/lifecycle-report
 * @desc    Get bottle lifecycle report
 * @access  Private (Admin)
 */
router.get('/lifecycle-report', protect, adminOnly, async (req, res) => {
    try {
        const result = await bottleTrackingService.getBottleLifecycleReport();

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
