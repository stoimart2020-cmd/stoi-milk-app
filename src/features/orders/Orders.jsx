import React, { useState, useEffect } from 'react';
import {
    ShoppingCart, User, MapPin, Clock, Truck, CheckCircle, XCircle,
    Search, Edit, Trash2, Plus, Minus, X, Package, IndianRupee,
    CreditCard, FileText, Save, AlertTriangle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrders, updateOrderStatus, assignRider, updateOrder } from '../../shared/api/orders';
import { getAllRiders } from '../../shared/api/riders';
import { axiosInstance } from '../../shared/api/axios';
import toast from 'react-hot-toast';
import { useFilters } from '../../shared/context/FilterContext';

// ── Status badge ──────────────────────────────────────────────────────────────
const statusBadge = (status) => ({
    confirmed: 'badge-info',
    delivered: 'badge-success',
    out_for_delivery: 'badge-warning',
    pending: 'badge-ghost',
    cancelled: 'badge-error',
}[status] || 'badge-ghost');

// ── Edit Order Modal ──────────────────────────────────────────────────────────
const EditOrderModal = ({ order, riders, onClose, onSave }) => {
    const [deliveryDate, setDeliveryDate] = useState(
        order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : ''
    );
    const [status, setStatus] = useState(order.status);
    const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus || 'pending');
    const [paymentMode, setPaymentMode] = useState(order.paymentMode || 'CASH');
    const [notes, setNotes] = useState(order.notes || '');
    const [assignedRider, setAssignedRider] = useState(order.assignedRider?._id || '');
    const [products, setProducts] = useState(
        (order.products || []).map(p => ({
            _id: p.product?._id || p.product,
            name: p.product?.name || 'Item',
            price: p.price || p.product?.price || 0,
            quantity: p.quantity,
        }))
    );
    const [productSearch, setProductSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [saving, setSaving] = useState(false);

    const liveTotal = products.reduce((s, p) => s + p.price * p.quantity, 0);

    // Product catalog search
    useEffect(() => {
        if (!productSearch.trim()) { setSearchResults([]); return; }
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const { data } = await axiosInstance.get(`/api/products?search=${encodeURIComponent(productSearch)}&limit=8`);
                const existing = new Set(products.map(p => p._id?.toString()));
                setSearchResults((data.result || []).filter(p => !existing.has(p._id?.toString())));
            } catch { setSearchResults([]); }
            setSearching(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [productSearch, products]);

    const addProduct = (p) => {
        setProducts(prev => [...prev, { _id: p._id, name: p.name, price: p.price, quantity: 1 }]);
        setProductSearch('');
        setSearchResults([]);
    };

    const removeProduct = (idx) => {
        setProducts(prev => prev.filter((_, i) => i !== idx));
    };

    const changeQty = (idx, delta) => {
        setProducts(prev => prev.map((p, i) => i === idx
            ? { ...p, quantity: Math.max(1, p.quantity + delta) }
            : p
        ));
    };

    const handleSave = async () => {
        if (products.length === 0) return toast.error('Order must have at least one product');
        setSaving(true);
        try {
            await onSave({
                deliveryDate,
                status,
                paymentStatus,
                paymentMode,
                notes,
                assignedRider: assignedRider || null,
                products: products.map(p => ({ product: p._id, quantity: p.quantity, price: p.price })),
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">

                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">
                            Edit Order <span className="font-mono text-blue-600">#{order.orderId || order._id?.slice(-6)}</span>
                        </h2>
                        <p className="text-xs text-gray-400">{order.customer?.name} · {order.customer?.mobile}</p>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-sm btn-square">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-5">

                    {/* Delivered warning */}
                    {['delivered', 'cancelled'].includes(order.status) && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-2 text-sm text-amber-800">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                            This order is already <strong>{order.status}</strong>. Editing is allowed but use with caution.
                        </div>
                    )}

                    {/* Grid: date + status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">📅 Delivery Date</label>
                            <input
                                type="date"
                                className="input input-bordered w-full"
                                value={deliveryDate}
                                onChange={e => setDeliveryDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">🔄 Order Status</label>
                            <select className="select select-bordered w-full" value={status} onChange={e => setStatus(e.target.value)}>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="out_for_delivery">Out for Delivery</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    {/* Grid: payment */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">💳 Payment Status</label>
                            <select className="select select-bordered w-full" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}>
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                                <option value="failed">Failed</option>
                                <option value="refunded">Refunded</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">🏧 Payment Mode</label>
                            <select className="select select-bordered w-full" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                                <option value="CASH">Cash</option>
                                <option value="WALLET">Wallet</option>
                                <option value="ONLINE">Online / UPI</option>
                                <option value="CARD">Card</option>
                            </select>
                        </div>
                    </div>

                    {/* Rider */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">🚛 Assigned Rider</label>
                        <select className="select select-bordered w-full" value={assignedRider} onChange={e => setAssignedRider(e.target.value)}>
                            <option value="">— Unassigned —</option>
                            {riders.map(r => (
                                <option key={r._id} value={r._id}>{r.name} ({r.mobile})</option>
                            ))}
                        </select>
                    </div>

                    {/* Products section */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-2">📦 Products</label>

                        {/* Product list */}
                        <div className="space-y-2 mb-3">
                            {products.map((p, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                                    <Package size={14} className="text-gray-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                                        <p className="text-xs text-gray-400">₹{p.price} / unit · subtotal ₹{(p.price * p.quantity).toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button type="button" className="btn btn-xs btn-circle btn-ghost border border-gray-200"
                                            onClick={() => changeQty(idx, -1)} disabled={p.quantity <= 1}>
                                            <Minus size={12} />
                                        </button>
                                        <span className="font-bold w-6 text-center text-sm">{p.quantity}</span>
                                        <button type="button" className="btn btn-xs btn-circle btn-ghost border border-gray-200"
                                            onClick={() => changeQty(idx, 1)}>
                                            <Plus size={12} />
                                        </button>
                                        <button type="button" className="btn btn-xs btn-circle btn-ghost text-red-400 hover:bg-red-50"
                                            onClick={() => removeProduct(idx)}>
                                            <X size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {products.length === 0 && (
                                <div className="text-center text-gray-400 text-sm py-4 border border-dashed rounded-xl">
                                    No products. Search below to add.
                                </div>
                            )}
                        </div>

                        {/* Product search */}
                        <div className="relative">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    className="input input-bordered input-sm w-full pl-8"
                                    placeholder="Search products to add…"
                                    value={productSearch}
                                    onChange={e => setProductSearch(e.target.value)}
                                />
                            </div>
                            {(searchResults.length > 0 || searching) && (
                                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 z-20 max-h-48 overflow-y-auto">
                                    {searching && <p className="text-xs text-gray-400 p-3">Searching…</p>}
                                    {searchResults.map(p => (
                                        <button key={p._id} type="button"
                                            className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between gap-2"
                                            onClick={() => addProduct(p)}>
                                            <span className="text-sm font-medium">{p.name}</span>
                                            <span className="text-xs text-gray-400 shrink-0">₹{p.price}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">📝 Admin Notes</label>
                        <textarea
                            className="textarea textarea-bordered w-full text-sm"
                            rows={2}
                            placeholder="Internal notes about this order…"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>

                    {/* Live total */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-blue-700 font-medium flex items-center gap-1.5">
                            <IndianRupee size={14} /> Updated Order Total
                        </span>
                        <span className="text-xl font-bold text-blue-800">₹{liveTotal.toFixed(2)}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
                    <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button
                        type="button"
                        className="btn btn-primary gap-2"
                        onClick={handleSave}
                        disabled={saving || products.length === 0}
                    >
                        {saving ? <span className="loading loading-spinner loading-xs" /> : <Save size={16} />}
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Main Orders Component ─────────────────────────────────────────────────────
export const Orders = () => {
    const queryClient = useQueryClient();
    const { filters: globalFilters } = useFilters();
    const [filterStatus, setFilterStatus] = useState('');
    const [search, setSearch] = useState('');

    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedRiderId, setSelectedRiderId] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [page, setPage] = useState(1);
    const limit = 20;

    const { data: ordersData, isLoading } = useQuery({
        queryKey: ['orders', 'ONE_TIME', filterStatus, page, globalFilters],
        queryFn: () => getOrders({ status: filterStatus, orderType: 'ONE_TIME', page, limit, ...globalFilters })
    });
    const orders = ordersData?.result || [];
    const pagination = ordersData?.pagination || {};

    const { data: ridersData } = useQuery({ queryKey: ['riders'], queryFn: getAllRiders });
    const riders = ridersData?.result || [];

    const statusMutation = useMutation({
        mutationFn: ({ id, status }) => updateOrderStatus(id, status),
        onSuccess: () => { queryClient.invalidateQueries(['orders']); toast.success('Order updated'); },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to update order'),
    });

    const assignMutation = useMutation({
        mutationFn: ({ id, riderId }) => assignRider(id, riderId),
        onSuccess: () => {
            queryClient.invalidateQueries(['orders']);
            setIsAssignModalOpen(false);
            setSelectedRiderId('');
            toast.success('Rider assigned');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to assign rider'),
    });

    const updateOrderMutation = useMutation({
        mutationFn: ({ id, data }) => updateOrder({ id, data }),
        onSuccess: () => {
            queryClient.invalidateQueries(['orders']);
            setIsEditModalOpen(false);
            toast.success('Order updated successfully');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to update order'),
    });

    const handleStatusUpdate = (id, status) => {
        if (window.confirm(`Mark this order as ${status}?`)) statusMutation.mutate({ id, status });
    };

    const openAssignModal = (order) => {
        setSelectedOrder(order);
        setSelectedRiderId(order.assignedRider?._id || '');
        setIsAssignModalOpen(true);
    };

    const openEditModal = (order) => {
        setSelectedOrder(order);
        setIsEditModalOpen(true);
    };

    const filteredOrders = orders.filter(order =>
        order.orderId?.toString().includes(search) ||
        order.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        order.customer?.mobile?.includes(search)
    );

    if (isLoading) return <div className="p-8 text-center">Loading Orders...</div>;

    return (
        <div className="space-y-6 p-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Manage Orders</h1>
                    <p className="text-gray-500 text-sm">Review, assign, and update one-time orders</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="text" placeholder="Search Order ID, Name…"
                            className="input input-bordered pl-10 w-full sm:w-64"
                            value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="select select-bordered" value={filterStatus}
                        onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            {/* Order Cards */}
            <div className="grid gap-4">
                {filteredOrders.length > 0 ? filteredOrders.map(order => (
                    <div key={order._id} className="card bg-base-100 shadow-sm border border-base-200">
                        <div className="card-body p-4">
                            <div className="flex flex-col lg:flex-row justify-between gap-6">

                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="font-mono font-bold text-lg">#{order.orderId || order._id?.slice(-6)}</span>
                                        <div className={`badge ${statusBadge(order.status)} uppercase text-xs font-bold`}>{order.status}</div>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
                                            {order.paymentStatus}
                                        </span>
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                            <Clock size={12} /> {new Date(order.createdAt).toLocaleDateString('en-GB')}
                                        </span>
                                        {order.deliveryDate && (
                                            <span className="text-xs text-blue-600 flex items-center gap-1">
                                                📅 Deliver: {new Date(order.deliveryDate).toLocaleDateString('en-GB')}
                                                {order.deliverySlot?.label && (
                                                    <span className="badge badge-xs badge-info ml-1">
                                                        {order.deliverySlot.label} ({order.deliverySlot.startTime}–{order.deliverySlot.endTime})
                                                    </span>
                                                )}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 font-medium text-gray-700">
                                                <User size={14} /> {order.customer?.name}
                                            </div>
                                            <div className="flex items-start gap-2 text-gray-500">
                                                <MapPin size={14} className="mt-0.5" />
                                                <span className="line-clamp-2">{order.customer?.address?.fullAddress || 'No Address'}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-start gap-2">
                                                <ShoppingCart size={14} className="mt-0.5 text-gray-400" />
                                                <div className="flex-1">
                                                    {order.products?.map((p, idx) => (
                                                        <span key={idx} className="block text-gray-700">
                                                            {p.quantity} × {p.product?.name || 'Item'}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="font-bold text-gray-800 ml-6">
                                                Total: ₹{order.totalAmount}
                                            </div>
                                            {order.notes && (
                                                <div className="text-xs text-gray-400 ml-6 italic">📝 {order.notes}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:w-1/3 lg:justify-end border-t lg:border-t-0 pt-4 lg:pt-0">
                                    <div className="min-w-[140px]">
                                        <p className="text-xs text-gray-500 mb-1">Assigned Rider</p>
                                        {order.assignedRider ? (
                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg">
                                                <Truck size={14} /> {order.assignedRider.name}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-sm italic">Unassigned</span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto">
                                        {order.status === 'pending' && (
                                            <>
                                                <button onClick={() => handleStatusUpdate(order._id, 'confirmed')}
                                                    className="btn btn-sm btn-success text-white" disabled={statusMutation.isPending}>
                                                    <CheckCircle size={16} /> Confirm
                                                </button>
                                                <button onClick={() => handleStatusUpdate(order._id, 'cancelled')}
                                                    className="btn btn-sm btn-error text-white" disabled={statusMutation.isPending}>
                                                    <XCircle size={16} /> Reject
                                                </button>
                                            </>
                                        )}
                                        {order.status === 'confirmed' && (
                                            <button onClick={() => openAssignModal(order)} className="btn btn-sm btn-info text-white">
                                                <Truck size={16} /> Assign Rider
                                            </button>
                                        )}
                                        {order.status === 'out_for_delivery' && (
                                            <button onClick={() => handleStatusUpdate(order._id, 'delivered')} className="btn btn-sm btn-primary">
                                                Mark Delivered
                                            </button>
                                        )}
                                        {/* Edit — always visible for admin */}
                                        <button className="btn btn-sm btn-outline gap-1" title="Edit Order"
                                            onClick={() => openEditModal(order)}>
                                            <Edit size={14} /> Edit
                                        </button>
                                        {order.status === 'confirmed' && (
                                            <button onClick={() => handleStatusUpdate(order._id, 'cancelled')}
                                                className="btn btn-sm btn-ghost text-red-500 hover:bg-red-50" title="Cancel Order">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-10 bg-white rounded-lg border border-dashed">
                        <p className="text-gray-500">No orders found matching your criteria.</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pagination?.pages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                    <button className="btn btn-sm btn-outline" disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
                    <span className="text-sm font-medium">Page {pagination.page} of {pagination.pages}</span>
                    <button className="btn btn-sm btn-outline" disabled={page === pagination.pages}
                        onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}>Next</button>
                </div>
            )}

            {/* Assign Rider Modal */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold mb-4">Assign Rider</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Order <span className="font-mono font-bold">#{selectedOrder?.orderId}</span>
                        </p>
                        <form onSubmit={e => { e.preventDefault(); if (!selectedRiderId) return toast.error('Select a rider'); assignMutation.mutate({ id: selectedOrder._id, riderId: selectedRiderId }); }}>
                            <div className="form-control mb-6">
                                <label className="label">Select Rider</label>
                                <select className="select select-bordered w-full" value={selectedRiderId}
                                    onChange={e => setSelectedRiderId(e.target.value)} required>
                                    <option value="">-- Choose a Rider --</option>
                                    {riders.map(r => (
                                        <option key={r._id} value={r._id}>{r.name} ({r.mobile})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" className="btn btn-ghost" onClick={() => setIsAssignModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={!selectedRiderId || assignMutation.isPending}>
                                    {assignMutation.isPending ? 'Assigning…' : 'Assign Rider'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Order Modal */}
            {isEditModalOpen && selectedOrder && (
                <EditOrderModal
                    order={selectedOrder}
                    riders={riders}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={(data) => updateOrderMutation.mutateAsync({ id: selectedOrder._id, data })}
                />
            )}
        </div>
    );
};