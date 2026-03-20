import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../../shared/utils/queryClient";
import { getDeliveryDashboard, getDeliveryOrders, bulkAssignRider, bulkUpdateStatus, generateOrdersForDate } from "../../shared/api/delivery";
import { getAllRiders } from "../../shared/api/riders";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
    Truck, Package, CheckCircle2, Clock, XCircle, AlertTriangle,
    Users, MapPin, ChevronLeft, ChevronRight, ChevronDown, Send, UserPlus,
    IndianRupee, TrendingUp, Filter, RefreshCw, Eye, Bike, Zap, Warehouse,
    MoreVertical, FileText, Edit3, ExternalLink, ArrowLeftRight, Phone,
    ClipboardList, CheckSquare
} from "lucide-react";
import React from "react";
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
    const [ordersSubTab, setOrdersSubTab] = useState("deliveries"); // deliveries | packing | recon | note | payment
    const [statusFilter, setStatusFilter] = useState("");
    const [riderFilter, setRiderFilter] = useState("");
    const [showUnassigned, setShowUnassigned] = useState(false);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [assignRiderId, setAssignRiderId] = useState("");
    const [expandedHubs, setExpandedHubs] = useState({});
    const [expandedRiders, setExpandedRiders] = useState({});

    const ObjectToggler = (setter, key) => {
        setter(prev => ({ ...prev, [key]: prev[key] === false ? true : false })); 
    };

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

    // --- Left Nav Grouping (Hub -> Riders) ---
    const leftNavData = useMemo(() => {
        const hubs = {};
        const allRiderStats = dash.riderStats || [];
        allRiderStats.forEach(rs => {
            let hubId = rs.rider?.hub?._id || "unassigned";
            let hubName = rs.rider?.hub?.name || "Unassigned";
            if (!hubs[hubId]) hubs[hubId] = { id: hubId, name: hubName, riders: [] };
            hubs[hubId].riders.push(rs);
        });
        return hubs;
    }, [dash.riderStats]);

    // --- Packing List Calculation ---
    const packingList = useMemo(() => {
        const pList = {};
        orders.forEach(order => {
            order.products?.forEach(p => {
                const prod = p.product;
                if (!prod) return;
                const pId = prod._id || prod;
                const pName = prod.name;
                const pUnit = prod.unit || "";
                const key = `${pId}_${pUnit}`;
                if (!pList[key]) {
                    pList[key] = { id: pId, name: pName, unit: pUnit, count: 0 };
                }
                pList[key].count += (p.quantity || 0);
            });
        });
        return Object.values(pList).sort((a, b) => a.name.localeCompare(b.name));
    }, [orders]);

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
                                            {dash.paymentBreakdown?.map(pb => (
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

                    {/* ===== ROUTES & DELIVERIES SPLIT TAB ===== */}
                    {activeTab === "orders" && (
                        <div className="flex flex-col lg:flex-row gap-6">
                            
                            {/* --- LEFT PANE: Active Routes & Drivers --- */}
                            <div className="lg:w-[380px] flex-shrink-0 space-y-4">
                                <div className="flex bg-[#fcf9f5] items-center justify-between py-2 px-1 border-b-2 border-teal-500">
                                    <h2 className="text-lg font-bold text-gray-800">Active Routes & Drivers</h2>
                                    <button className="px-4 py-1.5 border border-gray-300 rounded-full text-xs font-medium bg-white text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
                                        Filter
                                    </button>
                                </div>
                                
                                <div className="space-y-6">
                                    {Object.values(leftNavData).map(hub => (
                                        <div key={hub.id}>
                                            {hub.id !== "unassigned" && (
                                                <div className="flex items-center gap-2 mb-3 bg-gray-100/50 py-1 px-3 rounded-lg">
                                                    <Warehouse size={14} className="text-teal-600"/>
                                                    <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{hub.name}</h3>
                                                </div>
                                            )}
                                            
                                            <div className="space-y-3">
                                                {hub.riders.map(rs => {
                                                    const rate = rs.total > 0 ? ((rs.delivered / rs.total) * 100) : 0;
                                                    const isCompleted = rs.total > 0 && rs.delivered === rs.total;
                                                    const isSelected = riderFilter === rs.rider?._id;
                                                    
                                                    return (
                                                        <div 
                                                            key={rs._id} 
                                                            onClick={() => { setRiderFilter(rs.rider?._id); setShowUnassigned(false); }}
                                                            className={`rounded-2xl border bg-white p-5 cursor-pointer relative shadow-sm transition-all duration-200 
                                                                ${isSelected ? 'border-r-4 border-r-teal-500 border-t-transparent border-l-transparent border-b-transparent shadow-md' : 'border-gray-200 hover:border-teal-200'}`}
                                                        >
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-[50px] h-[50px] rounded-full overflow-hidden bg-gradient-to-br from-[#77db77] to-[#40a940] text-white flex items-center justify-center font-bold text-2xl shadow-inner">
                                                                        {rs.rider?.name?.charAt(0) || "?"}
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <h4 className="font-bold text-teal-800 text-lg leading-tight">{rs.rider?.name}</h4>
                                                                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold shadow-sm ${isCompleted ? 'bg-[#19c786] text-white' : 'bg-[#fba379] text-white'}`}>
                                                                                {isCompleted ? 'Completed' : 'Pending'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-sm text-gray-600 mt-1 flex flex-col gap-1">
                                                                            <span className="flex items-center gap-1.5"><Phone size={12}/> {rs.rider?.mobile}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <button className="text-gray-400 hover:text-gray-600"><MoreVertical size={16}/></button>
                                                            </div>

                                                            <div className="mt-5">
                                                                <div className="flex justify-between items-end mb-1.5">
                                                                    <span className="text-[11px] text-gray-500 font-medium">Completion Progress</span>
                                                                    <span className="text-sm font-bold text-gray-800">{Math.round(rate)}%</span>
                                                                </div>
                                                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                                    <div className="bg-[#1cc098] h-1.5 rounded-full" style={{ width: `${rate}%` }}></div>
                                                                </div>
                                                            </div>

                                                            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between tracking-tight">
                                                                <div className="text-center flex-1">
                                                                    <p className="text-[9px] text-gray-500 font-bold uppercase">Scheduled</p>
                                                                    <p className="font-bold text-gray-800 text-lg leading-none mt-1">{rs.total}</p>
                                                                </div>
                                                                <div className="w-px h-8 bg-gray-200 mx-1 mt-1"></div>
                                                                <div className="text-center flex-1">
                                                                    <p className="text-[9px] text-gray-500 font-bold uppercase">Delivered</p>
                                                                    <p className="font-bold text-[#1cc098] text-lg leading-none mt-1">{rs.delivered}</p>
                                                                </div>
                                                                <div className="w-px h-8 bg-gray-200 mx-1 mt-1"></div>
                                                                <div className="text-center flex-1">
                                                                    <p className="text-[9px] text-gray-500 font-bold uppercase">Pending</p>
                                                                    <p className="font-bold text-[#f27424] text-lg leading-none mt-1">{rs.pending}</p>
                                                                </div>
                                                                <div className="w-px h-8 bg-gray-200 mx-1 mt-1"></div>
                                                                <div className="text-center flex-1">
                                                                    <p className="text-[9px] text-gray-500 font-bold uppercase">Canceled</p>
                                                                    <p className="font-bold text-[#f27424] text-lg leading-none mt-1">0</p>
                                                                </div>
                                                                <div className="w-px h-8 bg-gray-200 mx-1 mt-1"></div>
                                                                <div className="text-center flex-1">
                                                                    <p className="text-[9px] text-gray-500 font-bold uppercase">Cash Collecton</p>
                                                                    <p className="font-bold text-[#1cc098] text-[15px] leading-none mt-1.5">Rs{rs.cashCollected}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* --- RIGHT PANE: Delivery List --- */}
                            <div className="flex-1 bg-[#fcf9f5] rounded-tl-xl rounded-bl-xl border-l-[3px] border-[#2980b9] shadow-sm flex flex-col min-h-[600px] overflow-hidden">
                                {riderFilter ? (
                                    <div className="flex flex-col h-full bg-[#eeebeb]">
                                        <div className="bg-[#177a66] text-white p-4 flex justify-between items-center rounded-tr-xl">
                                            <h2 className="text-lg font-extrabold uppercase tracking-wide flex items-center gap-2">
                                                DELIVERIES FOR {dash.riderStats?.find(r => r.rider?._id === riderFilter)?.rider?.name || 'Rider'} 
                                                <ExternalLink size={16} className="text-white/80 cursor-pointer"/>
                                            </h2>
                                            <button className="bg-[#243447] text-white p-2 rounded-lg hover:bg-opacity-80 transition-colors shadow-sm">
                                                <FileText size={16}/>
                                            </button>
                                        </div>
                                        
                                        <div className="bg-white border-b border-gray-200">
                                            <div className="flex overflow-x-auto no-scrollbar">
                                                <button 
                                                    onClick={() => setOrdersSubTab("deliveries")}
                                                    className={`px-6 py-3 font-semibold transition-all ${ordersSubTab === "deliveries" ? 'text-gray-900 border-b-[3px] border-[#1cc098] bg-[#f9fafb]' : 'text-gray-500 hover:text-teal-600'}`}
                                                >
                                                    Deliveries
                                                </button>
                                                <button 
                                                    onClick={() => setOrdersSubTab("packing")}
                                                    className={`px-6 py-3 font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${ordersSubTab === "packing" ? 'text-gray-900 border-b-[3px] border-[#1cc098] bg-[#f9fafb]' : 'text-gray-500 hover:text-teal-600'}`}
                                                >
                                                    <ClipboardList size={16}/> Packing List
                                                </button>
                                                <button className="px-6 py-3 font-semibold text-gray-500 hover:text-teal-600 transition-colors whitespace-nowrap">Delivery Recon</button>
                                                <button className="px-6 py-3 font-semibold text-gray-500 hover:text-teal-600 transition-colors whitespace-nowrap">Delivery Note</button>
                                                <button className="px-6 py-3 font-semibold text-gray-500 hover:text-teal-600 transition-colors whitespace-nowrap">Payment</button>
                                            </div>
                                        </div>

                                        <div className="p-4 flex-1">
                                            {ordersLoading && orders.length === 0 ? (
                                                <div className="text-center py-20 text-gray-400">Loading details...</div>
                                            ) : (ordersSubTab === "packing") ? (
                                                /* --- PACKING LIST VIEW --- */
                                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                                        <div className="bg-[#f0f9f6] px-6 py-4 border-b border-[#dcf4e8] flex justify-between items-center">
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-[#1cc098] text-white p-2 rounded-lg">
                                                                    <Package size={20}/>
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-bold text-gray-800">Route Load sheet</h3>
                                                                    <p className="text-xs text-teal-600 font-medium tracking-tight uppercase">Daily Packing Totals</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs text-gray-400 font-bold uppercase">Total Items</p>
                                                                <p className="text-xl font-black text-[#177a66]">{packingList.reduce((sum, i) => sum + i.count, 0)}</p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="p-0">
                                                            <table className="w-full">
                                                                <thead>
                                                                    <tr className="bg-gray-50/50 text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                                                        <th className="px-8 py-4 text-left">Product / SKU</th>
                                                                        <th className="px-6 py-4 text-right">Unit</th>
                                                                        <th className="px-8 py-4 text-right">Total Quantity</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-50">
                                                                    {packingList.length === 0 ? (
                                                                        <tr>
                                                                            <td colSpan="3" className="px-8 py-12 text-center text-gray-400 italic">No products found for this route.</td>
                                                                        </tr>
                                                                    ) : packingList.map((item, idx) => (
                                                                        <tr key={idx} className="hover:bg-teal-50/30 transition-colors group">
                                                                            <td className="px-8 py-4 font-bold text-gray-800 text-[15px] group-hover:text-teal-700">
                                                                                {item.name}
                                                                            </td>
                                                                            <td className="px-6 py-4 text-right">
                                                                                <span className="bg-gray-100 px-2.5 py-1 rounded text-xs font-bold text-gray-500 uppercase">{item.unit || 'nos'}</span>
                                                                            </td>
                                                                            <td className="px-8 py-4 text-right">
                                                                                <span className="text-xl font-black text-teal-600">{item.count}</span>
                                                                                <span className="ml-1 text-[11px] text-teal-400 font-bold uppercase tracking-tight">{item.unit || 'nos'}</span>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        
                                                        <div className="bg-gray-50 p-6 border-t border-gray-100 flex justify-between items-center">
                                                            <div className="flex items-center gap-2 text-gray-400">
                                                                <CheckSquare size={16}/>
                                                                <span className="text-xs font-medium">Verified by Warehouse Manager</span>
                                                            </div>
                                                            <button className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-white hover:text-teal-600 hover:border-teal-200 transition-all shadow-sm">
                                                                <FileText size={14}/> Print Load Sheet
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : ordersSubTab === "deliveries" ? (
                                                /* --- ORIGINAL DELIVERIES VIEW --- */
                                                <div className="space-y-4">
                                                    {orders.map(order => (
                                                        <div key={order._id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden pb-4">
                                                            <div className="px-5 py-4 flex gap-4">
                                                                <div className="pt-0.5">
                                                                    <div className="w-[22px] h-[22px] border-2 border-gray-400 rounded-sm cursor-pointer flex items-center justify-center hover:border-teal-500">
                                                                        {selectedOrders.includes(order._id) && <div className="w-[14px] h-[14px] bg-teal-500"></div>}
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            <h3 className="text-[17px] font-bold text-gray-900 inline-flex items-center gap-2">
                                                                                {order.customer?.name || "Unknown Customer"}
                                                                                <span className="bg-[#24bcd3] text-white text-[10px] px-2 py-[2px] rounded-full font-bold">{order.customer?.routeId || order._id.slice(-3)}</span>
                                                                            </h3>
                                                                            <p className="text-[13px] text-[#697f8c] mt-0.5 tracking-tight truncate max-w-[300px]">
                                                                                {order.customer?.address?.fullAddress || "No detailed address provided"}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-3 text-gray-600">
                                                                            <span className="text-[13px]">Mobile: <Eye size={18} className="inline ml-1 hover:text-teal-600 cursor-pointer"/></span>
                                                                            <Edit3 size={18} className="text-[#3c4b57] hover:text-teal-600 cursor-pointer"/>
                                                                        </div>
                                                                    </div>

                                                                    {/* Products List */}
                                                                    <div className="mt-5 space-y-4">
                                                                        {order.products?.map((p, i) => (
                                                                            <div key={i} className="bg-[#f0f6f4] rounded-lg">
                                                                                <div className="p-4 flex items-center justify-between">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <div className="w-[42px] h-[42px] bg-[#dcf4e8] rounded-md text-[#177a66] flex items-center justify-center flex-shrink-0">
                                                                                            <Package size={22}/>
                                                                                        </div>
                                                                                        <div>
                                                                                            <h4 className="font-bold text-black text-[15px]">{p.product?.name}</h4>
                                                                                            <div className="flex items-center gap-4 mt-1">
                                                                                                <div className="flex items-center gap-2 text-[13px] font-bold text-[#1cc098]">
                                                                                                    <span>{p.quantity} {p.product?.unit}</span>
                                                                                                    <span className="text-gray-800">→</span>
                                                                                                    <span>{p.quantity} {p.product?.unit}</span>
                                                                                                </div>
                                                                                                <span className="bg-[#b3b9bd] text-white text-[9px] px-2.5 py-[3px] rounded-full font-bold uppercase shadow-sm tracking-wider">Daily</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    
                                                                                    <div className="flex items-center gap-6">
                                                                                        <span className={`${order.status === 'delivered' ? 'bg-[#cbf4db] text-[#1e7647]' : 'bg-gray-200 text-gray-600'} px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm`}>
                                                                                            {order.status}
                                                                                        </span>
                                                                                        
                                                                                        {order.status !== 'delivered' && (
                                                                                            <div className="text-right">
                                                                                                <p className="text-[13px] text-gray-500">Bottles:</p>
                                                                                                <p className="font-bold text-gray-900 text-sm">{order.bottlesIssued || 0}</p>
                                                                                            </div>
                                                                                        )}
                                                                                        
                                                                                        <div className="flex items-center gap-1.5 text-[#1cc098] font-bold text-xs whitespace-nowrap">
                                                                                            <Clock size={14}/> {format(new Date(order.createdAt), "hh:mm a")}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="bg-[#dcf4e8]/60 border-t border-[#cbf4db] px-4 py-2 flex justify-between items-center text-[11px] rounded-b-lg font-bold">
                                                                                    <a href="#" className="flex items-center gap-1 text-[#1cc098] hover:text-teal-700 uppercase tracking-wide">
                                                                                        <MapPin size={12}/> View on Map <ExternalLink size={10}/>
                                                                                    </a>
                                                                                    <span className="flex items-center gap-1 text-[#1cc098]">
                                                                                        <ArrowLeftRight size={12}/> Distance: <span className="font-extrabold text-[#177a66]">-- m</span> from customer
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12 text-center">
                                        <Bike size={56} className="mb-4 text-gray-300"/>
                                        <h3 className="text-xl font-bold text-gray-500 mb-2">No Rider Selected</h3>
                                        <p className="text-[15px] text-gray-400 max-w-md">Click on a driver card from the active routes panel to view their itemized delivery checklist and performance.</p>
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
                                    {(dash.riderStats || []).map(rs => {
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
