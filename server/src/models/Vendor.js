const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, unique: true, uppercase: true }, // e.g., V001
    mobile: { type: String, required: true, unique: true },
    email: { type: String },
    factory: { type: mongoose.Schema.Types.ObjectId, ref: 'Factory' },
    address: {
        street: String,
        village: String,
        city: String,
        pincode: String
    },
    bankDetails: {
        accountHolderName: String,
        bankName: String,
        accountNumber: String,
        ifscCode: String,
        upiId: String
    },
    ratePerLiter: { type: Number, default: 0 }, // Base rate, can be overridden by fat/snf
    isActive: { type: Boolean, default: true },
    joinedDate: { type: Date, default: Date.now }
}, {
    timestamps: true
});

module.exports = mongoose.model("Vendor", vendorSchema);
