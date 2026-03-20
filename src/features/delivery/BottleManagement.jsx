import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, RefreshCw, Search, Plus, Users, ArrowDown, ArrowUp, Eye, X, Minus, ChevronUp, ChevronDown, ChevronsUpDown, Clock, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import {
    getBottleStats,
    getCustomerBottles,
    getCustomerBottleBalance,
    recordBottleTransaction,
    scheduleBottleCollection
} from "../../shared/api/logistics";
import { getAllRiders } from "../../shared/api/riders";

export const BottleManagement = () => {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState("remainingBottles");
    const [sortOrder, setSortOrder] = useState("desc");
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null); // for detail view
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [customerToSchedule, setCustomerToSchedule] = useState(null);
    const limit = 15;

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortBy(field);
            setSortOrder(field === "remainingBottles" ? "desc" : "asc");
        }
        setPage(1);
    };

    const SortIcon = ({ field }) => {
        if (sortBy !== field) return <ChevronsUpDown size={14} className="text-gray-300" />;
        return sortOrder === "asc" ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-primary" />;
    };

    // Fetch stats
    const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
        queryKey: ["bottleStats"],
        queryFn: getBottleStats,
    });

    // Fetch customers with bottle counts
    const { data: customersData, isLoading: customersLoading, refetch: refetchCustomers } = useQuery({
        queryKey: ["customerBottles", search, filter, page, sortBy, sortOrder],
        queryFn: () => getCustomerBottles({ search, filter, page, limit, sortBy, sortOrder }),
    });

    // Fetch selected customer detail (balance + transactions)
    const { data: customerDetailData, isLoading: detailLoading } = useQuery({
        queryKey: ["customerBottleBalance", selectedCustomer?._id],
        queryFn: () => getCustomerBottleBalance(selectedCustomer._id),
        enabled: !!selectedCustomer?._id,
    });

    const stats = statsData?.result || {};
    const customers = customersData?.result || [];
    const pagination = customersData?.pagination || {};

    // Add transaction mutation
    const addMutation = useMutation({
        mutationFn: recordBottleTransaction,
        onSuccess: () => {
            toast.success("Bottle transaction recorded");
            queryClient.invalidateQueries({ queryKey: ["bottleStats"] });
            queryClient.invalidateQueries({ queryKey: ["customerBottles"] });
            queryClient.invalidateQueries({ queryKey: ["customerBottleBalance"] });
            setShowAddModal(false);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to record transaction");
        },
    });

    const scheduleMutation = useMutation({
        mutationFn: scheduleBottleCollection,
        onSuccess: () => {
            toast.success("Bottle collection request created");
            queryClient.invalidateQueries({ queryKey: ["customerBottles"] });
            setShowScheduleModal(false);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to schedule collection");
        },
    });

    const handleRefresh = () => {
        refetchStats();
        refetchCustomers();
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Bottle Tracking</h1>
                    <p className="text-gray-500">Track how many bottles each customer has</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={handleRefresh}>
                        <RefreshCw size={16} className={statsLoading ? "animate-spin" : ""} />
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                        <Plus size={16} /> Add Transaction
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-orange-100 rounded-xl p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-orange-600 text-sm font-medium">Total Outstanding</p>
                            <p className="text-3xl font-bold text-orange-700">{stats.totalOutstanding || 0}</p>
                        </div>
                        <Package className="text-orange-400" size={24} />
                    </div>
                </div>

                <div className="bg-green-100 rounded-xl p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-green-600 text-sm font-medium">Collected Today</p>
                            <p className="text-3xl font-bold text-green-700">{stats.collectedToday || 0}</p>
                        </div>
                        <ArrowDown className="text-green-400" size={24} />
                    </div>
                </div>

                <div className="bg-blue-100 rounded-xl p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-blue-600 text-sm font-medium">Issued Today</p>
                            <p className="text-3xl font-bold text-blue-700">{stats.issuedToday || 0}</p>
                        </div>
                        <ArrowUp className="text-blue-400" size={24} />
                    </div>
                </div>

                <div className="bg-purple-100 rounded-xl p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-purple-600 text-sm font-medium">Customers with Bottles</p>
                            <p className="text-3xl font-bold text-purple-700">{stats.customersWithPending || 0}</p>
                        </div>
                        <Users className="text-purple-400" size={24} />
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search customer by name or mobile..."
                            className="input input-bordered w-full pl-10"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <select
                        className="select select-bordered"
                        value={filter}
                        onChange={(e) => { setFilter(e.target.value); setPage(1); }}
                    >
                        <option value="all">All Customers</option>
                        <option value="with_bottles">With Bottles</option>
                        <option value="no_bottles">No Bottles</option>
                    </select>
                </div>
            </div>

            {/* Customer Bottles Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr className="bg-gray-50">
                                <th>#</th>
                                <th>
                                    <button className="flex items-center gap-1 hover:text-primary transition-colors" onClick={() => handleSort("name")}>
                                        Customer <SortIcon field="name" />
                                    </button>
                                </th>
                                <th>
                                    <button className="flex items-center gap-1 hover:text-primary transition-colors" onClick={() => handleSort("mobile")}>
                                        Mobile <SortIcon field="mobile" />
                                    </button>
                                </th>
                                <th>Area</th>
                                <th>
                                    <button className="flex items-center gap-1 hover:text-primary transition-colors" onClick={() => handleSort("remainingBottles")}>
                                        Bottles <SortIcon field="remainingBottles" />
                                    </button>
                                </th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customersLoading ? (
                                <tr><td colSpan="6" className="text-center py-8">
                                    <span className="loading loading-spinner loading-md"></span>
                                </td></tr>
                            ) : customers.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-gray-500">No customers found</td></tr>
                            ) : (
                                customers.map((c, idx) => (
                                    <tr key={c._id} className="hover">
                                        <td className="text-gray-500">{(page - 1) * limit + idx + 1}</td>
                                        <td className="font-medium">{c.name}</td>
                                        <td className="text-gray-600">{c.mobile}</td>
                                        <td className="text-gray-500 max-w-xs truncate">{c.area}</td>
                                        <td>
                                            <span className={`badge ${c.remainingBottles > 0 ? 'badge-warning' : 'badge-ghost'} font-bold`}>
                                                {c.remainingBottles}
                                            </span>
                                        </td>
                                        <td className="flex gap-1 justify-end">
                                            <button
                                                className="btn btn-ghost btn-xs text-orange-600"
                                                onClick={() => { setCustomerToSchedule(c); setShowScheduleModal(true); }}
                                                title="Schedule Collection"
                                                disabled={c.remainingBottles === 0}
                                            >
                                                <Clock size={14} />
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-xs"
                                                onClick={() => setSelectedCustomer(c)}
                                                title="View Details"
                                            >
                                                <Eye size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="flex justify-between items-center px-4 py-3 border-t">
                        <span className="text-sm text-gray-500">
                            Showing {(page - 1) * limit + 1} - {Math.min(page * limit, pagination.total)} of {pagination.total}
                        </span>
                        <div className="join">
                            <button
                                className="join-item btn btn-sm"
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                «
                            </button>
                            <button className="join-item btn btn-sm">Page {page}</button>
                            <button
                                className="join-item btn btn-sm"
                                disabled={page >= pagination.pages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                »
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Customer Detail Modal */}
            {selectedCustomer && (
                <CustomerDetailModal
                    customer={selectedCustomer}
                    detailData={customerDetailData?.result}
                    isLoading={detailLoading}
                    onClose={() => setSelectedCustomer(null)}
                />
            )}

            {/* Add Transaction Modal */}
            {showAddModal && (
                <AddTransactionModal
                    onClose={() => setShowAddModal(false)}
                    onSave={(data) => addMutation.mutate(data)}
                    isLoading={addMutation.isPending}
                />
            )}

            {/* Schedule Collection Modal */}
            {showScheduleModal && (
                <ScheduleCollectionModal
                    customer={customerToSchedule}
                    onClose={() => setShowScheduleModal(false)}
                    onSave={(data) => scheduleMutation.mutate(data)}
                    isLoading={scheduleMutation.isPending}
                />
            )}
        </div>
    );
};

