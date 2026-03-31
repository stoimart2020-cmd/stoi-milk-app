const PDFDocument = require('pdfkit-table');
const path = require('path');
const fs = require('fs');

/**
 * Generate a GST-compliant PDF for a monthly invoice
 * @param {Object} invoice - The invoice model object
 * @param {Object} settings - Site/Company settings
 * @returns {Promise<Buffer>} - Resolves with the PDF buffer
 */
exports.generateInvoicePDF = (invoice, settings) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 30, size: 'A4' });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            const site = settings.site || {};
            const headerInfo = settings.header || {};
            const primaryColor = site.primaryColor || '#0d9488'; // Default teal-600

            // --- HEADER SECTION ---
            // Logo
            const logoPath = path.join(__dirname, '..', '..', 'public', 'images', 'logo.png');
            if (fs.existsSync(logoPath)) {
                try {
                    doc.image(logoPath, 30, 30, { width: 60 });
                } catch(e) {
                   console.error("PDF Logo Error:", e.message);
                }
            }

            // Company Title & GST
            doc.fillColor(primaryColor)
               .fontSize(20)
               .text(site.siteName || 'STOI MILK', 300, 45, { align: 'right' });

            doc.fillColor('#444444')
               .fontSize(9)
               .text(site.companyAddress || '', 300, 70, { align: 'right', width: 265 });
            
            doc.text(`GSTIN: ${site.gstin || '-'}`, 300, 100, { align: 'right' });

            // Horizontal Line
            doc.moveTo(30, 120).lineTo(565, 120).strokeColor('#eeeeee').stroke();

            // --- INVOICE INFO SECTION ---
            doc.fillColor('#000000').fontSize(24).text('INVOICE', 30, 135);
            
            // Client vs Invoice Info
            const yInfo = 175;
            // Left: Billed To
            doc.fontSize(10).fillColor('#666666').text('BILLED TO:', 30, yInfo);
            doc.fontSize(12).fillColor('#000000').text(invoice.customerDetails?.name || 'Unknown Customer', 30, yInfo + 15);
            doc.fontSize(9).fillColor('#444444').text(invoice.customerDetails?.address || '', 30, yInfo + 30, { width: 200 });
            doc.text(`Phone: ${invoice.customerDetails?.phone || '-'}`, 30, yInfo + 60);

            // Right: Invoice Metadata
            const xMeta = 350;
            const metaItems = [
                { label: 'Statement No:', value: invoice.statementNo },
                { label: 'Period:', value: invoice.period?.display },
                { label: 'Invoice Date:', value: new Date(invoice.invoiceDate).toLocaleDateString('en-GB') },
                { label: 'Due Date:', value: invoice.dueDate || 'IMMEDIATE' }
            ];

            metaItems.forEach((item, idx) => {
                const y = yInfo + (idx * 15);
                doc.fontSize(9).fillColor('#666666').text(item.label, xMeta, y);
                doc.fontSize(9).fillColor('#000000').text(String(item.value), xMeta + 80, y);
            });

            // Total Payable Highlight
            doc.rect(xMeta - 10, yInfo + 65, 225, 30).fill('#f0fdfa');
            doc.fillColor(primaryColor).fontSize(14).text('TOTAL PAYABLE:', xMeta, yInfo + 75);
            doc.text(`Rs. ${invoice.totalPayable?.toFixed(2)}`, xMeta + 120, yInfo + 75, { align: 'right', width: 85 });

            // --- TABLES SECTION ---
            let currentY = 270;

            // 1. PRODUCT SUMMARY TABLE
            const productTable = {
                title: "Product Summary",
                headers: [
                    { label: "Product", property: "product", width: 200 },
                    { label: "Qty", property: "qty", width: 100, align: "center" },
                    { label: "Amount (Rs.)", property: "amount", width: 150, align: "right" }
                ],
                datas: invoice.items.map(item => ({
                    product: item.product,
                    qty: item.qty.toString(),
                    amount: item.amount?.toFixed(2)
                }))
            };

            doc.fontSize(12).fillColor(primaryColor).text('Product Summary', 30, currentY);
            currentY += 20;

            doc.table(productTable, { 
                y: currentY,
                prepareHeader: () => doc.fontSize(9).fillColor('#444444'),
                prepareRow: () => doc.fontSize(9).fillColor('#222222')
            });

            // 2. WALLET SUMMARY SECTION (If Subscription)
            if (invoice.type === 'SUBSCRIPTION') {
                doc.addPage();
                doc.fontSize(12).fillColor(primaryColor).text('Wallet Summary', 30, 30);
                
                const w = invoice.walletSummary || {};
                const walletTable = {
                    headers: ["Description", "Amount (Rs.)"],
                    datas: [
                        { Description: "Previous Due", "Amount (Rs.)": w.previousDue?.toFixed(2) },
                        { Description: "Consumption (-)", "Amount (Rs.)": w.consumption?.toFixed(2) },
                        { Description: "Discount (+)", "Amount (Rs.)": w.discount?.toFixed(2) },
                        { Description: "Bonus (+)", "Amount (Rs.)": w.bonus?.toFixed(2) },
                        { Description: "Wallet Balance Used", "Amount (Rs.)": w.walletUsed?.toFixed(2) },
                        { Description: "Payable Amount", "Amount (Rs.)": w.payable?.toFixed(2) }
                    ]
                };

                doc.table(walletTable, { 
                    y: 50,
                    prepareHeader: () => doc.fontSize(9),
                    prepareRow: () => doc.fontSize(9),
                    columnsSize: [300, 150]
                });

                doc.fontSize(11).fillColor('#000000').text(`Closing Balance as on ${w.balanceDate || '-'}: Rs. ${w.balanceAsOn?.toFixed(2)}`, 30, doc.y + 20);
            }

            // 3. DELIVERY HISTORY
            if (invoice.deliveries && invoice.deliveries.length > 0) {
                doc.addPage();
                doc.fontSize(12).fillColor(primaryColor).text('Delivery History', 30, 30);
                
                const deliveryTable = {
                    headers: ["Date", "Product", "Qty", "Amount"],
                    datas: invoice.deliveries.map(d => ({
                        Date: String(d.date),
                        Product: String(d.product),
                        Qty: String(d.qty),
                        Amount: `Rs. ${d.amount?.toFixed(2)}`
                    }))
                };
                
                doc.table(deliveryTable, {
                    y: 50,
                    prepareHeader: () => doc.fontSize(8),
                    prepareRow: () => doc.fontSize(8),
                    columnsSize: [80, 200, 50, 100]
                });
            }

            // --- FOOTER SECTION ---
            const pageHeight = doc.page.height;
            doc.fontSize(8).fillColor('#999999').text(`For queries, contact support at ${headerInfo.phone || '7598232759'}`, 0, pageHeight - 50, { align: 'center', width: doc.page.width });
            doc.text(`Built by STOI - Logistics & Production Planning System`, 0, pageHeight - 35, { align: 'center', width: doc.page.width });

            doc.end();
        } catch (err) {
            console.error("PDF Generation Critical Error:", err);
            reject(err);
        }
    });
};
