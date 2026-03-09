/**
 * Admin Utility Routes
 * Special routes for administrative tasks
 */

const express = require('express');
const router = express.Router();
const { clearRateLimit, rateLimitStore } = require('../middleware/rateLimiter');

/**
 * @route   POST /api/admin/clear-rate-limit
 * @desc    Clear rate limits (for development/testing)
 * @access  Public (should be protected in production)
 */
router.post('/clear-rate-limit', (req, res) => {
    try {
        const { ip } = req.body;
        clearRateLimit(ip);

        res.json({
            success: true,
            message: ip ? `Rate limit cleared for IP: ${ip}` : 'All rate limits cleared'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   GET /api/admin/rate-limit-status
 * @desc    View current rate limit status
 * @access  Public (should be protected in production)
 */
router.get('/rate-limit-status', (req, res) => {
    try {
        const status = [];
        for (const [ip, data] of rateLimitStore.entries()) {
            status.push({
                ip,
                count: data.count,
                resetTime: new Date(data.resetTime).toISOString(),
                remainingSeconds: Math.ceil((data.resetTime - Date.now()) / 1000)
            });
        }

        res.json({
            success: true,
            totalIPs: status.length,
            limits: status
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
