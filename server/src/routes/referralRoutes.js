const express = require("express");
const router = express.Router();
const {
    getMyReferralCode,
    applyReferralCode,
    getReferralStats,
    getAllReferrals,
} = require("../controllers/referralController");
const { protect, authorize } = require("../middleware/auth");

// Customer routes
router.get("/my-code", protect, getMyReferralCode);
router.post("/apply", protect, applyReferralCode);
router.get("/stats", protect, getReferralStats);

// Admin routes
router.get("/admin/all", protect, authorize("ADMIN", "SUPERADMIN"), getAllReferrals);

module.exports = router;
