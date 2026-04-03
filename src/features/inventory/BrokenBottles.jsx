import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { axiosInstance } from "../../shared/api/axios";
import { queryClient } from "../../shared/utils/queryClient";
import { format } from "date-fns";
import { 
    AlertTriangle, 
    RotateCcw, 
    Search, 
    Filter, 
    Download,
    User,
    Calendar,
    Package,
    ArrowLeft
} from "lucide-react";
import toast from "react-hot-toast";

export const BrokenBottles = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("all"); // all, broken, unreturned_penalty

    // Fetch Bottle Transactions
    const { data: transactionsData, isLoading, refetch } = useQuery({
        queryKey: ["bottle-transactions", typeFilter],
        queryFn: async () => {
            const params = {
                type: typeFilter !== "all" ? typeFilter : undefined,
                limit: 200
            };
            const response = await axiosInstance.get("/api/bottles/transactions", { params });
            return response.data;
        }
    });

    const transactions = (transactionsData?.result || []).filter(t => 
        ['broken', 'unreturned_penalty'].includes(t.type)
    );

    const filteredTransactions = transactions.filter(t => 
        t.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Reverse Penalty Mutation
    const reverseMutation = useMutation({
        mutationFn: async (transactionId) => {
            const response = await axiosInstance.post(`/api/bottles/reverse-penalty/${transactionId}`);
            return response.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || "Penalty reversed successfully");
            queryClient.invalidateQueries({ queryKey: ["bottle-transactions"] });
            queryClient.invalidateQueries({ queryKey: ["riderBottleStats"] });
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to reverse penalty");
        }
    });

    const handleReverse = (id) => {
        if (window.confirm("Are you sure you want to reverse this penalty? This will refund the amount to the customer's wallet and move the bottle back to 'Pending' status.")) {
            reverseMutation.mutate(id);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <AlertTriangle className="text-orange-500" /> Bottle Penalty Management
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage broken bottle charges and automated Sunday penalties</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-outline btn-sm gap-2">
                        <Download size={16} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search customer or product..." 
                        className="input input-bordered w-full pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-gray-400" />
                    <select 
                        className="select select-bordered w-full"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                    >
                        <option value="all">All Penalty Types</option>
                        <option value="broken">Broken Bottle Reports</option>
                        <option value="unreturned_penalty">Sunday Unreturned Penalties</option>
                    </select>
                </div>
                <div className="flex items-center justify-end">
                    <div className="stats stats-vertical lg:stats-horizontal shadow-sm bg-base-100 border">
                        <div className="stat py-2 px-4 text-center">
                            <div className="stat-title text-[10px] uppercase font-bold">Total Penalties</div>
                            <div className="stat-value text-lg text-orange-600">₹{transactions.reduce((sum, t) => sum + (t.penaltyAmount || 0), 0)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th>Date & Customer</th>
                                <th>Reason</th>
                                <th>Product</th>
                                <th>Quantity</th>
                                <th>Amt Deducted</th>
                                <th className="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-12 text-gray-400 italic">
                                        No penalty transactions found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((t) => (
                                    <tr key={t._id} className="hover">
                                        <td>
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mt-1">
                                                    <User size={14} className="text-indigo-500" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-800">{t.customer?.name}</div>
                                                    <div className="text-[11px] text-gray-500 flex items-center gap-1">
                                                        <Calendar size={10} /> {format(new Date(t.createdAt), "dd MMM yyyy, hh:mm a")}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge badge-sm font-bold ${
                                                t.type === 'broken' ? 'badge-error' : 'badge-warning'
                                            }`}>
                                                {t.type === 'broken' ? 'BROKEN' : 'UNRETURNED'}
                                            </span>
                                            {t.notes && <p className="text-[10px] text-gray-500 mt-1 max-w-[150px] truncate" title={t.notes}>{t.notes}</p>}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <Package size={14} className="text-gray-400" />
                                                <span className="text-sm">{t.product?.name || "Global"}</span>
                                            </div>
                                        </td>
                                        <td className="font-bold">{t.quantity}</td>
                                        <td>
                                            <div className="text-red-600 font-black">₹{t.penaltyAmount || 0}</div>
                                        </td>
                                        <td className="text-right">
                                            <button 
                                                className="btn btn-sm btn-ghost text-indigo-600 gap-1 hover:bg-indigo-50"
                                                onClick={() => handleReverse(t._id)}
                                                disabled={reverseMutation.isPending}
                                            >
                                                <RotateCcw size={14} /> Reverse
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Help/Info */}
            <div className="alert bg-gray-50 border border-gray-200">
                <div className="flex gap-3">
                    <AlertTriangle className="text-gray-400 shrink-0" size={20} />
                    <div>
                        <h4 className="font-bold text-sm">About Penalty Reversals</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Reversing a penalty will:
                            1. Credit the penalized amount back to the customer's wallet.
                            2. Log a 'penalty_reversed' transaction for auditing.
                            3. Move the bottles back to 'Pending' so the system can track them for return again.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
