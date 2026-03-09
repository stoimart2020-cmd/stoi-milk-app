const express = require("express");
const router = express.Router();
const vendorController = require("../controllers/vendorController");
const { protect, authorize } = require("../middleware/auth");
const { attachScope } = require("../middleware/scope");

// All vendor routes require authentication
router.use(protect);
router.use(attachScope);

// Vendor CRUD — Admin, Factory Incharge
router.post("/", authorize("SUPERADMIN", "ADMIN", "FACTORY_INCHARGE"), vendorController.createVendor);
router.get("/", authorize("SUPERADMIN", "ADMIN", "FACTORY_INCHARGE", "MILK_COLLECTION_PERSON"), vendorController.getVendors);
router.put("/:id", authorize("SUPERADMIN", "ADMIN", "FACTORY_INCHARGE"), vendorController.updateVendor);
router.delete("/:id", authorize("SUPERADMIN", "ADMIN"), vendorController.deleteVendor);

// Milk Collection — Admin, Factory Incharge, Milk Collection Person
router.post("/collection", authorize("SUPERADMIN", "ADMIN", "FACTORY_INCHARGE", "MILK_COLLECTION_PERSON"), vendorController.addMilkCollection);
router.get("/collection/history", authorize("SUPERADMIN", "ADMIN", "FACTORY_INCHARGE", "MILK_COLLECTION_PERSON"), vendorController.getMilkCollectionHistory);
router.get("/collection/summary", authorize("SUPERADMIN", "ADMIN", "FACTORY_INCHARGE", "MILK_COLLECTION_PERSON"), vendorController.getMilkCollectionSummary);

// Payment management — Admin only
router.get("/payment-summary", authorize("SUPERADMIN", "ADMIN", "FINANCE_TEAM"), vendorController.getVendorPaymentSummary);
router.post("/payments", authorize("SUPERADMIN", "ADMIN"), vendorController.recordVendorPayment);
router.get("/payments", authorize("SUPERADMIN", "ADMIN", "FINANCE_TEAM"), vendorController.getVendorPayments);

module.exports = router;