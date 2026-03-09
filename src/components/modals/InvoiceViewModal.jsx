import React, { useRef, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, RefreshCw, Eye, Download, Printer, Mail } from 'lucide-react';
import jsPDF from 'jspdf';
import { axiosInstance } from '../../lib/axios';

export const InvoiceViewModal = ({ invoice, onClose, autoDownload = false }) => {
    const modalRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);

    // Export vector PDF manually for standard beautiful quality
    const handleDownload = async () => {
        setIsDownloading(true);

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();

            // Header Background
            pdf.setFillColor(13, 148, 136); // Teal-600
            pdf.rect(0, 0, pageWidth, 40, 'F');

            // Title
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(24);
            pdf.setFont('helvetica', 'bold');
            pdf.text('INVOICE', 14, 25);

            // Company Info
            pdf.setFontSize(14);
            pdf.text(company.companyName || 'Stoi Milk', pageWidth - 14, 15, { align: 'right' });
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            const addressLines = pdf.splitTextToSize(company.companyAddress || '', 80);
            pdf.text(addressLines, pageWidth - 14, 22, { align: 'right' });
            pdf.text(`GSTIN: ${company.gstin || '-'}`, pageWidth - 14, 32, { align: 'right' });

            // Customer Info Box
            pdf.setTextColor(40, 40, 40);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text('BILLED TO:', 14, 55);
            pdf.setFontSize(10);
            pdf.text(data.customer.name, 14, 62);
            pdf.setFont('helvetica', 'normal');
            const custAddr = pdf.splitTextToSize(data.customer.address || '', 70);
            pdf.text(custAddr, 14, 68);
            pdf.text(`Tel: ${data.customer.phone}`, 14, 68 + (custAddr.length * 5));

            // Invoice Summary Box
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Statement No:`, 120, 55);
            pdf.setFont('helvetica', 'normal');
            pdf.text(data.statementNo || '', 150, 55);

            pdf.setFont('helvetica', 'bold');
            pdf.text(`Period:`, 120, 62);
            pdf.setFont('helvetica', 'normal');
            pdf.text(data.period || '', 150, 62);

            pdf.setFont('helvetica', 'bold');
            pdf.text(`Due By:`, 120, 69);
            pdf.setFont('helvetica', 'normal');
            pdf.text(data.dueDate || '', 150, 69);

            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(13, 148, 136);
            pdf.text(`Total Payable: Rs. ${data.totalPayable}`, 120, 80);

            // Item Table Header
            let y = Math.max(95, 75 + (custAddr.length * 5));
            pdf.setFillColor(245, 245, 245);
            pdf.rect(14, y, pageWidth - 28, 10, 'F');
            pdf.setTextColor(80, 80, 80);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Product', 16, y + 6.5);
            pdf.text('Qty', 90, y + 6.5, { align: 'center' });
            pdf.text('SubTotal', 130, y + 6.5, { align: 'right' });
            pdf.text('Total', pageWidth - 16, y + 6.5, { align: 'right' });

            // Table Body
            y += 15;
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(50, 50, 50);

            data.items.forEach(item => {
                if (y > 270) {
                    pdf.addPage();
                    y = 20;
                }
                pdf.text(`${item.product}`, 16, y);
                pdf.text(`${item.qty}`, 90, y, { align: 'center' });
                pdf.text(`Rs. ${item.subTotal}`, 130, y, { align: 'right' });
                pdf.text(`Rs. ${item.total}`, pageWidth - 16, y, { align: 'right' });

                // Light line
                pdf.setDrawColor(230, 230, 230);
                pdf.line(14, y + 3, pageWidth - 14, y + 3);
                y += 10;
            });

            // Grand Total
            y += 2;
            pdf.setFont('helvetica', 'bold');
            pdf.text('GRAND TOTAL', 130, y, { align: 'right' });
            pdf.text(`Rs. ${data.items.reduce((acc, curr) => acc + curr.total, 0)}`, pageWidth - 16, y, { align: 'right' });

            // Wallet Summary for subscription modes
            if (data.type === 'SUBSCRIPTION') {
                y += 20;
                if (y > 250) { pdf.addPage(); y = 20; }

                pdf.setFillColor(245, 245, 245);
                pdf.rect(14, y, 90, 8, 'F');
                pdf.text('WALLET SUMMARY', 16, y + 5.5);

                y += 12;
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(9);

                const w = data.walletSummary;
                const summaries = [
                    { label: 'Previous Due', val: w.previousDue },
                    { label: 'Consumption', val: w.consumption },
                    { label: 'Discount', val: w.discount },
                    { label: 'Bonus', val: w.bonus },
                ];

                summaries.forEach((s) => {
                    pdf.text(s.label, 16, y);
                    pdf.text(`Rs. ${s.val}`, 100, y, { align: 'right' });
                    y += 6;
                });

                y += 2;
                pdf.setFont('helvetica', 'bold');
                pdf.text('Payable Amount', 16, y);
                pdf.text(`Rs. ${w.payable}`, 100, y, { align: 'right' });
                y += 6;
                pdf.text('Balance As On Date', 16, y);
                pdf.text(`Rs. ${w.balanceAsOn}`, 100, y, { align: 'right' });
            }

            // Footer / Payment Links
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            pdf.setTextColor(100, 100, 100);
            const pyBase = pdf.internal.pageSize.getHeight() - 25;

            pdf.line(14, pyBase - 5, pageWidth - 14, pyBase - 5);
            pdf.text(`For any query, call care at ${contact.phone || '7598232759'}`, 14, pyBase);
            pdf.text(`For payment or recharge, visit: https://stoimilk.com/pay`, 14, pyBase + 5);

            pdf.save(`Invoice_${data.statementNo || 'Doc'}.pdf`);

        } catch (error) {
            console.error('Download failed', error);
            toast.error(`Failed to generate PDF: ${error.message}`);
        } finally {
            setIsDownloading(false);
        }
    };

    // Fetch Settings for Company Info
    const { data: settingsData } = useQuery({
        queryKey: ["settings"],
        queryFn: async () => {
            const response = await axiosInstance.get("/api/settings");
            return response.data;
        }
    });

    // Auto-trigger download if requested
    useEffect(() => {
        if (autoDownload && settingsData && modalRef.current) {
            handleDownload();
        }
    }, [autoDownload, settingsData]); // Wait for settings to load too

    const company = settingsData?.result?.site || {};
    const contact = settingsData?.result?.header || {};

    // Use the passed invoice data directly, only providing safe defaults for deep fields
    // The backend structure matches what we expect mostly:
    // statementNo, period.display, customerDetails, walletSummary, transactions

    const data = {
        ...invoice,
        // Map backend fields to UI fields if necessary
        customer: {
            name: invoice?.customerDetails?.name || 'Unknown',
            address: invoice?.customerDetails?.address || '',
            phone: invoice?.customerDetails?.phone || '',
            email: invoice?.customerDetails?.email || ''
        },
        period: invoice?.period?.display,
        invoiceDate: new Date(invoice?.invoiceDate || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        // Ensure arrays exist
        items: invoice?.items || [],
        deliveries: invoice?.deliveries || [],
        transactions: invoice?.transactions || [],
        walletSummary: invoice?.walletSummary || {
            previousDue: 0, consumption: 0, discount: 0, bonus: 0, payable: 0, balanceAsOn: 0
        }
    };

    const SummaryRow = ({ label, amount, operator }) => (
        <div className="flex flex-col relative py-2">
            <div className="flex justify-between items-center text-xs font-bold text-gray-600 uppercase">
                <span>{label}</span>
                <span className={amount > 0 ? "text-red-500" : "text-gray-800"}>
                    <span className="text-[10px] mr-1">₹</span>{amount}
                </span>
            </div>
            {operator && (
                <div className="absolute -bottom-3 left-3 bg-white border border-gray-300 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold text-gray-500 z-10">
                    {operator}
                </div>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4" >
            <div className="bg-white w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-lg shadow-2xl flex flex-col">

                {/* Modal Header */}
                <div className="bg-teal-600 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center sticky top-0 z-10 shrink-0">
                    <h2 className="text-xl font-bold">Invoice</h2>
                    <button onClick={onClose} className="hover:bg-teal-700 p-1 rounded-full text-white/90 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 bg-gray-50/50 flex-1" ref={modalRef}>

                    {/* Header: Customer & Company Info */}
                    <div className="flex flex-col md:flex-row justify-between gap-6 md:gap-8">
                        {/* Customer Info Box */}
                        <div className="border border-gray-300 bg-white rounded-md p-4 w-full md:w-1/2 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-800 mb-1">{data.customer.name}</h3>
                            <p className="text-gray-600">{data.customer.address}</p>
                            <p className="text-gray-600 mt-2">Tel: {data.customer.phone}</p>
                        </div>

                        {/* Company Info */}
                        <div className="text-right w-full md:w-1/2">
                            {company.logo && (
                                <img src={company.logo} alt="Logo" className="h-12 sm:h-16 object-contain ml-auto mb-2" />
                            )}
                            <h3 className="text-xl font-bold text-teal-700">{company.companyName || 'Stoi Milk'}</h3>
                            <p className="text-gray-600 text-sm whitespace-pre-line">{company.companyAddress}</p>
                            <p className="text-gray-500 text-xs mt-1">GSTIN: {company.gstin}</p>
                        </div>
                    </div>

                    {/* Summary Boxes */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-gray-300 rounded-md bg-white overflow-hidden shadow-sm divide-y md:divide-y-0 md:divide-x divide-gray-300">
                        <div className="p-4 space-y-1">
                            <p className="text-xs font-bold text-gray-500 uppercase">Statement No: <span className="text-gray-800 ml-2 text-sm">{data.statementNo}</span></p>

                            <p className="text-xs font-bold text-gray-500 uppercase mt-1">Period: <span className="text-gray-800 ml-2 text-sm">{data.period || '01 Nov 2025 to 30 Nov 2025'}</span></p>

                            <p className="text-xs font-bold text-gray-500 uppercase mt-1">Invoice Date: <span className="text-gray-800 ml-2 text-sm">{data.invoiceDate}</span></p>
                            <p className="text-xs font-bold text-gray-500 uppercase">Due By: <span className="text-gray-800 ml-2 text-sm">{data.dueDate}</span></p>
                        </div>
                        <div className="p-4">
                            {/* Empty or Middle Content */}
                        </div>
                        <div className="p-4 flex flex-col justify-center items-center md:items-end bg-teal-50/30">
                            <p className="text-xs font-bold text-gray-500 uppercase">Total Payable</p>
                            <div className="flex items-center gap-4 mt-1">
                                <p className={`text-2xl font-bold ${data.totalPayable > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ₹ {data.totalPayable}
                                </p>
                                <div className="flex gap-2 w-full md:w-auto justify-end print:hidden" data-html2canvas-ignore>
                                    <a
                                        href={`https://stoimilk.com/pay/${data.customer.phone}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded hover:bg-teal-700 uppercase no-underline inline-block shadow-sm"
                                    >
                                        Pay Now / Recharge
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Items Table (Standard layout or shared header) */}
                    <div>
                        <div className="overflow-x-auto border border-gray-300 rounded-md shadow-sm">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-100 font-bold text-gray-600 border-b border-gray-300 uppercase">
                                    <tr>
                                        <th className="p-2 w-1/4">Product</th>
                                        {data.type === 'SUBSCRIPTION' && <th className="p-2 text-right">Unit Price</th>}
                                        <th className="p-2 text-center">Qty</th>
                                        {data.type === 'SUBSCRIPTION' && <th className="p-2 text-right">Canceltn. Charge</th>}
                                        {data.type !== 'SUBSCRIPTION' && <th className="p-2 text-right">Delivery Charge</th>}
                                        <th className="p-2 text-right">Tax</th>
                                        <th className="p-2 text-right">Sub Total</th>
                                        <th className="p-2 text-right">Discount</th>
                                        {data.type === 'SUBSCRIPTION' && <th className="p-2 text-right">Bonus</th>}
                                        <th className="p-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {data.items.length === 0 ? (
                                        <tr>
                                            <td colSpan="10" className="p-4 text-center text-gray-400 italic">No product items in this period</td>
                                        </tr>
                                    ) : (
                                        data.items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="p-3 font-medium">{item.product}</td>
                                                {data.type === 'SUBSCRIPTION' && <td className="p-3 text-right">₹{item.rate}</td>}
                                                <td className="p-3 text-center">{item.qty}</td>
                                                {data.type === 'SUBSCRIPTION' && <td className="p-3 text-right">₹{item.cancellationCharge || 0}</td>}
                                                {data.type !== 'SUBSCRIPTION' && <td className="p-3 text-right">{item.delivery}</td>}
                                                <td className="p-3 text-right">{item.tax}</td>
                                                <td className="p-3 text-right">₹ {item.subTotal}</td>
                                                <td className="p-3 text-right">{item.discount}</td>
                                                {data.type === 'SUBSCRIPTION' && <td className="p-3 text-right">{item.bonus || 0}</td>}
                                                <td className="p-3 text-right font-bold">₹ {item.total}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                <tfoot className="bg-gray-50 border-t border-gray-300">
                                    <tr>
                                        <td colSpan={data.type === 'SUBSCRIPTION' ? 9 : 7} className="p-2 text-right font-bold text-gray-600 uppercase text-[10px] tracking-wider">GRAND TOTAL</td>
                                        <td className="p-2 text-right font-bold text-gray-900 border-l">₹ {data.items.reduce((acc, curr) => acc + curr.total, 0)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Content Split: Wallet Summary vs History */}
                    <div className="flex flex-col lg:flex-row gap-6">

                        {/* LEFT: Wallet Summary (Subscription Only) */}
                        {data.type === 'SUBSCRIPTION' && (
                            <div className="w-full lg:w-1/3 space-y-4">
                                <h4 className="text-center text-xs font-bold text-gray-500 uppercase py-2 border border-gray-300 rounded-t-md bg-gray-100">Wallet Summary</h4>
                                <div className="border border-gray-300 rounded-b-md bg-white p-4 space-y-4 shadow-sm relative text-sm">

                                    <SummaryRow label="Previous Due" amount={data.walletSummary.previousDue} operator="+" />
                                    <SummaryRow label="Late Payment Fine" amount={data.walletSummary.lateFine} operator="+" />
                                    <SummaryRow label="Consumption" amount={data.walletSummary.consumption} operator="-" />
                                    <SummaryRow label="Discount" amount={data.walletSummary.discount} operator="-" />
                                    <SummaryRow label="Bonus" amount={data.walletSummary.bonus} operator="-" />
                                    <SummaryRow label="Wallet Balance Used" amount={data.walletSummary.walletUsed} operator="+" />
                                    <SummaryRow label="Adjustment" amount={data.walletSummary.adjustment} operator="=" />

                                    <div className="flex flex-col relative py-3 border-t-2 border-dashed border-gray-300 mt-2">
                                        <div className="flex justify-between items-center text-sm font-black text-gray-800 uppercase">
                                            <span>Payable Amount</span>
                                            <span className="text-red-600">₹ {data.walletSummary.payable}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <div className="text-center">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Wallet Balance as on</p>
                                            <p className="text-[10px] text-gray-500 mb-1">{data.walletSummary.balanceDate}</p>
                                            <p className={`text-xl font-bold ${data.walletSummary.balanceAsOn < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                ₹ {data.walletSummary.balanceAsOn}
                                            </p>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}

                        {/* RIGHT: Delivery & Transactions (Full width if standard, 2/3 if subscription) */}
                        <div className={`w-full ${data.type === 'SUBSCRIPTION' ? 'lg:w-2/3' : ''} space-y-6`}>

                            {/* Delivery History */}
                            <div>
                                <h4 className="text-center text-xs font-bold text-gray-500 uppercase mb-0 py-2 bg-gray-100 border-x border-t border-gray-300 rounded-t-md">Delivery History</h4>
                                <div className="overflow-x-auto border border-gray-300 rounded-b-md shadow-sm max-h-64 overflow-y-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-gray-50 font-bold text-gray-600 border-b border-gray-300 sticky top-0">
                                            <tr>
                                                <th className="p-2 w-20">Date</th>
                                                <th className="p-2">Product</th>
                                                <th className="p-2 text-center w-12">Qty</th>
                                                <th className="p-2 text-right w-20">Rate</th>
                                                <th className="p-2 text-right w-20">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {data.deliveries.length === 0 ? (
                                                <tr><td colSpan="5" className="p-4 text-center text-gray-400">No deliveries found</td></tr>
                                            ) : (
                                                data.deliveries.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="p-2 text-gray-600 whitespace-nowrap">{item.date}</td>
                                                        <td className="p-2">{item.product}</td>
                                                        <td className="p-2 text-center">{item.qty}</td>
                                                        <td className="p-2 text-right">₹{item.rate}</td>
                                                        <td className="p-2 text-right font-medium">₹{item.amount}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Recent Wallet Transactions */}
                            <div>
                                <h4 className="text-center text-xs font-bold text-gray-500 uppercase mb-0 py-2 bg-gray-100 border-x border-t border-gray-300 rounded-t-md">Recent Wallet Transactions</h4>
                                <div className="overflow-x-auto border border-gray-300 rounded-b-md shadow-sm">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-gray-50 font-bold text-gray-600 border-b border-gray-300">
                                            <tr>
                                                <th className="p-2 w-20">Date</th>
                                                <th className="p-2 w-20">Type</th>
                                                <th className="p-2">Note</th>
                                                <th className="p-2 text-right w-16">CR</th>
                                                <th className="p-2 text-right w-16">DR</th>
                                                <th className="p-2 text-right w-20">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {data.transactions.map((tx, idx) => (
                                                <tr key={idx}>
                                                    <td className="p-2 text-gray-600">{tx.date}</td>
                                                    <td className="p-2 font-medium text-gray-700">{tx.type}</td>
                                                    <td className="p-2 text-gray-500 italic truncate max-w-[150px]">{tx.note || '-'}</td>
                                                    <td className="p-2 text-right font-medium text-green-600">{tx.cr > 0 ? `₹${tx.cr}` : '₹0'}</td>
                                                    <td className="p-2 text-right font-medium text-red-600">{tx.dr > 0 ? `₹${tx.dr}` : '₹0'}</td>
                                                    <td className="p-2 text-right font-bold text-gray-800">₹{tx.balance}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer / Notes */}
                    <div className="space-y-4">
                        <div className="relative">
                            <h4 className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs font-bold text-gray-500 uppercase">Note</h4>
                            <div className="border border-gray-300 rounded p-4 text-center text-xs text-gray-500 space-y-1">
                                <p>For any query call {company.websiteLink} care at <span className="font-bold text-gray-800">{contact.phone || '7598232759'}</span></p>
                                <p>For payment or recharge go to <span className="font-bold text-gray-800">https://stoimilk.com/pay</span> <br className="hidden sm:block" />
                                    or use link <a href={`https://stoimilk.com/pay/${data.customer.phone}`} target="_blank" rel="noopener noreferrer" className="text-teal-600 font-bold hover:underline">https://stoimilk.com/pay/{data.customer.phone}</a> to directly pay to that account.</p>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 items-center border-t border-gray-200 pt-4">
                            <div className="relative w-full md:w-1/2" data-html2canvas-ignore>
                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="email"
                                    defaultValue={data.customer.email}
                                    className="w-full pl-9 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    placeholder="Enter email to send invoice"
                                />
                            </div>
                            {/* Action Bar - Hidden during download capture and print */}
                            <div className="flex justify-end gap-2 export-actions print:hidden" data-html2canvas-ignore>
                                <button
                                    className="gap-2 flex items-center px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100"
                                    onClick={() => window.print()}
                                >
                                    <Printer size={14} /> Print
                                </button>
                                <button
                                    className="gap-2 flex items-center px-3 py-1 bg-teal-600 text-white rounded text-sm hover:bg-teal-700"
                                    onClick={handleDownload}
                                    disabled={isDownloading}
                                >
                                    {isDownloading ? <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full mr-2"></span> : <Download size={14} />}
                                    Export PDF
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div >
    );
};
