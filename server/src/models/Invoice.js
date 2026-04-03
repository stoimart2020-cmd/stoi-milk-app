const mongoose = require('mongoose');
const { Schema } = mongoose;

const invoiceSchema = new Schema({
    statementNo: {
        type: String,
        required: true,
        unique: true
    },
    customerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    period: {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        display: { type: String } // e.g. "01 Nov 2025 to 30 Nov 2025"
    },
    invoiceDate: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: String, // 'IMMEDIATE' or date string
        default: 'IMMEDIATE'
    },
    totalPayable: {
        type: Number,
        default: 0
    },
    subTotal: {
        type: Number,
        default: 0
    },
    totalTax: {
        type: Number,
        default: 0
    },
    gstBreakdown: {
        cgst: { type: Number, default: 0 },
        sgst: { type: Number, default: 0 },
        igst: { type: Number, default: 0 },
    },
    type: {
        type: String,
        enum: ['STANDARD', 'SUBSCRIPTION'],
        default: 'SUBSCRIPTION'
    },

    // Details for re-generating the PDF
    customerDetails: {
        name: String,
        address: String,
        phone: String,
        email: String
    },

    // Line items
    items: [{
        product: String,
        qty: Number,
        rate: Number,
        amount: Number,
        delivery: Number,
        tax: Number,
        discount: Number,
        total: Number,
        subTotal: Number,
        bonus: Number,
        cancellationCharge: Number
    }],

    // Subscription specific - Wallet Summary snapshot
    walletSummary: {
        previousDue: { type: Number, default: 0 },
        lateFine: { type: Number, default: 0 },
        consumption: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        bonus: { type: Number, default: 0 },
        walletUsed: { type: Number, default: 0 },
        adjustment: { type: Number, default: 0 },
        payable: { type: Number, default: 0 }, // Should match totalPayable usually
        balanceAsOn: { type: Number, default: 0 },
        balanceDate: String
    },

    // Daily delivery snapshot
    deliveries: [{
        date: String,
        product: String,
        qty: Number,
        rate: Number,
        amount: Number
    }],

    // Transaction snapshot
    transactions: [{
        date: String,
        type: String,
        note: String,
        cr: Number,
        dr: Number,
        balance: Number
    }]

}, { timestamps: true });

// Compound index just in case we need to search by customer and period
invoiceSchema.index({ customerId: 1, 'period.endDate': -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
