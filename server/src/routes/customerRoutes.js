const express = require("express");
const router = express.Router();
const { getAllCustomers, createCustomer, getCustomerById, updateCustomer, getCustomerByMobile, getCustomerSummary, getTempOtp, mergeCustomers, uploadCustomers } = require("../controllers/customerController");
const { protect, checkPermission } = require("../middleware/auth");
const { attachScope } = require("../middleware/scope");

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.get("/summary", protect, checkPermission('customers', 'view'), attachScope, getCustomerSummary);
router.get("/mobile/:mobile", getCustomerByMobile);
router.get("/", protect, checkPermission('customers', 'view'), attachScope, getAllCustomers);
router.post("/merge", protect, checkPermission('customers', 'edit'), mergeCustomers);

router.get("/:id", protect, checkPermission('customers', 'view'), getCustomerById);
router.get("/:id/temp-otp", protect, checkPermission('customers', 'view'), getTempOtp);
router.post("/upload", protect, checkPermission('customers', 'add'), upload.single("file"), uploadCustomers);
router.post("/", protect, checkPermission('customers', 'add'), createCustomer);
router.put("/:id", protect, checkPermission('customers', 'edit'), updateCustomer);

module.exports = router;
