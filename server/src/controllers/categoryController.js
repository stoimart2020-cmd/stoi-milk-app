const Category = require("../models/Category");

// Get all categories (with optional filtering)
exports.getAllCategories = async (req, res) => {
    try {
        const { parent, level, active, featured } = req.query;

        let query = {};
        if (parent === "null" || parent === "root") {
            query.parent = null;
        } else if (parent) {
            query.parent = parent;
        }
        if (level !== undefined) query.level = parseInt(level);
        if (active !== undefined) query.isActive = active === "true";
        if (featured !== undefined) query.isFeatured = featured === "true";

        const categories = await Category.find(query)
            .populate("parent", "name slug")
            .populate("subcategories")
            .sort({ sortOrder: 1, name: 1 });

        res.status(200).json({ success: true, result: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get category tree (hierarchical)
exports.getCategoryTree = async (req, res) => {
    try {
        const rootCategories = await Category.find({ parent: null, isActive: true })
            .sort({ sortOrder: 1 });

        const buildTree = async (categories) => {
            const tree = [];
            for (const cat of categories) {
                const children = await Category.find({ parent: cat._id, isActive: true })
                    .sort({ sortOrder: 1 });
                tree.push({
                    ...cat.toObject(),
                    children: children.length > 0 ? await buildTree(children) : [],
                });
            }
            return tree;
        };

        const tree = await buildTree(rootCategories);
        res.status(200).json({ success: true, result: tree });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single category
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id)
            .populate("parent")
            .populate("ancestors")
            .populate("subcategories");

        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        res.status(200).json({ success: true, result: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get category by slug
exports.getCategoryBySlug = async (req, res) => {
    try {
        const category = await Category.findOne({ slug: req.params.slug })
            .populate("parent")
            .populate("subcategories");

        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        res.status(200).json({ success: true, result: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create category
exports.createCategory = async (req, res) => {
    try {
        const { name, parent, ...rest } = req.body;

        // Generate slug
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

        // Check if slug exists
        const existingCategory = await Category.findOne({ slug });
        if (existingCategory) {
            return res.status(400).json({ success: false, message: "Category with this name already exists" });
        }

        let categoryData = { name, slug, ...rest };

        // Handle parent category
        if (parent) {
            const parentCategory = await Category.findById(parent);
            if (!parentCategory) {
                return res.status(400).json({ success: false, message: "Parent category not found" });
            }
            categoryData.parent = parent;
            categoryData.level = parentCategory.level + 1;
            categoryData.ancestors = [...parentCategory.ancestors, parent];
        }

        const category = await Category.create(categoryData);
        res.status(201).json({ success: true, result: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update category
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Update slug if name changed
        if (updateData.name) {
            updateData.slug = updateData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        }

        const category = await Category.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        res.status(200).json({ success: true, result: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete category
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if category has children
        const hasChildren = await Category.findOne({ parent: id });
        if (hasChildren) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete category with subcategories. Delete subcategories first."
            });
        }

        // Check if products are using this category
        const Product = require("../models/Product");
        const hasProducts = await Product.findOne({ $or: [{ category: id }, { subcategory: id }] });
        if (hasProducts) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete category with associated products. Reassign products first."
            });
        }

        const category = await Category.findByIdAndDelete(id);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        res.status(200).json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Reorder categories
exports.reorderCategories = async (req, res) => {
    try {
        const { categories } = req.body; // Array of { id, sortOrder }

        const bulkOps = categories.map(cat => ({
            updateOne: {
                filter: { _id: cat.id },
                update: { $set: { sortOrder: cat.sortOrder } }
            }
        }));

        await Category.bulkWrite(bulkOps);

        res.status(200).json({ success: true, message: "Categories reordered successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
