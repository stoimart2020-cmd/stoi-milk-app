/**
 * GPS Tracking Routes
 */

const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const gpsTracker = require('../services/gpsTracker');
const Employee = require('../models/Employee');

/**
 * @route   POST /api/tracking/update-location
 * @desc    Update rider location (called by rider app)
 * @access  Private (Rider)
 */
router.post('/update-location', protect, async (req, res) => {
    try {
        const employeeId = req.user._id;
        const { lat, lng, accuracy, speed, heading, battery } = req.body;

        // Update in-memory tracker
        const result = gpsTracker.updateLocation(employeeId, {
            lat,
            lng,
            accuracy,
            speed,
            heading,
            battery,
            timestamp: new Date()
        });

        // Also persist to DB for durability
        await Employee.findByIdAndUpdate(employeeId, {
            liveLocation: {
                coordinates: {
                    type: "Point",
                    coordinates: [lng, lat],
                },
                speed: speed || 0,
                heading: heading || 0,
                accuracy: accuracy || 0,
                battery: battery || null,
                lastUpdated: new Date(),
                isTracking: true,
            }
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   GET /api/tracking/all-riders
 * @desc    Get ALL riders with their location data (from DB + in-memory)
 * @access  Private (Admin)
 */
router.get('/all-riders', protect, adminOnly, async (req, res) => {
    try {
        // Get all riders from DB
        const riders = await Employee.find({ role: 'RIDER', isActive: true })
            .select('name mobile hub areas liveLocation isActive documents.photo')
            .populate('hub', 'name')
            .populate('areas', 'name')
            .lean();

        // Merge with in-memory GPS data (more recent)
        const ridersWithLocation = riders.map(rider => {
            const memoryLocation = gpsTracker.getRiderLocation(rider._id.toString());
            const dbLocation = rider.liveLocation;

            let location = null;
            let isOnline = false;
            let lastSeen = null;

            // Prefer in-memory data if available and fresh
            if (memoryLocation.success && !memoryLocation.isStale) {
                location = {
                    lat: memoryLocation.location.lat,
                    lng: memoryLocation.location.lng,
                    speed: memoryLocation.location.speed,
                    heading: memoryLocation.location.heading,
                    accuracy: memoryLocation.location.accuracy,
                    battery: memoryLocation.location.battery,
                };
                isOnline = true;
                lastSeen = memoryLocation.location.timestamp;
            } else if (dbLocation?.coordinates?.coordinates?.length === 2) {
                // Fallback to DB location
                location = {
                    lat: dbLocation.coordinates.coordinates[1],
                    lng: dbLocation.coordinates.coordinates[0],
                    speed: dbLocation.speed || 0,
                    heading: dbLocation.heading || 0,
                    accuracy: dbLocation.accuracy || 0,
                    battery: dbLocation.battery,
                };
                isOnline = dbLocation.isTracking && dbLocation.lastUpdated &&
                    (Date.now() - new Date(dbLocation.lastUpdated).getTime()) < 5 * 60 * 1000;
                lastSeen = dbLocation.lastUpdated;
            }

            return {
                _id: rider._id,
                name: rider.name,
                mobile: rider.mobile,
                hub: rider.hub,
                areas: rider.areas,
                photo: rider.documents?.photo || null,
                location,
                isOnline,
                lastSeen,
            };
        });

        const onlineCount = ridersWithLocation.filter(r => r.isOnline).length;
        const withLocationCount = ridersWithLocation.filter(r => r.location).length;

        res.json({
            success: true,
            riders: ridersWithLocation,
            total: ridersWithLocation.length,
            online: onlineCount,
            withLocation: withLocationCount,
        });
    } catch (error) {
        console.error('Error fetching all riders for tracking:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   GET /api/tracking/rider/:riderId
 * @desc    Get current rider location
 * @access  Private (Admin)
 */
router.get('/rider/:riderId', protect, adminOnly, async (req, res) => {
    try {
        const result = gpsTracker.getRiderLocation(req.params.riderId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   GET /api/tracking/rider/:riderId/history
 * @desc    Get rider location history
 * @access  Private (Admin)
 */
router.get('/rider/:riderId/history', protect, adminOnly, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const result = gpsTracker.getRiderHistory(req.params.riderId, limit);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   GET /api/tracking/order/:orderId
 * @desc    Get order location (for customer tracking)
 * @access  Private
 */
router.get('/order/:orderId', protect, async (req, res) => {
    try {
        const result = gpsTracker.getOrderLocation(req.params.orderId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   GET /api/tracking/order/:orderId/eta
 * @desc    Get ETA for order delivery
 * @access  Private
 */
router.get('/order/:orderId/eta', protect, async (req, res) => {
    try {
        const Order = require('../models/Order');
        const order = await Order.findById(req.params.orderId).populate('customer');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (!order.assignedRider) {
            return res.json({
                success: false,
                message: 'Order not assigned to any rider yet'
            });
        }

        const destination = {
            lat: order.customer.address?.location?.coordinates[1],
            lng: order.customer.address?.location?.coordinates[0]
        };

        const result = gpsTracker.calculateETA(order.assignedRider, destination);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   GET /api/tracking/active-riders
 * @desc    Get all active riders with locations
 * @access  Private (Admin)
 */
router.get('/active-riders', protect, adminOnly, async (req, res) => {
    try {
        const result = gpsTracker.getActiveRiders();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   GET /api/tracking/summary
 * @desc    Get tracking summary for dashboard
 * @access  Private (Admin)
 */
router.get('/summary', protect, adminOnly, async (req, res) => {
    try {
        const result = gpsTracker.getTrackingSummary();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   POST /api/tracking/start
 * @desc    Start tracking session
 * @access  Private (Rider)
 */
router.post('/start', protect, async (req, res) => {
    try {
        const riderId = req.user._id;

        // Update DB tracking status
        await Employee.findByIdAndUpdate(riderId, {
            'liveLocation.isTracking': true,
            'liveLocation.lastUpdated': new Date(),
        });

        const result = gpsTracker.startTracking(riderId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   POST /api/tracking/stop
 * @desc    Stop tracking session
 * @access  Private (Rider)
 */
router.post('/stop', protect, async (req, res) => {
    try {
        const riderId = req.user._id;

        // Update DB tracking status
        await Employee.findByIdAndUpdate(riderId, {
            'liveLocation.isTracking': false,
        });

        const result = gpsTracker.stopTracking(riderId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
