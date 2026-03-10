const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { getNotifications, markAsRead, broadcastNotification } = require("../controllers/notificationController");

router.get("/", protect, getNotifications);
router.put("/read", protect, markAsRead);
router.post("/broadcast", protect, broadcastNotification);

module.exports = router;
