import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    User, Calendar, Search, Download, Upload, FileText, RefreshCw,
    Eye, Edit, Trash2, CheckCircle, XCircle, AlertCircle, Clock,
    TrendingUp, Activity, Users, Zap, CalendarIcon
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getAllSubscriptions } from '../../shared/api/subscriptions';
import { getAllProducts } from '../../shared/api/products';
import { getAllRiders } from '../../shared/api/riders';
import { updateSubscription } from '../../shared/api/subscriptions';
import { EditSubscriptionModal } from '../subscriptions/EditSubscriptionModal';
import { toast } from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query'; // Import useQueryClient
import { useFilters } from '../../shared/context/FilterContext';

export const Subscriptions = ({ type = 'regular' }) => {
    const [search, setSearch] = useState("");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState(null);
    const queryClient = useQueryClient();
    const { filters: globalFilters } = useFilters();

    const [filters, setFilters] = useState({
        status: "",
        product: "",
        frequency: "",
        deliveryBoy: "",
        startDate: "",
        endDate: "",
        customerId: ""
    });

    // Fetch subscriptions
    const { data: subsData, isLoading: loadingSubs, refetch, error } = useQuery({
        queryKey: ['adminSubscriptions', type, globalFilters],
        queryFn: () => {
            console.log('Fetching subscriptions with type:', type, 'and filters:', globalFilters);
            return getAllSubscriptions({ type, ...globalFilters });
        },
        staleTime: 30000, // 30 seconds
        retry: false, // Don't retry on error
    });

    // Fetch products for filter dropdown
    const { data: productsData, isLoading: loadingProducts } = useQuery({
        queryKey: ['products'],
        queryFn: getAllProducts,
        staleTime: 60000, // 1 minute
    });

    // Fetch riders/delivery boys for filter dropdown
    const { data: ridersData, isLoading: loadingRiders } = useQuery({
        queryKey: ['riders'],
        queryFn: getAllRiders,
        staleTime: 60000, // 1 minute
    });

    const subscriptions = subsData?.result || [];
    const products = productsData?.result || [];
    const riders = ridersData?.result || [];

    // Debug logging
    console.log('Subscriptions data:', subsData);
    console.log('Subscriptions count:', subscriptions.length);
    console.log('Type:', type);

    // Calculate Summary Stats
    const stats = {
        total: subscriptions.length,
        active: subscriptions.filter(s => s.status === 'active').length,
        paused: subscriptions.filter(s => s.status === 'paused').length,
        inactive: subscriptions.filter(s => s.status === 'cancelled').length,
        pending: 0, // Pending is usually for future start dates or approval
        last30Days: subscriptions.filter(s => {
            const created = new Date(s.createdAt);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return created >= thirtyDaysAgo;
        }).length
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-700';
            case 'paused': return 'bg-yellow-100 text-yellow-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const filteredSubscriptions = subscriptions.filter(sub => {
        const searchLower = search.toLowerCase();
        const userName = sub.user?.name?.toLowerCase() || "";
        const userMobile = sub.user?.mobile || "";
        const productName = sub.product?.name?.toLowerCase() || "";

        const matchesSearch =
            userName.includes(searchLower) ||
            userMobile.includes(searchLower) ||
            productName.includes(searchLower);

        const matchesStatus = !filters.status || sub.status === filters.status;
        const matchesFrequency = !filters.frequency || sub.frequency === filters.frequency;
        const matchesProduct = !filters.product || (sub.product?._id && sub.product._id.toString() === filters.product);

        // Handle both populated object and ID string cases
        const assignedRiderId = sub.assignedRider?._id || sub.assignedRider;
        const matchesDeliveryBoy = !filters.deliveryBoy || (assignedRiderId && assignedRiderId.toString() === filters.deliveryBoy);

        const matchesCustomerId = !filters.customerId || (sub.user?.customerId && sub.user.customerId.toString().includes(filters.customerId));

        const matchesStartDate = !filters.startDate || (sub.startDate && new Date(sub.startDate) >= new Date(filters.startDate));
        const matchesEndDate = !filters.endDate || (sub.startDate && new Date(sub.startDate) <= new Date(filters.endDate));

        return matchesSearch && matchesStatus && matchesFrequency && matchesProduct && matchesDeliveryBoy && matchesCustomerId && matchesStartDate && matchesEndDate;
    });

    const StatCard = ({ title, value, icon: Icon, color, bgColor }) => (
        <div className={`${bgColor} rounded-xl p-6 shadow-sm border border-gray-100`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600 mb-1">{title}</p>
                    <h3 className="text-3xl font-bold">{value}</h3>
                </div>
                <div className={`${color} bg-white rounded-full p-3`}>
                    <Icon size={24} />
                </div>
            </div>
        </div>
    );



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

    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {type === 'trial' ? 'Trial Subscriptions' : 'Subscription Management'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage and track all subscriptions</p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <FileText size={18} />
                        <span className="text-sm font-medium">Choose File</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                        <Upload size={18} />
                        <span className="text-sm font-medium">Upload CSV</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Download size={18} />
                        <span className="text-sm font-medium">Sample File</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <Download size={18} />
                        <span className="text-sm font-medium">Export</span>
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <StatCard title="Total Subscriptions" value={stats.total} icon={Users} color="text-blue-600" bgColor="bg-blue-50" />
                <StatCard title="Active" value={stats.active} icon={CheckCircle} color="text-green-600" bgColor="bg-green-50" />
                <StatCard title="Paused" value={stats.paused} icon={AlertCircle} color="text-orange-600" bgColor="bg-orange-50" />
                <StatCard title="Inactive" value={stats.inactive} icon={XCircle} color="text-red-600" bgColor="bg-red-50" />
                <StatCard title="Pending" value={stats.pending} icon={Clock} color="text-yellow-600" bgColor="bg-yellow-50" />
                <StatCard title="Last 30 Days" value={stats.last30Days} icon={TrendingUp} color="text-purple-600" bgColor="bg-purple-50" />
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">Show</span>
                        <select className="border border-gray-300 rounded-md px-3 py-1.5 text-sm">
                            <option>100</option>
                            <option>50</option>
                            <option>25</option>
                            <option>10</option>
                        </select>
                        <span className="text-sm text-gray-600">entries</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Showing 1 to {Math.min(100, filteredSubscriptions.length)} of {filteredSubscriptions.length} entries</span>
                        <button onClick={refetch} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh">
                            <RefreshCw size={18} className="text-gray-600" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table with Column-Level Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            {/* Column Headers */}
                            <tr className="border-b border-gray-200">
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Sub. ID</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Product Name</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Customer ID</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Customer Name</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Contact</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Email</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Frequency</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Quantity</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Alt Quantity</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Status</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Note</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Time Slot</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Delivery Boy</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Address</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Area</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Hub Name</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Start Date</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">End Date</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Current Consumption</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Last Delivered Date</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Last Stop Date</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Last Resume Date</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Wallet Balance</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Effective Balance</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Campaign</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Churn Reason</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Created By</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Created By Admin</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap">Created</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs whitespace-nowrap sticky right-0 bg-gray-50">Action</th>
                            </tr>

                            {/* Filter Row - Under Each Column */}
                            <tr className="bg-white border-b border-gray-300">
                                <th className="px-2 py-2">
                                    <input type="text" placeholder="" className="w-20 border border-gray-300 rounded px-2 py-1 text-xs" />
                                </th>
                                <th className="px-2 py-2">
                                    <select
                                        className="w-32 border border-gray-300 rounded px-2 py-1 text-xs"
                                        value={filters.product}
                                        onChange={(e) => setFilters({ ...filters, product: e.target.value })}
                                        disabled={loadingProducts}
                                    >
                                        <option value="">All Products</option>
                                        {products.map(product => (
                                            <option key={product._id} value={product._id}>
                                                {product.name}
                                            </option>
                                        ))}
                                    </select>
                                </th>
                                <th className="px-2 py-2">
                                    <input
                                        type="text"
                                        placeholder=""
                                        className="w-24 border border-gray-300 rounded px-2 py-1 text-xs"
                                        value={filters.customerId}
                                        onChange={(e) => setFilters({ ...filters, customerId: e.target.value })}
                                    />
                                </th>
                                <th className="px-2 py-2">
                                    <input type="text" placeholder="" className="w-32 border border-gray-300 rounded px-2 py-1 text-xs" />
                                </th>
                                <th className="px-2 py-2">
                                    <input type="text" placeholder="" className="w-28 border border-gray-300 rounded px-2 py-1 text-xs" />
                                </th>
                                <th className="px-2 py-2">
                                    <input type="email" placeholder="" className="w-36 border border-gray-300 rounded px-2 py-1 text-xs" />
                                </th>
                                <th className="px-2 py-2">
                                    <select
                                        value={filters.frequency}
                                        onChange={(e) => setFilters({ ...filters, frequency: e.target.value })}
                                        className="w-32 border border-gray-300 rounded px-2 py-1 text-xs"
                                    >
                                        <option value="">All</option>
                                        <option>Daily</option>
                                        <option>Alternate Days</option>
                                        <option>Weekdays</option>
                                        <option>Weekends</option>
                                        <option>Custom</option>
                                    </select>
                                </th>
                                <th className="px-2 py-2">
                                    <input type="text" placeholder="" className="w-16 border border-gray-300 rounded px-2 py-1 text-xs" />
                                </th>
                                <th className="px-2 py-2">
                                    <input type="text" placeholder="" className="w-20 border border-gray-300 rounded px-2 py-1 text-xs" />
                                </th>
                                <th className="px-2 py-2">
                                    <select
                                        value={filters.status}
                                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                        className="w-28 border border-gray-300 rounded px-2 py-1 text-xs"
                                    >
                                        <option value="">All</option>
                                        <option value="active">Active</option>
                                        <option value="paused">Paused</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </th>
                                <th className="px-2 py-2">
                                    <input type="text" placeholder="" className="w-24 border border-gray-300 rounded px-2 py-1 text-xs" />
                                </th>
                                <th className="px-2 py-2">
                                    <select className="w-28 border border-gray-300 rounded px-2 py-1 text-xs">
                                        <option>All</option>
                                        <option>Morning</option>
                                        <option>Evening</option>
                                    </select>
                                </th>
                                <th className="px-2 py-2">
                                    <select
                                        className="w-32 border border-gray-300 rounded px-2 py-1 text-xs"
                                        value={filters.deliveryBoy}
                                        onChange={(e) => setFilters({ ...filters, deliveryBoy: e.target.value })}
                                        disabled={loadingRiders}
                                    >
                                        <option value="">All Riders</option>
                                        {riders.map(rider => (
                                            <option key={rider._id} value={rider._id}>
                                                {rider.name}
                                            </option>
                                        ))}
                                    </select>
                                </th>
                                <th className="px-2 py-2">
                                    <input type="text" placeholder="" className="w-32 border border-gray-300 rounded px-2 py-1 text-xs" />
                                </th>
                                <th className="px-2 py-2">
                                    <input type="text" placeholder="" className="w-24 border border-gray-300 rounded px-2 py-1 text-xs" />
                                </th>
                                <th className="px-2 py-2">
                                    <input type="text" placeholder="" className="w-24 border border-gray-300 rounded px-2 py-1 text-xs" />
                                </th>
                                <th className="px-2 py-2">
                                    <input
                                        type="date"
                                        className="w-32 border border-gray-300 rounded px-2 py-1 text-xs"
                                        value={filters.startDate}
                                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                    />
                                </th>
                                <th className="px-2 py-2">
                                    <input
                                        type="date"
                                        className="w-32 border border-gray-300 rounded px-2 py-1 text-xs"
                                        value={filters.endDate}
                                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                    />
                                </th>
                                <th className="px-2 py-2">
                                    <input type="text" placeholder="" className="w-28 border border-gray-300 rounded px-2 py-1 text-xs" />
                                </th>
                                <th className="px-2 py-2">
                                    <input type="date" className="w-32 border border-gray-300 rounded px-2 py-1 text-xs" />
                                </th>
                                <th className="px-2 py-2">
                                    <input type="date" className="w-32 border border-gray-300 rounded px-2 py-1 text-xs" />
                                </th>
                                <th className="px-2 py-2">
                                    <input type="date" className="w-32 border border-gray-300 rounded px-2 py-1 text-xs" />
                                </th>
                                <th className="px-2 py-2">
                                    <select className="w-32 border border-gray-300 rounded px-2 py-1 text-xs">
                                        <option>All</option>
                                    </select>
                                </th>
                                <th className="px-2 py-2">
                                    <select className="w-36 border border-gray-300 rounded px-2 py-1 text-xs">
                                        <option>All</option>
                                    </select>
                                </th>
                                <th className="px-2 py-2">
                                    <select className="w-28 border border-gray-300 rounded px-2 py-1 text-xs">
                                        <option>All</option>
                                    </select>
                                </th>
                                <th className="px-2 py-2">
                                    <input type="text" placeholder="" className="w-24 border border-gray-300 rounded px-2 py-1 text-xs" />
                                </th>
                                <th className="px-2 py-2">
                                    <select className="w-28 border border-gray-300 rounded px-2 py-1 text-xs">
                                        <option>All</option>
                                        <option>Admin</option>
                                        <option>Customer</option>
                                    </select>
                                </th>
                                <th className="px-2 py-2">
                                    <select className="w-28 border border-gray-300 rounded px-2 py-1 text-xs">
                                        <option>All</option>
                                    </select>
                                </th>
                                <th className="px-2 py-2">
                                    <input type="date" className="w-32 border border-gray-300 rounded px-2 py-1 text-xs" />
                                </th>
                                <th className="px-2 py-2 sticky right-0 bg-white"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredSubscriptions.map((sub) => (
                                <tr key={sub._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <span className="text-blue-600 font-medium text-xs">
                                            {sub.subscriptionId || sub._id?.slice(-6)}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {sub.product?.image && (
                                                <img src={sub.product.image} alt="" className="w-6 h-6 rounded object-cover" />
                                            )}
                                            <span className="font-medium text-xs">{sub.product?.name || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">{sub.user?.customerId || 'N/A'}</td>
                                    <td className="px-3 py-3 font-medium whitespace-nowrap text-xs">
                                        <Link
                                            to={`/administrator/dashboard/customers/${sub.user?._id}`}
                                            className="text-blue-600 hover:underline hover:text-blue-800"
                                        >
                                            {sub.user?.name || 'N/A'}
                                        </Link>
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <span className="flex items-center gap-1 text-gray-600 text-xs">
                                            <Eye size={12} />
                                            {sub.user?.mobile || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">{sub.user?.email || 'N/A'}</td>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{sub.frequency}</span>
                                    </td>
                                    <td className="px-3 py-3 font-semibold whitespace-nowrap text-xs">{sub.quantity}</td>
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">{sub.alternateQuantity || 0}</td>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <button
                                            onClick={() => {
                                                const newStatus = sub.status === 'active' ? 'cancelled' : 'active';
                                                updateSubscriptionMutation.mutate({
                                                    id: sub._id,
                                                    data: { status: newStatus }
                                                });
                                            }}
                                            disabled={updateSubscriptionMutation.isPending}
                                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${sub.status === 'active'
                                                    ? 'bg-green-600 text-white hover:bg-red-500'
                                                    : 'bg-gray-400 text-white hover:bg-green-500'
                                                }`}
                                            title={sub.status === 'active' ? 'Click to deactivate' : 'Click to activate'}
                                        >
                                            {sub.status === 'active' ? 'Active' : 'Inactive'}
                                        </button>
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <input type="text" className="border border-gray-200 rounded px-1 py-0.5 text-xs w-20" />
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <select className="border border-gray-200 rounded px-1 py-0.5 text-xs w-24">
                                            <option>Select</option>
                                            <option>Morning</option>
                                            <option>Evening</option>
                                        </select>
                                    </td>
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">{sub.assignedRider?.name || '-'}</td>
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs max-w-xs truncate">
                                        {sub.user?.address?.fullAddress || 'N/A'}
                                    </td>
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">{sub.user?.address?.area || 'N/A'}</td>
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">-</td>
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">
                                        {sub.startDate ? new Date(sub.startDate).toLocaleDateString('en-GB') : '-'}
                                    </td>
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">
                                        {sub.endDate ? new Date(sub.endDate).toLocaleDateString('en-GB') : '-'}
                                    </td>
                                    <td className="px-3 py-3 font-semibold whitespace-nowrap text-xs">0</td>
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">-</td>
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">-</td>
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">-</td>
                                    <td className="px-3 py-3 font-semibold whitespace-nowrap text-xs">₹{sub.user?.walletBalance || 0}</td>
                                    <td className="px-3 py-3 font-semibold whitespace-nowrap text-xs">₹{((sub.user?.walletBalance || 0) + (sub.user?.creditLimit || 0) - (sub.user?.unbilledConsumption || 0)).toFixed(2)}</td>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <select className="border border-gray-200 rounded px-1 py-0.5 text-xs w-24">
                                            <option>Select Churn</option>
                                        </select>
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <button className="text-blue-600 hover:text-blue-800">
                                            <Edit size={14} />
                                        </button>
                                    </td>
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">customer</td>
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">-</td>
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">
                                        {new Date(sub.createdAt).toLocaleDateString('en-GB')}
                                    </td>
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
                            {filteredSubscriptions.length === 0 && (
                                <tr>
                                    <td colSpan="30" className="px-4 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-500">
                                            <Activity size={48} className="mb-4 opacity-50" />
                                            <p className="text-lg font-medium">No subscriptions found</p>
                                            <p className="text-sm mt-1">Try adjusting your filters or create a new subscription</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                    <p className="text-sm text-gray-600">
                        Showing 1 to {Math.min(100, filteredSubscriptions.length)} of {filteredSubscriptions.length} entries
                    </p>
                    <div className="flex items-center gap-2">
                        <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm">
                            Previous
                        </button>
                        <button className="px-3 py-1 bg-teal-600 text-white rounded text-sm">1</button>
                        <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm">
                            Next
                        </button>
                    </div>
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
