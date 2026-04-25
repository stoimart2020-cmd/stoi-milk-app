import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../../shared/utils/queryClient";
import { getDeliveryDashboard, getDeliveryOrders, bulkAssignRider, bulkUpdateStatus, generateOrdersForDate } from "../../shared/api/delivery";
import { axiosInstance } from "../../shared/api/axios";
import { getAllRiders } from "../../shared/api/riders";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
    Truck, Package, CheckCircle2, Clock, XCircle, AlertTriangle,
    Users, MapPin, ChevronLeft, ChevronRight, ChevronDown, Send, UserPlus,
    IndianRupee, TrendingUp, Filter, RefreshCw, Eye, Bike, Zap, Warehouse,
    MoreVertical, FileText, Edit3, ExternalLink, ArrowLeftRight, Phone,
    ClipboardList, CheckSquare, Printer, FileSpreadsheet, GlassWater
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
    const [ordersSubTab, setOrdersSubTab] = useState("deliveries"); // deliveries | packing | recon | note | payment
    const [statusFilter, setStatusFilter] = useState("");
    const [riderFilter, setRiderFilter] = useState("");
    const [showUnassigned, setShowUnassigned] = useState(false);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [assignRiderId, setAssignRiderId] = useState("");
    const [expandedHubs, setExpandedHubs] = useState({});
    const [expandedRiders, setExpandedRiders] = useState({});
    const [productDrilldown, setProductDrilldown] = useState(null); // { productId, productName, statusFilter }
    const [paymentDrilldown, setPaymentDrilldown] = useState(false);
    const [assignmentType, setAssignmentType] = useState("today"); // today | permanent | temporary
    const [endDate, setEndDate] = useState("");
    const [visiblePhoneIds, setVisiblePhoneIds] = useState([]);
    const [editOrder, setEditOrder] = useState(null);

    const ObjectToggler = (setter, key) => {
        setter(prev => ({ ...prev, [key]: prev[key] === false ? true : false })); 
    };

    const togglePhoneVisibility = (id) => {
        setVisiblePhoneIds(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
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
        mutationFn: (payload) => bulkAssignRider({ 
            ...payload, 
            date: selectedDate,
            assignmentType,
            endDate: assignmentType === 'temporary' ? endDate : null
        }),
        onSuccess: (data) => {
            toast.success(data.message);
            setSelectedOrders([]);
            setAssignRiderId("");
            setAssignmentType("today");
            setEndDate("");
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

    // --- Product drilldown customer list ---
    const drilldownCustomers = useMemo(() => {
        if (!productDrilldown) return [];
        const { productId, statusFilter: sf } = productDrilldown;
        const statusList = sf === 'scheduled' ? [] : sf === 'pending' ? ['pending', 'confirmed'] : [sf];
        return orders.filter(order => {
            const hasProduct = order.products?.some(p => {
                const pid = p.product?._id || p.product;
                return pid === productId || pid?.toString() === productId;
            });
            if (!hasProduct) return false;
            if (sf === 'scheduled') return true;
            return statusList.includes(order.status);
        }).map(order => {
            const matchedProduct = order.products?.find(p => {
                const pid = p.product?._id || p.product;
                return pid === productId || pid?.toString() === productId;
            });
            const addr = order.customer?.address;
            const addressStr = typeof addr === 'string' ? addr : (addr?.fullAddress || [addr?.houseNo, addr?.floor, addr?.landmark, addr?.area].filter(Boolean).join(', ') || '');
            return {
                orderId: order.orderId,
                customerId: order.customer?._id,
                customer: order.customer?.name || 'Unknown',
                phone: order.customer?.mobile || order.customer?.phone || '',
                address: addressStr,
                area: order.customer?.area?.name || '',
                qty: matchedProduct?.quantity || 0,
                status: order.status,
            };
        });
    }, [productDrilldown, orders]);

    const paymentCustomers = useMemo(() => {
        if (!paymentDrilldown) return [];
        return orders.filter(o => o.status === 'delivered' && ['CASH', 'Cash'].includes(o.paymentMode)).map(o => ({
            orderId: o.orderId,
            customerId: o.customer?._id,
            customer: o.customer?.name || 'Unknown',
            phone: o.customer?.mobile || o.customer?.phone || '',
            amount: o.totalAmount || 0,
            rider: o.assignedRider?.name || 'Unassigned'
        }));
    }, [paymentDrilldown, orders]);

    // --- PDF Sheet Generators ---
    const fetchAllOrders = async () => {
        const params = { date: selectedDate, limit: 999 };
        if (filters.hub) params.hub = filters.hub;
        if (filters.area) params.area = filters.area;
        if (filters.city) params.city = filters.city;
        const res = await getDeliveryOrders(params);
        return res?.result || [];
    };

    const openPrintWindow = (title, bodyHtml) => {
        const w = window.open('', '_blank');
        w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #333; font-size: 12px; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            .meta { color: #888; font-size: 11px; margin-bottom: 16px; }
            .rider-block { margin-bottom: 20px; page-break-inside: avoid; }
            .rider-header { background: #177a66; color: white; padding: 8px 12px; font-weight: bold; font-size: 13px; border-radius: 4px 4px 0 0; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
            th { background: #f5f5f5; text-align: left; padding: 5px 8px; font-size: 10px; text-transform: uppercase; color: #777; border-bottom: 2px solid #ddd; }
            td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
            .total-row td { font-weight: bold; background: #f9f9f9; border-top: 2px solid #ccc; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            @media print { .no-print { display: none; } .rider-block { page-break-inside: avoid; } }
        </style></head><body>
        <button class="no-print" onclick="window.print()" style="position:fixed;top:10px;right:10px;padding:8px 16px;background:#177a66;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">Print / Save PDF</button>
        ${bodyHtml}</body></html>`);
        w.document.close();
    };

    const generateRouteSheet = async () => {
        try {
            toast.loading('Generating Route Sheet...', { id: 'route-sheet' });
            const allOrders = await fetchAllOrders();
            const riderGroups = {};
            allOrders.forEach(o => {
                const rName = o.assignedRider?.name || 'Unassigned';
                const rId = o.assignedRider?._id || 'unassigned';
                if (!riderGroups[rId]) riderGroups[rId] = { name: rName, phone: o.assignedRider?.mobile || '', orders: [] };
                riderGroups[rId].orders.push(o);
            });

            let html = `<h1>🚚 Route Sheet</h1><p class="meta">${format(new Date(selectedDate), "EEEE, dd MMMM yyyy")} • ${allOrders.length} orders</p>`;
            let isFirst = true;
            Object.values(riderGroups).forEach(group => {
                const prodSummary = {};
                group.orders.forEach(o => {
                    if (o.status === 'cancelled') return;
                    o.products?.forEach(p => {
                        const pName = p.product?.name || 'Unknown';
                        prodSummary[pName] = (prodSummary[pName] || 0) + (p.quantity || 0);
                    });
                });
                const summaryStr = Object.entries(prodSummary).map(([name, qty]) => `<strong>${qty}</strong> × ${name}`).join(' &nbsp;|&nbsp; ');

                html += `<div class="rider-block" style="${isFirst ? '' : 'page-break-before:always;'}">
                    <div class="rider-header"><span>${group.name}</span><span>${group.phone} • ${group.orders.length} deliveries</span></div>
                    ${summaryStr ? `<div style="background:#e8f4f1; padding:8px 12px; font-size:11px; border:1px solid #c1e2db; border-top:none; margin-bottom:8px; border-radius:0 0 4px 4px; color:#136252;"><strong>Load Summary:</strong> ${summaryStr}</div>` : ''}
                    <table><thead><tr><th>#</th><th>Customer</th><th>Address</th><th>Products</th><th class="text-center">Status</th></tr></thead><tbody>`;
                group.orders.forEach((o, i) => {
                    const addr = o.customer?.address;
                    const addrStr = typeof addr === 'string' ? addr : (addr?.fullAddress || [addr?.houseNo, addr?.floor, addr?.landmark].filter(Boolean).join(', ') || '');
                    const prods = o.products?.map(p => `${p.product?.name || 'Product'} × ${p.quantity}`).join(', ') || '-';
                    html += `<tr>
                        <td>${i + 1}</td>
                        <td><strong>${o.customer?.name || 'Unknown'}</strong><br/><span style="color:#888;font-size:10px">${o.customer?.mobile || ''}</span></td>
                        <td style="max-width:200px">${addrStr}</td>
                        <td>${prods}</td>
                        <td class="text-center"><span style="padding:2px 6px;border-radius:10px;font-size:10px;background:${o.status === 'delivered' ? '#d1fae5' : o.status === 'cancelled' ? '#fee2e2' : '#fef3c7'}">${o.status}</span></td>
                    </tr>`;
                });
                html += `</tbody></table></div>`;
                isFirst = false;
            });
            openPrintWindow(`Route Sheet - ${selectedDate}`, html);
            toast.success('Route Sheet ready!', { id: 'route-sheet' });
        } catch (err) {
            toast.error('Failed to generate Route Sheet', { id: 'route-sheet' });
        }
    };

    const generateDespatchSheet = async () => {
        try {
            toast.loading('Generating Despatch Sheet...', { id: 'despatch-sheet' });
            const allOrders = await fetchAllOrders();
            const riderGroups = {};
            allOrders.filter(o => o.status !== 'cancelled').forEach(o => {
                const rName = o.assignedRider?.name || 'Unassigned';
                const rId = o.assignedRider?._id || 'unassigned';
                if (!riderGroups[rId]) riderGroups[rId] = { name: rName, products: {}, orderCount: 0 };
                riderGroups[rId].orderCount++;
                o.products?.forEach(p => {
                    const pName = p.product?.name || 'Unknown';
                    const pUnit = p.product?.unit || '';
                    const key = pName;
                    if (!riderGroups[rId].products[key]) riderGroups[rId].products[key] = { name: pName, unit: pUnit, qty: 0 };
                    riderGroups[rId].products[key].qty += p.quantity || 0;
                });
            });

            // Grand totals
            const grandTotals = {};
            Object.values(riderGroups).forEach(g => {
                Object.values(g.products).forEach(p => {
                    if (!grandTotals[p.name]) grandTotals[p.name] = { name: p.name, unit: p.unit, qty: 0 };
                    grandTotals[p.name].qty += p.qty;
                });
            });

            let html = `<h1>📦 Despatch Sheet</h1><p class="meta">${format(new Date(selectedDate), "EEEE, dd MMMM yyyy")} • ${allOrders.length} orders • ${Object.keys(riderGroups).length} riders</p>`;

            // Grand Total Summary
            html += `<div class="rider-block"><div class="rider-header" style="background:#2c3e50"><span>GRAND TOTAL</span></div>
                <table><thead><tr><th>Product</th><th class="text-center">Total Qty</th></tr></thead><tbody>`;
            Object.values(grandTotals).forEach(p => {
                html += `<tr><td><strong>${p.name}</strong></td><td class="text-center"><strong>${p.qty}</strong> ${p.unit}</td></tr>`;
            });
            html += `</tbody></table></div>`;

            // Per rider
            Object.values(riderGroups).forEach(group => {
                html += `<div class="rider-block">
                    <div class="rider-header"><span>${group.name}</span><span>${group.orderCount} orders</span></div>
                    <table><thead><tr><th>Product</th><th class="text-center">Qty</th></tr></thead><tbody>`;
                Object.values(group.products).forEach(p => {
                    html += `<tr><td>${p.name}</td><td class="text-center"><strong>${p.qty}</strong> ${p.unit}</td></tr>`;
                });
                html += `</tbody></table></div>`;
            });
            openPrintWindow(`Despatch Sheet - ${selectedDate}`, html);
            toast.success('Despatch Sheet ready!', { id: 'despatch-sheet' });
        } catch (err) {
            toast.error('Failed to generate Despatch Sheet', { id: 'despatch-sheet' });
        }
    };

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

            {/* ===== PRODUCT DELIVERIES + ACTION TILES ===== */}
            {!dashLoading && (
                <div className="flex flex-col lg:flex-row gap-4">
                    {dash.productStats?.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex-1 min-w-0">
                    <div className="bg-gradient-to-r from-orange-400 to-orange-500 px-4 py-2 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-white">
                            <Package size={15} />
                            <h2 className="text-sm font-bold tracking-tight uppercase">Product Deliveries</h2>
                        </div>
                        <span className="text-white/80 text-[10px] font-medium">{format(new Date(selectedDate), "dd MMM yyyy")}</span>
                    </div>

                    <table className="w-full text-left">
                        <thead className="bg-gray-50/80 border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Product</th>
                                <th className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Scheduled</th>
                                <th className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Pending</th>
                                <th className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Delivered</th>
                                <th className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Cancelled</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-amber-50/40 border-b border-amber-100">
                                <td className="px-4 py-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-amber-400 flex items-center justify-center text-white"><ClipboardList size={12} /></div>
                                        <span className="font-bold text-gray-800 text-sm">All</span>
                                    </div>
                                </td>
                                <td className="px-3 py-2 text-center"><span className="text-sm font-bold text-gray-800">{stats.total}</span></td>
                                <td className="px-3 py-2 text-center"><span className="text-sm font-bold text-amber-600">{(stats.pending || 0) + (stats.confirmed || 0)}</span></td>
                                <td className="px-3 py-2 text-center"><span className="text-sm font-bold text-emerald-600">{stats.delivered || 0}</span></td>
                                <td className="px-3 py-2 text-center">
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${(stats.cancelled || 0) > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>{stats.cancelled || 0}</span>
                                </td>
                            </tr>
                            <tr><td colSpan="5" className="px-4 py-1">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-100 rounded-full h-1 overflow-hidden"><div className="bg-teal-500 h-full transition-all duration-700" style={{ width: `${completionRate}%` }}></div></div>
                                    <span className="text-[9px] font-bold text-gray-400">Completion {completionRate}%</span>
                                </div>
                            </td></tr>
                            {dash.productStats.map((ps, idx) => {
                                const pRate = ps.scheduled > 0 ? Math.round((ps.delivered / ps.scheduled) * 100) : 0;
                                return (
                                    <React.Fragment key={ps._id || idx}>
                                        <tr className="border-t border-gray-50 hover:bg-gray-50/50">
                                            <td className="px-4 py-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded bg-emerald-50 flex items-center justify-center text-emerald-500"><Package size={11} /></div>
                                                    <span className="font-semibold text-gray-700 text-xs">{ps.product?.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-1.5 text-center"><span className="text-sm font-bold text-gray-700 cursor-pointer hover:underline" onClick={() => { setProductDrilldown({ productId: ps._id, productName: ps.product?.name, statusFilter: 'scheduled' }); setPaymentDrilldown(false); }}>{ps.scheduled}</span></td>
                                            <td className="px-3 py-1.5 text-center"><span className="text-sm font-bold text-amber-500 cursor-pointer hover:underline" onClick={() => { setProductDrilldown({ productId: ps._id, productName: ps.product?.name, statusFilter: 'pending' }); setPaymentDrilldown(false); }}>{ps.pending}</span></td>
                                            <td className="px-3 py-1.5 text-center"><span className="text-sm font-bold text-emerald-600 cursor-pointer hover:underline" onClick={() => { setProductDrilldown({ productId: ps._id, productName: ps.product?.name, statusFilter: 'delivered' }); setPaymentDrilldown(false); }}>{ps.delivered}</span></td>
                                            <td className="px-3 py-1.5 text-center">
                                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold cursor-pointer hover:underline ${(ps.cancelled || 0) > 0 ? 'bg-red-50 text-red-400' : 'bg-emerald-50 text-emerald-400'}`} onClick={() => { setProductDrilldown({ productId: ps._id, productName: ps.product?.name, statusFilter: 'cancelled' }); setPaymentDrilldown(false); }}>{ps.cancelled || 0}</span>
                                            </td>
                                        </tr>
                                        <tr><td colSpan="5" className="px-4 pb-1">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-100 rounded-full h-[3px] overflow-hidden"><div className="bg-teal-500 h-full transition-all duration-700" style={{ width: `${pRate}%` }}></div></div>
                                                <span className="text-[8px] font-bold text-gray-400">{pRate}%</span>
                                            </div>
                                        </td></tr>
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                        </div>
                    )}

                    {/* Right: Action Tiles */}
                    <div className="grid grid-cols-2 gap-3 lg:w-[300px] flex-shrink-0 auto-rows-min">
                        <button onClick={generateRouteSheet} className="flex flex-col items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-4 hover:border-teal-300 hover:shadow-md transition-all group">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
                                <Printer size={18} />
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-gray-800 group-hover:text-teal-700 transition-colors">Route Sheet</p>
                                <p className="text-[9px] text-gray-400">Print routes</p>
                            </div>
                        </button>
                        <button onClick={generateDespatchSheet} className="flex flex-col items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-4 hover:border-indigo-300 hover:shadow-md transition-all group">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                                <FileSpreadsheet size={18} />
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">Despatch Sheet</p>
                                <p className="text-[9px] text-gray-400">Download list</p>
                            </div>
                        </button>
                        <div onClick={() => { setPaymentDrilldown(true); setProductDrilldown(null); setRiderFilter(""); setShowUnassigned(false); }} className="bg-white border border-gray-200 rounded-xl px-3 py-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all group">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-sm mb-2 group-hover:scale-105 transition-transform">
                                <IndianRupee size={18} />
                            </div>
                            <p className="text-[9px] text-gray-400 font-medium group-hover:text-emerald-700 transition-colors">Payment Collected</p>
                            <p className="text-lg font-bold text-gray-800">₹{(dash.totalPaymentCollected || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl px-3 py-4 flex flex-col items-center justify-center text-center">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-sm mb-2">
                                <GlassWater size={18} />
                            </div>
                            <p className="text-[9px] text-gray-400 font-medium">Bottles Pending</p>
                            <p className="text-lg font-bold text-gray-800">{dash.bottleStats?.pending || 0}</p>
                            <p className="text-[9px] text-gray-400">{dash.bottleStats?.issued || 0}↑ / {dash.bottleStats?.returned || 0}↓</p>
                        </div>
                    </div>
                </div>
            )}

            {dashLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="loading loading-spinner loading-lg text-teal-600"></div>
                </div>
            ) : (
                <div className="space-y-6">
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
                                                            onClick={() => { setRiderFilter(rs.rider?._id); setShowUnassigned(false); setProductDrilldown(null); setPaymentDrilldown(false); }}
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
                                                                    <p className="font-bold text-[#f27424] text-lg leading-none mt-1">{rs.cancelled || 0}</p>
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

                                {/* Unassigned Orders Card */}
                                {(stats.unassigned || 0) > 0 && (
                                    <div
                                        onClick={() => { setShowUnassigned(true); setRiderFilter(""); setProductDrilldown(null); setPaymentDrilldown(false); }}
                                        className={`rounded-2xl border p-5 cursor-pointer relative shadow-sm transition-all duration-200 
                                            ${showUnassigned && !riderFilter ? 'border-r-4 border-r-orange-500 border-t-transparent border-l-transparent border-b-transparent shadow-md bg-orange-50' : 'bg-white border-gray-200 hover:border-orange-200'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-white flex items-center justify-center font-bold text-xl shadow-inner">
                                                <AlertTriangle size={24} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold text-orange-700 text-lg leading-tight">Unassigned</h4>
                                                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold shadow-sm bg-red-500 text-white">
                                                        Action Needed
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500">Orders without a rider</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-orange-100 flex justify-center">
                                            <div className="text-center">
                                                <p className="text-[9px] text-gray-500 font-bold uppercase">Orders</p>
                                                <p className="font-bold text-orange-600 text-2xl leading-none mt-1">{stats.unassigned}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* --- RIGHT PANE: Delivery List --- */}
                            <div className="flex-1 bg-[#fcf9f5] rounded-tl-xl rounded-bl-xl border-l-[3px] border-[#2980b9] shadow-sm flex flex-col min-h-[600px] overflow-hidden">
                                {productDrilldown ? (
                                    <div className="flex flex-col h-full bg-[#eeebeb]">
                                        <div className="bg-[#2c3e50] text-white p-4 flex justify-between items-center rounded-tr-xl">
                                            <h2 className="text-lg font-extrabold uppercase tracking-wide flex items-center gap-2">
                                                <Package size={20} />
                                                {productDrilldown.productName}
                                                <span className="text-sm font-normal opacity-70 capitalize">• {productDrilldown.statusFilter === 'scheduled' ? 'All' : productDrilldown.statusFilter}</span>
                                            </h2>
                                            <button onClick={() => setProductDrilldown(null)} className="bg-white/10 text-white p-2 rounded-lg hover:bg-white/20 transition-colors">
                                                <XCircle size={16}/>
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto">
                                            {drilldownCustomers.length > 0 ? (
                                                <table className="w-full text-left">
                                                    <thead className="bg-gray-50 sticky top-0">
                                                        <tr>
                                                            <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">#</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Customer</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Address</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Qty</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {drilldownCustomers.map((c, i) => (
                                                            <tr key={i} className="hover:bg-gray-50/50">
                                                                <td className="px-4 py-2.5 text-xs text-gray-400 font-medium">{i + 1}</td>
                                                                <td className="px-4 py-2.5">
                                                                    <a href={`/administrator/dashboard/customers/${c.customerId}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-teal-700 hover:underline">{c.customer}</a>
                                                                    {c.phone && <p className="text-[10px] text-gray-400 mt-0.5">{c.phone}</p>}
                                                                </td>
                                                                <td className="px-4 py-2.5">
                                                                    <p className="text-xs text-gray-600 max-w-[200px] truncate">{c.address || c.area || '—'}</p>
                                                                </td>
                                                                <td className="px-4 py-2.5 text-center">
                                                                    <span className="text-sm font-bold text-gray-800">{c.qty}</span>
                                                                </td>
                                                                <td className="px-4 py-2.5 text-center">
                                                                    <StatusBadge status={c.status} />
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-gray-50 border-t border-gray-100">
                                                        <tr>
                                                            <td colSpan="3" className="px-4 py-2.5 text-xs font-bold text-gray-500">Total</td>
                                                            <td className="px-4 py-2.5 text-center text-sm font-bold text-teal-700">{drilldownCustomers.reduce((s, c) => s + c.qty, 0)}</td>
                                                            <td></td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                                    <Package size={40} className="mb-3 text-gray-300" />
                                                    <p className="text-sm font-medium">No matching orders found</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : paymentDrilldown ? (
                                    <div className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                                        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 flex items-center justify-between shadow-sm relative z-10">
                                            <div className="flex items-center gap-3 text-white">
                                                <div className="p-1.5 bg-white/20 rounded-lg"><IndianRupee size={16} /></div>
                                                <div>
                                                    <h2 className="text-sm font-bold tracking-tight">Cash Payments Collected</h2>
                                                    <p className="text-[10px] text-emerald-100 font-medium">{paymentCustomers.length} Customers</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setPaymentDrilldown(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"><XCircle size={16} /></button>
                                        </div>
                                        <div className="overflow-y-auto flex-1 p-0">
                                            {paymentCustomers.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                                                    <IndianRupee size={32} className="opacity-20 mb-3" />
                                                    <p className="text-sm">No cash payments collected.</p>
                                                </div>
                                            ) : (
                                                <table className="w-full text-left">
                                                    <thead className="bg-emerald-50/50 border-b border-emerald-100 sticky top-0 backdrop-blur-sm">
                                                        <tr>
                                                            <th className="px-4 py-2 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">#</th>
                                                            <th className="px-4 py-2 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Customer</th>
                                                            <th className="px-4 py-2 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Rider</th>
                                                            <th className="px-4 py-2 text-[10px] font-bold text-emerald-600 uppercase tracking-wider text-right">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {paymentCustomers.map((c, i) => (
                                                            <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                                                                <td className="px-4 py-2.5 text-xs text-gray-400 font-medium">{i + 1}</td>
                                                                <td className="px-4 py-2.5">
                                                                    <a href={`/administrator/dashboard/customers/${c.customerId}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-teal-700 hover:underline">{c.customer}</a>
                                                                    {c.phone && <p className="text-[10px] text-gray-400 mt-0.5">{c.phone}</p>}
                                                                </td>
                                                                <td className="px-4 py-2.5">
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">{c.rider}</span>
                                                                </td>
                                                                <td className="px-4 py-2.5 text-right font-bold text-emerald-600 text-sm">
                                                                    ₹{c.amount}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                ) : (riderFilter || showUnassigned) ? (
                                    <div className="flex flex-col h-full bg-[#eeebeb]">
                                        <div className={`${showUnassigned && !riderFilter ? 'bg-orange-600' : 'bg-[#177a66]'} text-white p-4 flex justify-between items-center rounded-tr-xl`}>
                                            <h2 className="text-lg font-extrabold uppercase tracking-wide flex items-center gap-2">
                                                {showUnassigned && !riderFilter ? (
                                                    <>
                                                        <AlertTriangle size={20} />
                                                        UNASSIGNED ORDERS ({orders.length})
                                                    </>
                                                ) : (
                                                    <>
                                                        DELIVERIES FOR {dash.riderStats?.find(r => r.rider?._id === riderFilter)?.rider?.name || 'Rider'}
                                                        <ExternalLink size={16} className="text-white/80 cursor-pointer"/>
                                                    </>
                                                )}
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
                                                    {selectedOrders.length > 0 && (
                                                        <div className="sticky top-0 z-20 bg-teal-50 border border-teal-100 rounded-xl p-4 shadow-sm animate-in slide-in-from-top-2 duration-300 flex flex-col md:flex-row items-center justify-between gap-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-teal-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-sm">
                                                                    {selectedOrders.length}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-teal-800 uppercase tracking-tight">Orders Selected</p>
                                                                    <button 
                                                                        onClick={() => setSelectedOrders([])}
                                                                        className="text-[10px] font-bold text-teal-600 hover:text-teal-800 underline uppercase tracking-widest"
                                                                    >
                                                                        Clear Selection
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex flex-col gap-4 w-full md:w-auto">
                                                                <div className="flex bg-white rounded-lg p-1 border border-teal-200 shadow-sm self-start">
                                                                    {[
                                                                        { id: 'today', label: 'Today Only' },
                                                                        { id: 'temporary', label: 'Temporary' },
                                                                        { id: 'permanent', label: 'Permanent' }
                                                                    ].map(t => (
                                                                        <button
                                                                            key={t.id}
                                                                            onClick={() => setAssignmentType(t.id)}
                                                                            className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all whitespace-nowrap ${assignmentType === t.id ? 'bg-teal-600 text-white shadow-sm' : 'text-teal-600 hover:bg-teal-50'}`}
                                                                        >
                                                                            {t.label}
                                                                        </button>
                                                                    ))}
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    {assignmentType === 'temporary' && (
                                                                        <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                                                                            <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Until:</span>
                                                                            <input 
                                                                                type="date" 
                                                                                value={endDate}
                                                                                onChange={(e) => setEndDate(e.target.value)}
                                                                                className="input input-bordered input-xs font-bold w-32 bg-white"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    <div className="relative flex-1 md:flex-none">
                                                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                                        <select 
                                                                            value={assignRiderId}
                                                                            onChange={(e) => setAssignRiderId(e.target.value)}
                                                                            className="select select-bordered select-sm pl-9 text-xs font-bold w-full md:w-56 bg-white"
                                                                        >
                                                                            <option value="">Select Rider to Assign</option>
                                                                            {riders.map(r => (
                                                                                <option key={r._id} value={r._id}>{r.name} ({r.hub?.name || 'No Hub'})</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => assignMutation.mutate({ orderIds: selectedOrders, riderId: assignRiderId })}
                                                                        disabled={!assignRiderId || assignMutation.isPending || (assignmentType === 'temporary' && !endDate)}
                                                                        className="btn btn-sm btn-primary gap-2 shadow-md px-6"
                                                                    >
                                                                        {assignMutation.isPending ? <RefreshCw size={14} className="animate-spin"/> : <UserPlus size={14}/>}
                                                                        Assign
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {orders.map(order => (
                                                        <div key={order._id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden pb-4">
                                                            <div className="px-5 py-4 flex gap-4">
                                                                <div className="pt-0.5">
                                                                    <div 
                                                                        onClick={() => toggleOrder(order._id)}
                                                                        className={`w-[22px] h-[22px] border-2 rounded-sm cursor-pointer flex items-center justify-center transition-colors ${selectedOrders.includes(order._id) ? 'border-teal-500 bg-teal-50' : 'border-gray-400 hover:border-teal-500'}`}
                                                                    >
                                                                        {selectedOrders.includes(order._id) && <div className="w-[14px] h-[14px] bg-teal-500 rounded-[1px]"></div>}
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            <h3 className="text-[17px] font-bold text-gray-900 inline-flex items-center gap-2">
                                                                                {order.customer?.name || "Unknown Customer"}
                                                                                <span className="bg-[#24bcd3] text-white text-[10px] px-2 py-[2px] rounded-full font-bold">{order.customer?.routeId || order._id.slice(-3)}</span>
                                                                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                                                                    order.orderType === 'ONE_TIME' ? 'bg-purple-100 text-purple-700' : 
                                                                                    order.orderType === 'SPOT_SALE' ? 'bg-amber-100 text-amber-700' : 
                                                                                    'bg-teal-100 text-teal-700'
                                                                                }`}>
                                                                                    {order.orderType === 'DELIVERY' ? 'Subscription' : order.orderType?.replace('_', ' ')}
                                                                                </span>
                                                                            </h3>
                                                                            <p className="text-[13px] text-[#697f8c] mt-0.5 tracking-tight truncate max-w-[300px]">
                                                                                {order.customer?.address?.fullAddress || "No detailed address provided"}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-3 text-gray-600">
                                                                            <span className="text-[13px]">
                                                                        Mobile: {visiblePhoneIds.includes(order._id) ? order.customer?.mobile : "********" + (order.customer?.mobile?.slice(-2) || "")}
                                                                        <Eye 
                                                                            size={18} 
                                                                            onClick={() => togglePhoneVisibility(order._id)}
                                                                            className={`inline ml-1 cursor-pointer transition-colors ${visiblePhoneIds.includes(order._id) ? 'text-teal-600' : 'text-gray-400 hover:text-teal-600'}`}
                                                                        />
                                                                    </span>
                                                                            <Edit3 
                                                                                size={18} 
                                                                                onClick={() => setEditOrder(order)}
                                                                                className="text-[#3c4b57] hover:text-teal-600 cursor-pointer"
                                                                            />
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
                                                                                                <span className={`text-[9px] px-2.5 py-[3px] rounded-full font-bold uppercase shadow-sm tracking-wider ${
                                                                                                    order.orderType === 'ONE_TIME' ? 'bg-purple-500 text-white' : 
                                                                                                    order.orderType === 'SPOT_SALE' ? 'bg-amber-500 text-white' : 
                                                                                                    'bg-[#1cc098] text-white'
                                                                                                }`}>
                                                                                                    {order.orderType === 'DELIVERY' ? 'Daily' : order.orderType?.split('_')[0]}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    
                                                                                    <div className="flex items-center gap-6">
                                                                                        <span className={`${order.status === 'delivered' ? 'bg-[#cbf4db] text-[#1e7647]' : 'bg-gray-200 text-gray-600'} px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm`}>
                                                                                            {order.status}
                                                                                        </span>
                                                                                        
                                                                                        <div className="flex flex-col items-end gap-1">
                                                                                            {order.status === 'delivered' ? (
                                                                                                <div className="text-right">
                                                                                                    <p className="text-[13px] text-gray-500">Collected:</p>
                                                                                                    <div className="flex items-center gap-2 font-bold text-[13px]">
                                                                                                        <span className="text-emerald-600">₹{order.cashCollected || 0}</span>
                                                                                                        <span className="text-gray-300">|</span>
                                                                                                        <span className="text-blue-600">{order.bottlesReturned || 0} Bot.</span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <div className="text-right">
                                                                                                    <p className="text-[13px] text-gray-500">Bottles to Collect:</p>
                                                                                                    <p className="font-bold text-gray-900 text-sm">{order.bottlesIssued || 0}</p>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                        
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
                </div>
            )}


            {/* --- PAYMENTS DRILLDOWN --- */}
            {paymentDrilldown && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-teal-800 p-5 flex items-center justify-between text-white">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight">Cash Payments Collected</h3>
                                <p className="text-xs text-teal-200 font-bold tracking-widest">{format(new Date(selectedDate), "dd MMMM, yyyy")}</p>
                            </div>
                            <button onClick={() => setPaymentDrilldown(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                                <ChevronDown size={20} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-3">
                                {paymentCustomers.length > 0 ? paymentCustomers.map((p, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 group hover:border-teal-200 hover:bg-white transition-all shadow-sm hover:shadow-md">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-black text-sm">
                                                {p.customerName[0]}
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900 group-hover:text-teal-600 transition-colors uppercase text-sm tracking-tight">{p.customerName}</p>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Bike size={10} /> {p.riderName}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-gray-900">₹{p.amount}</p>
                                            <p className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block uppercase tracking-widest">Collected</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <IndianRupee size={32} className="text-gray-300" />
                                        </div>
                                        <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">No cash payments collected yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
                            <button onClick={() => setPaymentDrilldown(false)} className="btn btn-ghost btn-sm font-black text-[10px] uppercase tracking-widest text-gray-500 hover:text-gray-800">Close Window</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ORDER EDIT MODAL --- */}
            {editOrder && <OrderEditModal order={editOrder} onClose={() => setEditOrder(null)} date={selectedDate} />}
        </div>
    );
};

// =============================================
// ORDER EDIT MODAL
// =============================================
const OrderEditModal = ({ order, onClose, date }) => {
    const [tab, setTab] = useState("deliveries"); // deliveries | payment
    const [search, setSearch] = useState("");
    const [editedProducts, setEditedProducts] = useState(
        order.products.map(p => ({
            ...p,
            deliveredQty: p.quantity,
            // Try to find if this product had returned bottles in a previous save
            // Backward compatibility: order.bottlesReturned could be a number
            collectedItems: typeof order.bottlesReturned === 'object' 
                ? (order.bottlesReturned[p.product._id || p.product] || 0)
                : (order.bottlesReturned || 0) 
        }))
    );
    const [paymentAmount, setPaymentAmount] = useState(order.cashCollected !== undefined ? order.cashCollected : order.totalAmount);
    const [paymentMode, setPaymentMode] = useState(order.paymentMode || "CASH");

    const updateMutation = useMutation({
        mutationFn: (payload) => {
            return axiosInstance.patch(`/api/orders/${order._id}/status`, payload);
        },
        onSuccess: (data) => {
            toast.success("Order updated successfully");
            queryClient.invalidateQueries({ queryKey: ["deliveryDashboard"] });
            queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
            onClose();
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to update order"),
    });

    const handleSave = () => {
        const payload = {
            status: "delivered", // Explicitly mark as delivered to trigger payment and bottle logic
            products: editedProducts.map(p => ({
                product: p.product._id || p.product,
                quantity: p.deliveredQty
            })),
            bottlesReturned: editedProducts.reduce((acc, p) => {
                const id = (p.product._id || p.product).toString();
                acc[id] = p.collectedItems;
                return acc;
            }, {}),
            cashAmount: tab === "payment" ? paymentAmount : 0,
            paymentMode: paymentMode
        };

        updateMutation.mutate(payload);
    };

    const filteredProducts = editedProducts.filter(p => 
        (p.product.name || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-teal-100">
                {/* Header */}
                <div className="bg-[#177a66] p-5 flex items-center justify-between text-white">
                    <div>
                        <h3 className="text-lg font-black tracking-tight">Customer Delivery And Payment (Date: {format(new Date(date), "dd MMMM, yyyy")})</h3>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all shadow-sm">
                        <XCircle size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 px-6 pt-4 bg-gray-50/50">
                    <button 
                        onClick={() => setTab("payment")}
                        className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${tab === "payment" ? "border-teal-600 text-teal-700 bg-white rounded-t-xl" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                    >
                        Add Payment
                    </button>
                    <button 
                        onClick={() => setTab("deliveries")}
                        className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${tab === "deliveries" ? "border-teal-600 text-teal-700 bg-white rounded-t-xl" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                    >
                        Deliveries
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {tab === "deliveries" ? (
                        <div className="space-y-6">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="Search Product" 
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="input input-bordered w-full h-10 text-sm bg-white border-teal-600/30 rounded-md focus:border-teal-600"
                                />
                            </div>

                            <div className="max-h-[40vh] overflow-y-auto space-y-6 pr-2">
                                {filteredProducts.map((p, idx) => (
                                    <div key={idx} className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-gray-100 pb-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-600 text-[15px]">{p.product.name}</p>
                                            <p className="text-[13px] text-gray-400">(Subscribed)</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="w-24">
                                                <label className="block text-[13px] font-bold text-teal-700 mb-2">Qty Ordered</label>
                                                <input 
                                                    type="number" 
                                                    value={p.quantity} 
                                                    disabled 
                                                    className="input input-bordered input-sm w-full bg-gray-100 text-sm font-bold rounded-md text-center h-10" 
                                                />
                                            </div>
                                            <div className="w-24">
                                                <label className="block text-[13px] font-bold text-teal-700 mb-2">Qty Delivered</label>
                                                <input 
                                                    type="number" 
                                                    value={p.deliveredQty} 
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        setEditedProducts(prev => prev.map((item, i) => i === idx ? { ...item, deliveredQty: val } : item));
                                                    }}
                                                    className="input input-bordered input-sm w-full text-sm font-bold bg-white rounded-md text-center h-10 border-teal-600/30" 
                                                />
                                            </div>
                                            <div className="w-24">
                                                <label className="block text-[13px] font-bold text-teal-700 mb-2">Item Collected</label>
                                                <input 
                                                    type="number" 
                                                    value={p.collectedItems} 
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        setEditedProducts(prev => prev.map((item, i) => i === idx ? { ...item, collectedItems: val } : item));
                                                    }}
                                                    className="input input-bordered input-sm w-full text-sm font-bold bg-white rounded-md text-center h-10 border-teal-600/30" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[13px] font-bold text-teal-700">Payment Amount (₹)</label>
                                    <input 
                                        type="number" 
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                        className="input input-bordered w-full h-12 text-lg font-bold bg-white border-teal-600/30 rounded-md focus:border-teal-600"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[13px] font-bold text-teal-700">Payment Mode</label>
                                    <select 
                                        value={paymentMode}
                                        onChange={(e) => setPaymentMode(e.target.value)}
                                        className="select select-bordered w-full h-12 font-bold rounded-md bg-white border-teal-600/30 focus:border-teal-600"
                                    >
                                        <option value="CASH">Cash</option>
                                        <option value="UPI">UPI</option>
                                        <option value="WALLET">Wallet</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-white flex items-center justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="btn bg-[#ff7b80] hover:bg-[#ff6b71] border-none text-white px-8 font-bold rounded-full gap-2"
                    >
                        <XCircle size={18} />
                        Close
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="btn bg-[#177a66] hover:bg-[#126151] border-none text-white px-10 font-bold rounded-md gap-2"
                    >
                        {updateMutation.isPending ? <RefreshCw size={18} className="animate-spin" /> : <CheckSquare size={18} />}
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};
