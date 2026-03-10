const express = require("express");
const router = express.Router();
const { getAllCustomers, createCustomer, getCustomerById, updateCustomer, getCustomerByMobile, getCustomerSummary, getTempOtp, mergeCustomers, uploadCustomers } = require("../controllers/customerController");
const { protect } = require("../middleware/auth");
const { attachScope } = require("../middleware/scope");

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.get("/summary", protect, attachScope, getCustomerSummary);
router.get("/mobile/:mobile", getCustomerByMobile);
router.get("/", protect, attachScope, getAllCustomers);
router.post("/merge", protect, mergeCustomers);

router.get("/:id", protect, getCustomerById);
router.get("/:id/temp-otp", protect, getTempOtp);
router.post("/upload", protect, upload.single("file"), uploadCustomers);
router.post("/", protect, createCustomer);
router.put("/:id", protect, updateCustomer);

module.exports = router;
