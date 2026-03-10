const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// @desc    Get delivery history
// @route   GET /api/delivery/history
// @access  Private
const { getOrders } = require('../controllers/orderController');

// @desc    Get delivery history
// @route   GET /api/delivery/history
// @access  Private
router.get('/', protect, getOrders);

module.exports = router;
