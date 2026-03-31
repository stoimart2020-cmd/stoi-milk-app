const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");

router.get("/status", inventoryController.getDailyStockStatus);
router.get("/forecast", inventoryController.getLogisticsForecast);
router.post("/log", inventoryController.addProductionLog);
// router.get("/history", inventoryController.getStockHistory); // If needed

module.exports = router;
