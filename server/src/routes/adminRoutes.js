const express = require("express");
const router = express.Router();
const { protect, checkPermission } = require("../middleware/auth");

// Route to clear data
router.delete("/clear-data", protect, checkPermission('settings'), clearData);

module.exports = router;
