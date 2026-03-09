const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { protect, adminOnly } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// Customer Routes
router.get('/my-invoices', invoiceController.getMyInvoices);

// Admin Routes
router.get('/', adminOnly, invoiceController.getInvoices);
router.post('/generate-monthly', adminOnly, invoiceController.generateMonthlyInvoices);
router.post('/generate-single', adminOnly, invoiceController.generateSingleCustomerInvoice);
router.get('/customer/:customerId', adminOnly, invoiceController.getCustomerInvoices);

// Shared Route (must be last)
router.get('/:id', invoiceController.getInvoiceById);

module.exports = router;
