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
const { protect } = require("../middleware/auth");
const { uploadMix } = require("../controllers/uploadController");

// Public routes
router.get("/home-products", getHomeProducts);
router.get("/", getAllProducts);
router.get("/featured", getFeaturedProducts);
router.get("/low-stock", protect, getLowStockProducts);
router.get("/category/:categoryId", getProductsByCategory);
router.get("/slug/:slug", getProductBySlug);
router.get("/:id", getProductById);

// Protected routes (Admin only)
router.post("/", protect, uploadMix, createProduct);
router.put("/bulk", protect, bulkUpdateProducts);
router.put("/:id", protect, uploadMix, updateProduct);
router.delete("/:id", protect, deleteProduct);

// Variant routes
router.post("/:id/variant", protect, addVariant);
router.put("/:id/variant/:variantId", protect, updateVariant);
router.delete("/:id/variant/:variantId", protect, deleteVariant);

// Stock routes
router.put("/:id/stock", protect, updateStock);

module.exports = router;
