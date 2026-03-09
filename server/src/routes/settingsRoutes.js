const express = require("express");
const router = express.Router();
const {
    getSettings,
    getPublicSettings,
    updateSettings,
    testSmsGateway,
    testPaymentGateway,
} = require("../controllers/settingsController");
const { protect } = require("../middleware/auth");

// Public route - for customer/rider apps
router.get("/public", getPublicSettings);

// Protected routes - admin only
router.get("/", protect, getSettings);
router.put("/", protect, updateSettings);
router.post("/test-sms", protect, testSmsGateway);
router.post("/test-payment", protect, testPaymentGateway);

module.exports = router;
