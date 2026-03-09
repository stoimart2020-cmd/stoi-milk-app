const express = require("express");
const router = express.Router();
const controller = require("../controllers/districtController");
// Add middleware if needed (e.g., protect, authorize)

router.post("/", controller.createDistrict);
router.get("/", controller.getAllDistricts);
router.get("/:id", controller.getDistrictById);
router.put("/:id", controller.updateDistrict);
router.delete("/:id", controller.deleteDistrict);

module.exports = router;
