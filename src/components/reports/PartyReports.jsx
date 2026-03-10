import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { axiosInstance as axios } from "../../lib/axios";
import {
    Download, Users, Clock, AlertCircle, Search,
    FileText, ChevronDown, ChevronUp, DollarSign, TrendingDown
} from "lucide-react";
import * as XLSX from 'xlsx';
import toast from "react-hot-toast";

const PartyReports = ({ dateRange, customDateRange }) => {
    const [activeReport, setActiveReport] = useState("outstanding");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    let queryParams = `period=${dateRange}`;
    if (dateRange === 'custom' && customDateRange?.start && customDateRange?.end) {
        queryParams += `&startDate=${customDateRange.start}&endDate=${customDateRange.end}`;
    }

    const { data: outstandingData, isLoading: loadingOutstanding } = useQuery({
        queryKey: ["report-outstanding"],
        queryFn: async () => {
            const res = await axios.get("/api/analytics/reports/customer-outstanding");
            return res.data;
        },
        enabled: activeReport === "outstanding"
    });

    const { data: customerSalesData, isLoading: loadingCustomerSales } = useQuery({
        queryKey: ["report-customer-sales", dateRange, customDateRange],
        queryFn: async () => {
            const res = await axios.get(`/api/analytics/reports/customer-sales?${queryParams}`);
            return res.data;
        },
        enabled: activeReport === "customer_sales"
    });

    const { data: ledgerData, isLoading: loadingLedger } = useQuery({
        queryKey: ["report-ledger", selectedCustomer, dateRange, customDateRange],
        queryFn: async () => {
            const res = await axios.get(`/api/analytics/reports/customer-ledger/${selectedCustomer}?${queryParams}`);
            return res.data;
        },
        enabled: activeReport === "ledger" && !!selectedCustomer
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
        { id: "outstanding", label: "Receivable / Outstanding", icon: AlertCircle },
        { id: "customer_sales", label: "Customer-wise Sales", icon: Users },
        { id: "ledger", label: "Customer Ledger", icon: FileText },
    ];

    const openLedger = (customerId) => {
        setSelectedCustomer(customerId);
        setActiveReport("ledger");
    };

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

            {/* Search */}
            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search customers..."
                    className="input input-bordered w-full pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Outstanding / Receivables */}
            {activeReport === "outstanding" && (
                <div className="space-y-4">
                    {outstandingData?.result && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                                <p className="text-xs text-red-600 font-medium">Total Outstanding</p>
                                <p className="text-2xl font-bold text-red-700">₹{outstandingData.result.totalOutstanding?.toLocaleString()}</p>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                                <p className="text-xs text-orange-600 font-medium">Customers with Dues</p>
                                <p className="text-2xl font-bold text-orange-700">{outstandingData.result.count}</p>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                                <p className="text-xs text-yellow-600 font-medium">Avg Outstanding</p>
                                <p className="text-2xl font-bold text-yellow-700">
                                    ₹{outstandingData.result.count ? Math.round(outstandingData.result.totalOutstanding / outstandingData.result.count).toLocaleString() : 0}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-red-50 to-orange-50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <AlertCircle size={18} className="text-red-600" />
                                Receivable Ageing Report
                            </h3>
                            <button
                                onClick={() => exportToExcel(
                                    (outstandingData?.result?.customers || []).map(c => ({
                                        'Customer ID': c.customerId || '-',
                                        Name: c.name,
                                        Mobile: c.mobile,
                                        Outstanding: c.outstanding,
                                        'Credit Limit': c.creditLimit,
                                        'Ageing': c.ageingBucket,
                                        'Days Since': c.daysSince
                                    })),
                                    'Outstanding_Report'
                                )}
                                className="btn btn-sm btn-ghost gap-1"
                            >
                                <Download size={14} /> Export
                            </button>
                        </div>
                        {loadingOutstanding ? (
                            <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th>Customer ID</th>
                                            <th>Name</th>
                                            <th>Mobile</th>
                                            <th>Outstanding</th>
                                            <th>Credit Limit</th>
                                            <th>Ageing</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(outstandingData?.result?.customers || [])
                                            .filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.mobile?.includes(searchTerm))
                                            .map((c, i) => (
                                                <tr key={i} className="hover">
                                                    <td className="text-blue-600 font-medium">{c.customerId || '-'}</td>
                                                    <td className="font-medium">{c.name}</td>
                                                    <td>{c.mobile}</td>
                                                    <td className="font-bold text-red-600">₹{c.outstanding?.toLocaleString()}</td>
                                                    <td>₹{c.creditLimit?.toLocaleString()}</td>
                                                    <td>
                                                        <span className={`badge badge-sm ${c.ageingBucket === '0-7 days' ? 'badge-warning' :
                                                                c.ageingBucket === '8-14 days' ? 'badge-error' : 'badge-error badge-outline'
                                                            }`}>
                                                            {c.ageingBucket}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            onClick={() => openLedger(c._id)}
                                                            className="btn btn-xs btn-ghost text-blue-600"
                                                        >
                                                            View Ledger
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        {(outstandingData?.result?.customers || []).length === 0 && (
                                            <tr><td colSpan="7" className="text-center py-8 text-gray-400">No outstanding dues</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Customer-wise Sales */}
            {activeReport === "customer_sales" && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-green-50 to-teal-50">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Users size={18} className="text-green-600" />
                            Customer-wise Sales Summary
                        </h3>
                        <button
                            onClick={() => exportToExcel(
                                (customerSalesData?.result || []).map(c => ({
                                    'Customer ID': c.customerId || '-',
                                    Name: c.name,
                                    Mobile: c.mobile,
                                    'Total Sales': c.totalAmount,
                                    Orders: c.orderCount,
                                    'Avg Order Value': Math.round(c.avgOrderValue),
                                    'Wallet Balance': c.walletBalance || 0,
                                    'Last Order': c.lastOrder ? new Date(c.lastOrder).toLocaleDateString('en-GB') : '-'
                                })),
                                'Customer_Sales_Summary'
                            )}
                            className="btn btn-sm btn-ghost gap-1"
                        >
                            <Download size={14} /> Export
                        </button>
                    </div>
                    {loadingCustomerSales ? (
                        <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th>#</th>
                                        <th>Customer ID</th>
                                        <th>Name</th>
                                        <th>Mobile</th>
                                        <th>Total Sales</th>
                                        <th>Orders</th>
                                        <th>Avg Order</th>
                                        <th>Wallet</th>
                                        <th>Last Order</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(customerSalesData?.result || [])
                                        .filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.mobile?.includes(searchTerm))
                                        .map((c, i) => (
                                            <tr key={i} className="hover">
                                                <td>{i + 1}</td>
                                                <td className="text-blue-600 font-medium">{c.customerId || '-'}</td>
                                                <td className="font-medium">{c.name}</td>
                                                <td>{c.mobile}</td>
                                                <td className="text-green-600 font-bold">₹{c.totalAmount?.toLocaleString()}</td>
                                                <td>{c.orderCount}</td>
                                                <td>₹{Math.round(c.avgOrderValue)}</td>
                                                <td className={c.walletBalance < 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                                                    ₹{c.walletBalance?.toLocaleString() || 0}
                                                </td>
                                                <td className="text-xs">{c.lastOrder ? new Date(c.lastOrder).toLocaleDateString('en-GB') : '-'}</td>
                                                <td>
                                                    <button
                                                        onClick={() => openLedger(c._id)}
                                                        className="btn btn-xs btn-ghost text-blue-600"
                                                    >
                                                        Ledger
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    {(customerSalesData?.result || []).length === 0 && (
                                        <tr><td colSpan="10" className="text-center py-8 text-gray-400">No sales data for this period</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Customer Ledger */}
            {activeReport === "ledger" && (
                <div className="space-y-4">
                    {!selectedCustomer ? (
                        <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
                            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="text-gray-500">Select a customer from Outstanding or Sales report to view their ledger</p>
                        </div>
                    ) : loadingLedger ? (
                        <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
                    ) : (
                        <>
                            {/* Customer Info */}
                            {ledgerData?.result?.customer && (
                                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800">{ledgerData.result.customer.name}</h3>
                                        <p className="text-sm text-gray-600">
                                            ID: {ledgerData.result.customer.customerId || '-'} | Mobile: {ledgerData.result.customer.mobile}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Current Balance</p>
                                        <p className={`text-xl font-bold ${ledgerData.result.summary?.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ₹{ledgerData.result.summary?.currentBalance?.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Summary Cards */}
                            {ledgerData?.result?.summary && (
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                                        <p className="text-xs text-green-600 font-medium">Total Credits</p>
                                        <p className="text-lg font-bold text-green-700">₹{ledgerData.result.summary.totalCredits?.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                                        <p className="text-xs text-red-600 font-medium">Total Debits</p>
                                        <p className="text-lg font-bold text-red-700">₹{ledgerData.result.summary.totalDebits?.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                        <p className="text-xs text-blue-600 font-medium">Net</p>
                                        <p className={`text-lg font-bold ${ledgerData.result.summary.netBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                            ₹{ledgerData.result.summary.netBalance?.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Transaction Table */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <FileText size={18} className="text-indigo-600" />
                                        Statement / Ledger
                                    </h3>
                                    <button
                                        onClick={() => exportToExcel(
                                            (ledgerData?.result?.transactions || []).map(t => ({
                                                Date: new Date(t.createdAt).toLocaleDateString('en-GB'),
                                                Type: t.type,
                                                Mode: t.mode || '-',
                                                Description: t.description || '-',
                                                Amount: t.amount,
                                                'Running Balance': t.runningBalance
                                            })),
                                            `Ledger_${ledgerData?.result?.customer?.name || 'Customer'}`
                                        )}
                                        className="btn btn-sm btn-ghost gap-1"
                                    >
                                        <Download size={14} /> Export
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="table w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th>Date</th>
                                                <th>Type</th>
                                                <th>Mode</th>
                                                <th>Description</th>
                                                <th>Credit</th>
                                                <th>Debit</th>
                                                <th>Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(ledgerData?.result?.transactions || []).map((t, i) => (
                                                <tr key={i} className="hover">
                                                    <td className="text-xs">{new Date(t.createdAt).toLocaleDateString('en-GB')}</td>
                                                    <td>
                                                        <span className={`badge badge-sm ${t.type === 'CREDIT' ? 'badge-success' : 'badge-error'}`}>
                                                            {t.type}
                                                        </span>
                                                    </td>
                                                    <td className="text-xs">{t.mode || '-'}</td>
                                                    <td className="text-xs max-w-xs truncate">{t.description || '-'}</td>
                                                    <td className="text-green-600 font-semibold">
                                                        {t.type === 'CREDIT' ? `₹${t.amount?.toLocaleString()}` : ''}
                                                    </td>
                                                    <td className="text-red-600 font-semibold">
                                                        {t.type === 'DEBIT' ? `₹${t.amount?.toLocaleString()}` : ''}
                                                    </td>
                                                    <td className={`font-bold ${t.runningBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        ₹{t.runningBalance?.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            {(ledgerData?.result?.transactions || []).length === 0 && (
                                                <tr><td colSpan="7" className="text-center py-8 text-gray-400">No transactions in this period</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default PartyReports;
