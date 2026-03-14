const Invoice = require('../models/Invoice');
const User = require('../models/User');
const { sendMonthlyInvoiceNotification } = require('../utils/notification');

// @desc    Get all invoices (Admin)
// @route   GET /api/invoices
exports.getInvoices = async (req, res) => {
    try {
        const { page = 1, limit = 20, customerId } = req.query;
        const query = {};
        if (customerId) query.customerId = customerId;

        const invoices = await Invoice.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await Invoice.countDocuments(query);

        res.status(200).json({
            invoices,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get invoices for a customer (Admin)
// @route   GET /api/invoices/customer/:customerId
exports.getCustomerInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.find({ customerId: req.params.customerId })
            .sort({ createdAt: -1 });
        res.status(200).json(invoices);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get logged-in user's invoices
// @route   GET /api/invoices/my-invoices
exports.getMyInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.find({ customerId: req.user._id })
            .sort({ 'period.endDate': -1 });
        res.status(200).json(invoices);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
exports.getInvoiceById = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        res.status(200).json(invoice);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Core Logic for Cron / API
exports.processMonthlyGeneration = async (referenceDate = new Date()) => {
    try {
        const User = require('../models/User');
        const Transaction = require('../models/Transaction');
        const Order = require('../models/Order');

        // Target: Previous Month
        // If referenceDate is Feb 1st 2024, start is Jan 1st 2024, end is Jan 31st 2024.
        const year = referenceDate.getFullYear();
        const month = referenceDate.getMonth(); // 0-based index of current month

        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

        console.log(`[Invoice Generator] Generating for: ${startOfMonth.toLocaleDateString()} - ${endOfMonth.toLocaleDateString()}`);

        const periodDisplay = `${startOfMonth.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} to ${endOfMonth.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
        const invoiceDate = new Date();

        // Fetch all active customers? Or just those with activity?
        // Let's fetch all customers to ensure statements are generated even if idle (showing opening/closing balance).
        const customers = await User.find({ role: 'CUSTOMER' });

        let generatedCount = 0;

        for (const customer of customers) {
            // Check if full-month invoice already exists
            const fullStatementNo = `INV-${startOfMonth.getFullYear()}${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-${customer.customerId || customer._id.toString().slice(-4)}`;
            const fullInvoice = await Invoice.findOne({ statementNo: fullStatementNo });
            if (fullInvoice) {
                console.log(`[Invoice Generator] Skipping ${fullStatementNo} - Already exists`);
                continue;
            }

            // Find all existing invoices for this customer within this month
            const existingInvoices = await Invoice.find({
                customerId: customer._id,
                'period.startDate': { $lte: endOfMonth },
                'period.endDate': { $gte: startOfMonth }
            }).sort({ 'period.startDate': 1 });

            // Calculate uncovered gaps in the month
            const gaps = [];

            if (existingInvoices.length === 0) {
                // No existing invoices — entire month is uncovered
                gaps.push({ start: startOfMonth, end: endOfMonth });
            } else {
                // Check gap BEFORE the first existing invoice
                const firstInvStart = new Date(existingInvoices[0].period.startDate);
                if (firstInvStart > startOfMonth) {
                    const gapEnd = new Date(firstInvStart);
                    gapEnd.setDate(gapEnd.getDate() - 1);
                    gapEnd.setHours(23, 59, 59, 999);
                    if (gapEnd >= startOfMonth) {
                        gaps.push({ start: new Date(startOfMonth), end: gapEnd });
                    }
                }

                // Check gaps BETWEEN consecutive invoices
                for (let i = 0; i < existingInvoices.length - 1; i++) {
                    const currentEnd = new Date(existingInvoices[i].period.endDate);
                    const nextStart = new Date(existingInvoices[i + 1].period.startDate);

                    const gapStart = new Date(currentEnd);
                    gapStart.setDate(gapStart.getDate() + 1);
                    gapStart.setHours(0, 0, 0, 0);

                    const gapEnd = new Date(nextStart);
                    gapEnd.setDate(gapEnd.getDate() - 1);
                    gapEnd.setHours(23, 59, 59, 999);

                    if (gapStart <= gapEnd) {
                        gaps.push({ start: gapStart, end: gapEnd });
                    }
                }

                // Check gap AFTER the last existing invoice
                const lastInvEnd = new Date(existingInvoices[existingInvoices.length - 1].period.endDate);
                if (lastInvEnd < endOfMonth) {
                    const gapStart = new Date(lastInvEnd);
                    gapStart.setDate(gapStart.getDate() + 1);
                    gapStart.setHours(0, 0, 0, 0);
                    if (gapStart <= endOfMonth) {
                        gaps.push({ start: gapStart, end: new Date(endOfMonth) });
                    }
                }
            }

            if (gaps.length === 0) {
                console.log(`[Invoice Generator] Skipping ${customer.name} - Month fully covered`);
                continue;
            }

            // Generate an invoice for each uncovered gap
            for (const gap of gaps) {
                const gapStart = gap.start;
                const gapEnd = gap.end;

                const datePart = `${gapStart.getFullYear()}${String(gapStart.getMonth() + 1).padStart(2, '0')}${String(gapStart.getDate()).padStart(2, '0')}`;
                const gapStatementNo = `INV-${datePart}-${customer.customerId || customer._id.toString().slice(-4)}`;

                // Skip if this exact statement already exists
                const dupCheck = await Invoice.findOne({ statementNo: gapStatementNo });
                if (dupCheck) continue;

                const gapPeriodDisplay = `${gapStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} to ${gapEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

                // Opening Balance
                const lastTx = await Transaction.findOne({
                    user: customer._id,
                    createdAt: { $lt: gapStart }
                }).sort({ createdAt: -1 });
                const safeOpening = lastTx ? lastTx.balanceAfter : 0;

                // Fetch Transactions
                const txs = await Transaction.find({
                    user: customer._id,
                    createdAt: { $gte: gapStart, $lte: gapEnd }
                }).sort({ createdAt: 1 });

                // Fetch Delivered Orders
                const orders = await Order.find({
                    customer: customer._id,
                    status: 'delivered',
                    deliveryDate: { $gte: gapStart, $lte: gapEnd }
                }).sort({ deliveryDate: 1 }).populate('products.product', 'name price');

                // Skip if no activity
                if (orders.length === 0 && txs.length === 0 && Math.abs(safeOpening) < 1) {
                    continue;
                }

                // Calculations
                let totalConsumption = 0;
                let totalCredits = 0;
                let totalDebits = 0;
                let totalDiscounts = 0;

                txs.forEach(tx => {
                    if (tx.type === 'DEBIT') totalDebits += tx.amount;
                    if (tx.type === 'CREDIT') {
                        if (tx.mode === 'DISCOUNT' || tx.description?.toLowerCase().includes('discount')) {
                            totalDiscounts += tx.amount;
                        } else {
                            totalCredits += tx.amount;
                        }
                    }
                });

                const deliveryRows = orders.map(order => {
                    totalConsumption += order.totalAmount;
                    const productName = order.products.map(p => `${p.product?.name || 'Item'} x${p.quantity}`).join(', ');
                    return {
                        date: new Date(order.deliveryDate).toLocaleDateString('en-GB'),
                        product: productName,
                        qty: order.products.reduce((acc, p) => acc + p.quantity, 0),
                        rate: 0,
                        amount: order.totalAmount
                    };
                });

                const closingBalance = safeOpening + (totalCredits + totalDiscounts) - totalDebits;

                const productSummary = {};
                orders.forEach(order => {
                    order.products.forEach(p => {
                        const name = p.product?.name || "Unknown";
                        if (!productSummary[name]) productSummary[name] = { qty: 0, amount: 0 };
                        productSummary[name].qty += p.quantity;
                        productSummary[name].amount += (p.price * p.quantity);
                    });
                });

                const itemRows = Object.keys(productSummary).map(name => ({
                    product: name,
                    qty: productSummary[name].qty,
                    amount: productSummary[name].amount
                }));

                const txRows = txs.map(tx => ({
                    date: new Date(tx.createdAt).toLocaleDateString('en-GB'),
                    type: tx.type,
                    note: tx.description || tx.mode,
                    cr: tx.type === 'CREDIT' ? tx.amount : 0,
                    dr: tx.type === 'DEBIT' ? tx.amount : 0,
                    balance: tx.balanceAfter
                }));

                const invoice = await Invoice.create({
                    statementNo: gapStatementNo,
                    customerId: customer._id,
                    period: {
                        startDate: gapStart,
                        endDate: gapEnd,
                        display: gapPeriodDisplay
                    },
                    invoiceDate,
                    dueDate: 'IMMEDIATE',
                    totalPayable: closingBalance < 0 ? Math.abs(closingBalance) : 0,
                    type: 'SUBSCRIPTION',
                    customerDetails: {
                        name: customer.name,
                        address: customer.address?.body || "",
                        phone: customer.mobile,
                        email: customer.email
                    },
                    walletSummary: {
                        previousDue: safeOpening < 0 ? Math.abs(safeOpening) : 0,
                        previousAdvance: safeOpening > 0 ? safeOpening : 0,
                        consumption: totalDebits,
                        discount: totalDiscounts,
                        walletUsed: totalDebits,
                        payable: closingBalance < 0 ? Math.abs(closingBalance) : 0,
                        balanceAsOn: closingBalance,
                        balanceDate: gapEnd.toLocaleDateString('en-GB')
                    },
                    items: itemRows,
                    deliveries: deliveryRows,
                    transactions: txRows
                });

                // --- AUTOMATIC MONTHLY INVOICE NOTIFICATION ---
                try {
                    await sendMonthlyInvoiceNotification(customer, invoice);
                } catch (notifErr) {
                    console.error(`Failed to notify customer ${customer.name} for invoice ${gapStatementNo}`, notifErr);
                }

                generatedCount++;
                console.log(`[Invoice Generator] Created ${gapStatementNo} for ${customer.name} (${gapPeriodDisplay})`);
            }
        }

        console.log(`[Invoice Generator] Successfully generated ${generatedCount} invoices.`);
        return generatedCount;

    } catch (err) {
        console.error("[Invoice Generator] Fatal Error:", err);
        throw err;
    }
};

// @desc    Trigger Monthly Generation Manually
// @route   POST /api/invoices/generate-monthly
exports.generateMonthlyInvoices = async (req, res) => {
    try {
        const count = await exports.processMonthlyGeneration();
        res.status(200).json({ success: true, message: `Generated ${count} invoices` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Generate invoice for a single customer (Manual)
// @route   POST /api/invoices/generate-single
exports.generateSingleCustomerInvoice = async (req, res) => {
    try {
        const Transaction = require('../models/Transaction');
        const Order = require('../models/Order');

        const { customerId, startDate, endDate } = req.body;
        if (!customerId || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'customerId, startDate, and endDate are required' });
        }

        const customer = await User.findById(customerId);
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        if (start >= end) {
            return res.status(400).json({ success: false, message: 'Start date must be before end date' });
        }

        // Check for overlapping invoices for this customer
        const overlapping = await Invoice.findOne({
            customerId,
            $or: [
                { 'period.startDate': { $lte: end }, 'period.endDate': { $gte: start } }
            ]
        });

        if (overlapping) {
            return res.status(409).json({
                success: false,
                message: `An invoice already exists for an overlapping period: ${overlapping.period?.display || overlapping.statementNo}`,
                existingInvoice: overlapping.statementNo
            });
        }

        // Generate statement number
        const datePart = `${start.getFullYear()}${String(start.getMonth() + 1).padStart(2, '0')}${String(start.getDate()).padStart(2, '0')}`;
        const statementNo = `INV-${datePart}-${customer.customerId || customer._id.toString().slice(-4)}`;

        // Check exact statement number too
        const exactDuplicate = await Invoice.findOne({ statementNo });
        if (exactDuplicate) {
            return res.status(409).json({
                success: false,
                message: `Invoice ${statementNo} already exists`,
                existingInvoice: statementNo
            });
        }

        const periodDisplay = `${start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} to ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

        // Opening Balance
        const lastTx = await Transaction.findOne({
            user: customer._id,
            createdAt: { $lt: start }
        }).sort({ createdAt: -1 });
        const safeOpening = lastTx ? lastTx.balanceAfter : 0;

        // Fetch Transactions
        const txs = await Transaction.find({
            user: customer._id,
            createdAt: { $gte: start, $lte: end }
        }).sort({ createdAt: 1 });

        // Fetch Delivered Orders
        const orders = await Order.find({
            customer: customer._id,
            status: 'delivered',
            deliveryDate: { $gte: start, $lte: end }
        }).sort({ deliveryDate: 1 }).populate('products.product', 'name price');

        // Calculations
        let totalConsumption = 0;
        let totalCredits = 0;
        let totalDebits = 0;
        let totalDiscounts = 0;

        txs.forEach(tx => {
            if (tx.type === 'DEBIT') totalDebits += tx.amount;
            if (tx.type === 'CREDIT') {
                if (tx.mode === 'DISCOUNT' || tx.description?.toLowerCase().includes('discount')) {
                    totalDiscounts += tx.amount;
                } else {
                    totalCredits += tx.amount;
                }
            }
        });

        const deliveryRows = orders.map(order => {
            totalConsumption += order.totalAmount;
            const productName = order.products.map(p => `${p.product?.name || 'Item'} x${p.quantity}`).join(', ');
            return {
                date: new Date(order.deliveryDate).toLocaleDateString('en-GB'),
                product: productName,
                qty: order.products.reduce((acc, p) => acc + p.quantity, 0),
                rate: 0,
                amount: order.totalAmount
            };
        });

        const closingBalance = safeOpening + (totalCredits + totalDiscounts) - totalDebits;

        // Product Summary
        const productSummary = {};
        orders.forEach(order => {
            order.products.forEach(p => {
                const name = p.product?.name || "Unknown";
                if (!productSummary[name]) productSummary[name] = { qty: 0, amount: 0 };
                productSummary[name].qty += p.quantity;
                productSummary[name].amount += (p.price * p.quantity);
            });
        });

        const itemRows = Object.keys(productSummary).map(name => ({
            product: name,
            qty: productSummary[name].qty,
            amount: productSummary[name].amount
        }));

        const txRows = txs.map(tx => ({
            date: new Date(tx.createdAt).toLocaleDateString('en-GB'),
            type: tx.type,
            note: tx.description || tx.mode,
            cr: tx.type === 'CREDIT' ? tx.amount : 0,
            dr: tx.type === 'DEBIT' ? tx.amount : 0,
            balance: tx.balanceAfter
        }));

        const invoice = await Invoice.create({
            statementNo,
            customerId: customer._id,
            period: {
                startDate: start,
                endDate: end,
                display: periodDisplay
            },
            invoiceDate: new Date(),
            dueDate: 'IMMEDIATE',
            totalPayable: closingBalance < 0 ? Math.abs(closingBalance) : 0,
            type: 'SUBSCRIPTION',
            customerDetails: {
                name: customer.name,
                address: customer.address?.body || "",
                phone: customer.mobile,
                email: customer.email
            },
            walletSummary: {
                previousDue: safeOpening < 0 ? Math.abs(safeOpening) : 0,
                previousAdvance: safeOpening > 0 ? safeOpening : 0,
                consumption: totalDebits,
                discount: totalDiscounts,
                walletUsed: totalDebits,
                payable: closingBalance < 0 ? Math.abs(closingBalance) : 0,
                balanceAsOn: closingBalance,
                balanceDate: end.toLocaleDateString('en-GB')
            },
            items: itemRows,
            deliveries: deliveryRows,
            transactions: txRows
        });

        // --- AUTOMATIC MONTHLY INVOICE NOTIFICATION ---
        try {
            await sendMonthlyInvoiceNotification(customer, invoice);
        } catch (notifErr) {
            console.error(`Failed to notify customer ${customer.name} for manual invoice ${statementNo}`, notifErr);
        }

        res.status(201).json({ success: true, message: `Invoice ${statementNo} generated`, invoice });
    } catch (err) {
        console.error("[Manual Invoice] Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
