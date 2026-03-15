const express = require("express");
const router = express.Router();
const {
    getSettings,
    getPublicSettings,
    updateSettings,
    testSmsGateway,
    testPaymentGateway,
    testEmail,
    sendEmail,
} = require("../controllers/settingsController");
const { protect } = require("../middleware/auth");

// Public route - for customer/rider apps
router.get("/public", getPublicSettings);

// Public settings (needed globally by frontend)
router.get("/", getSettings);
router.put("/", protect, updateSettings);
router.post("/test-sms", protect, testSmsGateway);
router.post("/test-payment", protect, testPaymentGateway);
router.post("/test-email", protect, testEmail);
router.post("/send-email", protect, sendEmail);

module.exports = router;
