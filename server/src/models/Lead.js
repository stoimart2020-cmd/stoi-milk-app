const mongoose = require("mongoose");

const interactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['call', 'email', 'meeting', 'demo', 'note'],
        required: true
    },
    notes: String,
    date: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
});

const leadSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        mobile: { type: String, required: true },
        email: { type: String },
        company: { type: String },
        address: {
            street: String,
            city: String,
            state: String,
            pincode: String,
            fullAddress: String
        },
        source: {
            type: String,
            enum: ["Website", "Referral", "Social Media", "Walk-in", "Cold Call", "Event", "Partner", "Other"],
            default: "Website"
        },
        status: {
            type: String,
            enum: ["New", "Contacted", "Interested", "Qualified", "Proposal", "Negotiation", "Converted", "Lost"],
            default: "New"
        },
        priority: {
            type: String,
            enum: ["hot", "warm", "cold", "ice"],
            default: "cold"
        },
        score: { type: Number, default: 0, min: 0, max: 100 },

        // Product interest
        interestedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
        estimatedValue: { type: Number, default: 0 },
        budget: {
            type: String,
            enum: ["high", "medium", "low", "unknown"],
            default: "unknown"
        },

        // Timeline
        expectedClosureDate: Date,
        followUpDate: Date,
        lastContactedAt: Date,

        // Assignment
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

        // Interactions
        interactions: [interactionSchema],
        interactionCount: { type: Number, default: 0 },

        // Status history
        statusHistory: [{
            status: String,
            date: { type: Date, default: Date.now },
            by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
        }],

        // Notes and tags
        notes: { type: String },
        tags: [String],

        // Conversion
        convertedToCustomer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        conversionDate: Date,

        // Loss reason
        lostReason: {
            type: String,
            enum: ["Price", "Competition", "No Response", "Not Interested", "Timing", "Other"]
        },
        lostNotes: String,
    },
    { timestamps: true }
);

// Indexes
leadSchema.index({ mobile: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ score: -1 });
leadSchema.index({ followUpDate: 1 });
leadSchema.index({ createdAt: -1 });

// Pre-save middleware to update interaction count
leadSchema.pre('save', function (next) {
    if (this.interactions) {
        this.interactionCount = this.interactions.length;
    }
    next();
});

module.exports = mongoose.model("Lead", leadSchema);
