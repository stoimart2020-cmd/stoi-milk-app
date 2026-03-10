const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { protect, authorize } = require("../middleware/auth");

router.get("/stats", protect, authorize("ADMIN", "SUPERADMIN"), dashboardController.getDashboardStats);

module.exports = router;
