const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const deliveryComparisonController = require("../controllers/deliveryComparisonController");
const { protect, adminOnly } = require('../middleware/auth');
const predictiveAnalytics = require('../services/predictiveAnalytics');

// Existing routes - Protected for admin access
router.get("/sales", protect, analyticsController.getSalesReport);
router.get("/profit-loss", protect, analyticsController.getProfitLoss);
router.get("/financial-report", protect, analyticsController.getFinancialReport);
router.get("/forecast", protect, analyticsController.getForecast);
router.get("/dashboard-stats", protect, analyticsController.getDashboardStats);
router.get("/customers", protect, analyticsController.getCustomerAnalytics);
router.get("/inventory", protect, analyticsController.getInventoryAnalytics);
router.post("/seed", protect, adminOnly, analyticsController.seedAnalyticsData);

// Delivery Comparison Report
router.get("/delivery-comparison/filter-options", protect, deliveryComparisonController.getFilterOptions);
router.get("/delivery-comparison", protect, deliveryComparisonController.getDeliveryComparison);

// New Predictive Analytics Routes
router.get('/demand-forecast/:productId', protect, adminOnly, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const result = await predictiveAnalytics.forecastDemand(req.params.productId, days);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/churn-prediction/:userId', protect, adminOnly, async (req, res) => {
    try {
        const result = await predictiveAnalytics.predictChurn(req.params.userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/inventory-optimization/:productId', protect, adminOnly, async (req, res) => {
    try {
        const result = await predictiveAnalytics.optimizeInventory(req.params.productId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/customer-ltv/:userId', protect, adminOnly, async (req, res) => {
    try {
        const result = await predictiveAnalytics.predictLTV(req.params.userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─── Detailed Reports ────────────────────────────────────────────────────────
const reportController = require('../controllers/reportController');

// Product / Item Reports
router.get("/reports/product-sales", protect, reportController.getProductSalesSummary);
router.get("/reports/rate-list", protect, reportController.getRateList);
router.get("/reports/stock-summary", protect, reportController.getStockSummary);

// Customer / Party Reports
router.get("/reports/customer-outstanding", protect, reportController.getCustomerOutstanding);
router.get("/reports/customer-ledger/:userId", protect, reportController.getCustomerLedger);
router.get("/reports/customer-sales", protect, reportController.getCustomerSalesSummary);

// Transaction Reports
router.get("/reports/payment-collection", protect, reportController.getPaymentCollectionReport);
router.get("/reports/daybook", protect, reportController.getDaybook);
router.get("/reports/purchase-summary", protect, reportController.getPurchaseSummary);
router.get("/reports/subscription-report", protect, reportController.getSubscriptionReport);

// ─── GST & E-Way Bill Reports ────────────────────────────────────────────────
const gstController = require('../controllers/gstController');

router.get("/gst/gstr1", protect, gstController.getGSTR1);
router.get("/gst/gstr3b", protect, gstController.getGSTR3B);
router.get("/gst/hsn-summary", protect, gstController.getHSNSummary);
router.get("/gst/eway-bill-data", protect, gstController.getEwayBillData);
router.post("/gst/generate-eway-bill", protect, gstController.generateEwayBill);

module.exports = router;
