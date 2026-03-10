const mongoose = require("mongoose");

const vendorPaymentSchema = new mongoose.Schema({
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    method: {
        type: String,
        enum: ["Cash", "Bank Transfer", "UPI", "Cheque", "Other"],
        default: "Bank Transfer"
    },
    reference: {
        type: String,
        default: ""
    },
    notes: {
        type: String,
        default: ""
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    }
}, {
    timestamps: true
});

vendorPaymentSchema.index({ vendor: 1, date: -1 });

module.exports = mongoose.model("VendorPayment", vendorPaymentSchema);
