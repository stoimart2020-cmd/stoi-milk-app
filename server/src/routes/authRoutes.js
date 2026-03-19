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
    msg91WidgetVerify,
    checkUserStatus,
    loginWithPin,
    setPin,
    changePin,
    verifyTwoStep,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/firebase-verify", firebaseVerifyOtp);
router.post("/msg91-verify", msg91WidgetVerify);

router.post("/onboard", protect, onBoard);
router.get("/me", protect, getCurrentUser);
router.post("/super-admin-login", superAdminLogin);
router.get("/current-admin", protect, getCurrentAdmin);
router.post("/logout", logout);
router.post("/update-fcm-token", protect, updateFcmToken);

router.post("/check-status", checkUserStatus);
router.post("/login-pin", loginWithPin);
router.post("/set-pin", protect, setPin);
router.post("/change-pin", protect, changePin);
router.post("/verify-2fa", verifyTwoStep);


module.exports = router;