// ============================
// Schedule Collection Modal
// ============================
const ScheduleCollectionModal = ({ customer, onClose, onSave, isLoading }) => {
    const [preferredDate, setPreferredDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedRider, setSelectedRider] = useState("");
    const [expectedQty, setExpectedQty] = useState(customer.remainingBottles || 1);

    const { data: ridersData, isLoading: ridersLoading } = useQuery({
        queryKey: ["allRiders"],
        queryFn: getAllRiders,
    });

    // Support different response structures commonly found in the codebase
    const activeRiders = (ridersData?.result || ridersData?.data || []).filter(r => r.isActive !== false);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ customerId: customer._id, preferredDate, riderId: selectedRider || null, expectedQty });
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Schedule Collection</h3>
                    <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose}><X size={16} /></button>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg mb-4 text-sm text-orange-800 border border-orange-100">
                    <p className="font-bold">{customer.name}</p>
                    <p>Has <span className="font-bold">{customer.remainingBottles}</span> bottles outstanding.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">
                            <span className="label-text flex items-center gap-2"><Calendar size={14} /> Collection Date</span>
                        </label>
                        <input
                            type="date"
                            className="input input-bordered w-full"
                            required
                            min={new Date().toISOString().split('T')[0]}
                            value={preferredDate}
                            onChange={(e) => setPreferredDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="label">
                            <span className="label-text flex items-center gap-2"><Package size={14} /> Quantity to Collect</span>
                        </label>
                        <input
                            type="number"
                            className="input input-bordered w-full"
                            required
                            min="1"
                            value={expectedQty}
                            onChange={(e) => setExpectedQty(parseInt(e.target.value) || 0)}
                        />
                    </div>

                    <div>
                        <label className="label">
                            <span className="label-text flex items-center gap-2"><Users size={14} /> Assign Rider (Optional)</span>
                        </label>
                        {ridersLoading ? (
                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                <span className="loading loading-spinner loading-xs border-primary"></span>
                                <span className="text-sm text-gray-500">Loading riders...</span>
                            </div>
                        ) : (
                            <select
                                className="select select-bordered w-full"
                                value={selectedRider}
                                onChange={(e) => setSelectedRider(e.target.value)}
                            >
                                <option value="">Auto-assign or No specific rider</option>
                                {activeRiders.map((rider) => (
                                    <option key={rider._id} value={rider._id}>
                                        {rider.name} ({rider.mobile})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="modal-action">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? "Scheduling..." : "Schedule Request"}
                        </button>
                    </div>
                </form>
            </div>
            <div className="modal-backdrop" onClick={onClose}></div>
        </div>
    );
};

// ============================
// Customer Detail Modal
// ============================
const CustomerDetailModal = ({ customer, detailData, isLoading, onClose }) => {
    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Bottle History</h3>
                    <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose}><X size={16} /></button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <span className="loading loading-spinner loading-md"></span>
                    </div>
                ) : detailData ? (
                    <div className="space-y-4">
                        {/* Customer Info */}
                        <div className="bg-gray-50 rounded-lg p-4 flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-lg">{detailData.customer.name}</h4>
                                <span className="text-gray-500">{detailData.customer.mobile}</span>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Remaining Bottles</p>
                                <p className={`text-3xl font-bold ${detailData.customer.remainingBottles > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                    {detailData.customer.remainingBottles}
                                </p>
                            </div>
                        </div>

                        {/* Recent Transactions */}
                        <div>
                            <h5 className="font-medium text-gray-700 mb-2">Recent Transactions</h5>
                            {detailData.recentTransactions.length === 0 ? (
                                <p className="text-center text-gray-400 py-4">No transactions yet</p>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-auto">
                                    {detailData.recentTransactions.map((t) => (
                                        <div key={t._id} className="flex justify-between items-center text-sm bg-white p-3 rounded-lg border border-gray-100">
                                            <div className="flex items-center gap-2">
                                                <span className={`badge badge-sm ${t.type === 'issued' ? 'badge-info' : t.type === 'returned' ? 'badge-success' : 'badge-warning'}`}>
                                                    {t.type}
                                                </span>
                                                <span className="text-gray-600">{t.notes || "-"}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className={`font-bold ${t.type === 'issued' ? 'text-blue-600' : 'text-green-600'}`}>
                                                    {t.type === 'issued' ? '+' : '-'}{t.quantity}
                                                </span>
                                                <span className="text-gray-400 ml-2 text-xs">
                                                    {new Date(t.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-gray-400 py-4">Failed to load details</p>
                )}
            </div>
            <div className="modal-backdrop" onClick={onClose}></div>
        </div>
    );
};

// ============================
// Add Transaction Modal
// ============================
const AddTransactionModal = ({ onClose, onSave, isLoading }) => {
    const [formData, setFormData] = useState({
        customerId: "",
        type: "returned",
        quantity: 1,
        notes: "",
    });
    const [customerSearch, setCustomerSearch] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // Search customers from the bottle list
    const { data: customersData } = useQuery({
        queryKey: ["customerBottles", customerSearch],
        queryFn: () => getCustomerBottles({ search: customerSearch, limit: 10 }),
        enabled: customerSearch.length > 2,
    });

    const customers = customersData?.result || [];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedCustomer) {
            toast.error("Please select a customer");
            return;
        }
        onSave({ ...formData, customerId: selectedCustomer._id });
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-md">
                <h3 className="font-bold text-lg mb-4">Add Bottle Transaction</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                        <input
                            type="text"
                            placeholder="Search customer..."
                            className="input input-bordered w-full"
                            value={customerSearch}
                            onChange={(e) => { setCustomerSearch(e.target.value); setSelectedCustomer(null); }}
                        />
                        {customerSearch.length > 2 && customers.length > 0 && !selectedCustomer && (
                            <div className="mt-1 bg-white border rounded-lg shadow-lg max-h-32 overflow-auto">
                                {customers.map((c) => (
                                    <div
                                        key={c._id}
                                        className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm flex justify-between"
                                        onClick={() => {
                                            setSelectedCustomer(c);
                                            setCustomerSearch(c.name);
                                        }}
                                    >
                                        <span>{c.name} - {c.mobile}</span>
                                        <span className="badge badge-sm badge-warning">{c.remainingBottles} bottles</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {selectedCustomer && (
                            <div className="mt-1 text-sm text-green-600">
                                Selected: {selectedCustomer.name} (Current: {selectedCustomer.remainingBottles} bottles)
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                        <select
                            className="select select-bordered w-full"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        >
                            <option value="returned">Returned</option>
                            <option value="issued">Issued</option>
                            <option value="adjustment">Adjustment</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                        <input
                            type="number"
                            min="1"
                            className="input input-bordered w-full"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            className="textarea textarea-bordered w-full"
                            placeholder="Optional notes..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <div className="modal-action">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Save Transaction"}
                        </button>
                    </div>
                </form>
            </div>
            <div className="modal-backdrop" onClick={onClose}></div>
        </div>
    );
};
