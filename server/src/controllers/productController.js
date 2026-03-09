const Product = require("../models/Product");

// Helper: Apply Zone Pricing
const applyZonePricing = (product, zoneId) => {
    if (!product || !zoneId || !product.zonePricing || product.zonePricing.length === 0) return product;

    // Convert to object if it's a mongoose doc to allow modification
    const p = product.toObject ? product.toObject() : product;

    // Find matching zone price
    const zonePriceData = p.zonePricing.find(z =>
        (z.serviceArea?._id?.toString() === zoneId || z.serviceArea?.toString() === zoneId) &&
        z.isActive !== false
    );

    if (zonePriceData) {
        p.originalPrice = p.price; // Keep reference to base price
        p.price = zonePriceData.price;

        // Recalculate effective price roughly (ignoring complex date rules for now or assuming discount applies to new price)
        // If discount is percentage, it applies to new price.
        if (p.discountType === "percentage" && p.discountValue) {
            p.effectivePrice = p.price - (p.price * p.discountValue / 100);
        } else if (p.discountType === "fixed" && p.discountValue) {
            p.effectivePrice = Math.max(0, p.price - p.discountValue);
        } else {
            p.effectivePrice = p.price;
        }
    }
    return p;
};

// Create product
exports.createProduct = async (req, res) => {
    try {
        const { name, ...rest } = req.body;

        // Handle Image Upload
        if (req.files && req.files['image']) {
            rest.image = `/uploads/${req.files['image'][0].filename}`;
        }

        // Handle Gallery Upload
        if (req.files && req.files['gallery']) {
            rest.gallery = req.files['gallery'].map(file => `/uploads/${file.filename}`);
        }

        // Generate SKU if not provided
        if (!rest.sku) {
            const timestamp = Date.now().toString(36).toUpperCase();
            const random = Math.random().toString(36).substring(2, 5).toUpperCase();
            rest.sku = `PRD-${timestamp}-${random}`;
        }

        // Parse zonePricing if it's a string (from FormData)
        if (typeof rest.zonePricing === 'string') {
            try {
                rest.zonePricing = JSON.parse(rest.zonePricing);
            } catch (e) {
                console.warn("Failed to parse zonePricing JSON", e);
            }
        }

        // Clean up ObjectId fields
        const objectIdFields = ["category", "subcategory", "childCategory", "vendor"];
        objectIdFields.forEach(field => {
            if (rest[field] === "") {
                delete rest[field];
            }
        });

        const product = await Product.create({ name, ...rest });
        res.status(201).json({ success: true, result: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all products with filtering, sorting, pagination
exports.getAllProducts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            category,
            subcategory,
            brand,
            minPrice,
            maxPrice,
            search,
            sort = "-createdAt",
            productType,
            featured,
            active,
            inStock,
            quickDelivery,
            zoneId // New param
        } = req.query;

        let query = {};

        // Filtering
        if (category) query.category = category;
        if (subcategory) query.subcategory = subcategory;
        if (brand) query.brand = brand;
        if (productType) query.productType = productType;
        if (featured === "true") query.isFeatured = true;
        if (active !== undefined) query.isActive = active === "true";
        else query.isActive = true; // Default to active products
        if (inStock === "true") query.stock = { $gt: 0 };
        if (quickDelivery === "true") query.isQuickDelivery = true;

        // Price range filtering is tricky with dynamic zone pricing.
        // We filter by BASE price here. Zone filtering would require post-processing which breaks pagination.
        // Accepted limitation: Price filter works on Base Price.
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        // Text search
        if (search) {
            query.$text = { $search: search };
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let products = await Product.find(query)
            .populate("category", "name slug")
            .populate("subcategory", "name slug")
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Product.countDocuments(query);

        // Apply Zone Pricing
        if (zoneId) {
            products = products.map(p => applyZonePricing(p, zoneId));
        }

        res.status(200).json({
            success: true,
            result: products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get product by ID
exports.getProductById = async (req, res) => {
    try {
        const { zoneId } = req.query;
        let product = await Product.findById(req.params.id)
            .populate("category")
            .populate("subcategory")
            .populate("relatedProducts", "name slug price image");

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Increment view count
        product.viewCount += 1;
        await product.save();

        if (zoneId) {
            product = applyZonePricing(product, zoneId);
        }

        res.status(200).json({ success: true, result: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get product by slug
exports.getProductBySlug = async (req, res) => {
    try {
        const { zoneId } = req.query;
        let product = await Product.findOne({ slug: req.params.slug })
            .populate("category")
            .populate("subcategory")
            .populate("relatedProducts", "name slug price image");

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        if (zoneId) {
            product = applyZonePricing(product, zoneId);
        }

        res.status(200).json({ success: true, result: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update product
exports.updateProduct = async (req, res) => {
    try {
        console.log("UPDATE PRODUCT - Body:", req.body);
        console.log("UPDATE PRODUCT - Files:", req.files);

        const updates = { ...req.body };

        // Handle Image Upload
        if (req.files && req.files['image']) {
            updates.image = `/uploads/${req.files['image'][0].filename}`;
        }

        // Handle Gallery Upload
        if (req.files && req.files['gallery']) {
            const newGallery = req.files['gallery'].map(file => `/uploads/${file.filename}`);
            // Use push logic below
        } else {
            delete updates.gallery; // Don't wipe gallery if no files sent
        }

        // Parse zonePricing if string and available
        if (updates.zonePricing && typeof updates.zonePricing === 'string') {
            try {
                updates.zonePricing = JSON.parse(updates.zonePricing);
            } catch (e) {
                console.warn("Failed to parse zonePricing JSON", e);
            }
        }

        // Clean up ObjectId fields
        const objectIdFields = ["category", "subcategory", "childCategory", "vendor"];
        objectIdFields.forEach(field => {
            if (updates[field] === "") {
                updates[field] = null; // Set to null to unset in DB
            }
        });

        // Clean up empty strings for Number fields to avoid CastError
        const numberFields = [
            "weight", "price", "mrp", "costPrice", "taxRate", "discountValue",
            "stock", "lowStockThreshold", "unitValue", "cancellationCharge",
            "leadTime", "adminLeadTime", "expiryDays", "prepaidPrice", "preparationTime",
            "averageRating", "totalReviews", "nutritionalInfo.calories" // etc
        ];

        numberFields.forEach(field => {
            if (updates[field] === "") {
                updates[field] = undefined; // or null, undefined removes it from $set usually or effectively ignores it
                delete updates[field]; // Safest to just remove it if it's empty string so Mongoose doesn't try to validat it
            }
        });

        // Map minQuantity to subscriptionOptions.minQuantity
        if (updates.minQuantity !== undefined) {
            // We need to be careful not to overwrite other subscriptionOptions if we just set subscriptionOptions
            // Safest is to set "subscriptionOptions.minQuantity"
            updates["subscriptionOptions.minQuantity"] = updates.minQuantity === "" ? 1 : updates.minQuantity;
            delete updates.minQuantity;
        }

        const updateOperation = { $set: updates };
        const pushOperation = {};

        if (req.files && req.files['gallery']) {
            const newGallery = req.files['gallery'].map(file => `/uploads/${file.filename}`);
            pushOperation.gallery = { $each: newGallery };
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { ...updateOperation, ...(Object.keys(pushOperation).length > 0 ? { $push: pushOperation } : {}) },
            { new: true, runValidators: true }
        ).populate("category").populate("subcategory");

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        res.status(200).json({ success: true, result: product });
    } catch (error) {
        console.error("Update Product Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete product (soft delete)
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        res.status(200).json({ success: true, message: "Product deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Add variant to product
exports.addVariant = async (req, res) => {
    try {
        const { id } = req.params;
        const variantData = req.body;

        // Generate SKU for variant if not provided
        if (!variantData.sku) {
            const product = await Product.findById(id);
            const variantCount = product.variants?.length || 0;
            variantData.sku = `${product.sku}-V${variantCount + 1}`;
        }

        const product = await Product.findByIdAndUpdate(
            id,
            {
                $push: { variants: variantData },
                $set: { hasVariants: true }
            },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.status(200).json({ success: true, result: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update variant
exports.updateVariant = async (req, res) => {
    try {
        const { id, variantId } = req.params;
        const updateData = req.body;

        const product = await Product.findOneAndUpdate(
            { _id: id, "variants._id": variantId },
            { $set: { "variants.$": { ...updateData, _id: variantId } } },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ success: false, message: "Product or variant not found" });
        }

        res.status(200).json({ success: true, result: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete variant
exports.deleteVariant = async (req, res) => {
    try {
        const { id, variantId } = req.params;

        const product = await Product.findByIdAndUpdate(
            id,
            { $pull: { variants: { _id: variantId } } },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Update hasVariants flag
        if (product.variants.length === 0) {
            product.hasVariants = false;
            await product.save();
        }

        res.status(200).json({ success: true, result: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update stock
exports.updateStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { stock, variantId, operation = "set" } = req.body;

        let updateQuery;
        if (variantId) {
            // Update variant stock
            if (operation === "add") {
                updateQuery = { $inc: { "variants.$.stock": stock } };
            } else if (operation === "subtract") {
                updateQuery = { $inc: { "variants.$.stock": -stock } };
            } else {
                updateQuery = { $set: { "variants.$.stock": stock } };
            }

            const product = await Product.findOneAndUpdate(
                { _id: id, "variants._id": variantId },
                updateQuery,
                { new: true }
            );
            res.status(200).json({ success: true, result: product });
        } else {
            // Update product stock
            if (operation === "add") {
                updateQuery = { $inc: { stock } };
            } else if (operation === "subtract") {
                updateQuery = { $inc: { stock: -stock } };
            } else {
                updateQuery = { $set: { stock } };
            }

            const product = await Product.findByIdAndUpdate(id, updateQuery, { new: true });
            res.status(200).json({ success: true, result: product });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Bulk update products
exports.bulkUpdateProducts = async (req, res) => {
    try {
        const { updates } = req.body; // Array of { id, data }

        const bulkOps = updates.map(update => ({
            updateOne: {
                filter: { _id: update.id },
                update: { $set: update.data }
            }
        }));

        await Product.bulkWrite(bulkOps);

        res.status(200).json({ success: true, message: "Products updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get low stock products
exports.getLowStockProducts = async (req, res) => {
    try {
        const products = await Product.find({
            isActive: true,
            $expr: { $lte: ["$stock", "$lowStockThreshold"] }
        }).sort({ stock: 1 });

        res.status(200).json({ success: true, result: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get featured products
exports.getFeaturedProducts = async (req, res) => {
    try {
        const { zoneId } = req.query;
        let products = await Product.find({ isActive: true, isFeatured: true })
            .populate("category", "name")
            .limit(10);

        if (zoneId) {
            products = products.map(p => applyZonePricing(p, zoneId));
        }

        res.status(200).json({ success: true, result: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get products by category
exports.getProductsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { page = 1, limit = 20, zoneId } = req.query;

        let products = await Product.find({
            isActive: true,
            $or: [{ category: categoryId }, { subcategory: categoryId }]
        })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Product.countDocuments({
            isActive: true,
            $or: [{ category: categoryId }, { subcategory: categoryId }]
        });

        if (zoneId) {
            products = products.map(p => applyZonePricing(p, zoneId));
        }

        res.status(200).json({
            success: true,
            result: products,
            pagination: { page: parseInt(page), limit: parseInt(limit), total }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// Get products for home screen (random 4 from enabled ones)
exports.getHomeProducts = async (req, res) => {
    try {
        const { zoneId } = req.query;
        // Find all active products that are enabled for home screen
        let products = await Product.find({
            isActive: true,
            showOnHome: true
        });

        // If 4 or fewer products, return all of them
        if (products.length <= 4) {
            if (zoneId) {
                products = products.map(p => applyZonePricing(p, zoneId));
            }
            return res.status(200).json({ success: true, result: products });
        }

        // If more than 4, pick 4 random ones
        const shuffled = products.sort(() => 0.5 - Math.random());
        let selected = shuffled.slice(0, 4);

        if (zoneId) {
            selected = selected.map(p => applyZonePricing(p, zoneId));
        }

        res.status(200).json({ success: true, result: selected });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
