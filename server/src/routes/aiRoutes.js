const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

// Only allow Admins and Superadmins to access the AI assistant
router.post('/chat', protect, authorize("SUPERADMIN", "ADMIN", "CUSTOMER_RELATIONS"), aiController.chat);

module.exports = router;
