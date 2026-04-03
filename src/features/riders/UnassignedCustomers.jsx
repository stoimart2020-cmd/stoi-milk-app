import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getUnassignedCustomers } from "../../shared/api/riders";
import {
    ArrowLeft,
    Search,
    UserX,
    Phone,
    MapPin,
    Package,
    ExternalLink,
    Loader,
    AlertTriangle,
    RefreshCw
} from "lucide-react";

export const UnassignedCustomers = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");

    const { data, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ["unassigned-customers"],
        queryFn: getUnassignedCustomers,
        staleTime: 30_000
    });

    const customers = data?.result || [];
    const total = data?.total || 0;

    const filtered = customers.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.mobile?.includes(searchTerm) ||
        c.customerId?.toString().includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center">
                            <UserX size={22} className="text-amber-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Unassigned Customers</h1>
                            <p className="text-gray-500 text-sm mt-0.5">
                                Active subscriptions with no delivery rider assigned
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                        {total} customer{total !== 1 ? "s" : ""}
                    </span>
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={isFetching ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Alert Banner */}
            {total > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
                    <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-amber-800">
                            {total} customer{total !== 1 ? "s have" : " has"} active subscriptions but no delivery rider assigned.
                        </p>
                        <p className="text-xs text-amber-600 mt-0.5">
                            Go to each customer's subscription to assign a rider, or update the subscription directly.
                        </p>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, mobile, or ID..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Service Area</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subscriptions</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Wallet</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <Loader className="animate-spin text-amber-500 mx-auto mb-2" size={28} />
                                        <p className="text-gray-500 text-sm">Loading unassigned customers...</p>
                                    </td>
                                </tr>
                            ) : isError ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <p className="text-red-500 font-medium">Failed to load customers</p>
                                        <button onClick={() => refetch()} className="mt-2 text-sm text-amber-600 underline">
                                            Try again
                                        </button>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <UserX size={36} className="text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 font-medium">
                                            {searchTerm ? "No customers match your search" : "All customers have a delivery rider assigned! 🎉"}
                                        </p>
                                        {searchTerm && (
                                            <button onClick={() => setSearchTerm("")} className="mt-1 text-sm text-amber-600 underline">
                                                Clear search
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(customer => (
                                    <tr key={customer._id} className="hover:bg-gray-50/50 transition-colors group">
                                        {/* Customer */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                                    {customer.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{customer.name}</p>
                                                    <p className="text-xs text-gray-400">ID: {customer.customerId || customer._id?.slice(-6)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Contact */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Phone size={13} className="text-gray-400" />
                                                {customer.mobile || "—"}
                                            </div>
                                        </td>
                                        {/* Service Area */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                <MapPin size={13} className="text-gray-400" />
                                                {customer.serviceArea?.name || "No Area"}
                                            </div>
                                        </td>
                                        {/* Subscriptions */}
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {customer.subscriptions?.length > 0 ? (
                                                    customer.subscriptions.slice(0, 2).map((sub, i) => (
                                                        <div key={i} className="flex items-center gap-1.5">
                                                            <Package size={12} className="text-amber-500 flex-shrink-0" />
                                                            <span className="text-xs text-gray-700 font-medium truncate max-w-[160px]">
                                                                {sub.product?.name || "Unknown Product"}
                                                            </span>
                                                            <span className="text-xs text-gray-400">×{sub.quantity}</span>
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100 font-medium">
                                                                {sub.frequency}
                                                            </span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-400">No subscriptions</span>
                                                )}
                                                {customer.subscriptions?.length > 2 && (
                                                    <p className="text-xs text-gray-400 pl-4">
                                                        +{customer.subscriptions.length - 2} more
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        {/* Wallet */}
                                        <td className="px-6 py-4">
                                            <span className={`text-sm font-semibold ${(customer.walletBalance || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                ₹{customer.walletBalance || 0}
                                            </span>
                                        </td>
                                        {/* Action */}
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => navigate(`/administrator/dashboard/customers/${customer._id}`)}
                                                className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 ml-auto px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all"
                                            >
                                                <ExternalLink size={13} />
                                                View & Assign
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && (
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                        Showing {filtered.length} of {total} unassigned customer{total !== 1 ? "s" : ""}
                    </div>
                )}
            </div>
        </div>
    );
};
