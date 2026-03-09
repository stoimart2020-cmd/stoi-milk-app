const mongoose = require("mongoose");

const milkCollectionSchema = new mongoose.Schema({
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    shift: {
        type: String,
        enum: ["Morning", "Evening"],
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0 // In Liters
    },
    fat: {
        type: Number,
        default: 0
    },
    snf: {
        type: Number,
        default: 0 // Solids Not Fat
    },
    clr: {
        type: Number,
        default: 0
    },
    rate: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    qualityCheckStatus: {
        type: String,
        enum: ["Passed", "Failed", "Pending"],
        default: "Pending"
    },
    notes: {
        type: String
    }
}, {
    timestamps: true
});

milkCollectionSchema.index({ vendor: 1, date: -1 });

module.exports = mongoose.model("MilkCollection", milkCollectionSchema);
