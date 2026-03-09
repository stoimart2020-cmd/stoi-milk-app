const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { attachScope } = require("../middleware/scope");
const { createOrder, getOrders, getAssignedOrders, updateOrderStatus } = require("../controllers/orderController");

router.post("/", protect, createOrder);
router.get("/", protect, attachScope, getOrders);
router.get("/assigned", protect, getAssignedOrders);
router.patch("/:id/status", protect, updateOrderStatus);
router.patch("/:id/assign", protect, require("../controllers/orderController").assignRider);
router.post("/bottle-collection", protect, require("../controllers/orderController").createBottleCollectionRequest);
router.put("/:id", protect, require("../controllers/orderController").updateOrder);

// Manual trigger for testing or recovering missed cron job executions
router.post("/trigger-cron", async (req, res) => {
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
