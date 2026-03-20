import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Filter, Download, Calendar } from "lucide-react";
import { axiosInstance } from "../../shared/api/axios";
import { useAuth } from "../../shared/hooks/useAuth";

export const CustomerBottleHistory = ({ onBack }) => {
    const { data: userData } = useAuth();
    const [filter, setFilter] = useState("this_week"); // this_week, last_week, all
    const [dateRange, setDateRange] = useState({ start: "", end: "" });

    const getDateFilter = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (filter === "this_week") {
            const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
            const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6));
            return { start: firstDay.toISOString(), end: lastDay.toISOString() };
        }
        if (filter === "last_week") {
            const firstDay = new Date(today.setDate(today.getDate() - today.getDay() - 7));
            const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6));
            return { start: firstDay.toISOString(), end: lastDay.toISOString() };
        }
        return {};
    };

    const { data: transactionsData, isLoading } = useQuery({
        queryKey: ["my-bottle-transactions", filter, dateRange],
        queryFn: async () => {
            // Fetch recent bottle transactions
            return await axiosInstance.get("/api/bottles?limit=50");
        }
    });

    const transactions = transactionsData?.data?.result || [];

    // Filter transactions client-side
    const filteredTransactions = transactions.filter(tx => {
        if (filter === "all") return true;
        const txDate = new Date(tx.createdAt);
        const dates = getDateFilter();
        if (!dates.start) return true;
        return txDate >= new Date(dates.start) && txDate <= new Date(dates.end || new Date());
    });

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <button onClick={onBack} className="btn btn-ghost btn-circle btn-sm">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-xl font-bold text-gray-800">Bottle History</h2>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                    onClick={() => setFilter("this_week")}
                    className={`btn btn-sm ${filter === "this_week" ? "btn-primary text-white" : "btn-ghost bg-gray-100"}`}
                >
                    This Week
                </button>
                <button
                    onClick={() => setFilter("last_week")}
                    className={`btn btn-sm ${filter === "last_week" ? "btn-primary text-white" : "btn-ghost bg-gray-100"}`}
                >
                    Last Week
                </button>
                <button
                    onClick={() => setFilter("all")}
                    className={`btn btn-sm ${filter === "all" ? "btn-primary text-white" : "btn-ghost bg-gray-100"}`}
                >
                    All Time
                </button>
            </div>

            {/* Bottle Ledger View */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
                                <th>Date</th>
                                <th>Product</th>
                                <th className="text-center">Issued</th>
                                <th className="text-center">Returned</th>
                                <th className="text-center">Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-8">
                                        <span className="loading loading-spinner loading-md text-primary"></span>
                                    </td>
                                </tr>
                            ) : filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-8 text-gray-500">
                                        No bottle transactions found
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((tx) => (
                                    <tr key={tx._id} className="hover:bg-gray-50">
                                        <td className="text-xs">
                                            <div className="font-medium">
                                                {new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                            </div>
                                            <div className="text-gray-400 text-[10px]">
                                                {new Date(tx.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="text-sm font-medium text-gray-800">
                                                {tx.product?.name || "General"}
                                            </div>
                                            {tx.notes && <div className="text-xs text-gray-500">{tx.notes}</div>}
                                        </td>
                                        <td className="text-center font-medium text-orange-600">
                                            {tx.type === "issued" ? tx.quantity : "-"}
                                        </td>
                                        <td className="text-center font-medium text-green-600">
                                            {tx.type === "returned" ? tx.quantity : "-"}
                                        </td>
                                        <td className="text-center">
                                            <span className={`badge badge-xs ${tx.type === "issued" ? "badge-warning" :
                                                    tx.type === "returned" ? "badge-success" : "badge-ghost"
                                                }`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
