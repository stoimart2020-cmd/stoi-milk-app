const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        slug: { type: String, unique: true },
        description: { type: String },
        image: { type: String },
        icon: { type: String },

        // Parent category (null for root categories)
        parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },

        // For quick access to hierarchy
        ancestors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],

        // Category level (0 = root, 1 = subcategory, 2 = sub-subcategory)
        level: { type: Number, default: 0 },

        // Display order
        sortOrder: { type: Number, default: 0 },

        // SEO
        metaTitle: { type: String },
        metaDescription: { type: String },
        metaKeywords: [String],

        // Status
        isActive: { type: Boolean, default: true },
        isFeatured: { type: Boolean, default: false },

        // Quick commerce specific
        deliveryTime: { type: String }, // e.g., "10 mins", "30 mins"
        availableForQuickDelivery: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Generate slug from name
categorySchema.pre("save", function () {
    if (this.isModified("name") && !this.slug) {
        this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }
});

// Virtual for subcategories
categorySchema.virtual("subcategories", {
    ref: "Category",
    localField: "_id",
    foreignField: "parent",
});

categorySchema.set("toJSON", { virtuals: true });
categorySchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Category", categorySchema);
