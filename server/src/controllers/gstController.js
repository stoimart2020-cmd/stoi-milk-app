const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const Invoice = require("../models/Invoice");
const Settings = require("../models/Settings");
const mongoose = require("mongoose");

const getDateRange = (period, query) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (period === 'week') start.setDate(now.getDate() - 7);
    else if (period === 'month') start.setDate(now.getDate() - 30);
    else if (period === 'this_month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'last_month') {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (period === 'this_quarter') {
        const qMonth = Math.floor(now.getMonth() / 3) * 3;
        start = new Date(now.getFullYear(), qMonth, 1);
        end = new Date(now.getFullYear(), qMonth + 3, 0);
    } else if (period === 'this_year') {
        start = new Date(now.getFullYear(), 0, 1);
    } else if (period === 'custom' && query.startDate && query.endDate) {
        start = new Date(query.startDate);
        end = new Date(query.endDate);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

// Helper: Calculate GST components from a taxRate
const calcGST = (amount, taxRate, isInterstate = false) => {
    const taxableAmount = amount; // Assuming tax-inclusive prices, adjust if needed
    const gstAmount = (taxableAmount * taxRate) / (100 + taxRate);
    const taxableValue = taxableAmount - gstAmount;
    if (isInterstate) {
        return { taxableValue: Math.round(taxableValue * 100) / 100, igst: Math.round(gstAmount * 100) / 100, cgst: 0, sgst: 0 };
    }
    return {
        taxableValue: Math.round(taxableValue * 100) / 100,
        cgst: Math.round((gstAmount / 2) * 100) / 100,
        sgst: Math.round((gstAmount / 2) * 100) / 100,
        igst: 0
    };
};

// ─── GSTR-1 (Sales Report) ──────────────────────────────────────────────────
// B2C (Unregistered dealers) small invoices - most milk delivery will be here
exports.getGSTR1 = async (req, res) => {
    try {
        const { period = 'this_month' } = req.query;
        const { start, end } = getDateRange(period, req.query);

        const settings = await Settings.findOne();
        const companyGstin = settings?.site?.gstin || '';

        // Fetch orders with product details
        const orders = await Order.find({
            createdAt: { $gte: start, $lte: end },
            status: { $in: ["confirmed", "delivered", "out_for_delivery"] }
        })
            .populate("customer", "name mobile address gstin")
            .populate("products.product", "name hsn taxRate price")
            .lean();

        // B2C Small (Unregistered - below 2.5L per customer)
        // B2B (Registered dealers - if customer has GSTIN)
        const b2b = [];
        const b2cs = [];
        const hsnSummary = {};

        // Group by customer for threshold calculation
        const customerOrders = {};
        orders.forEach(order => {
            const custId = order.customer?._id?.toString() || 'unknown';
            if (!customerOrders[custId]) {
                customerOrders[custId] = {
                    customer: order.customer,
                    orders: [],
                    total: 0
                };
            }
            customerOrders[custId].orders.push(order);
            customerOrders[custId].total += order.totalAmount;
        });

        Object.values(customerOrders).forEach(({ customer, orders: custOrders, total }) => {
            const hasGstin = customer?.gstin && customer.gstin.length === 15;

            custOrders.forEach(order => {
                order.products.forEach(item => {
                    const product = item.product;
                    const taxRate = product?.taxRate || 0;
                    const hsn = product?.hsn || '';
                    const amount = item.price * item.quantity;
                    const gst = calcGST(amount, taxRate);

                    // HSN Summary
                    const hsnKey = `${hsn}_${taxRate}`;
                    if (!hsnSummary[hsnKey]) {
                        hsnSummary[hsnKey] = {
                            hsn,
                            description: product?.name || '',
                            uqc: 'NOS',
                            totalQty: 0,
                            totalValue: 0,
                            taxableValue: 0,
                            cgst: 0,
                            sgst: 0,
                            igst: 0,
                            rate: taxRate
                        };
                    }
                    hsnSummary[hsnKey].totalQty += item.quantity;
                    hsnSummary[hsnKey].totalValue += amount;
                    hsnSummary[hsnKey].taxableValue += gst.taxableValue;
                    hsnSummary[hsnKey].cgst += gst.cgst;
                    hsnSummary[hsnKey].sgst += gst.sgst;
                    hsnSummary[hsnKey].igst += gst.igst;

                    const invoiceEntry = {
                        invoiceNo: order.orderId || order._id.toString().slice(-6),
                        invoiceDate: order.createdAt,
                        customerName: customer?.name || 'Walk-in',
                        productName: product?.name || '',
                        hsn,
                        quantity: item.quantity,
                        rate: item.price,
                        totalValue: amount,
                        taxableValue: gst.taxableValue,
                        cgst: gst.cgst,
                        sgst: gst.sgst,
                        igst: gst.igst,
                        taxRate,
                        placeOfSupply: '33-Tamil Nadu' // Default, should come from settings
                    };

                    if (hasGstin) {
                        invoiceEntry.customerGstin = customer.gstin;
                        b2b.push(invoiceEntry);
                    } else {
                        b2cs.push(invoiceEntry);
                    }
                });
            });
        });

        // Totals
        const totalB2CS = b2cs.reduce((s, i) => ({
            totalValue: s.totalValue + i.totalValue,
            taxableValue: s.taxableValue + i.taxableValue,
            cgst: s.cgst + i.cgst,
            sgst: s.sgst + i.sgst,
            igst: s.igst + i.igst
        }), { totalValue: 0, taxableValue: 0, cgst: 0, sgst: 0, igst: 0 });

        const totalB2B = b2b.reduce((s, i) => ({
            totalValue: s.totalValue + i.totalValue,
            taxableValue: s.taxableValue + i.taxableValue,
            cgst: s.cgst + i.cgst,
            sgst: s.sgst + i.sgst,
            igst: s.igst + i.igst
        }), { totalValue: 0, taxableValue: 0, cgst: 0, sgst: 0, igst: 0 });

        res.status(200).json({
            success: true,
            result: {
                period: { start, end },
                gstin: companyGstin,
                b2b: { entries: b2b, totals: totalB2B },
                b2cs: { entries: b2cs, totals: totalB2CS },
                hsnSummary: Object.values(hsnSummary),
                grandTotal: {
                    totalValue: totalB2B.totalValue + totalB2CS.totalValue,
                    taxableValue: totalB2B.taxableValue + totalB2CS.taxableValue,
                    cgst: totalB2B.cgst + totalB2CS.cgst,
                    sgst: totalB2B.sgst + totalB2CS.sgst,
                    igst: totalB2B.igst + totalB2CS.igst,
                    totalTax: totalB2B.cgst + totalB2CS.cgst + totalB2B.sgst + totalB2CS.sgst +
                        totalB2B.igst + totalB2CS.igst
                }
            }
        });
    } catch (error) {
        console.error("Error in getGSTR1:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GSTR-3B (Summary Return) ──────────────────────────────────────────────
exports.getGSTR3B = async (req, res) => {
    try {
        const { period = 'this_month' } = req.query;
        const { start, end } = getDateRange(period, req.query);

        const settings = await Settings.findOne();

        // OUTWARD SUPPLIES (Sales)
        const salesOrders = await Order.find({
            createdAt: { $gte: start, $lte: end },
            status: { $in: ["confirmed", "delivered", "out_for_delivery"] }
        }).populate("products.product", "taxRate hsn").lean();

        let totalTaxableOutward = 0, totalCGST = 0, totalSGST = 0, totalIGST = 0, totalCess = 0;
        let totalInvoiceValue = 0;

        salesOrders.forEach(order => {
            order.products.forEach(item => {
                const taxRate = item.product?.taxRate || 0;
                const amount = item.price * item.quantity;
                const gst = calcGST(amount, taxRate);
                totalTaxableOutward += gst.taxableValue;
                totalCGST += gst.cgst;
                totalSGST += gst.sgst;
                totalIGST += gst.igst;
                totalInvoiceValue += amount;
            });
        });

        // INWARD SUPPLIES (Purchases) - from VendorPayments/MilkCollections
        let totalTaxableInward = 0, inputCGST = 0, inputSGST = 0, inputIGST = 0;
        try {
            const MilkCollection = require("../models/MilkCollection");
            const milkAgg = await MilkCollection.aggregate([
                { $match: { date: { $gte: start, $lte: end } } },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } }
            ]);
            totalTaxableInward = milkAgg[0]?.total || 0;
            // Assuming 5% GST on milk procurement
            const inputGst = calcGST(totalTaxableInward, 5);
            inputCGST = inputGst.cgst;
            inputSGST = inputGst.sgst;
        } catch (e) { /* MilkCollection might not exist */ }

        // NET TAX LIABILITY
        const netCGST = Math.max(0, totalCGST - inputCGST);
        const netSGST = Math.max(0, totalSGST - inputSGST);
        const netIGST = Math.max(0, totalIGST - inputIGST);

        res.status(200).json({
            success: true,
            result: {
                period: { start, end },
                gstin: settings?.site?.gstin || '',
                // 3.1 - Outward supplies
                outwardSupplies: {
                    taxableValue: Math.round(totalTaxableOutward * 100) / 100,
                    cgst: Math.round(totalCGST * 100) / 100,
                    sgst: Math.round(totalSGST * 100) / 100,
                    igst: Math.round(totalIGST * 100) / 100,
                    cess: totalCess,
                    invoiceValue: Math.round(totalInvoiceValue * 100) / 100,
                    invoiceCount: salesOrders.length
                },
                // 4 - ITC (Input Tax Credit)
                inputTaxCredit: {
                    taxableValue: Math.round(totalTaxableInward * 100) / 100,
                    cgst: Math.round(inputCGST * 100) / 100,
                    sgst: Math.round(inputSGST * 100) / 100,
                    igst: Math.round(inputIGST * 100) / 100
                },
                // 6.1 - Net Tax Payable
                netTaxPayable: {
                    cgst: Math.round(netCGST * 100) / 100,
                    sgst: Math.round(netSGST * 100) / 100,
                    igst: Math.round(netIGST * 100) / 100,
                    total: Math.round((netCGST + netSGST + netIGST) * 100) / 100
                }
            }
        });
    } catch (error) {
        console.error("Error in getGSTR3B:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── HSN SUMMARY ────────────────────────────────────────────────────────────
exports.getHSNSummary = async (req, res) => {
    try {
        const { period = 'this_month' } = req.query;
        const { start, end } = getDateRange(period, req.query);

        const orders = await Order.find({
            createdAt: { $gte: start, $lte: end },
            status: { $in: ["confirmed", "delivered", "out_for_delivery"] }
        }).populate("products.product", "name hsn taxRate unit").lean();

        const hsnMap = {};
        orders.forEach(order => {
            order.products.forEach(item => {
                const product = item.product;
                const hsn = product?.hsn || 'N/A';
                const taxRate = product?.taxRate || 0;
                const key = `${hsn}_${taxRate}`;
                const amount = item.price * item.quantity;
                const gst = calcGST(amount, taxRate);

                if (!hsnMap[key]) {
                    hsnMap[key] = {
                        hsn,
                        productName: product?.name || '',
                        uqc: product?.unit?.toUpperCase() || 'NOS',
                        gstRate: taxRate,
                        totalQty: 0,
                        totalValue: 0,
                        taxableValue: 0,
                        cgst: 0,
                        sgst: 0,
                        igst: 0
                    };
                }
                hsnMap[key].totalQty += item.quantity;
                hsnMap[key].totalValue += amount;
                hsnMap[key].taxableValue += gst.taxableValue;
                hsnMap[key].cgst += gst.cgst;
                hsnMap[key].sgst += gst.sgst;
            });
        });

        const hsnData = Object.values(hsnMap).map(h => ({
            ...h,
            totalValue: Math.round(h.totalValue * 100) / 100,
            taxableValue: Math.round(h.taxableValue * 100) / 100,
            cgst: Math.round(h.cgst * 100) / 100,
            sgst: Math.round(h.sgst * 100) / 100,
            totalTax: Math.round((h.cgst + h.sgst + h.igst) * 100) / 100
        }));

        const totals = hsnData.reduce((s, h) => ({
            totalQty: s.totalQty + h.totalQty,
            totalValue: s.totalValue + h.totalValue,
            taxableValue: s.taxableValue + h.taxableValue,
            cgst: s.cgst + h.cgst,
            sgst: s.sgst + h.sgst,
            totalTax: s.totalTax + h.totalTax
        }), { totalQty: 0, totalValue: 0, taxableValue: 0, cgst: 0, sgst: 0, totalTax: 0 });

        res.status(200).json({
            success: true,
            result: { hsnData, totals, period: { start, end } }
        });
    } catch (error) {
        console.error("Error in getHSNSummary:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── E-WAY BILL GENERATOR DATA ──────────────────────────────────────────────
// Generates data needed for E-Way bill (for goods movement > ₹50,000)
exports.getEwayBillData = async (req, res) => {
    try {
        const { period = 'this_month' } = req.query;
        const { start, end } = getDateRange(period, req.query);

        const settings = await Settings.findOne();

        // Find orders that qualify for e-way bill (> ₹50,000 or based on config)
        const threshold = 50000;

        // Group orders by customer to find combined value per consignment
        const orders = await Order.find({
            createdAt: { $gte: start, $lte: end },
            status: { $in: ["confirmed", "delivered", "out_for_delivery"] }
        })
            .populate("customer", "name mobile address gstin")
            .populate("products.product", "name hsn taxRate price weight")
            .sort({ createdAt: -1 })
            .lean();

        // Group by customer and delivery date for consignment-level e-way
        const consignments = {};
        orders.forEach(order => {
            const custId = order.customer?._id?.toString() || 'unknown';
            const dateStr = new Date(order.deliveryDate || order.createdAt).toISOString().split('T')[0];
            const key = `${custId}_${dateStr}`;
            if (!consignments[key]) {
                consignments[key] = {
                    customer: order.customer,
                    date: dateStr,
                    orders: [],
                    totalValue: 0,
                    totalWeight: 0,
                    products: []
                };
            }
            consignments[key].orders.push(order);
            consignments[key].totalValue += order.totalAmount;
            order.products.forEach(item => {
                const weight = (item.product?.weight || 500) * item.quantity; // Default 500g
                consignments[key].totalWeight += weight;
                consignments[key].products.push({
                    name: item.product?.name || '',
                    hsn: item.product?.hsn || '',
                    taxRate: item.product?.taxRate || 0,
                    quantity: item.quantity,
                    price: item.price,
                    amount: item.price * item.quantity
                });
            });
        });

        // Filter consignments that need e-way bill
        const ewayRequired = Object.values(consignments)
            .filter(c => c.totalValue >= threshold)
            .map(c => {
                const gst = calcGST(c.totalValue, c.products[0]?.taxRate || 0);
                return {
                    customerName: c.customer?.name || 'Unknown',
                    customerMobile: c.customer?.mobile || '',
                    customerAddress: c.customer?.address?.fullAddress || '',
                    customerGstin: c.customer?.gstin || 'URP',
                    date: c.date,
                    totalValue: c.totalValue,
                    totalWeight: Math.round(c.totalWeight / 1000 * 100) / 100, // Convert to kg
                    orderCount: c.orders.length,
                    taxableValue: gst.taxableValue,
                    cgst: gst.cgst,
                    sgst: gst.sgst,
                    igst: gst.igst,
                    products: c.products,
                    ewayBillNo: '', // Will be filled after generation
                    status: 'pending'
                };
            })
            .sort((a, b) => b.totalValue - a.totalValue);

        // All orders summary for potential e-way
        const allConsignments = Object.values(consignments)
            .map(c => ({
                customerName: c.customer?.name || 'Unknown',
                customerGstin: c.customer?.gstin || 'URP',
                date: c.date,
                totalValue: c.totalValue,
                totalWeight: Math.round(c.totalWeight / 1000 * 100) / 100,
                orderCount: c.orders.length,
                needsEway: c.totalValue >= threshold
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json({
            success: true,
            result: {
                ewayRequired,
                allConsignments,
                supplierDetails: {
                    name: settings?.site?.companyName || '',
                    gstin: settings?.site?.gstin || '',
                    address: settings?.site?.companyAddress || ''
                },
                threshold,
                period: { start, end }
            }
        });
    } catch (error) {
        console.error("Error in getEwayBillData:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GENERATE E-WAY BILL (Single entry) ─────────────────────────────────────
exports.generateEwayBill = async (req, res) => {
    try {
        const {
            customerName, customerGstin, customerAddress,
            supplierGstin, supplierName, supplierAddress,
            documentNo, documentDate, totalValue,
            products, vehicleNo, transporterName, transporterId,
            fromPincode, toPincode, distance
        } = req.body;

        // Validate required fields
        if (!customerName || !totalValue || !products?.length) {
            return res.status(400).json({
                success: false,
                message: "Customer name, total value, and products are required"
            });
        }

        // Calculate GST breakdown
        let totalTaxableValue = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;
        const processedProducts = products.map(p => {
            const gst = calcGST(p.amount, p.taxRate || 0);
            totalTaxableValue += gst.taxableValue;
            totalCgst += gst.cgst;
            totalSgst += gst.sgst;
            totalIgst += gst.igst;
            return {
                ...p,
                taxableValue: gst.taxableValue,
                cgst: gst.cgst,
                sgst: gst.sgst,
                igst: gst.igst
            };
        });

        // Generate E-Way Bill data object (for printing/download)
        const ewayBillData = {
            ewayBillNo: `EWB${Date.now()}`, // Placeholder - in production, call NIC API
            ewayBillDate: new Date().toISOString(),
            validUpto: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // +1 day
            docType: 'INV',
            docNo: documentNo || `INV-${Date.now()}`,
            docDate: documentDate || new Date().toISOString(),
            supplyType: 'Outward',
            subType: 'Supply',
            transType: 'Regular',

            supplier: {
                name: supplierName,
                gstin: supplierGstin,
                address: supplierAddress,
                pincode: fromPincode
            },
            recipient: {
                name: customerName,
                gstin: customerGstin || 'URP',
                address: customerAddress,
                pincode: toPincode
            },

            products: processedProducts,
            totalValue: Math.round(totalValue * 100) / 100,
            totalTaxableValue: Math.round(totalTaxableValue * 100) / 100,
            totalCgst: Math.round(totalCgst * 100) / 100,
            totalSgst: Math.round(totalSgst * 100) / 100,
            totalIgst: Math.round(totalIgst * 100) / 100,

            transport: {
                vehicleNo: vehicleNo || '',
                transporterName: transporterName || '',
                transporterId: transporterId || '',
                distance: distance || 0,
                mode: 'Road'
            },

            status: 'generated',
            generatedAt: new Date()
        };

        res.status(200).json({
            success: true,
            message: "E-Way Bill data generated successfully",
            result: ewayBillData
        });
    } catch (error) {
        console.error("Error in generateEwayBill:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
