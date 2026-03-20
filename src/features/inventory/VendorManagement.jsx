import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    getVendors, createVendor, updateVendor, deleteVendor,
    getVendorPaymentSummary, recordVendorPayment, getVendorPayments
} from "../../shared/api/vendors";
import { getFactories } from "../../shared/api/logistics";
import { queryClient } from "../../shared/utils/queryClient";
import {
    Plus, Edit, Trash, Search, Users, IndianRupee, TrendingUp,
    ChevronLeft, ChevronRight, Wallet, Eye, X, Loader,
    CreditCard, Banknote, Phone, Building, Download
} from "lucide-react";
import { toast } from "react-hot-toast";

export const VendorManagement = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState(null);
    const [activeTab, setActiveTab] = useState("vendors"); // vendors | summary | payments
    const [selectedVendorId, setSelectedVendorId] = useState(null); // for drilling into a vendor's summary

    // Payment modal
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        vendor: "", amount: "", method: "Bank Transfer", reference: "", notes: "", date: new Date().toISOString().split("T")[0]
    });

    // Date range for summary
    const now = new Date();
    const [summaryMonth, setSummaryMonth] = useState(now.getMonth() + 1);
    const [summaryYear, setSummaryYear] = useState(now.getFullYear());

    const startDate = `${summaryYear}-${String(summaryMonth).padStart(2, "0")}-01`;
    const endDate = new Date(summaryYear, summaryMonth, 0).toISOString().split("T")[0];
    const monthName = new Date(summaryYear, summaryMonth - 1).toLocaleString("default", { month: "long" });

    // ─── Data Fetching ────────────────────────────────
    const { data: vendorsData, isLoading } = useQuery({
        queryKey: ["vendors"],
        queryFn: getVendors
    });

    const { data: factoriesData } = useQuery({
        queryKey: ["factories"],
        queryFn: getFactories
    });

    const { data: summaryData, isLoading: summaryLoading } = useQuery({
        queryKey: ["vendor-payment-summary", startDate, endDate, selectedVendorId],
        queryFn: () => getVendorPaymentSummary({
            startDate, endDate,
            ...(selectedVendorId ? { vendorId: selectedVendorId } : {})
        }),
        enabled: activeTab === "summary"
    });

    const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
        queryKey: ["vendor-payments", startDate, endDate, selectedVendorId],
        queryFn: () => getVendorPayments({
            startDate, endDate,
            ...(selectedVendorId ? { vendorId: selectedVendorId } : {})
        }),
        enabled: activeTab === "payments"
    });

    const vendors = vendorsData?.result || [];
    const factories = factoriesData?.result || [];
    const summary = summaryData || {};
    const payments = paymentsData?.result || [];

    // ─── Mutations ────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: createVendor,
        onSuccess: () => {
            queryClient.invalidateQueries(["vendors"]);
            setIsModalOpen(false);
            toast.success("Vendor added successfully");
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to add vendor")
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateVendor(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(["vendors"]);
            setIsModalOpen(false);
            setEditingVendor(null);
            toast.success("Vendor updated successfully");
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to update vendor")
    });

    const deleteMutation = useMutation({
        mutationFn: deleteVendor,
        onSuccess: () => {
            queryClient.invalidateQueries(["vendors"]);
            toast.success("Vendor deleted");
        }
    });

    const paymentMutation = useMutation({
        mutationFn: recordVendorPayment,
        onSuccess: () => {
            queryClient.invalidateQueries(["vendor-payment-summary"]);
            queryClient.invalidateQueries(["vendor-payments"]);
            setIsPaymentModalOpen(false);
            setPaymentForm({ vendor: "", amount: "", method: "Bank Transfer", reference: "", notes: "", date: new Date().toISOString().split("T")[0] });
            toast.success("Payment recorded successfully");
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to record payment")
    });

    // ─── Filters ──────────────────────────────────────
    const filteredVendors = useMemo(() =>
        vendors.filter(v =>
            v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.mobile.includes(searchTerm) ||
            v.code?.toLowerCase().includes(searchTerm.toLowerCase())
        ), [vendors, searchTerm]);

    // ─── Handlers ─────────────────────────────────────
    const handleSave = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get("name"),
            code: formData.get("code"),
            mobile: formData.get("mobile"),
            factory: formData.get("factory") || null,
            ratePerLiter: Number(formData.get("ratePerLiter")),
            address: {
                street: formData.get("street"),
                village: formData.get("village"),
                city: formData.get("city")
            },
            bankDetails: {
                bankName: formData.get("bankName"),
                accountNumber: formData.get("accountNumber"),
                ifscCode: formData.get("ifscCode"),
                upiId: formData.get("upiId")
            }
        };

        if (editingVendor) {
            updateMutation.mutate({ id: editingVendor._id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleRecordPayment = () => {
        if (!paymentForm.vendor || !paymentForm.amount || Number(paymentForm.amount) <= 0) {
            toast.error("Select a vendor and enter a valid amount");
            return;
        }
        paymentMutation.mutate({
            ...paymentForm,
            amount: Number(paymentForm.amount)
        });
    };

    const prevMonth = () => {
        if (summaryMonth === 1) { setSummaryMonth(12); setSummaryYear(y => y - 1); }
        else setSummaryMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (summaryMonth === 12) { setSummaryMonth(1); setSummaryYear(y => y + 1); }
        else setSummaryMonth(m => m + 1);
    };

    // ─── Render ───────────────────────────────────────
    return (
        <div className="p-4 space-y-4">
            {/* ═══ Header ═══ */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Vendor Management</h2>
                    <p className="text-sm text-gray-500">Manage milk suppliers, collections & payments</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { setIsPaymentModalOpen(true); setPaymentForm(f => ({ ...f, vendor: selectedVendorId || "" })); }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
                    >
                        <IndianRupee size={16} /> Record Payment
                    </button>
                    <button
                        onClick={() => { setEditingVendor(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition shadow-sm"
                    >
                        <Plus size={16} /> Add Vendor
                    </button>
                </div>
            </div>

            {/* ═══ Tabs ═══ */}
            <div className="flex gap-2">
                {[
                    { key: "vendors", label: "Vendors", icon: Users },
                    { key: "summary", label: "Collection & Payments", icon: TrendingUp },
                    { key: "payments", label: "Payment History", icon: CreditCard },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); if (tab.key !== "summary") setSelectedVendorId(null); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition border ${activeTab === tab.key
                                ? "bg-teal-600 text-white border-teal-600 shadow"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══ Tab: Vendors List ═══ */}
            {activeTab === "vendors" && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b flex gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search vendors..."
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-5 py-3 font-semibold text-gray-600">Code</th>
                                    <th className="px-5 py-3 font-semibold text-gray-600">Name / Mobile</th>
                                    <th className="px-5 py-3 font-semibold text-gray-600">Factory</th>
                                    <th className="px-5 py-3 font-semibold text-gray-600">Address</th>
                                    <th className="px-5 py-3 font-semibold text-gray-600">Bank Details</th>
                                    <th className="px-5 py-3 font-semibold text-gray-600">Base Rate</th>
                                    <th className="px-5 py-3 font-semibold text-gray-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading ? (
                                    <tr><td colSpan="7" className="text-center py-8 text-gray-400"><Loader className="animate-spin mx-auto" size={20} /></td></tr>
                                ) : filteredVendors.length === 0 ? (
                                    <tr><td colSpan="7" className="text-center py-8 text-gray-500">No vendors found</td></tr>
                                ) : (
                                    filteredVendors.map(vendor => (
                                        <tr key={vendor._id} className="hover:bg-gray-50/50">
                                            <td className="px-5 py-3 font-mono text-xs font-bold">{vendor.code || "-"}</td>
                                            <td className="px-5 py-3">
                                                <div className="font-bold text-gray-800">{vendor.name}</div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} />{vendor.mobile}</div>
                                            </td>
                                            <td className="px-5 py-3 text-xs font-medium text-teal-600">
                                                {vendor.factory?.name || <span className="text-gray-400">Not Assigned</span>}
                                            </td>
                                            <td className="px-5 py-3 text-xs">
                                                {vendor.address?.village}, {vendor.address?.city}
                                            </td>
                                            <td className="px-5 py-3 text-xs">
                                                {vendor.bankDetails?.bankName ? (
                                                    <div>
                                                        <div>{vendor.bankDetails.bankName}</div>
                                                        <div className="font-mono">{vendor.bankDetails.accountNumber}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">Not Added</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 font-semibold">₹{vendor.ratePerLiter}/L</td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => { setSelectedVendorId(vendor._id); setActiveTab("summary"); }}
                                                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500 hover:text-indigo-700 transition"
                                                        title="View Summary"
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingVendor(vendor); setIsModalOpen(true); }}
                                                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition"
                                                    >
                                                        <Edit size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => { if (confirm("Deactivate this vendor?")) updateMutation.mutate({ id: vendor._id, data: { isActive: false } }) }}
                                                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition"
                                                    >
                                                        <Trash size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══ Tab: Collection & Payment Summary ═══ */}
            {activeTab === "summary" && (
                <div className="space-y-5">
                    {/* Month Nav + Vendor Filter */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /></button>
                                <span className="text-lg font-bold text-gray-800 min-w-[160px] text-center">{monthName} {summaryYear}</span>
                                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={18} /></button>
                            </div>
                            <div className="flex items-center gap-3">
                                {selectedVendorId && (
                                    <button
                                        onClick={() => setSelectedVendorId(null)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium hover:bg-gray-200"
                                    >
                                        <X size={12} /> Clear vendor filter
                                    </button>
                                )}
                                <select
                                    value={selectedVendorId || ""}
                                    onChange={(e) => setSelectedVendorId(e.target.value || null)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                                >
                                    <option value="">All Vendors</option>
                                    {vendors.map(v => <option key={v._id} value={v._id}>{v.name} ({v.code})</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {summaryLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader className="animate-spin text-teal-600" size={24} />
                            <span className="ml-3 text-gray-500 text-sm">Loading summary...</span>
                        </div>
                    ) : (
                        <>
                            {/* Overall Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                {[
                                    { label: "Total Quantity", value: `${(summary.overall?.totalQuantity || 0).toLocaleString()} L`, color: "bg-blue-50 border-blue-100 text-blue-700", icon: TrendingUp },
                                    { label: "Total Amount", value: `₹${(summary.overall?.totalAmount || 0).toLocaleString()}`, color: "bg-emerald-50 border-emerald-100 text-emerald-700", icon: IndianRupee },
                                    { label: "Total Paid", value: `₹${(summary.overall?.totalPaid || 0).toLocaleString()}`, color: "bg-green-50 border-green-100 text-green-700", icon: Wallet },
                                    { label: "Balance Due", value: `₹${(summary.overall?.balanceDue || 0).toLocaleString()}`, color: `${(summary.overall?.balanceDue || 0) > 0 ? "bg-red-50 border-red-100 text-red-700" : "bg-gray-50 border-gray-200 text-gray-700"}`, icon: Banknote },
                                    { label: "Vendors", value: summary.overall?.vendorCount || 0, color: "bg-purple-50 border-purple-100 text-purple-700", icon: Users },
                                    { label: "Collections", value: summary.overall?.totalCollections || 0, color: "bg-amber-50 border-amber-100 text-amber-700", icon: CreditCard },
                                ].map(card => (
                                    <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs font-bold uppercase tracking-wide opacity-70">{card.label}</p>
                                            <card.icon size={16} className="opacity-40" />
                                        </div>
                                        <p className="text-xl font-extrabold">{card.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Per-Vendor Breakdown */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 border-b bg-gray-50">
                                    <h3 className="font-bold text-gray-700">Vendor-wise Breakdown</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50/80 border-b">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold text-gray-600">Vendor</th>
                                                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Qty (L)</th>
                                                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Avg Fat</th>
                                                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Avg Rate</th>
                                                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Total Amt</th>
                                                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Paid</th>
                                                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Balance</th>
                                                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {(summary.vendors || []).length === 0 ? (
                                                <tr><td colSpan="8" className="text-center py-8 text-gray-400">No collections found for this period</td></tr>
                                            ) : (
                                                (summary.vendors || []).map(v => (
                                                    <tr key={v.vendorId} className="hover:bg-gray-50/50">
                                                        <td className="px-4 py-3">
                                                            <div className="font-semibold text-gray-800">{v.vendorName}</div>
                                                            <div className="text-xs text-gray-400">{v.vendorCode} • {v.vendorMobile}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-semibold">{v.totalQuantity.toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-right">{v.avgFat}</td>
                                                        <td className="px-4 py-3 text-right">₹{v.avgRate}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-emerald-700">₹{v.totalAmount.toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-right font-semibold text-green-600">₹{v.totalPaid.toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className={`font-bold ${v.balanceDue > 0 ? "text-red-600" : "text-gray-500"}`}>
                                                                ₹{v.balanceDue.toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button
                                                                onClick={() => {
                                                                    setPaymentForm(f => ({ ...f, vendor: v.vendorId, amount: v.balanceDue > 0 ? v.balanceDue : "" }));
                                                                    setIsPaymentModalOpen(true);
                                                                }}
                                                                className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition"
                                                                disabled={v.balanceDue <= 0}
                                                            >
                                                                Pay
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ═══ Tab: Payment History ═══ */}
            {activeTab === "payments" && (
                <div className="space-y-5">
                    {/* Month Nav */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /></button>
                                <span className="text-lg font-bold text-gray-800 min-w-[160px] text-center">{monthName} {summaryYear}</span>
                                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={18} /></button>
                            </div>
                            <div className="flex items-center gap-3">
                                <select
                                    value={selectedVendorId || ""}
                                    onChange={(e) => setSelectedVendorId(e.target.value || null)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                                >
                                    <option value="">All Vendors</option>
                                    {vendors.map(v => <option key={v._id} value={v._id}>{v.name} ({v.code})</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Total banner */}
                    {paymentsData?.analytics && (
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl p-5 flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-80">Total Payments in {monthName}</p>
                                <p className="text-3xl font-extrabold mt-1">₹{(paymentsData.analytics.totalPaid || 0).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm opacity-80">Transactions</p>
                                <p className="text-3xl font-extrabold mt-1">{paymentsData.analytics.count || 0}</p>
                            </div>
                        </div>
                    )}

                    {/* Payments table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold text-gray-600">Date</th>
                                        <th className="px-5 py-3 font-semibold text-gray-600">Vendor</th>
                                        <th className="px-5 py-3 font-semibold text-gray-600">Method</th>
                                        <th className="px-5 py-3 font-semibold text-gray-600">Reference</th>
                                        <th className="px-5 py-3 font-semibold text-gray-600 text-right">Amount</th>
                                        <th className="px-5 py-3 font-semibold text-gray-600">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paymentsLoading ? (
                                        <tr><td colSpan="6" className="text-center py-8 text-gray-400"><Loader className="animate-spin mx-auto" size={20} /></td></tr>
                                    ) : payments.length === 0 ? (
                                        <tr><td colSpan="6" className="text-center py-8 text-gray-500">No payments found for this period</td></tr>
                                    ) : (
                                        payments.map(p => (
                                            <tr key={p._id} className="hover:bg-gray-50/50">
                                                <td className="px-5 py-3 text-xs font-medium">
                                                    {new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="font-semibold">{p.vendor?.name || "Unknown"}</div>
                                                    <div className="text-xs text-gray-400">{p.vendor?.code || ""}</div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-semibold">{p.method}</span>
                                                </td>
                                                <td className="px-5 py-3 text-xs font-mono">{p.reference || "-"}</td>
                                                <td className="px-5 py-3 text-right font-bold text-emerald-700">₹{p.amount?.toLocaleString()}</td>
                                                <td className="px-5 py-3 text-xs text-gray-500 max-w-[200px] truncate">{p.notes || "-"}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Add/Edit Vendor Modal ═══ */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">{editingVendor ? "Edit Vendor" : "Add New Vendor"}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-lg"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2 text-xs font-bold text-gray-400 uppercase border-b pb-1">Basic Info</div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
                                <input name="name" defaultValue={editingVendor?.name} required className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Code</label>
                                <input name="code" defaultValue={editingVendor?.code} className="w-full px-3 py-2 border rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="e.g. V001" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Mobile</label>
                                <input name="mobile" defaultValue={editingVendor?.mobile} required className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Factory</label>
                                <select name="factory" defaultValue={editingVendor?.factory?._id || editingVendor?.factory || ""} className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
                                    <option value="">Select Factory (Optional)</option>
                                    {factories.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Base Rate (₹/L)</label>
                                <input name="ratePerLiter" type="number" step="0.01" defaultValue={editingVendor?.ratePerLiter} required className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                            </div>

                            <div className="col-span-2 text-xs font-bold text-gray-400 uppercase border-b pb-1 mt-2">Address</div>
                            <input name="street" defaultValue={editingVendor?.address?.street} placeholder="Street" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                            <input name="village" defaultValue={editingVendor?.address?.village} placeholder="Village" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                            <input name="city" defaultValue={editingVendor?.address?.city} placeholder="City" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />

                            <div className="col-span-2 text-xs font-bold text-gray-400 uppercase border-b pb-1 mt-2">Payment Details</div>
                            <input name="bankName" defaultValue={editingVendor?.bankDetails?.bankName} placeholder="Bank Name" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                            <input name="accountNumber" defaultValue={editingVendor?.bankDetails?.accountNumber} placeholder="Account Number" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                            <input name="ifscCode" defaultValue={editingVendor?.bankDetails?.ifscCode} placeholder="IFSC Code" className="w-full px-3 py-2 border rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-teal-400" />
                            <input name="upiId" defaultValue={editingVendor?.bankDetails?.upiId} placeholder="UPI ID" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />

                            <div className="col-span-2 flex justify-end gap-3 mt-4">
                                <button type="button" className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="px-6 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {editingVendor ? "Update" : "Create"} Vendor
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══ Record Payment Modal ═══ */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-indigo-50 px-6 py-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-indigo-800 flex items-center gap-2"><IndianRupee size={18} /> Record Payment</h3>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="p-1 hover:bg-indigo-100 rounded-lg text-indigo-600"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Vendor</label>
                                <select
                                    value={paymentForm.vendor}
                                    onChange={(e) => setPaymentForm(f => ({ ...f, vendor: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value="">Select Vendor</option>
                                    {vendors.map(v => <option key={v._id} value={v._id}>{v.name} ({v.code})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        placeholder="Enter amount"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={paymentForm.date}
                                        onChange={(e) => setPaymentForm(f => ({ ...f, date: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Payment Method</label>
                                <select
                                    value={paymentForm.method}
                                    onChange={(e) => setPaymentForm(f => ({ ...f, method: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    {["Cash", "Bank Transfer", "UPI", "Cheque", "Other"].map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Reference / Transaction ID</label>
                                <input
                                    type="text"
                                    value={paymentForm.reference}
                                    onChange={(e) => setPaymentForm(f => ({ ...f, reference: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    placeholder="Optional"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes</label>
                                <input
                                    type="text"
                                    value={paymentForm.notes}
                                    onChange={(e) => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    placeholder="Optional"
                                />
                            </div>
                        </div>
                        <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
                            <button onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">Cancel</button>
                            <button
                                onClick={handleRecordPayment}
                                disabled={paymentMutation.isPending}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {paymentMutation.isPending ? "Recording..." : "Record Payment"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
