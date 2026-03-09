import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getDailyStockStatus, addProductionLog } from "../../../lib/api/inventory";
import { getAllProducts } from "../../../lib/api/products";
import { queryClient } from "../../../lib/queryClient";
import { Calendar, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";

export const StockAnalytics = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [activeTab, setActiveTab] = useState("overview");

    const { data: statusData, isLoading } = useQuery({
        queryKey: ["inventoryStatus", selectedDate],
        queryFn: () => getDailyStockStatus(selectedDate)
    });

    const { data: productsData } = useQuery({
        queryKey: ["products"],
        queryFn: getAllProducts
    });

    const products = productsData?.result || [];
    const metrics = statusData?.metrics || {};

    const productionMutation = useMutation({
        mutationFn: addProductionLog,
        onSuccess: () => {
            queryClient.invalidateQueries(["inventoryStatus"]);
            toast.success("Production logged");
        },
        onError: (err) => toast.error(err.message)
    });

    const handleProductionSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Build products array from dynamic inputs? 
        // For simplicity, let's assume specific products are selected
        // Or implement a dynamic form array
        const productsProduced = [];
        // Hardcoded for now: Allow user to select products and quantity
        // Actually, let's just make it simple: Add One Entry at a time? No, usually batch.
        // Let's implement a simple "Select Product, Enter Qty" and Add to List
        // But for this MVP, I will just iterate over the form entries if I can.

        // Let's use a simpler approach: Just one product entry for now or rethink the UI.
        // I will use a state for the production entry list.
    };

    // State for production entry
    const [productionEntries, setProductionEntries] = useState([]);

    const addToProduction = (productId, qty) => {
        if (!productId || qty <= 0) return;
        setProductionEntries([...productionEntries, { product: productId, quantityProduced: Number(qty) }]);
    };

    const submitProductionLog = () => {
        if (productionEntries.length === 0) return;
        productionMutation.mutate({
            date: selectedDate,
            productsProduced: productionEntries,
            wastage: 0, // Simplified
            notes: "Manual Entry"
        });
        setProductionEntries([]);
    };

    return (
        <div className="p-4 space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                <div>
                    <h2 className="text-xl font-bold">Stock & Production</h2>
                    <p className="text-sm text-gray-500">Monitor milk flow from collection to sales</p>
                </div>
                <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border">
                    <Calendar size={16} className="text-gray-400" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="text-sm bg-transparent outline-none"
                    />
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat bg-white shadow-sm rounded-lg border-l-4 border-blue-500">
                    <div className="stat-title text-gray-500">Total Collected</div>
                    <div className="stat-value text-blue-600">{metrics.collected?.toFixed(1) || 0} L</div>
                    <div className="stat-desc">Raw Milk Received</div>
                </div>

                <div className="stat bg-white shadow-sm rounded-lg border-l-4 border-purple-500">
                    <div className="stat-title text-gray-500">Forecast Demand</div>
                    <div className="stat-value text-purple-600">{metrics.demand?.toFixed(1) || 0} L</div>
                    <div className="stat-desc">Subscription + Orders</div>
                </div>

                <div className="stat bg-white shadow-sm rounded-lg border-l-4 border-green-500">
                    <div className="stat-title text-gray-500">Total Packed</div>
                    <div className="stat-value text-green-600">{metrics.packed?.toFixed(1) || 0} L</div>
                    <div className="stat-desc">Processed into Products</div>
                </div>

                <div className="stat bg-white shadow-sm rounded-lg border-l-4 border-orange-500">
                    <div className="stat-title text-gray-500">Surplus / Deficit</div>
                    <div className={`stat-value ${metrics.surplus < 0 ? "text-red-500" : "text-orange-600"}`}>
                        {metrics.surplus?.toFixed(1) || 0} L
                    </div>
                    <div className="stat-desc">Packed - Sold</div>
                </div>
            </div>

            {/* Production Log */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <h3 className="font-bold text-lg mb-4">Log Production (Packing)</h3>
                        <div className="flex gap-2 mb-4">
                            <select id="prod-select" className="select select-bordered select-sm w-full max-w-xs">
                                <option value="">Select Product</option>
                                {products.map(p => (
                                    <option key={p._id} value={p._id}>{p.name} ({p.unitValue} {p.unit})</option>
                                ))}
                            </select>
                            <input id="qty-input" type="number" placeholder="Qty" className="input input-bordered input-sm w-24" />
                            <button
                                onClick={() => {
                                    const p = document.getElementById("prod-select").value;
                                    const q = document.getElementById("qty-input").value;
                                    addToProduction(p, q);
                                    document.getElementById("qty-input").value = "";
                                }}
                                className="btn btn-sm btn-primary text-white"
                            >
                                Add
                            </button>
                        </div>

                        {productionEntries.length > 0 && (
                            <div className="overflow-x-auto border rounded-lg mb-4">
                                <table className="table table-xs w-full">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Quantity</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productionEntries.map((entry, idx) => {
                                            const prod = products.find(p => p._id === entry.product);
                                            return (
                                                <tr key={idx}>
                                                    <td>{prod?.name || "Unknown"}</td>
                                                    <td>{entry.quantityProduced}</td>
                                                    <td>
                                                        <button
                                                            onClick={() => setProductionEntries(productionEntries.filter((_, i) => i !== idx))}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                onClick={submitProductionLog}
                                disabled={productionEntries.length === 0 || productionMutation.isPending}
                                className="btn btn-primary text-white"
                            >
                                {productionMutation.isPending ? "Saving..." : "Save Production Log"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-4">
                    <div className="alert alert-info shadow-sm text-sm">
                        <AlertCircle size={16} />
                        <span>Analysis Tip: Ideally, "Total Packed" should match "Forecast Demand" to minimize wastage.</span>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <h4 className="font-bold text-sm text-gray-500 mb-2">Detailed Breakdown</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Collected:</span>
                                <span className="font-mono">{metrics.collected} L</span>
                            </div>
                            <div className="flex justify-between text-red-500">
                                <span>Variance (Loss):</span>
                                <span className="font-mono">{metrics.variance?.toFixed(2)} L</span>
                            </div>
                            <div className="divider my-1"></div>
                            <div className="flex justify-between">
                                <span>Sold (Delivered):</span>
                                <span className="font-mono">{metrics.sold?.toFixed(2)} L</span>
                            </div>
                            <div className="flex justify-between text-green-600 font-bold">
                                <span>Surplus (Inventory):</span>
                                <span className="font-mono">{metrics.surplus?.toFixed(2)} L</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
