/**
 * Route Optimization Routes
 */

const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const routeOptimizer = require('../services/routeOptimizer');
const Order = require('../models/Order');
const User = require('../models/User');

/**
 * @route   POST /api/routes/optimize
 * @desc    Optimize route for deliveries
 * @access  Private (Admin/Rider)
 */
router.post('/optimize', protect, async (req, res) => {
    try {
        const { depot, deliveries } = req.body;

        if (!depot || !deliveries) {
            return res.status(400).json({
                success: false,
                message: 'Depot and deliveries are required'
            });
        }

        const result = await routeOptimizer.optimizeRoute(depot, deliveries);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   POST /api/routes/optimize-orders
 * @desc    Optimize route for specific orders
 * @access  Private (Admin)
 */
router.post('/optimize-orders', protect, adminOnly, async (req, res) => {
    try {
        const { orderIds, depotLocation } = req.body;

        // Fetch orders with customer addresses
        const orders = await Order.find({ _id: { $in: orderIds } })
            .populate('customer', 'address');

        const deliveries = orders.map(order => ({
            orderId: order._id,
            lat: order.customer.address?.location?.coordinates[1],
            lng: order.customer.address?.location?.coordinates[0],
            address: order.customer.address?.fullAddress,
            priority: order.priority || 1
        })).filter(d => d.lat && d.lng);

        const result = await routeOptimizer.optimizeRoute(depotLocation, deliveries);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   POST /api/routes/optimize-multiple
 * @desc    Optimize routes for multiple riders
 * @access  Private (Admin)
 */
router.post('/optimize-multiple', protect, adminOnly, async (req, res) => {
    try {
        const { depot, deliveries, numberOfRiders } = req.body;

        const result = await routeOptimizer.optimizeMultipleRoutes(
            depot,
            deliveries,
            numberOfRiders
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   POST /api/routes/directions
 * @desc    Get turn-by-turn directions
 * @access  Private
 */
router.post('/directions', protect, async (req, res) => {
    try {
        const { origin, destination } = req.body;

        const result = await routeOptimizer.getDirections(origin, destination);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
