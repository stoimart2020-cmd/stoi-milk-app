const express = require("express");
const router = express.Router();
const {
    getDeliveryDashboard,
    getDeliveryOrders,
    bulkAssignRider,
    bulkUpdateStatus,
    generateOrdersForDate
} = require("../controllers/deliveryController");

// Dashboard stats
router.get("/dashboard", getDeliveryDashboard);

// Orders list with filters
router.get("/orders", getDeliveryOrders);

// Generate orders from subscriptions for a date (manual trigger)
router.post("/generate-orders", generateOrdersForDate);

// Bulk operations
router.post("/bulk-assign", bulkAssignRider);
router.post("/bulk-status", bulkUpdateStatus);

module.exports = router;
