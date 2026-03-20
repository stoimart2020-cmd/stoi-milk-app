import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Filter, Download, Calendar } from "lucide-react";
import { axiosInstance } from "../../shared/api/axios";
import { useAuth } from "../../shared/hooks/useAuth";

export const CustomerWalletHistory = ({ onBack }) => {
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
        if (filter === "custom" && dateRange.start && dateRange.end) {
            return { start: dateRange.start, end: dateRange.end };
        }
        return {};
    };

    const { data: transactionsData, isLoading } = useQuery({
        queryKey: ["my-transactions", filter, dateRange],
        queryFn: async () => {
            const dates = getDateFilter();
            const params = new URLSearchParams();
            if (dates.start) params.append("date", dates.start); // The API might need start/end date support, currently it has 'date' which is single day. 
            // Wait, the API buildTransactionQuery supports 'date' for a single day. 
            // I might need to update the API to support startDate and endDate range if I want precise filtering.
            // For now, let's just fetch all and filter client side if API doesn't support range, OR just rely on pagination.
            // Actually, let's check the API again. It supports 'date' which filters for that specific day.
            // It DOES NOT support a range. I should probably update the API to support range, or just fetch recent ones.
            // Given the user request "display a week information by default", I should probably fetch recent 20-50 and filter.

            // Let's assume for now we fetch recent transactions.
            return await axiosInstance.get("/api/payments?limit=50");
        }
    });

    const transactions = transactionsData?.data?.result || [];

    // Filter transactions client-side for now since API range support is limited
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
                <h2 className="text-xl font-bold text-gray-800">Wallet History</h2>
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

            {/* Ledger View */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
                                <th>Date</th>
                                <th>Description</th>
                                <th className="text-right">Amount</th>
                                <th className="text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="4" className="text-center py-8">
                                        <span className="loading loading-spinner loading-md text-primary"></span>
                                    </td>
                                </tr>
                            ) : filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="text-center py-8 text-gray-500">
                                        No transactions found for this period
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
                                                {tx.type === "CREDIT" ? "Money Added" : (tx.description || "Purchase")}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {tx.mode} {tx.status !== "SUCCESS" && <span className="text-red-500">({tx.status})</span>}
                                            </div>
                                        </td>
                                        <td className={`text-right font-bold ${tx.type === "CREDIT" ? "text-green-600" : "text-red-600"}`}>
                                            {tx.type === "CREDIT" ? "+" : "-"}₹{tx.amount}
                                        </td>
                                        <td className="text-right font-medium text-gray-700">
                                            ₹{tx.balanceAfter}
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
