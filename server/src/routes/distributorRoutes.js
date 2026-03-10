const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
    createDistributor,
    getAllDistributors,
    getDistributorById,
    updateDistributor,
    deleteDistributor
} = require("../controllers/distributorController");

router.post("/", protect, authorize("SUPERADMIN", "ADMIN"), createDistributor);
router.get("/", protect, authorize("SUPERADMIN", "ADMIN", "DISTRIBUTOR", "FINANCE_TEAM"), getAllDistributors);
router.get("/:id", protect, getDistributorById);
router.put("/:id", protect, authorize("SUPERADMIN", "ADMIN"), updateDistributor);
router.delete("/:id", protect, authorize("SUPERADMIN"), deleteDistributor);

module.exports = router;
