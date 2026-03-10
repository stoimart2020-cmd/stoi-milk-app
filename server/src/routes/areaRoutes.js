const express = require("express");
const router = express.Router();
const controller = require("../controllers/areaController");

router.post("/", controller.createArea);
router.get("/", controller.getAllAreas);
router.get("/:id", controller.getAreaById);
router.put("/:id", controller.updateArea);
router.delete("/:id", controller.deleteArea);

module.exports = router;
