const mongoose = require("mongoose");

// Variant Schema (for size, color, packaging options)
const variantSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "500ml", "1L", "Red"
    sku: { type: String, required: true },
    price: { type: Number, required: true },
    mrp: { type: Number }, // Maximum Retail Price
    costPrice: { type: Number }, // For profit calculation
    stock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    weight: { type: Number }, // in grams
    dimensions: {
        length: Number,
        width: Number,
        height: Number,
    },
    barcode: { type: String },
    image: { type: String },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
});

const productSchema = new mongoose.Schema(
    {
        // Basic Info
        productId: { type: Number, unique: true, sparse: true }, // Auto-increment
        name: { type: String, required: true },
        slug: { type: String, unique: true },
        description: { type: String },
        shortDescription: { type: String },

        // SKU & Identification
        sku: { type: String, unique: true, sparse: true },
        barcode: { type: String },
        hsn: { type: String }, // HSN Code for tax

        // Categorization
        category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
        subcategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
        childCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
        brand: { type: String },
        tags: [String],

        // Pricing (base product price, can be overridden by variants)
        price: { type: Number, required: true },
        mrp: { type: Number }, // Maximum Retail Price
        costPrice: { type: Number },
        taxRate: { type: Number, default: 0 }, // GST percentage
        taxInclusive: { type: Boolean, default: true },

        // Trial Pack Pricing
        trialPrice: { type: Number }, // Special price for trial packs
        trialMrp: { type: Number }, // MRP for trial packs
        trialEnabled: { type: Boolean, default: false }, // Whether trial packs are available for this product
        trialDuration: { type: Number, default: 7 }, // Trial duration in days (e.g., 3, 7, 10, 15, 30)

        // One-Time Purchase Pricing
        oneTimePrice: { type: Number }, // Special price for one-time purchases
        oneTimeMrp: { type: Number }, // MRP for one-time purchases
        oneTimePriceEnabled: { type: Boolean, default: false }, // Whether to use separate one-time pricing

        // Zone-based Pricing
        zonePricing: [{
            serviceArea: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceArea" },
            price: { type: Number },
            isActive: { type: Boolean, default: true }
        }],

        // Discount
        discountType: { type: String, enum: ["percentage", "fixed", "none"], default: "none" },
        discountValue: { type: Number, default: 0 },
        discountStartDate: { type: Date },
        discountEndDate: { type: Date },

        // Images
        image: { type: String }, // Primary image
        images: [{
            url: String,
            alt: String,
            sortOrder: Number
        }],

        // Variants (different sizes, colors, etc.)
        hasVariants: { type: Boolean, default: false },
        variants: [variantSchema],
        variantType: { type: String }, // e.g., "size", "color", "packaging"

        // Inventory
        stock: { type: Number, default: 0 },
        lowStockThreshold: { type: Number, default: 10 },
        trackInventory: { type: Boolean, default: true },
        allowBackorder: { type: Boolean, default: false },

        // Physical attributes
        weight: { type: Number }, // in grams
        dimensions: {
            length: Number,
            width: Number,
            height: Number,
        },
        unit: { type: String, default: "piece" }, // piece, kg, litre, etc.
        unitValue: { type: Number, default: 1 }, // e.g., 500 for 500ml
        unitsPerCrate: { type: Number, default: 12 }, // e.g., 12 bottles per crate

        // Product Type
        productType: {
            type: String,
            enum: ["subscription", "one-time", "both"],
            default: "both"
        },

        // Subscription specific
        subscriptionOptions: {
            allowDaily: { type: Boolean, default: true },
            allowAlternate: { type: Boolean, default: true },
            allowWeekly: { type: Boolean, default: true },
            allowCustom: { type: Boolean, default: true },
            minQuantity: { type: Number, default: 1 },
            maxQuantity: { type: Number, default: 10 },
        },

        // Quick Commerce specific
        isQuickDelivery: { type: Boolean, default: false },
        deliveryTime: { type: String }, // e.g., "10 mins"
        preparationTime: { type: Number }, // in minutes

        // Status
        isActive: { type: Boolean, default: true },
        isFeatured: { type: Boolean, default: false },
        isNewArrival: { type: Boolean, default: false },
        isBestSeller: { type: Boolean, default: false },

        // SEO
        metaTitle: { type: String },
        metaDescription: { type: String },
        metaKeywords: [String],

        // Ratings & Reviews
        averageRating: { type: Number, default: 0 },
        totalReviews: { type: Number, default: 0 },

        // Nutritional Info (for food products)
        nutritionalInfo: {
            calories: Number,
            protein: Number,
            carbs: Number,
            fat: Number,
            fiber: Number,
            sugar: Number,
        },

        // Additional Info
        ingredients: { type: String },
        shelfLife: { type: String },
        storageInstructions: { type: String },
        manufacturer: { type: String },
        countryOfOrigin: { type: String, default: "India" },

        // Vendor/Hub
        vendor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        hub: { type: String },

        // Related products
        relatedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

        // New fields requested
        cancellationCharge: { type: Number, default: 0 },
        leadTime: { type: Number, default: 0 }, // in minutes
        adminLeadTime: { type: Number, default: 0 }, // in minutes
        expiryDays: { type: Number, default: 0 },
        harvestPeriod: { type: String },
        isVisible: { type: Boolean, default: true },
        reverseLogistic: { type: Boolean, default: false },
        actualQuantityCanVary: { type: Boolean, default: false },
        autoAssignToDeliveryBoy: { type: Boolean, default: false },
        prepaidPrice: { type: Number },
        productFeature: { type: String }, // Dropdown value
        cutoffTime: { type: String }, // Product-specific cutoff time (e.g., "17:00")
        cutoffDay: { type: Number }, // -1 = Previous Day, 0 = Same Day

        // Statistics
        totalSold: { type: Number, default: 0 },
        viewCount: { type: Number, default: 0 },

        // Home Screen Display
        showOnHome: { type: Boolean, default: true },
    },
    { timestamps: true }
);

productSchema.pre("save", async function () {
    if (this.isNew && !this.productId) {
        const Counter = require("./Counter");
        this.productId = await Counter.getNextSequence("productId");
    }
});

// Generate slug from name
productSchema.pre("save", function () {
    if (this.isModified("name") && !this.slug) {
        this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }
});

// Virtual for effective price (after discount)
productSchema.virtual("effectivePrice").get(function () {
    if (this.discountType === "none" || !this.discountValue) return this.price;

    const now = new Date();
    if (this.discountStartDate && now < this.discountStartDate) return this.price;
    if (this.discountEndDate && now > this.discountEndDate) return this.price;

    if (this.discountType === "percentage") {
        return this.price - (this.price * this.discountValue / 100);
    }
    return this.price - this.discountValue;
});

// Virtual for discount percentage
productSchema.virtual("discountPercentage").get(function () {
    if (!this.mrp || this.mrp <= this.price) return 0;
    return Math.round(((this.mrp - this.price) / this.mrp) * 100);
});

// Virtual for stock status
productSchema.virtual("stockStatus").get(function () {
    if (this.stock <= 0) return "out_of_stock";
    if (this.stock <= this.lowStockThreshold) return "low_stock";
    return "in_stock";
});

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

// Indexes for search and filtering
productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ isActive: 1, isFeatured: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Product", productSchema);
