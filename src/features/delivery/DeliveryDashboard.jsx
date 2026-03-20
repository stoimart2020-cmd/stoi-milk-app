import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../../shared/utils/queryClient";
import { getDeliveryDashboard, getDeliveryOrders, bulkAssignRider, bulkUpdateStatus, generateOrdersForDate } from "../../shared/api/delivery";
import { getAllRiders } from "../../shared/api/riders";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
    Truck, Package, CheckCircle2, Clock, XCircle, AlertTriangle,
    Users, MapPin, ChevronLeft, ChevronRight, Send, UserPlus,
    IndianRupee, TrendingUp, Filter, RefreshCw, Eye, Bike, Zap
} from "lucide-react";
import { useFilters } from "../../shared/context/FilterContext";

// =============================================
// STAT CARD
// =============================================
const StatCard = ({ icon: Icon, label, value, sub, color, onClick }) => (
    <button
        onClick={onClick}
        className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all duration-200 text-left w-full group ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                <Icon size={20} className="text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-2xl font-bold text-gray-900 group-hover:text-teal-600 transition-colors">{value}</p>
                <p className="text-xs text-gray-500 truncate">{label}</p>
            </div>
        </div>
        {sub && <p className="text-xs text-gray-400 mt-2 truncate">{sub}</p>}
    </button>
);

