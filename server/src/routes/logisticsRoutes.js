const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
    // Factory
    createFactory, getFactories, updateFactory, deleteFactory,
    // District
    createDistrict, getDistricts, updateDistrict, deleteDistrict,
    // City
    createCity, getCities, updateCity, deleteCity,
    // Area
    createArea, getAreas, updateArea, deleteArea,
    // Hub
    createHub, getHubs, updateHub, deleteHub,
    // Delivery Point
    createDeliveryPoint, getDeliveryPoints, updateDeliveryPoint, deleteDeliveryPoint,
    // Delivery Route
    createDeliveryRoute, getDeliveryRoutes, updateDeliveryRoute, deleteDeliveryRoute,
    // Hierarchy
    getHierarchy,
} = require("../controllers/logisticsController");

// Factory Routes
router.route("/factories")
    .get(protect, authorize("ADMIN", "SUPERADMIN"), getFactories)
    .post(protect, authorize("ADMIN", "SUPERADMIN"), createFactory);
router.route("/factories/:id")
    .put(protect, authorize("ADMIN", "SUPERADMIN"), updateFactory)
    .delete(protect, authorize("ADMIN", "SUPERADMIN"), deleteFactory);

// District Routes
router.route("/districts")
    .get(protect, authorize("ADMIN", "SUPERADMIN"), getDistricts)
    .post(protect, authorize("ADMIN", "SUPERADMIN"), createDistrict);
router.route("/districts/:id")
    .put(protect, authorize("ADMIN", "SUPERADMIN"), updateDistrict)
    .delete(protect, authorize("ADMIN", "SUPERADMIN"), deleteDistrict);

// City Routes
router.route("/cities")
    .get(protect, authorize("ADMIN", "SUPERADMIN"), getCities)
    .post(protect, authorize("ADMIN", "SUPERADMIN"), createCity);
router.route("/cities/:id")
    .put(protect, authorize("ADMIN", "SUPERADMIN"), updateCity)
    .delete(protect, authorize("ADMIN", "SUPERADMIN"), deleteCity);

// Area Routes
router.route("/areas")
    .get(protect, authorize("ADMIN", "SUPERADMIN"), getAreas)
    .post(protect, authorize("ADMIN", "SUPERADMIN"), createArea);
router.route("/areas/:id")
    .put(protect, authorize("ADMIN", "SUPERADMIN"), updateArea)
    .delete(protect, authorize("ADMIN", "SUPERADMIN"), deleteArea);

// Hub Routes
router.route("/hubs")
    .get(protect, authorize("ADMIN", "SUPERADMIN"), getHubs)
    .post(protect, authorize("ADMIN", "SUPERADMIN"), createHub);
router.route("/hubs/:id")
    .put(protect, authorize("ADMIN", "SUPERADMIN"), updateHub)
    .delete(protect, authorize("ADMIN", "SUPERADMIN"), deleteHub);

// Delivery Point Routes (formerly Stock Points)
router.route("/delivery-points")
    .get(protect, authorize("ADMIN", "SUPERADMIN"), getDeliveryPoints)
    .post(protect, authorize("ADMIN", "SUPERADMIN"), createDeliveryPoint);
router.route("/delivery-points/:id")
    .put(protect, authorize("ADMIN", "SUPERADMIN"), updateDeliveryPoint)
    .delete(protect, authorize("ADMIN", "SUPERADMIN"), deleteDeliveryPoint);

// Delivery Route Routes
router.route("/delivery-routes")
    .get(protect, authorize("ADMIN", "SUPERADMIN"), getDeliveryRoutes)
    .post(protect, authorize("ADMIN", "SUPERADMIN"), createDeliveryRoute);
router.route("/delivery-routes/:id")
    .put(protect, authorize("ADMIN", "SUPERADMIN"), updateDeliveryRoute)
    .delete(protect, authorize("ADMIN", "SUPERADMIN"), deleteDeliveryRoute);

// Full Hierarchy Tree
router.route("/hierarchy")
    .get(protect, authorize("ADMIN", "SUPERADMIN"), getHierarchy);

module.exports = router;
