import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    User, Calendar, Search, RefreshCw, ChevronUp, ChevronDown,
    Eye, Edit, CheckCircle, XCircle, AlertCircle, Clock,
    TrendingUp, Activity, Users, ExternalLink
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getAllSubscriptions } from '../../shared/api/subscriptions';
import { getAllProducts } from '../../shared/api/products';
import { getAllRiders } from '../../shared/api/riders';
import { updateSubscription } from '../../shared/api/subscriptions';
import { EditSubscriptionModal } from '../subscriptions/EditSubscriptionModal';
import { toast } from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFilters } from '../../shared/context/FilterContext';

export const Subscriptions = ({ type = 'regular' }) => {
    const [search, setSearch] = useState("");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState(null);
    const queryClient = useQueryClient();
    const { filters: globalFilters } = useFilters();

    // Card-level filter (clicking on stat cards)
    const [cardFilter, setCardFilter] = useState("");

    // Column-level inline filters
    const [colFilters, setColFilters] = useState({
        subId: "",
        product: "",
        customerId: "",
        customerName: "",
        contact: "",
        email: "",
        frequency: "",
        quantity: "",
        altQty: "",
        status: "",
        deliveryBoy: "",
        area: "",
        hub: "",
        startDate: "",
        endDate: "",
    });

    // Sorting
    const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' });

    // Fetch subscriptions
    const { data: subsData, isLoading: loadingSubs, refetch, error } = useQuery({
        queryKey: ['adminSubscriptions', type, globalFilters],
        queryFn: () => getAllSubscriptions({ type, ...globalFilters }),
        staleTime: 30000,
        retry: false,
    });

    // Fetch products for filter dropdown
    const { data: productsData, isLoading: loadingProducts } = useQuery({
        queryKey: ['products'],
        queryFn: getAllProducts,
        staleTime: 60000,
    });

    // Fetch riders
    const { data: ridersData, isLoading: loadingRiders } = useQuery({
        queryKey: ['riders'],
        queryFn: getAllRiders,
        staleTime: 60000,
    });

    const subscriptions = subsData?.result || [];
    const products = productsData?.result || [];
    const riders = ridersData?.result || [];

    // Stats
    const stats = {
        total: subscriptions.length,
        active: subscriptions.filter(s => s.status === 'active').length,
        paused: subscriptions.filter(s => s.status === 'paused').length,
        cancelled: subscriptions.filter(s => s.status === 'cancelled').length,
        last30Days: subscriptions.filter(s => {
            const created = new Date(s.createdAt);
            const ago = new Date(); ago.setDate(ago.getDate() - 30);
            return created >= ago;
        }).length
    };

    // Filter logic (card + column + search)
    const filteredSubscriptions = useMemo(() => {
        return subscriptions.filter(sub => {
            // Global search
            const searchLower = search.toLowerCase();
            const matchesSearch = !search || [
                sub.user?.name, sub.user?.mobile, sub.user?.email,
                sub.product?.name, sub.subscriptionId?.toString(), sub.user?.customerId?.toString()
            ].some(v => (v || "").toLowerCase().includes(searchLower));

            // Card filter
            const matchesCard = !cardFilter || (
                cardFilter === 'last30' ? (() => {
                    const ago = new Date(); ago.setDate(ago.getDate() - 30);
                    return new Date(sub.createdAt) >= ago;
                })() : sub.status === cardFilter
            );

            // Column filters
            const cf = colFilters;
            const matchSubId = !cf.subId || (sub.subscriptionId?.toString() || sub._id?.slice(-6) || "").includes(cf.subId);
            const matchProduct = !cf.product || (sub.product?._id?.toString() === cf.product);
            const matchCustId = !cf.customerId || (sub.user?.customerId?.toString() || "").includes(cf.customerId);
            const matchCustName = !cf.customerName || (sub.user?.name || "").toLowerCase().includes(cf.customerName.toLowerCase());
            const matchContact = !cf.contact || (sub.user?.mobile || "").includes(cf.contact);
            const matchEmail = !cf.email || (sub.user?.email || "").toLowerCase().includes(cf.email.toLowerCase());
            const matchFreq = !cf.frequency || sub.frequency === cf.frequency;
            const matchQty = !cf.quantity || sub.quantity?.toString() === cf.quantity;
            const matchAltQty = !cf.altQty || (sub.alternateQuantity || 0).toString() === cf.altQty;
            const matchStatus = !cf.status || sub.status === cf.status;
            const riderId = sub.assignedRider?._id || sub.assignedRider;
            const matchRider = !cf.deliveryBoy || (riderId && riderId.toString() === cf.deliveryBoy);
            const matchArea = !cf.area || (sub.user?.address?.area || "").toLowerCase().includes(cf.area.toLowerCase());
            const matchHub = !cf.hub || (sub.user?.hub || "").toLowerCase().includes((cf.hub || "").toLowerCase());
            const matchStartDate = !cf.startDate || (sub.startDate && new Date(sub.startDate) >= new Date(cf.startDate));
            const matchEndDate = !cf.endDate || (sub.endDate && new Date(sub.endDate) <= new Date(cf.endDate + "T23:59:59"));

            return matchesSearch && matchesCard && matchSubId && matchProduct && matchCustId &&
                matchCustName && matchContact && matchEmail && matchFreq && matchQty && matchAltQty &&
                matchStatus && matchRider && matchArea && matchHub && matchStartDate && matchEndDate;
        });
    }, [subscriptions, search, cardFilter, colFilters]);

    // Sorting
    const sortedSubscriptions = useMemo(() => {
        if (!sortConfig.key) return filteredSubscriptions;
        const sorted = [...filteredSubscriptions].sort((a, b) => {
            let va, vb;
            switch (sortConfig.key) {
                case 'subId': va = a.subscriptionId || 0; vb = b.subscriptionId || 0; break;
                case 'product': va = a.product?.name || ""; vb = b.product?.name || ""; break;
                case 'customerId': va = a.user?.customerId || 0; vb = b.user?.customerId || 0; break;
                case 'customerName': va = a.user?.name || ""; vb = b.user?.name || ""; break;
                case 'contact': va = a.user?.mobile || ""; vb = b.user?.mobile || ""; break;
                case 'frequency': va = a.frequency || ""; vb = b.frequency || ""; break;
                case 'quantity': va = a.quantity || 0; vb = b.quantity || 0; break;
                case 'status': va = a.status || ""; vb = b.status || ""; break;
                case 'startDate': va = new Date(a.startDate || 0); vb = new Date(b.startDate || 0); break;
                case 'endDate': va = new Date(a.endDate || 0); vb = new Date(b.endDate || 0); break;
                case 'wallet': va = a.user?.walletBalance || 0; vb = b.user?.walletBalance || 0; break;
                case 'created': va = new Date(a.createdAt || 0); vb = new Date(b.createdAt || 0); break;
                default: return 0;
            }
            if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
            if (va < vb) return sortConfig.dir === 'asc' ? -1 : 1;
            if (va > vb) return sortConfig.dir === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [filteredSubscriptions, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
        }));
    };

    const SortIcon = ({ colKey }) => {
        if (sortConfig.key !== colKey) return <ChevronUp size={10} className="text-gray-300" />;
        return sortConfig.dir === 'asc'
            ? <ChevronUp size={10} className="text-indigo-600" />
            : <ChevronDown size={10} className="text-indigo-600" />;
    };


    // Stat Card with filter action
    const StatCard = ({ title, value, icon: IconComponent, color, bgColor, filterKey }) => {
        const isActive = cardFilter === filterKey;
        return (
            <div
                onClick={() => setCardFilter(isActive ? "" : filterKey)}
                className={`rounded-xl p-5 shadow-sm border-2 transition-all cursor-pointer select-none
                    ${isActive ? 'border-indigo-500 ring-2 ring-indigo-200 scale-[1.02]' : 'border-gray-100 hover:border-gray-300'}
                    ${bgColor}`}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide font-medium">{title}</p>
                        <h3 className="text-2xl font-bold">{value}</h3>
                    </div>
                    <div className={`${color} bg-white rounded-full p-2.5 shadow-sm`}>
                        {IconComponent && <IconComponent size={20} />}
                    </div>
                </div>
                {isActive && <p className="text-[10px] text-indigo-600 font-semibold mt-2 uppercase">✓ Filtering</p>}
            </div>
        );
    };

    const updateSubscriptionMutation = useMutation({
        mutationFn: updateSubscription,
        onSuccess: () => {
            queryClient.invalidateQueries(['adminSubscriptions', type]);
            toast.success("Subscription updated successfully");
            setIsEditModalOpen(false);
            setSelectedSubscription(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to update subscription");
        }
    });

    const handleUpdateSubscription = (formData) => {
        updateSubscriptionMutation.mutate({
            id: formData.subscriptionId,
            data: {
                product: formData.product,
                startDate: formData.startDate,
                endDate: formData.endDate || null,
                frequency: formData.frequency,
                quantity: formData.quantity,
                alternateQuantity: formData.alternateQuantity !== undefined ? formData.alternateQuantity : (formData.altQuantity || 0),
                customDays: formData.customDays || [],
                customSchedule: formData.customSchedule || {},
                status: formData.status,
                note: formData.note
            }
        });
    };

    const handleEdit = (subscription) => {
        setSelectedSubscription(subscription);
        setIsEditModalOpen(true);
    };

    const updateColFilter = (key, val) => setColFilters(prev => ({ ...prev, [key]: val }));

    if (loadingSubs) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <RefreshCw className="animate-spin mx-auto mb-4 text-teal-600" size={40} />
                    <p className="text-gray-600">Loading Subscriptions...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center text-red-600">
                    <AlertCircle className="mx-auto mb-4" size={40} />
                    <p className="font-semibold">Error loading subscriptions</p>
                    <p className="text-sm mt-2">{error.response?.data?.message || error.message}</p>
                    <button onClick={refetch} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Column definitions for the sortable header
    const columns = [
        { key: 'subId', label: 'Sub. ID', w: 'w-20' },
        { key: 'product', label: 'Product', w: 'w-32' },
        { key: 'customerId', label: 'Cust. ID', w: 'w-20' },
        { key: 'customerName', label: 'Customer', w: 'w-32' },
        { key: 'contact', label: 'Contact', w: 'w-28' },
        { key: null, label: 'Email', w: 'w-36' },
        { key: 'frequency', label: 'Frequency', w: 'w-28' },
        { key: 'quantity', label: 'Qty', w: 'w-16' },
        { key: null, label: 'Alt Qty', w: 'w-16' },
        { key: 'status', label: 'Status', w: 'w-24' },
        { key: null, label: 'Delivery Boy', w: 'w-28' },
        { key: null, label: 'Area', w: 'w-24' },
        { key: null, label: 'Hub', w: 'w-24' },
        { key: 'startDate', label: 'Start Date', w: 'w-28' },
        { key: 'endDate', label: 'End Date', w: 'w-28' },
        { key: 'wallet', label: 'Wallet', w: 'w-24' },
        { key: 'created', label: 'Created', w: 'w-24' },
    ];

    return (
        <div className="space-y-5 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {type === 'trial' ? 'Trial Subscriptions' : 'Subscription Management'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage and track all subscriptions</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Global Search */}
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name, mobile, product..."
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                        />
                    </div>
                    <button onClick={refetch} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh">
                        <RefreshCw size={18} className="text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Summary Cards — clickable as filters */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard title="Total" value={stats.total} icon={Users} color="text-blue-600" bgColor="bg-blue-50" filterKey="" />
                <StatCard title="Active" value={stats.active} icon={CheckCircle} color="text-green-600" bgColor="bg-green-50" filterKey="active" />
                <StatCard title="Paused" value={stats.paused} icon={AlertCircle} color="text-orange-600" bgColor="bg-orange-50" filterKey="paused" />
                <StatCard title="Cancelled" value={stats.cancelled} icon={XCircle} color="text-red-600" bgColor="bg-red-50" filterKey="cancelled" />
                <StatCard title="Last 30 Days" value={stats.last30Days} icon={TrendingUp} color="text-purple-600" bgColor="bg-purple-50" filterKey="last30" />
            </div>

            {/* Results Bar */}
            <div className="flex items-center justify-between text-sm text-gray-500 px-1">
                <span>Showing <strong className="text-gray-800">{sortedSubscriptions.length}</strong> of {subscriptions.length} subscriptions</span>
                {(cardFilter || Object.values(colFilters).some(v => v)) && (
                    <button onClick={() => { setCardFilter(""); setColFilters({ subId: "", product: "", customerId: "", customerName: "", contact: "", email: "", frequency: "", quantity: "", altQty: "", status: "", deliveryBoy: "", area: "", hub: "", startDate: "", endDate: "" }); }}
                        className="text-xs text-red-500 hover:text-red-700 font-medium">
                        ✕ Clear All Filters
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            {/* Sortable Column Headers */}
                            <tr className="border-b border-gray-200">
                                {columns.map((col, i) => (
                                    <th key={i}
                                        onClick={() => col.key && handleSort(col.key)}
                                        className={`px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap ${col.key ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}`}>
                                        <div className="flex items-center gap-1">
                                            {col.label}
                                            {col.key && <SortIcon colKey={col.key} />}
                                        </div>
                                    </th>
                                ))}
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap sticky right-0 bg-gray-50">Action</th>
                            </tr>

                            {/* Column Filter Row */}
                            <tr className="bg-white border-b border-gray-300">
                                {/* Sub ID */}
                                <th className="px-2 py-2"><input type="text" placeholder="ID" value={colFilters.subId} onChange={e => updateColFilter('subId', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" /></th>
                                {/* Product */}
                                <th className="px-2 py-2">
                                    <select value={colFilters.product} onChange={e => updateColFilter('product', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" disabled={loadingProducts}>
                                        <option value="">All</option>
                                        {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                    </select>
                                </th>
                                {/* Customer ID */}
                                <th className="px-2 py-2"><input type="text" placeholder="" value={colFilters.customerId} onChange={e => updateColFilter('customerId', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" /></th>
                                {/* Customer Name */}
                                <th className="px-2 py-2"><input type="text" placeholder="Name" value={colFilters.customerName} onChange={e => updateColFilter('customerName', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" /></th>
                                {/* Contact */}
                                <th className="px-2 py-2"><input type="text" placeholder="Mobile" value={colFilters.contact} onChange={e => updateColFilter('contact', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" /></th>
                                {/* Email */}
                                <th className="px-2 py-2"><input type="email" placeholder="Email" value={colFilters.email} onChange={e => updateColFilter('email', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" /></th>
                                {/* Frequency */}
                                <th className="px-2 py-2">
                                    <select value={colFilters.frequency} onChange={e => updateColFilter('frequency', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-xs">
                                        <option value="">All</option>
                                        <option>Daily</option>
                                        <option>Alternate Days</option>
                                        <option>Weekdays</option>
                                        <option>Weekends</option>
                                        <option>Custom</option>
                                    </select>
                                </th>
                                {/* Quantity */}
                                <th className="px-2 py-2"><input type="text" placeholder="" value={colFilters.quantity} onChange={e => updateColFilter('quantity', e.target.value)} className="w-16 border border-gray-300 rounded px-2 py-1 text-xs" /></th>
                                {/* Alt Qty */}
                                <th className="px-2 py-2"><input type="text" placeholder="" value={colFilters.altQty} onChange={e => updateColFilter('altQty', e.target.value)} className="w-16 border border-gray-300 rounded px-2 py-1 text-xs" /></th>
                                {/* Status */}
                                <th className="px-2 py-2">
                                    <select value={colFilters.status} onChange={e => updateColFilter('status', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-xs">
                                        <option value="">All</option>
                                        <option value="active">Active</option>
                                        <option value="paused">Paused</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </th>
                                {/* Delivery Boy */}
                                <th className="px-2 py-2">
                                    <select value={colFilters.deliveryBoy} onChange={e => updateColFilter('deliveryBoy', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" disabled={loadingRiders}>
                                        <option value="">All</option>
                                        {riders.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                                    </select>
                                </th>
                                {/* Area */}
                                <th className="px-2 py-2"><input type="text" placeholder="Area" value={colFilters.area} onChange={e => updateColFilter('area', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" /></th>
                                {/* Hub */}
                                <th className="px-2 py-2"><input type="text" placeholder="Hub" value={colFilters.hub} onChange={e => updateColFilter('hub', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" /></th>
                                {/* Start Date */}
                                <th className="px-2 py-2"><input type="date" value={colFilters.startDate} onChange={e => updateColFilter('startDate', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" /></th>
                                {/* End Date */}
                                <th className="px-2 py-2"><input type="date" value={colFilters.endDate} onChange={e => updateColFilter('endDate', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" /></th>
                                {/* Wallet */}
                                <th className="px-2 py-2"></th>
                                {/* Created */}
                                <th className="px-2 py-2"></th>
                                {/* Action */}
                                <th className="px-2 py-2 sticky right-0 bg-white"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sortedSubscriptions.map((sub) => (
                                <tr key={sub._id} className="hover:bg-gray-50 transition-colors">
                                    {/* Sub ID — opens customer detail in new tab */}
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <Link
                                            to={`/administrator/dashboard/customers/${sub.user?._id}`}
                                            target="_blank"
                                            className="text-blue-600 font-medium text-xs hover:underline flex items-center gap-1"
                                        >
                                            {sub.subscriptionId || sub._id?.slice(-6)}
                                            <ExternalLink size={10} />
                                        </Link>
                                    </td>
                                    {/* Product */}
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {sub.product?.image && (
                                                <img src={sub.product.image} alt="" className="w-6 h-6 rounded object-cover" />
                                            )}
                                            <span className="font-medium text-xs">{sub.product?.name || 'N/A'}</span>
                                        </div>
                                    </td>
                                    {/* Customer ID */}
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">{sub.user?.customerId || 'N/A'}</td>
                                    {/* Customer Name */}
                                    <td className="px-3 py-3 font-medium whitespace-nowrap text-xs">
                                        <Link to={`/administrator/dashboard/customers/${sub.user?._id}`} className="text-blue-600 hover:underline hover:text-blue-800">
                                            {sub.user?.name || 'N/A'}
                                        </Link>
                                    </td>
                                    {/* Contact */}
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <span className="flex items-center gap-1 text-gray-600 text-xs">{sub.user?.mobile || 'N/A'}</span>
                                    </td>
                                    {/* Email */}
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">{sub.user?.email || 'N/A'}</td>
                                    {/* Frequency */}
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{sub.frequency}</span>
                                    </td>
                                    {/* Quantity */}
                                    <td className="px-3 py-3 font-semibold whitespace-nowrap text-xs">{sub.quantity}</td>
                                    {/* Alt Qty */}
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">{sub.alternateQuantity || 0}</td>
                                    {/* Status */}
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <button
                                            onClick={() => {
                                                const newStatus = sub.status === 'active' ? 'cancelled' : 'active';
                                                updateSubscriptionMutation.mutate({ id: sub._id, data: { status: newStatus } });
                                            }}
                                            disabled={updateSubscriptionMutation.isPending}
                                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${sub.status === 'active'
                                                ? 'bg-green-600 text-white hover:bg-red-500'
                                                : sub.status === 'paused'
                                                    ? 'bg-yellow-500 text-white hover:bg-green-500'
                                                    : 'bg-gray-400 text-white hover:bg-green-500'
                                                }`}
                                            title={sub.status === 'active' ? 'Click to deactivate' : 'Click to activate'}
                                        >
                                            {sub.status === 'active' ? 'Active' : sub.status === 'paused' ? 'Paused' : 'Inactive'}
                                        </button>
                                    </td>
                                    {/* Delivery Boy */}
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">{sub.assignedRider?.name || '-'}</td>
                                    {/* Area */}
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">{sub.user?.address?.area || 'N/A'}</td>
                                    {/* Hub */}
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">-</td>
                                    {/* Start Date */}
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">
                                        {sub.startDate ? new Date(sub.startDate).toLocaleDateString('en-GB') : '-'}
                                    </td>
                                    {/* End Date */}
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">
                                        {sub.endDate ? new Date(sub.endDate).toLocaleDateString('en-GB') : '-'}
                                    </td>
                                    {/* Wallet */}
                                    <td className="px-3 py-3 font-semibold whitespace-nowrap text-xs">₹{sub.user?.walletBalance || 0}</td>
                                    {/* Created */}
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">
                                        {new Date(sub.createdAt).toLocaleDateString('en-GB')}
                                    </td>
                                    {/* Action */}
                                    <td className="px-3 py-3 whitespace-nowrap sticky right-0 bg-white">
                                        <button
                                            onClick={() => handleEdit(sub)}
                                            className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium transition-colors"
                                        >
                                            <Edit size={12} />
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {sortedSubscriptions.length === 0 && (
                                <tr>
                                    <td colSpan="18" className="px-4 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-500">
                                            <Activity size={48} className="mb-4 opacity-50" />
                                            <p className="text-lg font-medium">No subscriptions found</p>
                                            <p className="text-sm mt-1">Try adjusting your filters</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Subscription Modal */}
            <EditSubscriptionModal
                customer={selectedSubscription?.user}
                subscription={selectedSubscription}
                products={selectedSubscription?.product ? [selectedSubscription.product] : []}
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedSubscription(null);
                }}
                onSave={handleUpdateSubscription}
            />
        </div>
    );
};
