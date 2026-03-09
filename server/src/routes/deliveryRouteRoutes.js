const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
    getDeliveryRoutes,
    getDeliveryRoute,
    createDeliveryRoute,
    updateDeliveryRoute,
    deleteDeliveryRoute,
    getRoutesByArea
} = require('../controllers/deliveryRouteController');

// Public routes (none for now)

// Protected routes
router.use(protect);
router.use(adminOnly);

router.route('/')
    .get(getDeliveryRoutes)
    .post(createDeliveryRoute);

router.route('/:id')
    .get(getDeliveryRoute)
    .put(updateDeliveryRoute)
    .delete(deleteDeliveryRoute);

router.get('/area/:areaId', getRoutesByArea);

module.exports = router;
