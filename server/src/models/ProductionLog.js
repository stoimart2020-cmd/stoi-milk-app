const mongoose = require("mongoose");

const productionLogSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    totalMilkUsed: {
        type: Number,
        required: true // Liters
    },
    productsProduced: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        quantityProduced: {
            type: Number,
            required: true // Bottles/Packets count
        },
        batchNumber: {
            type: String
        },
        unitVolume: {
            type: Number,
            default: 1 // Liters per unit (e.g. 0.5 for 500ml)
        }
    }],
    wastage: {
        type: Number,
        default: 0 // Liters wasted during processing
    },
    notes: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("ProductionLog", productionLogSchema);
