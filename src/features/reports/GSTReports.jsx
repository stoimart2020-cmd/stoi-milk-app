import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { axiosInstance as axios } from "../../shared/api/axios";
import {
    Download, FileText, Receipt, Truck, Shield,
    Search, ChevronDown, ChevronUp, AlertCircle,
    ClipboardList, Hash, Calculator, Building2
} from "lucide-react";
import * as XLSX from 'xlsx';
import toast from "react-hot-toast";

const GSTReports = ({ dateRange, customDateRange }) => {
    const [activeReport, setActiveReport] = useState("gstr1");
    const [ewayModal, setEwayModal] = useState(null);
    const [ewayForm, setEwayForm] = useState({
        vehicleNo: '', transporterName: '', fromPincode: '', toPincode: '', distance: ''
    });

    let queryParams = `period=${dateRange}`;
    if (dateRange === 'custom' && customDateRange?.start && customDateRange?.end) {
        queryParams += `&startDate=${customDateRange.start}&endDate=${customDateRange.end}`;
    }

    const { data: gstr1Data, isLoading: loadingGSTR1 } = useQuery({
        queryKey: ["gst-gstr1", dateRange, customDateRange],
        queryFn: async () => {
            const res = await axios.get(`/api/analytics/gst/gstr1?${queryParams}`);
            return res.data;
        },
        enabled: activeReport === "gstr1"
    });

    const { data: gstr3bData, isLoading: loadingGSTR3B } = useQuery({
        queryKey: ["gst-gstr3b", dateRange, customDateRange],
        queryFn: async () => {
            const res = await axios.get(`/api/analytics/gst/gstr3b?${queryParams}`);
            return res.data;
        },
        enabled: activeReport === "gstr3b"
    });

    const { data: hsnData, isLoading: loadingHSN } = useQuery({
        queryKey: ["gst-hsn", dateRange, customDateRange],
        queryFn: async () => {
            const res = await axios.get(`/api/analytics/gst/hsn-summary?${queryParams}`);
            return res.data;
        },
        enabled: activeReport === "hsn"
    });

    const { data: ewayData, isLoading: loadingEway } = useQuery({
        queryKey: ["gst-eway", dateRange, customDateRange],
        queryFn: async () => {
            const res = await axios.get(`/api/analytics/gst/eway-bill-data?${queryParams}`);
            return res.data;
        },
        enabled: activeReport === "eway"
    });

    const generateEwayMutation = useMutation({
        mutationFn: async (data) => {
            const res = await axios.post("/api/analytics/gst/generate-eway-bill", data);
            return res.data;
        },
        onSuccess: (data) => {
            toast.success("E-Way Bill generated!");
            setEwayModal(null);
            // Download as JSON
            const blob = new Blob([JSON.stringify(data.result, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `eway_bill_${data.result.ewayBillNo}.json`;
            a.click();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to generate E-Way Bill");
        }
    });

    const exportToExcel = (data, filename) => {
        try {
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Report");
            XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("Report exported!");
        } catch { toast.error("Export failed"); }
    };

    const reports = [
        { id: "gstr1", label: "GSTR-1 (Sales)", icon: FileText },
        { id: "gstr3b", label: "GSTR-3B", icon: Calculator },
        { id: "hsn", label: "HSN Summary", icon: Hash },
        { id: "eway", label: "E-Way Bill", icon: Truck },
    ];

    const fmt = (v) => `₹${(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="space-y-4">
            {/* Report Selector */}
            <div className="flex flex-wrap gap-2">
                {reports.map(r => (
                    <button
                        key={r.id}
                        onClick={() => setActiveReport(r.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeReport === r.id
                                ? "bg-indigo-600 text-white shadow-md"
                                : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                            }`}
                    >
                        <r.icon size={16} />
                        {r.label}
                    </button>
                ))}
            </div>

            {/* ═══════════════ GSTR-1 ═══════════════ */}
            {activeReport === "gstr1" && (
                <div className="space-y-4">
                    {/* GSTIN Header */}
                    {gstr1Data?.result?.gstin && (
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-4 flex justify-between items-center">
                            <div>
                                <p className="text-xs opacity-80">GSTIN</p>
                                <p className="text-lg font-mono font-bold tracking-wider">{gstr1Data.result.gstin || 'Not Configured'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs opacity-80">Tax Period</p>
                                <p className="font-semibold">
                                    {new Date(gstr1Data.result.period.start).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Grand Total Cards */}
                    {gstr1Data?.result?.grandTotal && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                <p className="text-xs text-blue-600 font-medium">Total Value</p>
                                <p className="text-lg font-bold text-blue-700">{fmt(gstr1Data.result.grandTotal.totalValue)}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                                <p className="text-xs text-green-600 font-medium">Taxable Value</p>
                                <p className="text-lg font-bold text-green-700">{fmt(gstr1Data.result.grandTotal.taxableValue)}</p>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                                <p className="text-xs text-orange-600 font-medium">CGST</p>
                                <p className="text-lg font-bold text-orange-700">{fmt(gstr1Data.result.grandTotal.cgst)}</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                                <p className="text-xs text-purple-600 font-medium">SGST</p>
                                <p className="text-lg font-bold text-purple-700">{fmt(gstr1Data.result.grandTotal.sgst)}</p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                                <p className="text-xs text-red-600 font-medium">Total Tax</p>
                                <p className="text-lg font-bold text-red-700">{fmt(gstr1Data.result.grandTotal.totalTax)}</p>
                            </div>
                        </div>
                    )}

                    {/* B2CS Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-green-50 to-teal-50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <Receipt size={18} className="text-green-600" />
                                B2CS - Sales to Unregistered Dealers
                                <span className="text-xs text-gray-500 font-normal">({gstr1Data?.result?.b2cs?.entries?.length || 0} entries)</span>
                            </h3>
                            <button
                                onClick={() => exportToExcel(
                                    (gstr1Data?.result?.b2cs?.entries || []).map(e => ({
                                        'Invoice No': e.invoiceNo,
                                        'Invoice Date': new Date(e.invoiceDate).toLocaleDateString('en-GB'),
                                        Customer: e.customerName,
                                        Product: e.productName,
                                        HSN: e.hsn,
                                        Qty: e.quantity,
                                        Rate: e.rate,
                                        'Total Value': e.totalValue,
                                        'Taxable Value': e.taxableValue,
                                        'Tax Rate': `${e.taxRate}%`,
                                        CGST: e.cgst,
                                        SGST: e.sgst,
                                        IGST: e.igst,
                                        'Place of Supply': e.placeOfSupply
                                    })),
                                    'GSTR1_B2CS'
                                )}
                                className="btn btn-sm btn-ghost gap-1"
                            >
                                <Download size={14} /> Export
                            </button>
                        </div>
                        {loadingGSTR1 ? (
                            <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table w-full text-xs">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th>Invoice</th>
                                            <th>Date</th>
                                            <th>Customer</th>
                                            <th>Product</th>
                                            <th>HSN</th>
                                            <th>Qty</th>
                                            <th>Value</th>
                                            <th>Taxable</th>
                                            <th>Rate</th>
                                            <th>CGST</th>
                                            <th>SGST</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(gstr1Data?.result?.b2cs?.entries || []).slice(0, 100).map((e, i) => (
                                            <tr key={i} className="hover">
                                                <td className="font-medium text-blue-600">{e.invoiceNo}</td>
                                                <td>{new Date(e.invoiceDate).toLocaleDateString('en-GB')}</td>
                                                <td>{e.customerName}</td>
                                                <td>{e.productName}</td>
                                                <td className="font-mono">{e.hsn || '-'}</td>
                                                <td>{e.quantity}</td>
                                                <td className="font-semibold">{fmt(e.totalValue)}</td>
                                                <td>{fmt(e.taxableValue)}</td>
                                                <td>{e.taxRate}%</td>
                                                <td className="text-orange-600">{fmt(e.cgst)}</td>
                                                <td className="text-purple-600">{fmt(e.sgst)}</td>
                                            </tr>
                                        ))}
                                        {(gstr1Data?.result?.b2cs?.entries || []).length === 0 && (
                                            <tr><td colSpan="11" className="text-center py-8 text-gray-400">No B2CS transactions</td></tr>
                                        )}
                                    </tbody>
                                    {gstr1Data?.result?.b2cs?.totals && (
                                        <tfoot className="bg-gray-50 font-bold">
                                            <tr>
                                                <td colSpan="6" className="text-right">Totals:</td>
                                                <td>{fmt(gstr1Data.result.b2cs.totals.totalValue)}</td>
                                                <td>{fmt(gstr1Data.result.b2cs.totals.taxableValue)}</td>
                                                <td></td>
                                                <td className="text-orange-600">{fmt(gstr1Data.result.b2cs.totals.cgst)}</td>
                                                <td className="text-purple-600">{fmt(gstr1Data.result.b2cs.totals.sgst)}</td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        )}
                    </div>

                    {/* B2B Table */}
                    {(gstr1Data?.result?.b2b?.entries || []).length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Building2 size={18} className="text-blue-600" />
                                    B2B - Sales to Registered Dealers
                                    <span className="text-xs text-gray-500 font-normal">({gstr1Data.result.b2b.entries.length} entries)</span>
                                </h3>
                                <button
                                    onClick={() => exportToExcel(
                                        gstr1Data.result.b2b.entries.map(e => ({
                                            'GSTIN': e.customerGstin,
                                            'Invoice No': e.invoiceNo,
                                            'Date': new Date(e.invoiceDate).toLocaleDateString('en-GB'),
                                            'Total Value': e.totalValue,
                                            'Taxable Value': e.taxableValue,
                                            CGST: e.cgst, SGST: e.sgst, IGST: e.igst
                                        })),
                                        'GSTR1_B2B'
                                    )}
                                    className="btn btn-sm btn-ghost gap-1"
                                >
                                    <Download size={14} /> Export
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="table w-full text-xs">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th>GSTIN</th>
                                            <th>Invoice</th>
                                            <th>Date</th>
                                            <th>Customer</th>
                                            <th>Value</th>
                                            <th>Taxable</th>
                                            <th>CGST</th>
                                            <th>SGST</th>
                                            <th>IGST</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {gstr1Data.result.b2b.entries.map((e, i) => (
                                            <tr key={i} className="hover">
                                                <td className="font-mono text-xs">{e.customerGstin}</td>
                                                <td className="text-blue-600 font-medium">{e.invoiceNo}</td>
                                                <td>{new Date(e.invoiceDate).toLocaleDateString('en-GB')}</td>
                                                <td>{e.customerName}</td>
                                                <td className="font-semibold">{fmt(e.totalValue)}</td>
                                                <td>{fmt(e.taxableValue)}</td>
                                                <td className="text-orange-600">{fmt(e.cgst)}</td>
                                                <td className="text-purple-600">{fmt(e.sgst)}</td>
                                                <td>{fmt(e.igst)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* HSN Summary within GSTR1 */}
                    {(gstr1Data?.result?.hsnSummary || []).length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-yellow-50 to-amber-50">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Hash size={18} className="text-yellow-600" />
                                    HSN-wise Summary of Outward Supplies
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="table w-full text-xs">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th>HSN Code</th>
                                            <th>Description</th>
                                            <th>UQC</th>
                                            <th>Qty</th>
                                            <th>Total Value</th>
                                            <th>Taxable</th>
                                            <th>Rate</th>
                                            <th>CGST</th>
                                            <th>SGST</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {gstr1Data.result.hsnSummary.map((h, i) => (
                                            <tr key={i} className="hover">
                                                <td className="font-mono font-bold">{h.hsn || '-'}</td>
                                                <td>{h.description}</td>
                                                <td>{h.uqc}</td>
                                                <td>{h.totalQty}</td>
                                                <td className="font-semibold">{fmt(h.totalValue)}</td>
                                                <td>{fmt(h.taxableValue)}</td>
                                                <td>{h.rate}%</td>
                                                <td className="text-orange-600">{fmt(h.cgst)}</td>
                                                <td className="text-purple-600">{fmt(h.sgst)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════ GSTR-3B ═══════════════ */}
            {activeReport === "gstr3b" && (
                <div className="space-y-4">
                    {gstr3bData?.result?.gstin && (
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl p-4 flex justify-between items-center">
                            <div>
                                <p className="text-xs opacity-80">GSTR-3B Summary Return</p>
                                <p className="text-lg font-mono font-bold tracking-wider">{gstr3bData.result.gstin || 'Not Configured'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs opacity-80">Tax Period</p>
                                <p className="font-semibold">
                                    {new Date(gstr3bData.result.period.start).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    )}

                    {loadingGSTR3B ? (
                        <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
                    ) : gstr3bData?.result ? (
                        <>
                            {/* 3.1 - Outward Supplies */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                                    <h3 className="font-bold text-gray-800">3.1 - Details of Outward Supplies</h3>
                                    <p className="text-xs text-gray-500 mt-1">{gstr3bData.result.outwardSupplies?.invoiceCount || 0} invoices</p>
                                </div>
                                <div className="p-4">
                                    <table className="table w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th>Nature of Supplies</th>
                                                <th>Taxable Value</th>
                                                <th>CGST</th>
                                                <th>SGST</th>
                                                <th>IGST</th>
                                                <th>Cess</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="font-medium">Outward taxable supplies (other than zero rated, nil rated and exempted)</td>
                                                <td className="font-bold">{fmt(gstr3bData.result.outwardSupplies.taxableValue)}</td>
                                                <td className="text-orange-600">{fmt(gstr3bData.result.outwardSupplies.cgst)}</td>
                                                <td className="text-purple-600">{fmt(gstr3bData.result.outwardSupplies.sgst)}</td>
                                                <td>{fmt(gstr3bData.result.outwardSupplies.igst)}</td>
                                                <td>{fmt(gstr3bData.result.outwardSupplies.cess)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 4 - Eligible ITC */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
                                    <h3 className="font-bold text-gray-800">4 - Eligible ITC (Input Tax Credit)</h3>
                                </div>
                                <div className="p-4">
                                    <table className="table w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th>Details</th>
                                                <th>Taxable Value</th>
                                                <th>CGST</th>
                                                <th>SGST</th>
                                                <th>IGST</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="font-medium">Import of Goods & Services + All other ITC</td>
                                                <td className="font-bold">{fmt(gstr3bData.result.inputTaxCredit.taxableValue)}</td>
                                                <td className="text-green-600">{fmt(gstr3bData.result.inputTaxCredit.cgst)}</td>
                                                <td className="text-green-600">{fmt(gstr3bData.result.inputTaxCredit.sgst)}</td>
                                                <td className="text-green-600">{fmt(gstr3bData.result.inputTaxCredit.igst)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 6.1 - Net Tax */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-red-50 to-orange-50">
                                    <h3 className="font-bold text-gray-800">6.1 - Payment of Tax</h3>
                                </div>
                                <div className="p-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 text-center">
                                            <p className="text-xs text-orange-600 font-medium mb-1">CGST Payable</p>
                                            <p className="text-2xl font-bold text-orange-700">{fmt(gstr3bData.result.netTaxPayable.cgst)}</p>
                                        </div>
                                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 text-center">
                                            <p className="text-xs text-purple-600 font-medium mb-1">SGST Payable</p>
                                            <p className="text-2xl font-bold text-purple-700">{fmt(gstr3bData.result.netTaxPayable.sgst)}</p>
                                        </div>
                                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 text-center">
                                            <p className="text-xs text-blue-600 font-medium mb-1">IGST Payable</p>
                                            <p className="text-2xl font-bold text-blue-700">{fmt(gstr3bData.result.netTaxPayable.igst)}</p>
                                        </div>
                                        <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200 text-center">
                                            <p className="text-xs text-red-600 font-bold mb-1">TOTAL TAX PAYABLE</p>
                                            <p className="text-2xl font-bold text-red-700">{fmt(gstr3bData.result.netTaxPayable.total)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8 text-gray-400">No data available</div>
                    )}
                </div>
            )}

            {/* ═══════════════ HSN SUMMARY ═══════════════ */}
            {activeReport === "hsn" && (
                <div className="space-y-4">
                    {/* Totals */}
                    {hsnData?.result?.totals && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                <p className="text-xs text-blue-600 font-medium">Total Qty</p>
                                <p className="text-xl font-bold text-blue-700">{hsnData.result.totals.totalQty}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                                <p className="text-xs text-green-600 font-medium">Total Value</p>
                                <p className="text-xl font-bold text-green-700">{fmt(hsnData.result.totals.totalValue)}</p>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                                <p className="text-xs text-yellow-600 font-medium">Taxable Value</p>
                                <p className="text-xl font-bold text-yellow-700">{fmt(hsnData.result.totals.taxableValue)}</p>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                                <p className="text-xs text-orange-600 font-medium">CGST + SGST</p>
                                <p className="text-xl font-bold text-orange-700">{fmt(hsnData.result.totals.cgst + hsnData.result.totals.sgst)}</p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                                <p className="text-xs text-red-600 font-medium">Total Tax</p>
                                <p className="text-xl font-bold text-red-700">{fmt(hsnData.result.totals.totalTax)}</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-yellow-50 to-amber-50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <Hash size={18} className="text-yellow-600" />
                                HSN Wise Sales Summary
                            </h3>
                            <button
                                onClick={() => exportToExcel(
                                    (hsnData?.result?.hsnData || []).map(h => ({
                                        'HSN Code': h.hsn,
                                        Product: h.productName,
                                        UQC: h.uqc,
                                        'GST Rate': `${h.gstRate}%`,
                                        Quantity: h.totalQty,
                                        'Total Value': h.totalValue,
                                        'Taxable Value': h.taxableValue,
                                        CGST: h.cgst,
                                        SGST: h.sgst,
                                        'Total Tax': h.totalTax
                                    })),
                                    'HSN_Summary'
                                )}
                                className="btn btn-sm btn-ghost gap-1"
                            >
                                <Download size={14} /> Export
                            </button>
                        </div>
                        {loadingHSN ? (
                            <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th>HSN Code</th>
                                            <th>Product Name</th>
                                            <th>UQC</th>
                                            <th>GST Rate</th>
                                            <th>Qty</th>
                                            <th>Total Value</th>
                                            <th>Taxable Value</th>
                                            <th>CGST</th>
                                            <th>SGST</th>
                                            <th>Total Tax</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(hsnData?.result?.hsnData || []).map((h, i) => (
                                            <tr key={i} className="hover">
                                                <td className="font-mono font-bold text-blue-600">{h.hsn || '-'}</td>
                                                <td className="font-medium">{h.productName}</td>
                                                <td>{h.uqc}</td>
                                                <td>{h.gstRate}%</td>
                                                <td className="font-semibold">{h.totalQty}</td>
                                                <td>{fmt(h.totalValue)}</td>
                                                <td>{fmt(h.taxableValue)}</td>
                                                <td className="text-orange-600">{fmt(h.cgst)}</td>
                                                <td className="text-purple-600">{fmt(h.sgst)}</td>
                                                <td className="font-bold text-red-600">{fmt(h.totalTax)}</td>
                                            </tr>
                                        ))}
                                        {(hsnData?.result?.hsnData || []).length === 0 && (
                                            <tr><td colSpan="10" className="text-center py-8 text-gray-400">No HSN data available</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════ E-WAY BILL ═══════════════ */}
            {activeReport === "eway" && (
                <div className="space-y-4">
                    {/* Supplier Info */}
                    {ewayData?.result?.supplierDetails && (
                        <div className="bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl p-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-xs opacity-80">Supplier</p>
                                    <p className="text-lg font-bold">{ewayData.result.supplierDetails.name}</p>
                                    <p className="text-sm opacity-80">{ewayData.result.supplierDetails.gstin || 'GSTIN not configured'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs opacity-80">E-Way Threshold</p>
                                    <p className="text-lg font-bold">₹{ewayData.result.threshold?.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* E-Way Required */}
                    {(ewayData?.result?.ewayRequired || []).length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
                            <div className="p-4 border-b border-red-100 bg-gradient-to-r from-red-50 to-orange-50">
                                <h3 className="font-bold text-red-700 flex items-center gap-2">
                                    <AlertCircle size={18} />
                                    E-Way Bill Required ({ewayData.result.ewayRequired.length} consignments)
                                </h3>
                                <p className="text-xs text-red-600 mt-1">These consignments exceed ₹{ewayData.result.threshold?.toLocaleString()} and require an E-Way Bill</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="table w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th>Date</th>
                                            <th>Customer</th>
                                            <th>GSTIN</th>
                                            <th>Value</th>
                                            <th>Weight (kg)</th>
                                            <th>Orders</th>
                                            <th>CGST</th>
                                            <th>SGST</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ewayData.result.ewayRequired.map((e, i) => (
                                            <tr key={i} className="hover bg-red-50/30">
                                                <td>{e.date}</td>
                                                <td className="font-medium">{e.customerName}</td>
                                                <td className="font-mono text-xs">{e.customerGstin}</td>
                                                <td className="font-bold text-red-600">{fmt(e.totalValue)}</td>
                                                <td>{e.totalWeight}</td>
                                                <td>{e.orderCount}</td>
                                                <td className="text-orange-600">{fmt(e.cgst)}</td>
                                                <td className="text-purple-600">{fmt(e.sgst)}</td>
                                                <td>
                                                    <button
                                                        onClick={() => setEwayModal(e)}
                                                        className="btn btn-xs btn-primary gap-1"
                                                    >
                                                        <Truck size={12} /> Generate
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* All Consignments */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-slate-50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <ClipboardList size={18} className="text-gray-600" />
                                All Consignments
                            </h3>
                            <button
                                onClick={() => exportToExcel(
                                    (ewayData?.result?.allConsignments || []).map(c => ({
                                        Date: c.date,
                                        Customer: c.customerName,
                                        GSTIN: c.customerGstin,
                                        Value: c.totalValue,
                                        'Weight (kg)': c.totalWeight,
                                        Orders: c.orderCount,
                                        'E-Way Required': c.needsEway ? 'Yes' : 'No'
                                    })),
                                    'Consignment_Report'
                                )}
                                className="btn btn-sm btn-ghost gap-1"
                            >
                                <Download size={14} /> Export
                            </button>
                        </div>
                        {loadingEway ? (
                            <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th>Date</th>
                                            <th>Customer</th>
                                            <th>GSTIN</th>
                                            <th>Value</th>
                                            <th>Weight (kg)</th>
                                            <th>Orders</th>
                                            <th>E-Way Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(ewayData?.result?.allConsignments || []).map((c, i) => (
                                            <tr key={i} className={`hover ${c.needsEway ? 'bg-red-50/30' : ''}`}>
                                                <td>{c.date}</td>
                                                <td className="font-medium">{c.customerName}</td>
                                                <td className="font-mono text-xs">{c.customerGstin}</td>
                                                <td className={`font-semibold ${c.needsEway ? 'text-red-600' : ''}`}>{fmt(c.totalValue)}</td>
                                                <td>{c.totalWeight}</td>
                                                <td>{c.orderCount}</td>
                                                <td>
                                                    {c.needsEway ? (
                                                        <span className="badge badge-sm badge-error">Required</span>
                                                    ) : (
                                                        <span className="badge badge-sm badge-success">Not Required</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {(ewayData?.result?.allConsignments || []).length === 0 && (
                                            <tr><td colSpan="7" className="text-center py-8 text-gray-400">No consignments found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* E-Way Bill Generation Modal */}
            {ewayModal && (
                <dialog className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Truck size={20} className="text-teal-600" />
                            Generate E-Way Bill
                        </h3>
                        <div className="divider mt-1 mb-3" />

                        <div className="space-y-4">
                            {/* Consignment Info */}
                            <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                <div className="grid grid-cols-2 gap-2">
                                    <div><span className="text-gray-500">Customer:</span> <span className="font-semibold">{ewayModal.customerName}</span></div>
                                    <div><span className="text-gray-500">Value:</span> <span className="font-bold text-red-600">{fmt(ewayModal.totalValue)}</span></div>
                                    <div><span className="text-gray-500">Date:</span> {ewayModal.date}</div>
                                    <div><span className="text-gray-500">Weight:</span> {ewayModal.totalWeight} kg</div>
                                </div>
                            </div>

                            {/* Transport Details */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="label"><span className="label-text text-xs font-medium">Vehicle Number *</span></label>
                                    <input
                                        type="text"
                                        placeholder="TN 74 AB 1234"
                                        className="input input-bordered input-sm w-full"
                                        value={ewayForm.vehicleNo}
                                        onChange={(e) => setEwayForm({ ...ewayForm, vehicleNo: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div>
                                    <label className="label"><span className="label-text text-xs font-medium">Transporter Name</span></label>
                                    <input
                                        type="text"
                                        placeholder="Self / Transporter name"
                                        className="input input-bordered input-sm w-full"
                                        value={ewayForm.transporterName}
                                        onChange={(e) => setEwayForm({ ...ewayForm, transporterName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label"><span className="label-text text-xs font-medium">From Pincode</span></label>
                                    <input
                                        type="text"
                                        placeholder="629001"
                                        className="input input-bordered input-sm w-full"
                                        value={ewayForm.fromPincode}
                                        onChange={(e) => setEwayForm({ ...ewayForm, fromPincode: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label"><span className="label-text text-xs font-medium">To Pincode</span></label>
                                    <input
                                        type="text"
                                        placeholder="629002"
                                        className="input input-bordered input-sm w-full"
                                        value={ewayForm.toPincode}
                                        onChange={(e) => setEwayForm({ ...ewayForm, toPincode: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label"><span className="label-text text-xs font-medium">Distance (km)</span></label>
                                    <input
                                        type="number"
                                        placeholder="50"
                                        className="input input-bordered input-sm w-full"
                                        value={ewayForm.distance}
                                        onChange={(e) => setEwayForm({ ...ewayForm, distance: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modal-action">
                            <button className="btn btn-ghost" onClick={() => setEwayModal(null)}>Cancel</button>
                            <button
                                className="btn btn-primary gap-2"
                                disabled={generateEwayMutation.isPending}
                                onClick={() => {
                                    const supplierDetails = ewayData?.result?.supplierDetails || {};
                                    generateEwayMutation.mutate({
                                        customerName: ewayModal.customerName,
                                        customerGstin: ewayModal.customerGstin,
                                        customerAddress: ewayModal.customerAddress,
                                        supplierGstin: supplierDetails.gstin,
                                        supplierName: supplierDetails.name,
                                        supplierAddress: supplierDetails.address,
                                        documentNo: `INV-${Date.now()}`,
                                        documentDate: ewayModal.date,
                                        totalValue: ewayModal.totalValue,
                                        products: ewayModal.products,
                                        vehicleNo: ewayForm.vehicleNo,
                                        transporterName: ewayForm.transporterName,
                                        fromPincode: ewayForm.fromPincode,
                                        toPincode: ewayForm.toPincode,
                                        distance: parseInt(ewayForm.distance) || 0
                                    });
                                }}
                            >
                                {generateEwayMutation.isPending ? (
                                    <span className="loading loading-spinner loading-sm" />
                                ) : (
                                    <Truck size={16} />
                                )}
                                Generate E-Way Bill
                            </button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={() => setEwayModal(null)}>close</button>
                    </form>
                </dialog>
            )}
        </div>
    );
};

export default GSTReports;
