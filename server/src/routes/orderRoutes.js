const express = require("express");
const router = express.Router();
const { protect, checkPermission } = require("../middleware/auth");
const { attachScope } = require("../middleware/scope");
const { createOrder, getOrders, getAssignedOrders, updateOrderStatus } = require("../controllers/orderController");

router.post("/", protect, checkPermission('orders', 'add'), createOrder);
router.get("/", protect, checkPermission('orders', 'view'), attachScope, getOrders);
router.get("/assigned", protect, getAssignedOrders); // Allow riders to see their assignments
router.patch("/:id/status", protect, updateOrderStatus); // Allow status updates for linked delivery
router.patch("/:id/assign", protect, checkPermission('orders', 'edit'), require("../controllers/orderController").assignRider);
router.post("/bottle-collection", protect, checkPermission('orders', 'add'), require("../controllers/orderController").createBottleCollectionRequest);
router.put("/:id", protect, checkPermission('orders', 'edit'), require("../controllers/orderController").updateOrder);

// Manual trigger for testing or recovering missed cron job executions
// Limited to SUPERADMIN for safety
router.post("/trigger-cron", protect, checkPermission('settings'), async (req, res) => {
    try {
        const { targetDate } = req.body || {};
        const { processSubscriptionPayments, autoAssignOrders } = require("../jobs/dynamicCronJobs");
        console.log(`[MANUAL] Triggering Subscription Payments Job... targetDate: ${targetDate || 'tomorrow'}`);
        await processSubscriptionPayments(targetDate);
        console.log(`[MANUAL] Triggering Auto-Assignment Job... targetDate: ${targetDate || 'tomorrow'}`);
        await autoAssignOrders(targetDate);
        res.status(200).json({ success: true, message: "Manual cron jobs executed successfully." });
    } catch (err) {
        console.error("[MANUAL] Cron trigger failed:", err);
        res.status(500).json({ success: false, message: "Failed to run cron jobs manually." });
    }
});

module.exports = router;