// =============================================
// STATUS BADGE
// =============================================
const statusConfig = {
    pending: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
    confirmed: { label: "Confirmed", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-400" },
    out_for_delivery: { label: "Out for Delivery", color: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-400" },
    delivered: { label: "Delivered", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-400" },
    cancelled: { label: "Cancelled", color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-400" },
};

const StatusBadge = ({ status }) => {
    const cfg = statusConfig[status] || { label: status, color: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
            {cfg.label}
        </span>
    );
};

// =============================================
// MAIN COMPONENT
// =============================================
export const DeliveryDashboard = () => {
    const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [activeTab, setActiveTab] = useState("overview"); // overview | orders | riders
    const [statusFilter, setStatusFilter] = useState("");
    const [riderFilter, setRiderFilter] = useState("");
    const [showUnassigned, setShowUnassigned] = useState(false);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [assignRiderId, setAssignRiderId] = useState("");

    const { filters } = useFilters();

    // --- Data Fetching ---
    const dashParams = useMemo(() => {
        const p = { date: selectedDate };
        if (filters.hub) p.hub = filters.hub;
        if (filters.area) p.area = filters.area;
        if (filters.city) p.city = filters.city;
        return p;
    }, [selectedDate, filters]);

    const { data: dashData, isLoading: dashLoading, refetch: refetchDash } = useQuery({
        queryKey: ["deliveryDashboard", dashParams],
        queryFn: () => getDeliveryDashboard(dashParams),
    });

    const orderParams = useMemo(() => {
        const p = { date: selectedDate };
        if (statusFilter) p.status = statusFilter;
        if (riderFilter) p.rider = riderFilter;
        if (showUnassigned) p.unassigned = "true";
        if (filters.hub) p.hub = filters.hub;
        if (filters.area) p.area = filters.area;
        if (filters.city) p.city = filters.city;
        return p;
    }, [selectedDate, statusFilter, riderFilter, showUnassigned, filters]);

    const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
        queryKey: ["deliveryOrders", orderParams],
        queryFn: () => getDeliveryOrders(orderParams),
        enabled: activeTab !== "overview" || true, // always fetch
    });

    const { data: ridersData } = useQuery({
        queryKey: ["riders"],
        queryFn: getAllRiders,
    });

    const dash = dashData?.result || {};
    const stats = dash.stats || {};
    const orders = ordersData?.result || [];
    const riders = ridersData?.result || [];

    // --- Mutations ---
    const assignMutation = useMutation({
        mutationFn: bulkAssignRider,
        onSuccess: (data) => {
            toast.success(data.message);
            setSelectedOrders([]);
            setAssignRiderId("");
            queryClient.invalidateQueries({ queryKey: ["deliveryDashboard"] });
            queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
        },
        onError: (err) => toast.error(err.response?.data?.message || "Assignment failed"),
    });

    const statusMutation = useMutation({
        mutationFn: bulkUpdateStatus,
        onSuccess: (data) => {
            toast.success(data.message);
            setSelectedOrders([]);
            queryClient.invalidateQueries({ queryKey: ["deliveryDashboard"] });
            queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
        },
        onError: (err) => toast.error(err.response?.data?.message || "Update failed"),
    });

    const generateMutation = useMutation({
        mutationFn: () => generateOrdersForDate(selectedDate),
        onSuccess: (data) => {
            const r = data.result;
            toast.success(`${r.ordersCreated} orders generated! (${r.skipped} skipped, ${r.alreadyExists} already existed)`);
            queryClient.invalidateQueries({ queryKey: ["deliveryDashboard"] });
            queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to generate orders"),
    });

    // --- Handlers ---
    const shiftDate = (delta) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + delta);
        setSelectedDate(format(d, "yyyy-MM-dd"));
    };

    const toggleOrder = (id) => {
        setSelectedOrders(prev =>
            prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedOrders.length === orders.length) {
            setSelectedOrders([]);
        } else {
            setSelectedOrders(orders.map(o => o._id));
        }
    };

    const handleBulkAssign = () => {
        if (!assignRiderId || selectedOrders.length === 0) {
            toast.error("Select orders and a rider");
            return;
        }
        assignMutation.mutate({ orderIds: selectedOrders, riderId: assignRiderId });
    };

    const handleBulkStatus = (status) => {
        if (selectedOrders.length === 0) {
            toast.error("Select orders first");
            return;
        }
        if (confirm(`Update ${selectedOrders.length} orders to "${status}"?`)) {
            statusMutation.mutate({ orderIds: selectedOrders, status });
        }
    };

    const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");

    // --- Compute completion rate ---
    const completionRate = stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* ===== HEADER ===== */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Truck className="text-teal-600" size={28} />
                        Delivery Dashboard
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage and track daily deliveries</p>
                </div>

                {/* Date Picker */}
                <div className="flex items-center gap-2">
                    <button onClick={() => shiftDate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                    />
                    <button onClick={() => shiftDate(1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <ChevronRight size={20} />
                    </button>
                    {!isToday && (
                        <button
                            onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}
                            className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium hover:bg-teal-100 transition-colors"
                        >
                            Today
                        </button>
                    )}
                    <button
                        onClick={() => { refetchDash(); refetchOrders(); }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-teal-600"
                        title="Refresh"
                    >
                        <RefreshCw size={18} />
                    </button>
                    <button
                        onClick={() => {
                            if (confirm(`Generate subscription orders for ${selectedDate}? This will create delivery orders from all active subscriptions.`)) {
                                generateMutation.mutate();
                            }
                        }}
                        disabled={generateMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-xs font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-sm"
                        title="Generate orders from subscriptions"
                    >
                        <Zap size={14} />
                        {generateMutation.isPending ? 'Generating...' : 'Generate Orders'}
                    </button>
                </div>
            </div>

            {/* ===== TABS ===== */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                {[
                    { key: "overview", label: "Overview", icon: Eye },
                    { key: "orders", label: "Orders", icon: Package },
                    { key: "riders", label: "Riders", icon: Bike },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                            ? "bg-white text-teal-700 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {dashLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="loading loading-spinner loading-lg text-teal-600"></div>
                </div>
            ) : (
                <>
                    {/* ===== OVERVIEW TAB ===== */}
                    {activeTab === "overview" && (
                        <div className="space-y-6">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                <StatCard
                                    icon={Package} label="Total Orders" value={stats.total || 0}
                                    color="bg-gray-700"
                                    onClick={() => { setActiveTab("orders"); setStatusFilter(""); }}
                                />
                                <StatCard
                                    icon={Clock} label="Pending" value={stats.pending || 0}
                                    sub={stats.confirmed ? `+${stats.confirmed} confirmed` : null}
                                    color="bg-amber-500"
                                    onClick={() => { setActiveTab("orders"); setStatusFilter("pending,confirmed"); }}
                                />
                                <StatCard
                                    icon={Send} label="Out for Delivery" value={stats.out_for_delivery || 0}
                                    color="bg-indigo-500"
                                    onClick={() => { setActiveTab("orders"); setStatusFilter("out_for_delivery"); }}
                                />
                                <StatCard
                                    icon={CheckCircle2} label="Delivered" value={stats.delivered || 0}
                                    sub={`${completionRate}% completion`}
                                    color="bg-emerald-500"
                                    onClick={() => { setActiveTab("orders"); setStatusFilter("delivered"); }}
                                />
                                <StatCard
                                    icon={XCircle} label="Cancelled" value={stats.cancelled || 0}
                                    color="bg-red-500"
                                    onClick={() => { setActiveTab("orders"); setStatusFilter("cancelled"); }}
                                />
                                <StatCard
                                    icon={AlertTriangle} label="Unassigned" value={stats.unassigned || 0}
                                    color="bg-orange-500"
                                    onClick={() => { setActiveTab("orders"); setShowUnassigned(true); setStatusFilter(""); }}
                                />
                            </div>

                            {/* Revenue + Completion */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Revenue Card */}
                                <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl p-6 text-white col-span-1">
                                    <div className="flex items-center gap-2 mb-4">
                                        <IndianRupee size={20} />
                                        <span className="text-sm font-medium opacity-80">Revenue</span>
                                    </div>
                                    <p className="text-3xl font-bold">₹{(stats.deliveredRevenue || 0).toLocaleString()}</p>
                                    <p className="text-xs opacity-70 mt-1">of ₹{(stats.revenue || 0).toLocaleString()} total value</p>

                                    {/* Payment breakdown */}
                                    {dash.paymentBreakdown?.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-white/20 space-y-1">
                                            {dash.paymentBreakdown.map(pb => (
                                                <div key={pb._id} className="flex justify-between text-xs">
                                                    <span className="opacity-80">{pb._id || "Unknown"}</span>
                                                    <span className="font-medium">₹{pb.total.toLocaleString()} ({pb.count})</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Completion Progress */}
                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 col-span-1">
                                    <div className="flex items-center gap-2 mb-4">
                                        <TrendingUp size={20} className="text-teal-600" />
                                        <span className="text-sm font-bold text-gray-700">Completion Rate</span>
                                    </div>
                                    <div className="relative pt-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-4xl font-bold text-gray-900">{completionRate}%</span>
                                            <span className="text-xs text-gray-400">{stats.delivered || 0} / {stats.total || 0}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-3">
                                            <div
                                                className="h-3 rounded-full transition-all duration-700 ease-out"
                                                style={{
                                                    width: `${completionRate}%`,
                                                    background: completionRate >= 80 ? '#10b981' : completionRate >= 50 ? '#f59e0b' : '#ef4444'
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                    {/* Status breakdown mini */}
                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        {[
                                            { label: "Pending", val: stats.pending, c: "text-amber-600" },
                                            { label: "Confirmed", val: stats.confirmed, c: "text-blue-600" },
                                            { label: "In Transit", val: stats.out_for_delivery, c: "text-indigo-600" },
                                            { label: "Cancelled", val: stats.cancelled, c: "text-red-600" },
                                        ].map(s => (
                                            <div key={s.label} className="text-center">
                                                <p className={`text-lg font-bold ${s.c}`}>{s.val || 0}</p>
                                                <p className="text-[10px] text-gray-400">{s.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Area Breakdown */}
                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 col-span-1">
                                    <div className="flex items-center gap-2 mb-4">
                                        <MapPin size={20} className="text-teal-600" />
                                        <span className="text-sm font-bold text-gray-700">Area Breakdown</span>
                                    </div>
                                    {dash.areaStats?.length > 0 ? (
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {dash.areaStats.map((a, i) => (
                                                <div key={i} className="flex items-center justify-between py-1">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-gray-800 truncate">{a.area?.name || "Unknown"}</p>
                                                        <p className="text-[10px] text-gray-400">{a.area?.city?.name || ""}</p>
                                                    </div>
                                                    <div className="text-right flex-shrink-0 ml-2">
                                                        <p className="text-sm font-bold text-gray-700">{a.total}</p>
                                                        <p className="text-[10px] text-emerald-500">{a.delivered} done</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 text-center py-6">No area data</p>
                                    )}
                                </div>
                            </div>

                            {/* Rider Performance Table */}
                            {dash.riderStats?.length > 0 && (
                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-100">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                            <Users size={18} className="text-teal-600" />
                                            Rider Performance
                                        </h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50/50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rider</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Total</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Delivered</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">In Transit</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Pending</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Rate</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Cash</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {dash.riderStats.map((rs) => {
                                                    const rate = rs.total > 0 ? Math.round((rs.delivered / rs.total) * 100) : 0;
                                                    return (
                                                        <tr key={rs._id} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs font-bold">
                                                                        {rs.rider?.name?.charAt(0) || "?"}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-800">{rs.rider?.name}</p>
                                                                        <p className="text-[10px] text-gray-400">{rs.rider?.hub?.name || ""}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-sm font-bold text-gray-700">{rs.total}</td>
                                                            <td className="px-4 py-3 text-center text-sm font-bold text-emerald-600">{rs.delivered}</td>
                                                            <td className="px-4 py-3 text-center text-sm text-indigo-600">{rs.out}</td>
                                                            <td className="px-4 py-3 text-center text-sm text-amber-600">{rs.pending}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rate >= 80 ? 'bg-emerald-50 text-emerald-700' : rate >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                                                                    {rate}%
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">₹{(rs.cashCollected || 0).toLocaleString()}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ===== ORDERS TAB ===== */}
                    {activeTab === "orders" && (
                        <div className="space-y-4">
                            {/* Filters + Bulk Actions */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <Filter size={16} className="text-gray-400" />
                                        <select
                                            value={statusFilter}
                                            onChange={e => { setStatusFilter(e.target.value); setShowUnassigned(false); }}
                                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                                        >
                                            <option value="">All Status</option>
                                            <option value="pending">Pending</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="pending,confirmed">Pending & Confirmed</option>
                                            <option value="out_for_delivery">Out for Delivery</option>
                                            <option value="delivered">Delivered</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>

                                    <select
                                        value={riderFilter}
                                        onChange={e => setRiderFilter(e.target.value)}
                                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                                    >
                                        <option value="">All Riders</option>
                                        {riders.map(r => (
                                            <option key={r._id} value={r._id}>{r.name}</option>
                                        ))}
                                    </select>

                                    <button
                                        onClick={() => { setShowUnassigned(!showUnassigned); setStatusFilter(""); setRiderFilter(""); }}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${showUnassigned
                                            ? "bg-orange-50 text-orange-700 border-orange-200"
                                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                            }`}
                                    >
                                        <AlertTriangle size={14} className="inline mr-1" />
                                        Unassigned
                                    </button>

                                    <div className="ml-auto flex items-center gap-2">
                                        <span className="text-xs text-gray-400">{selectedOrders.length} selected</span>
                                    </div>
                                </div>

                                {/* Bulk Actions Row */}
                                {selectedOrders.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <UserPlus size={14} className="text-gray-400" />
                                            <select
                                                value={assignRiderId}
                                                onChange={e => setAssignRiderId(e.target.value)}
                                                className="px-2 py-1 border border-gray-200 rounded-lg text-sm"
                                            >
                                                <option value="">Select Rider</option>
                                                {riders.map(r => (
                                                    <option key={r._id} value={r._id}>{r.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={handleBulkAssign}
                                                disabled={!assignRiderId || assignMutation.isPending}
                                                className="px-3 py-1 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
                                            >
                                                Assign ({selectedOrders.length})
                                            </button>
                                        </div>

                                        <div className="h-5 w-px bg-gray-200"></div>

                                        <div className="flex items-center gap-1">
                                            {["confirmed", "out_for_delivery", "delivered"].map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => handleBulkStatus(s)}
                                                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-medium text-gray-600 transition-colors capitalize"
                                                >
                                                    → {s.replace("_", " ")}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Orders Table */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50/50 border-b border-gray-100">
                                            <tr>
                                                <th className="px-3 py-3 text-left">
                                                    <input
                                                        type="checkbox"
                                                        checked={orders.length > 0 && selectedOrders.length === orders.length}
                                                        onChange={toggleAll}
                                                        className="rounded border-gray-300"
                                                    />
                                                </th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Order</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Products</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rider</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Payment</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {ordersLoading ? (
                                                <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
                                            ) : orders.length === 0 ? (
                                                <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-400">No orders found</td></tr>
                                            ) : (
                                                orders.map(order => (
                                                    <tr key={order._id} className={`hover:bg-gray-50/50 transition-colors ${selectedOrders.includes(order._id) ? 'bg-teal-50/30' : ''}`}>
                                                        <td className="px-3 py-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedOrders.includes(order._id)}
                                                                onChange={() => toggleOrder(order._id)}
                                                                className="rounded border-gray-300"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <p className="text-sm font-bold text-gray-800">#{order.orderId || order._id?.slice(-6)}</p>
                                                            <p className="text-[10px] text-gray-400">{format(new Date(order.createdAt), "hh:mm a")}</p>
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <p className="text-sm font-medium text-gray-800">{order.customer?.name || "—"}</p>
                                                            <p className="text-[10px] text-gray-400 max-w-[150px] truncate">{order.customer?.address?.fullAddress || order.customer?.mobile}</p>
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <div className="space-y-0.5">
                                                                {order.products?.slice(0, 2).map((p, i) => (
                                                                    <p key={i} className="text-xs text-gray-600">
                                                                        {p.product?.name || "Product"} × {p.quantity}
                                                                    </p>
                                                                ))}
                                                                {order.products?.length > 2 && (
                                                                    <p className="text-[10px] text-gray-400">+{order.products.length - 2} more</p>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <p className="text-sm font-bold text-gray-800">₹{order.totalAmount}</p>
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <StatusBadge status={order.status} />
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            {order.assignedRider ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold">
                                                                        {order.assignedRider.name?.charAt(0)}
                                                                    </div>
                                                                    <span className="text-xs text-gray-700">{order.assignedRider.name}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-orange-500 font-medium">Unassigned</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <span className={`text-xs font-medium ${order.paymentStatus === "paid" ? "text-emerald-600" : "text-gray-500"}`}>
                                                                {order.paymentMode || "—"} · {order.paymentStatus}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {ordersData?.pagination && (
                                    <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
                                        Showing {orders.length} of {ordersData.pagination.total} orders
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ===== RIDERS TAB ===== */}
                    {activeTab === "riders" && (
                        <div className="space-y-4">
                            {dash.riderStats?.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {dash.riderStats.map(rs => {
                                        const rate = rs.total > 0 ? Math.round((rs.delivered / rs.total) * 100) : 0;
                                        return (
                                            <div key={rs._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white flex items-center justify-center text-lg font-bold">
                                                        {rs.rider?.name?.charAt(0) || "?"}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-800">{rs.rider?.name}</p>
                                                        <p className="text-xs text-gray-400">{rs.rider?.hub?.name || "No hub"}</p>
                                                    </div>
                                                    <div className="ml-auto">
                                                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${rate >= 80 ? 'bg-emerald-50 text-emerald-700' : rate >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                                                            {rate}%
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Progress bar */}
                                                <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                                                    <div
                                                        className="h-2 rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${rate}%`,
                                                            background: rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444'
                                                        }}
                                                    ></div>
                                                </div>

                                                <div className="grid grid-cols-4 gap-2 text-center">
                                                    <button 
                                                        onClick={() => { setActiveTab("orders"); setRiderFilter(rs.rider?._id); setStatusFilter(""); setShowUnassigned(false); }}
                                                        className="hover:bg-gray-50 rounded py-1 transition-colors cursor-pointer"
                                                    >
                                                        <p className="text-lg font-bold text-gray-800">{rs.total}</p>
                                                        <p className="text-[10px] text-gray-400">Total</p>
                                                    </button>
                                                    <button 
                                                        onClick={() => { setActiveTab("orders"); setRiderFilter(rs.rider?._id); setStatusFilter("delivered"); setShowUnassigned(false); }}
                                                        className="hover:bg-gray-50 rounded py-1 transition-colors cursor-pointer"
                                                    >
                                                        <p className="text-lg font-bold text-emerald-600">{rs.delivered}</p>
                                                        <p className="text-[10px] text-gray-400">Done</p>
                                                    </button>
                                                    <button 
                                                        onClick={() => { setActiveTab("orders"); setRiderFilter(rs.rider?._id); setStatusFilter("out_for_delivery"); setShowUnassigned(false); }}
                                                        className="hover:bg-gray-50 rounded py-1 transition-colors cursor-pointer"
                                                    >
                                                        <p className="text-lg font-bold text-indigo-600">{rs.out}</p>
                                                        <p className="text-[10px] text-gray-400">Transit</p>
                                                    </button>
                                                    <button 
                                                        onClick={() => { setActiveTab("orders"); setRiderFilter(rs.rider?._id); setStatusFilter("pending,confirmed"); setShowUnassigned(false); }}
                                                        className="hover:bg-gray-50 rounded py-1 transition-colors cursor-pointer"
                                                    >
                                                        <p className="text-lg font-bold text-amber-600">{rs.pending}</p>
                                                        <p className="text-[10px] text-gray-400">Pending</p>
                                                    </button>
                                                </div>

                                                {rs.cashCollected > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm">
                                                        <span className="text-gray-500">Cash Collected</span>
                                                        <span className="font-bold text-gray-800">₹{rs.cashCollected.toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                                    <Bike size={48} className="text-gray-200 mx-auto mb-3" />
                                    <p className="text-gray-500">No rider activity for this date</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
