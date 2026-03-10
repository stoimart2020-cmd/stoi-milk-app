const express = require("express");
const router = express.Router();
const {
    sendOtp,
    verifyOtp,
    onBoard,
    getCurrentUser,
    superAdminLogin,
    getCurrentAdmin,
    logout,
    updateFcmToken,
    firebaseVerifyOtp,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/firebase-verify", firebaseVerifyOtp);

router.post("/onboard", protect, onBoard);
router.get("/me", protect, getCurrentUser);
router.post("/super-admin-login", superAdminLogin);
router.get("/current-admin", protect, getCurrentAdmin);
router.post("/logout", logout);
router.post("/update-fcm-token", protect, updateFcmToken);


module.exports = router;
