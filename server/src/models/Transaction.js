const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        amount: { type: Number, required: true },
        type: { type: String, enum: ["CREDIT", "DEBIT"], required: true }, // CREDIT = Money added to wallet, DEBIT = Money spent
        mode: { type: String, enum: ["CASH", "ONLINE", "UPI", "CHEQUE", "WALLET", "ADJUSTMENT", "NET BANKING"], default: "CASH" },
        status: { type: String, enum: ["SUCCESS", "PENDING", "FAILED"], default: "SUCCESS" },
        description: { type: String },

        // Related entities
        order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
        invoice: { type: String }, // Invoice number or ID
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" }, // Admin who added the payment

        // Specific fields from screenshot
        adjustmentNote: { type: String },
        deliveryBoy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },

        // Payment Gateway Fields
        pgOrderId: { type: String },
        pgPaymentId: { type: String }, // Transaction Ref Id
        gateway: { type: String }, // e.g. RazorpayGateway
        refundAmount: { type: Number, default: 0 },
        responseText: { type: String }, // Raw response from PG

        balanceAfter: { type: Number }, // Snapshot of balance after transaction
    },
    { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
