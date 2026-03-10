const express = require("express");
const router = express.Router();
const {
    getAllCategories,
    getCategoryTree,
    getCategoryById,
    getCategoryBySlug,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
} = require("../controllers/categoryController");
const { protect } = require("../middleware/auth");

// Public routes
router.get("/", getAllCategories);
router.get("/tree", getCategoryTree);
router.get("/slug/:slug", getCategoryBySlug);
router.get("/:id", getCategoryById);

// Protected routes (admin only)
router.post("/", protect, createCategory);
router.put("/reorder", protect, reorderCategories);
router.put("/:id", protect, updateCategory);
router.delete("/:id", protect, deleteCategory);

module.exports = router;
