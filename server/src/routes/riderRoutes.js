const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
    updateShiftStatus,
    getRiderCustomers,
    markAttendance,
    getAttendance,
    uploadDocument,
    getDocuments,
    getRiderFinancials,
    submitKmLog,
    getTodayKmLog,
    collectCashFromRider,
    payAdvanceToRider,
    getRiderSelfFinancials,
    updateMyRoute,
    getAllSalarySummary,
    getTempOtp
} = require("../controllers/riderController");

// Rider self-service
router.put("/shift", protect, authorize("RIDER"), updateShiftStatus);
router.get("/my/financials", protect, authorize("RIDER"), getRiderSelfFinancials);
router.get("/my/km-log", protect, authorize("RIDER"), getTodayKmLog);
router.get("/my/customers", protect, authorize("RIDER"), (req, res) => {
    req.params.id = req.user._id;
    getRiderCustomers(req, res);
});
router.put("/my/route", protect, authorize("RIDER"), updateMyRoute);
router.post("/my/km-log", protect, authorize("RIDER"), (req, res) => {
    req.params.id = req.user._id;
    submitKmLog(req, res);
});

// Admin managed
router.get("/:id/customers", protect, authorize("SUPERADMIN", "ADMIN", "DELIVERY_MANAGER"), getRiderCustomers);

// Attendance
router.get("/salary-summary", protect, authorize("SUPERADMIN", "ADMIN", "DELIVERY_MANAGER"), getAllSalarySummary);
router.post("/:id/attendance", protect, authorize("SUPERADMIN", "ADMIN", "DELIVERY_MANAGER"), markAttendance);
router.get("/:id/attendance", protect, authorize("SUPERADMIN", "ADMIN", "DELIVERY_MANAGER"), getAttendance);

// Documents
router.post("/:id/documents", protect, authorize("SUPERADMIN", "ADMIN"), uploadDocument);
router.get("/:id/documents", protect, authorize("SUPERADMIN", "ADMIN", "DELIVERY_MANAGER"), getDocuments);

// Financials (Admin)
router.get("/:id/financials", protect, authorize("SUPERADMIN", "ADMIN", "DELIVERY_MANAGER"), getRiderFinancials);
router.post("/:id/km-log", protect, authorize("SUPERADMIN", "ADMIN", "DELIVERY_MANAGER", "RIDER"), submitKmLog);
router.post("/:id/collect-cash", protect, authorize("SUPERADMIN", "ADMIN"), collectCashFromRider);
router.post("/:id/pay-advance", protect, authorize("SUPERADMIN", "ADMIN"), payAdvanceToRider);
router.get("/:id/temp-otp", protect, authorize("SUPERADMIN", "ADMIN"), getTempOtp);

module.exports = router;
