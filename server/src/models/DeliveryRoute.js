const mongoose = require('mongoose');

const deliveryRouteSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    area: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Area',
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    // Route-specific details
    estimatedDeliveries: {
        type: Number,
        default: 0
    },
    averageDeliveryTime: {
        type: Number, // in minutes
        default: 30
    },
    // Geographic boundaries (optional polygon for route coverage)
    polygon: {
        type: {
            type: String,
            enum: ['Polygon'],
            default: 'Polygon'
        },
        coordinates: {
            type: [[[Number]]], // Array of arrays of coordinate pairs
            default: undefined
        }
    },
    // Landmarks or key points in the route
    landmarks: [{
        name: String,
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: [Number] // [longitude, latitude]
        }
    }],
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    // Metadata
    notes: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    }
}, {
    timestamps: true
});

// Indexes
deliveryRouteSchema.index({ area: 1 });
deliveryRouteSchema.index({ code: 1 });
deliveryRouteSchema.index({ isActive: 1 });
deliveryRouteSchema.index({ 'polygon': '2dsphere' });

// Virtual for getting city through area
deliveryRouteSchema.virtual('city', {
    ref: 'City',
    localField: 'area',
    foreignField: '_id',
    justOne: true
});

module.exports = mongoose.model('DeliveryRoute', deliveryRouteSchema);
