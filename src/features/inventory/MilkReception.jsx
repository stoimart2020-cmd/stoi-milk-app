import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getVendors, addMilkCollection, getMilkCollectionHistory } from "../../shared/api/vendors";
import { queryClient } from "../../shared/utils/queryClient";
import { Plus, Search, Calendar } from "lucide-react";
import { toast } from "react-hot-toast";

export const MilkReception = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedShift, setSelectedShift] = useState("Morning");

    // Fetch Vendors for dropdown
    const { data: vendorsData } = useQuery({ queryKey: ["vendors"], queryFn: getVendors });
    const vendors = vendorsData?.result || [];

    // Fetch history for the selected date
    const { data: historyData } = useQuery({
        queryKey: ["milkCollection", selectedDate],
        queryFn: () => getMilkCollectionHistory({ startDate: selectedDate, endDate: selectedDate })
    });
    const collections = historyData?.result || [];

    const addMutation = useMutation({
        mutationFn: addMilkCollection,
        onSuccess: () => {
            queryClient.invalidateQueries(["milkCollection"]);
            toast.success("Entry added");
        },
        onError: (err) => toast.error(err.message)
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const vendorId = formData.get("vendor");
        const vendor = vendors.find(v => v._id === vendorId);

        const qty = Number(formData.get("quantity"));
        const rate = Number(formData.get("rate"));

        addMutation.mutate({
            vendor: vendorId,
            date: selectedDate,
            shift: selectedShift,
            quantity: qty,
            impurities: formData.get("impurities"), // Optional
            fat: Number(formData.get("fat") || 0),
            snf: Number(formData.get("snf") || 0),
            rate: rate,
            totalAmount: qty * rate,
            notes: formData.get("notes")
        });

        e.target.reset();
    };

    return (
        <div className="p-4 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold">Milk Reception</h2>
                    <p className="text-sm text-gray-500">Record daily milk collection from vendors</p>
                </div>
                <div className="flex gap-2 items-center bg-white p-2 rounded-lg border">
                    <Calendar size={16} className="text-gray-400" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="text-sm outline-none"
                    />
                    <select
                        value={selectedShift}
                        onChange={(e) => setSelectedShift(e.target.value)}
                        className="select select-xs select-ghost"
                    >
                        <option>Morning</option>
                        <option>Evening</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="lg:col-span-1">
                    <div className="card bg-white shadow-sm border border-gray-100">
                        <div className="card-body p-4">
                            <h3 className="font-bold text-gray-700 mb-4">New Entry</h3>
                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div className="form-control">
                                    <label className="label-text text-xs mb-1">Vendor</label>
                                    <select name="vendor" required className="select select-sm select-bordered w-full">
                                        <option value="">Select Vendor</option>
                                        {vendors.map(v => (
                                            <option key={v._id} value={v._id}>
                                                {v.code} - {v.name} (₹{v.ratePerLiter})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="form-control">
                                        <label className="label-text text-xs mb-1">Quantity (Liters)</label>
                                        <input name="quantity" type="number" step="0.01" required className="input input-sm input-bordered" placeholder="0.00" />
                                    </div>
                                    <div className="form-control">
                                        <label className="label-text text-xs mb-1">Rate (₹/L)</label>
                                        <input name="rate" type="number" step="0.01" required className="input input-sm input-bordered" placeholder="0.00" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="form-control">
                                        <label className="label-text text-xs mb-1">Fat %</label>
                                        <input name="fat" type="number" step="0.1" className="input input-sm input-bordered" placeholder="0.0" />
                                    </div>
                                    <div className="form-control">
                                        <label className="label-text text-xs mb-1">SNF %</label>
                                        <input name="snf" type="number" step="0.1" className="input input-sm input-bordered" placeholder="0.0" />
                                    </div>
                                </div>

                                <div className="form-control">
                                    <label className="label-text text-xs mb-1">Notes</label>
                                    <textarea name="notes" className="textarea textarea-bordered textarea-xs h-16" placeholder="Quality checks, etc."></textarea>
                                </div>

                                <button type="submit" className="btn btn-primary w-full text-white" disabled={addMutation.isPending}>
                                    {addMutation.isPending ? "Saving..." : "Save Entry"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* History Table */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden h-full">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">Today's Collection</h3>
                            <div className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Total: {collections.reduce((acc, c) => acc + c.quantity, 0).toFixed(2)} L
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="table table-zebra table-xs w-full">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Vendor</th>
                                        <th>Shift</th>
                                        <th className="text-right">Qty (L)</th>
                                        <th className="text-right">Fat / SNF</th>
                                        <th className="text-right">Rate</th>
                                        <th className="text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {collections.length === 0 ? (
                                        <tr><td colSpan="7" className="text-center py-8 text-gray-500">No entries for this date</td></tr>
                                    ) : (
                                        collections.map(c => (
                                            <tr key={c._id}>
                                                <td className="font-mono text-gray-500">
                                                    {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td>
                                                    <div className="font-bold">{c.vendor?.name}</div>
                                                    <div className="text-[10px] text-gray-400">{c.vendor?.code}</div>
                                                </td>
                                                <td>
                                                    <span className={`badge badge-ghost badge-xs ${c.shift === 'Morning' ? 'text-orange-500' : 'text-blue-500'}`}>
                                                        {c.shift}
                                                    </span>
                                                </td>
                                                <td className="text-right font-bold">{c.quantity}</td>
                                                <td className="text-right">{c.fat} / {c.snf}</td>
                                                <td className="text-right">₹{c.rate}</td>
                                                <td className="text-right font-mono">₹{c.totalAmount.toFixed(2)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
