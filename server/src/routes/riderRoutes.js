const express = require("express");
const router = express.Router();
const { protect, checkPermission } = require("../middleware/auth");
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

// --- Rider Self-Service (Allowed for active RIDER role) ---
router.put("/shift", protect, updateShiftStatus);
router.get("/my/financials", protect, getRiderSelfFinancials);
router.get("/my/km-log", protect, getTodayKmLog);
router.get("/my/customers", protect, (req, res) => {
    req.params.id = req.user._id;
    getRiderCustomers(req, res);
});
router.put("/my/route", protect, updateMyRoute);
router.post("/my/km-log", protect, (req, res) => {
    req.params.id = req.user._id;
    submitKmLog(req, res);
});

// --- Admin Managed (Staff Access Required) ---
router.get("/:id/customers", protect, checkPermission('riders', 'view'), getRiderCustomers);

// Attendance & Salary
router.get("/salary-summary", protect, checkPermission('attendance', 'view'), getAllSalarySummary);
router.post("/:id/attendance", protect, checkPermission('attendance', 'add'), markAttendance);
router.get("/:id/attendance", protect, checkPermission('attendance', 'view'), getAttendance);

// Documents
router.post("/:id/documents", protect, checkPermission('staff', 'edit'), uploadDocument);
router.get("/:id/documents", protect, checkPermission('staff', 'view'), getDocuments);

// Financials (Admin)
router.get("/:id/financials", protect, checkPermission('payments', 'view'), getRiderFinancials);
router.post("/:id/km-log", protect, checkPermission('riders', 'edit'), submitKmLog);
router.post("/:id/collect-cash", protect, checkPermission('payments', 'add'), collectCashFromRider);
router.post("/:id/pay-advance", protect, checkPermission('payments', 'edit'), payAdvanceToRider);
router.get("/:id/temp-otp", protect, checkPermission('staff', 'view'), getTempOtp);

module.exports = router;
