const express = require("express");
const router = express.Router();
const {
    getAllServiceAreas,
    getServiceAreaById,
    createServiceArea,
    updateServiceArea,
    deleteServiceArea,
    checkServiceability,
    getAreaForLocation,
    toggleServiceAreaStatus,
} = require("../controllers/serviceAreaController");
const { protect } = require("../middleware/auth");

// Public routes
router.get("/check", checkServiceability); // Check if location is serviceable
router.get("/location", getAreaForLocation); // Get area details for location

// Protected routes (admin only)
router.get("/", protect, getAllServiceAreas);
router.get("/:id", protect, getServiceAreaById);
router.post("/", protect, createServiceArea);
router.put("/:id", protect, updateServiceArea);
router.put("/:id/toggle", protect, toggleServiceAreaStatus);
router.delete("/:id", protect, deleteServiceArea);

module.exports = router;
