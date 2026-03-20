const express = require("express");
const router = express.Router();
const {
    createProduct,
    getAllProducts,
    getProductById,
    getProductBySlug,
    updateProduct,
    deleteProduct,
    addVariant,
    updateVariant,
    deleteVariant,
    updateStock,
    bulkUpdateProducts,
    getLowStockProducts,
    getFeaturedProducts,
    getProductsByCategory,
    getHomeProducts,
} = require("../controllers/productController");
const { protect, checkPermission } = require("../middleware/auth");
const { uploadMix } = require("../controllers/uploadController");

// Public routes (Showcase)
router.get("/home-products", getHomeProducts);
router.get("/", getAllProducts);
router.get("/featured", getFeaturedProducts);
router.get("/category/:categoryId", getProductsByCategory);
router.get("/slug/:slug", getProductBySlug);
router.get("/:id", getProductById);

// Protected routes (Admin only)
router.get("/low-stock", protect, checkPermission('products', 'view'), getLowStockProducts);
router.post("/", protect, checkPermission('products', 'add'), uploadMix, createProduct);
router.put("/bulk", protect, checkPermission('products', 'edit'), bulkUpdateProducts);
router.put("/:id", protect, checkPermission('products', 'edit'), uploadMix, updateProduct);
router.delete("/:id", protect, checkPermission('products', 'delete'), deleteProduct);

// Variant routes
router.post("/:id/variant", protect, checkPermission('products', 'add'), addVariant);
router.put("/:id/variant/:variantId", protect, checkPermission('products', 'edit'), updateVariant);
router.delete("/:id/variant/:variantId", protect, checkPermission('products', 'delete'), deleteVariant);

// Stock routes
router.put("/:id/stock", protect, checkPermission('products', 'edit'), updateStock);

module.exports = router;
