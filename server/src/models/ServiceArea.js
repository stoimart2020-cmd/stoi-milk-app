const mongoose = require("mongoose");

const serviceAreaSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        description: { type: String },

        // GeoJSON polygon for the service area
        polygon: {
            type: {
                type: String,
                enum: ["Polygon"],
                default: "Polygon",
            },
            coordinates: {
                type: [[[Number]]], // Array of arrays of [lng, lat] pairs
                required: true,
            },
        },

        // Center point for display purposes
        center: {
            lat: { type: Number },
            lng: { type: Number },
        },

        // Color for map display
        color: { type: String, default: "#22c55e" },

        // Pricing/delivery settings for this area
        deliveryCharge: { type: Number, default: 0 },
        minimumOrderValue: { type: Number, default: 0 },
        freeDeliveryAbove: { type: Number },

        // Delivery time estimates
        estimatedDeliveryTime: { type: String, default: "30-45 mins" },


        // Hierarchy Link — Service Area is tied to an Area in the logistics hierarchy
        // Hub(s) and Delivery Points are derived from Area → Hub → DeliveryPoint
        area: { type: mongoose.Schema.Types.ObjectId, ref: "Area" },

        // Priority (for overlapping areas)
        priority: { type: Number, default: 0 },

        // Status
        isActive: { type: Boolean, default: true },

        // Timing restrictions
        serviceStartTime: { type: String, default: "06:00" },
        serviceEndTime: { type: String, default: "21:00" },
        serviceDays: {
            type: [String],
            default: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        },
    },
    { timestamps: true }
);

// Create 2dsphere index for geospatial queries
serviceAreaSchema.index({ polygon: "2dsphere" });

// Static method to check if a point is within any service area
serviceAreaSchema.statics.isPointInServiceArea = async function (lat, lng) {
    const result = await this.findOne({
        isActive: true,
        polygon: {
            $geoIntersects: {
                $geometry: {
                    type: "Point",
                    coordinates: [lng, lat], // GeoJSON uses [lng, lat]
                },
            },
        },
    });
    return result;
};

// Static method to get all active service areas
serviceAreaSchema.statics.getActiveAreas = async function () {
    return this.find({ isActive: true }).sort({ priority: -1 });
};

// Virtual for area in sq km (approximate)
serviceAreaSchema.virtual("areaSqKm").get(function () {
    if (!this.polygon?.coordinates?.[0]) return 0;

    const coords = this.polygon.coordinates[0];
    let area = 0;

    for (let i = 0; i < coords.length - 1; i++) {
        area += coords[i][0] * coords[i + 1][1];
        area -= coords[i + 1][0] * coords[i][1];
    }

    area = Math.abs(area) / 2;
    // Convert to approximate sq km (rough estimate)
    return (area * 111 * 111).toFixed(2);
});

serviceAreaSchema.set("toJSON", { virtuals: true });
serviceAreaSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("ServiceArea", serviceAreaSchema);
