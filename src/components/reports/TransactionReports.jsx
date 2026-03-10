import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { axiosInstance as axios } from "../../lib/axios";
import {
    Download, Wallet, Receipt, ShoppingBag, ReceiptText,
    Calendar, Search, CreditCard, Banknote, ArrowUpDown
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import * as XLSX from 'xlsx';
import toast from "react-hot-toast";

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const TransactionReports = ({ dateRange, customDateRange }) => {
    const [activeReport, setActiveReport] = useState("payment_collection");
    const [searchTerm, setSearchTerm] = useState("");

    let queryParams = `period=${dateRange}`;
    if (dateRange === 'custom' && customDateRange?.start && customDateRange?.end) {
        queryParams += `&startDate=${customDateRange.start}&endDate=${customDateRange.end}`;
    }

    const { data: paymentData, isLoading: loadingPayment } = useQuery({
        queryKey: ["report-payment-collection", dateRange, customDateRange],
        queryFn: async () => {
            const res = await axios.get(`/api/analytics/reports/payment-collection?${queryParams}`);
            return res.data;
        },
        enabled: activeReport === "payment_collection"
    });

    const { data: daybookData, isLoading: loadingDaybook } = useQuery({
        queryKey: ["report-daybook", dateRange, customDateRange],
        queryFn: async () => {
            const res = await axios.get(`/api/analytics/reports/daybook?${queryParams}`);
            return res.data;
        },
        enabled: activeReport === "daybook"
    });

    const { data: purchaseData, isLoading: loadingPurchase } = useQuery({
        queryKey: ["report-purchase-summary", dateRange, customDateRange],
        queryFn: async () => {
            const res = await axios.get(`/api/analytics/reports/purchase-summary?${queryParams}`);
            return res.data;
        },
        enabled: activeReport === "purchase_summary"
    });

    const { data: subscriptionData, isLoading: loadingSub } = useQuery({
        queryKey: ["report-subscription"],
        queryFn: async () => {
            const res = await axios.get("/api/analytics/reports/subscription-report");
            return res.data;
        },
        enabled: activeReport === "subscription_report"
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
        { id: "payment_collection", label: "Payment Collection", icon: Wallet },
        { id: "daybook", label: "Daybook", icon: Calendar },
        { id: "purchase_summary", label: "Purchase Summary", icon: ShoppingBag },
        { id: "subscription_report", label: "Subscription Report", icon: ReceiptText },
    ];

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

            {/* Payment Collection */}
            {activeReport === "payment_collection" && (
                <div className="space-y-4">
                    {paymentData?.result && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                                <p className="text-xs text-green-600 font-medium">Total Collected</p>
                                <p className="text-2xl font-bold text-green-700">₹{paymentData.result.totalCollected?.toLocaleString()}</p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                <p className="text-xs text-blue-600 font-medium">Total Transactions</p>
                                <p className="text-2xl font-bold text-blue-700">{paymentData.result.totalTransactions}</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                                <p className="text-xs text-purple-600 font-medium">Avg per Transaction</p>
                                <p className="text-2xl font-bold text-purple-700">
                                    ₹{paymentData.result.totalTransactions ? Math.round(paymentData.result.totalCollected / paymentData.result.totalTransactions).toLocaleString() : 0}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Payment Mode Breakdown */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <CreditCard size={18} className="text-indigo-600" />
                                Collection by Payment Mode
                            </h3>
                            {loadingPayment ? (
                                <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
                            ) : (
                                <>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={(paymentData?.result?.byMode || []).map(m => ({ name: m._id || 'Other', value: m.total }))}
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={90}
                                                    innerRadius={50}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {(paymentData?.result?.byMode || []).map((_, i) => (
                                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-2 mt-2">
                                        {(paymentData?.result?.byMode || []).map((m, i) => (
                                            <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                                    <span className="text-sm font-medium">{m._id || 'Other'}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-bold text-sm">₹{m.total?.toLocaleString()}</span>
                                                    <span className="text-xs text-gray-500 ml-2">({m.count} txns)</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Daily Collection Trend */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Banknote size={18} className="text-green-600" />
                                Daily Collection Trend
                            </h3>
                            {loadingPayment ? (
                                <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
                            ) : (
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={paymentData?.result?.dailyTrend || []}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="_id" tick={{ fontSize: 10 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`, 'Collection']} />
                                            <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} name="Collection" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Daybook */}
            {activeReport === "daybook" && (
                <div className="space-y-4">
                    {daybookData?.result?.summary && (
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                                <p className="text-xs text-green-600 font-medium">Total Credits</p>
                                <p className="text-2xl font-bold text-green-700">₹{daybookData.result.summary.totalCredits?.toLocaleString()}</p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                                <p className="text-xs text-red-600 font-medium">Total Debits</p>
                                <p className="text-2xl font-bold text-red-700">₹{daybookData.result.summary.totalDebits?.toLocaleString()}</p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                <p className="text-xs text-blue-600 font-medium">Net</p>
                                <p className={`text-2xl font-bold ${daybookData.result.summary.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                    ₹{daybookData.result.summary.net?.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <Calendar size={18} className="text-purple-600" />
                                Daybook - All Transactions
                                {daybookData?.result?.totalRecords && (
                                    <span className="text-xs text-gray-500 font-normal">({daybookData.result.totalRecords} records)</span>
                                )}
                            </h3>
                            <button
                                onClick={() => exportToExcel(
                                    (daybookData?.result?.transactions || []).map(t => ({
                                        Date: new Date(t.createdAt).toLocaleDateString('en-GB'),
                                        Time: new Date(t.createdAt).toLocaleTimeString('en-GB'),
                                        Customer: t.user?.name || '-',
                                        'Customer ID': t.user?.customerId || '-',
                                        Type: t.type,
                                        Mode: t.mode || '-',
                                        Amount: t.amount,
                                        Description: t.description || '-',
                                        Status: t.status || '-'
                                    })),
                                    'Daybook'
                                )}
                                className="btn btn-sm btn-ghost gap-1"
                            >
                                <Download size={14} /> Export
                            </button>
                        </div>
                        {loadingDaybook ? (
                            <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th>Date & Time</th>
                                            <th>Customer</th>
                                            <th>Type</th>
                                            <th>Mode</th>
                                            <th>Credit</th>
                                            <th>Debit</th>
                                            <th>Description</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(daybookData?.result?.transactions || [])
                                            .filter(t => {
                                                if (!searchTerm) return true;
                                                const s = searchTerm.toLowerCase();
                                                return t.user?.name?.toLowerCase().includes(s) ||
                                                    t.description?.toLowerCase().includes(s) ||
                                                    t.mode?.toLowerCase().includes(s);
                                            })
                                            .map((t, i) => (
                                                <tr key={i} className="hover">
                                                    <td className="text-xs whitespace-nowrap">
                                                        <div>{new Date(t.createdAt).toLocaleDateString('en-GB')}</div>
                                                        <div className="text-gray-400">{new Date(t.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </td>
                                                    <td>
                                                        <div className="font-medium text-xs">{t.user?.name || '-'}</div>
                                                        <div className="text-gray-400 text-xs">{t.user?.customerId || ''}</div>
                                                    </td>
                                                    <td>
                                                        <span className={`badge badge-sm ${t.type === 'CREDIT' ? 'badge-success' : 'badge-error'}`}>
                                                            {t.type}
                                                        </span>
                                                    </td>
                                                    <td className="text-xs">{t.mode || '-'}</td>
                                                    <td className="text-green-600 font-semibold">
                                                        {t.type === 'CREDIT' ? `₹${t.amount?.toLocaleString()}` : ''}
                                                    </td>
                                                    <td className="text-red-600 font-semibold">
                                                        {t.type === 'DEBIT' ? `₹${t.amount?.toLocaleString()}` : ''}
                                                    </td>
                                                    <td className="text-xs max-w-xs truncate">{t.description || '-'}</td>
                                                    <td>
                                                        <span className={`badge badge-xs ${t.status === 'SUCCESS' ? 'badge-success' :
                                                                t.status === 'FAILED' ? 'badge-error' : 'badge-warning'
                                                            }`}>
                                                            {t.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        {(daybookData?.result?.transactions || []).length === 0 && (
                                            <tr><td colSpan="8" className="text-center py-8 text-gray-400">No transactions found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Purchase Summary */}
            {activeReport === "purchase_summary" && (
                <div className="space-y-4">
                    {purchaseData?.result?.summary && (
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                                <p className="text-xs text-orange-600 font-medium">Total Purchases</p>
                                <p className="text-2xl font-bold text-orange-700">₹{purchaseData.result.summary.totalPurchases?.toLocaleString()}</p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                <p className="text-xs text-blue-600 font-medium">Vendor Payments</p>
                                <p className="text-2xl font-bold text-blue-700">₹{purchaseData.result.summary.totalVendorPayments?.toLocaleString()}</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                                <p className="text-xs text-purple-600 font-medium">Milk Procurement</p>
                                <p className="text-2xl font-bold text-purple-700">₹{purchaseData.result.summary.totalMilkCost?.toLocaleString()}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Vendor Payments */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <ShoppingBag size={18} className="text-blue-600" />
                                    Vendor Payments
                                </h3>
                            </div>
                            {loadingPurchase ? (
                                <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="table w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th>Vendor</th>
                                                <th>Payments</th>
                                                <th>Total Paid</th>
                                                <th>Last Payment</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(purchaseData?.result?.vendorPayments || []).map((v, i) => (
                                                <tr key={i} className="hover">
                                                    <td className="font-medium">{v.vendorName || 'Unknown'}</td>
                                                    <td>{v.paymentCount}</td>
                                                    <td className="font-bold text-blue-600">₹{v.totalPaid?.toLocaleString()}</td>
                                                    <td className="text-xs">{v.lastPayment ? new Date(v.lastPayment).toLocaleDateString('en-GB') : '-'}</td>
                                                </tr>
                                            ))}
                                            {(purchaseData?.result?.vendorPayments || []).length === 0 && (
                                                <tr><td colSpan="4" className="text-center py-6 text-gray-400">No vendor payments</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Milk Collections */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Receipt size={18} className="text-purple-600" />
                                    Milk Collections
                                </h3>
                            </div>
                            {loadingPurchase ? (
                                <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="table w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th>Vendor</th>
                                                <th>Collections</th>
                                                <th>Quantity (L)</th>
                                                <th>Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(purchaseData?.result?.milkCollections || []).map((m, i) => (
                                                <tr key={i} className="hover">
                                                    <td className="font-medium">{m.vendorName || 'Unknown'}</td>
                                                    <td>{m.collections}</td>
                                                    <td className="font-semibold">{m.totalQuantity?.toFixed(1)}</td>
                                                    <td className="font-bold text-purple-600">₹{m.totalAmount?.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            {(purchaseData?.result?.milkCollections || []).length === 0 && (
                                                <tr><td colSpan="4" className="text-center py-6 text-gray-400">No milk collections</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Subscription Report */}
            {activeReport === "subscription_report" && (
                <div className="space-y-4">
                    {subscriptionData?.result?.totals && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                                <p className="text-xs text-green-600 font-medium">Active Subscriptions</p>
                                <p className="text-2xl font-bold text-green-700">{subscriptionData.result.totals.totalActiveSubscriptions}</p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                <p className="text-xs text-blue-600 font-medium">Daily Quantity</p>
                                <p className="text-2xl font-bold text-blue-700">{subscriptionData.result.totals.totalDailyQuantity}</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                                <p className="text-xs text-purple-600 font-medium">Est. Daily Revenue</p>
                                <p className="text-2xl font-bold text-purple-700">₹{subscriptionData.result.totals.estimatedDailyRevenue?.toLocaleString()}</p>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                                <p className="text-xs text-yellow-600 font-medium">Active Trials</p>
                                <p className="text-2xl font-bold text-yellow-700">{subscriptionData.result.totals.totalTrials}</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-teal-50 to-green-50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <ReceiptText size={18} className="text-teal-600" />
                                Subscription Report by Product
                            </h3>
                            <button
                                onClick={() => exportToExcel(
                                    (subscriptionData?.result?.products || []).map(p => ({
                                        Product: p.name,
                                        Price: p.price,
                                        'Active Subscriptions': p.activeCount,
                                        'Daily Quantity': p.totalDailyQty,
                                        'Daily Revenue': p.dailyRevenue,
                                        'Monthly Revenue (Est)': p.dailyRevenue * 30,
                                        Trials: p.trialCount
                                    })),
                                    'Subscription_Report'
                                )}
                                className="btn btn-sm btn-ghost gap-1"
                            >
                                <Download size={14} /> Export
                            </button>
                        </div>
                        {loadingSub ? (
                            <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th>#</th>
                                            <th>Product</th>
                                            <th>Price</th>
                                            <th>Active Subs</th>
                                            <th>Daily Qty</th>
                                            <th>Daily Revenue</th>
                                            <th>Monthly (Est)</th>
                                            <th>Trials</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(subscriptionData?.result?.products || []).map((p, i) => (
                                            <tr key={i} className="hover">
                                                <td>{i + 1}</td>
                                                <td className="font-medium">{p.name}</td>
                                                <td>₹{p.price}</td>
                                                <td className="font-bold text-green-600">{p.activeCount}</td>
                                                <td className="font-semibold">{p.totalDailyQty}</td>
                                                <td className="font-bold text-blue-600">₹{p.dailyRevenue?.toLocaleString()}</td>
                                                <td className="font-bold text-purple-600">₹{(p.dailyRevenue * 30)?.toLocaleString()}</td>
                                                <td>
                                                    <span className="badge badge-sm badge-warning">{p.trialCount}</span>
                                                </td>
                                            </tr>
                                        ))}
                                        {(subscriptionData?.result?.products || []).length === 0 && (
                                            <tr><td colSpan="8" className="text-center py-8 text-gray-400">No active subscriptions</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransactionReports;
