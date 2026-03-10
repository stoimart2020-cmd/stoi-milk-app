const express = require("express");
const router = express.Router();
const { clearData } = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");

// Route to clear data
// Protected: Only logged-in users
// Admin: Only users with role SUPERADMIN (or ADMIN depending on middleware logic)
router.delete("/clear-data", protect, authorize("SUPERADMIN"), clearData);

module.exports = router;
