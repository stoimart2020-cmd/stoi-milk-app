const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const crmController = require("../controllers/crmController");

// Dashboard stats
router.get("/dashboard-stats", protect, crmController.getDashboardStats);

// Lead CRUD
router.get("/leads", protect, crmController.getLeads);
router.post("/leads", protect, crmController.createLead);
router.get("/leads/:id", protect, crmController.getLeadById);
router.put("/leads/:id", protect, crmController.updateLead);
router.delete("/leads/:id", protect, adminOnly, crmController.deleteLead);

// Lead interactions
router.post("/leads/:id/interactions", protect, crmController.addInteraction);

// Lead management
router.post("/leads/:id/convert", protect, crmController.convertLead);
router.post("/leads/:id/mark-lost", protect, crmController.markAsLost);
router.post("/leads/bulk-assign", protect, adminOnly, crmController.bulkAssignLeads);

// Analytics
router.get("/follow-ups", protect, crmController.getFollowUpLeads);
router.get("/hot-leads", protect, crmController.getHotLeads);
router.get("/pipeline-analytics", protect, crmController.getPipelineAnalytics);
router.get("/source-analytics", protect, adminOnly, crmController.getSourceAnalytics);
router.get("/team-performance", protect, adminOnly, crmController.getTeamPerformance);
router.get("/leads/:id/prediction", protect, crmController.getConversionPrediction);

module.exports = router;
