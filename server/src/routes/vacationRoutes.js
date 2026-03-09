const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getVacationStatus,
    setVacation,
    cancelVacation,
    adminSetVacation,
    adminCancelVacation,
    getCustomersOnVacation
} = require('../controllers/vacationController');

// @desc    Get vacation status
// @route   GET /api/vacation/status
// @access  Private
router.get('/status', protect, getVacationStatus);

// @desc    Set vacation
// @route   POST /api/vacation/set
// @access  Private
router.post('/set', protect, setVacation);

// @desc    Cancel vacation
// @route   POST /api/vacation/cancel
// @access  Private
router.post('/cancel', protect, cancelVacation);

// @desc    Admin Set vacation for customer
// @route   POST /api/vacation/admin/set
// @access  Private (Admin)
router.post('/admin/set', protect, adminSetVacation);

// @desc    Admin Cancel vacation for customer
// @route   POST /api/vacation/admin/cancel
// @access  Private (Admin)
router.post('/admin/cancel', protect, adminCancelVacation);

// @desc    Get all customers on vacation
// @route   GET /api/vacation/admin/active
// @access  Private (Admin)
router.get('/admin/active', protect, getCustomersOnVacation);

module.exports = router;
