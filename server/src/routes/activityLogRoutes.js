const express = require("express");
const router = express.Router();
const activityLogController = require("../controllers/activityLogController");

router.get("/", activityLogController.getLogs);
router.post("/seed", activityLogController.seedLogs);

module.exports = router;
