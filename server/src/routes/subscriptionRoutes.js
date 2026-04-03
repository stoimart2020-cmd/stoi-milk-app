const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { attachScope } = require("../middleware/scope");
const {
    createSubscription,
    getSubscriptions,
    updateSubscription,
    togglePauseSubscription,
    cancelSubscription,
    getCalendarData,
    updateDailyModification,
    getAdminCustomerSubscriptions,
    getAdminCalendarData,
    updateAdminDailyModification,
    getAllSubscriptions,
    getTrialEligibility,
    resetTrialEligibility
} = require("../controllers/subscriptionController");

router.post("/", protect, createSubscription);
router.get("/", protect, getSubscriptions);
router.get("/trial-eligibility", protect, getTrialEligibility);
router.get("/calendar", protect, getCalendarData);
router.put("/modification", protect, updateDailyModification);
router.put("/:id", protect, updateSubscription);
router.put("/:id/pause", protect, togglePauseSubscription);
router.put("/:id/cancel", protect, cancelSubscription);

// Admin Routes - Using different path to avoid parameter conflicts
console.log('🔧 Registering subscription routes...');
router.get("/admin-all", protect, attachScope, getAllSubscriptions);
console.log('✅ Route registered: GET /api/subscriptions/admin-all');
router.get("/admin/calendar/:userId", protect, getAdminCalendarData);
router.put("/admin/modification", protect, updateAdminDailyModification);
router.get("/admin/:userId", protect, getAdminCustomerSubscriptions);
router.post("/admin/reset-trial", protect, resetTrialEligibility);

module.exports = router;
