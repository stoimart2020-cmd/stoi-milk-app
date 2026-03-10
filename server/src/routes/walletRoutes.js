const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { getTransactions } = require("../controllers/paymentController");

// Alias /api/wallet/history to getTransactions
router.get("/history", protect, getTransactions);

module.exports = router;
