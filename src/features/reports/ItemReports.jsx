import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { axiosInstance as axios } from "../../shared/api/axios";
import {
    Download, Package, TrendingUp, ShoppingCart,
    DollarSign, AlertTriangle, Search, ChevronDown, ChevronUp
} from "lucide-react";
import * as XLSX from 'xlsx';
import toast from "react-hot-toast";

const ItemReports = ({ dateRange, customDateRange }) => {
    const [activeReport, setActiveReport] = useState("product_sales");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState("totalRevenue");
    const [sortDir, setSortDir] = useState("desc");

    let queryParams = `period=${dateRange}`;
    if (dateRange === 'custom' && customDateRange?.start && customDateRange?.end) {
        queryParams += `&startDate=${customDateRange.start}&endDate=${customDateRange.end}`;
    }

    const { data: productSalesData, isLoading: loadingProductSales } = useQuery({
        queryKey: ["report-product-sales", dateRange, customDateRange],
        queryFn: async () => {
            const res = await axios.get(`/api/analytics/reports/product-sales?${queryParams}`);
            return res.data;
        },
        enabled: activeReport === "product_sales"
    });

    const { data: rateListData, isLoading: loadingRateList } = useQuery({
        queryKey: ["report-rate-list"],
        queryFn: async () => {
            const res = await axios.get("/api/analytics/reports/rate-list");
            return res.data;
        },
        enabled: activeReport === "rate_list"
    });

    const { data: stockData, isLoading: loadingStock } = useQuery({
        queryKey: ["report-stock-summary"],
        queryFn: async () => {
            const res = await axios.get("/api/analytics/reports/stock-summary");
            return res.data;
        },
        enabled: activeReport === "stock_summary"
    });

    const exportToExcel = (data, filename) => {
        try {
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Report");
            XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("Report exported!");
        } catch { toast.error("Export failed"); }
    };

    const reports = [
        { id: "product_sales", label: "Product Sales Summary", icon: ShoppingCart },
        { id: "rate_list", label: "Rate List", icon: DollarSign },
        { id: "stock_summary", label: "Stock Summary", icon: Package },
    ];

    const handleSort = (field) => {
        if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortField(field); setSortDir("desc"); }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return null;
        return sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
    };

    const sortData = (data) => {
        if (!data) return [];
        return [...data].sort((a, b) => {
            const aVal = a[sortField] || 0;
            const bVal = b[sortField] || 0;
            return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        });
    };

    return (
        <div className="space-y-4">
            {/* Report Selector */}
            <div className="flex flex-wrap gap-2">
                {reports.map(r => (
                    <button
                        key={r.id}
                        onClick={() => setActiveReport(r.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeReport === r.id
                                ? "bg-indigo-600 text-white shadow-md"
                                : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                            }`}
                    >
                        <r.icon size={16} />
                        {r.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search products..."
                    className="input input-bordered w-full pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Product Sales Summary */}
            {activeReport === "product_sales" && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <ShoppingCart size={18} className="text-blue-600" />
                            Product Sales Summary
                        </h3>
                        <button
                            onClick={() => exportToExcel(
                                (productSalesData?.result || []).map(p => ({
                                    Product: p.name,
                                    'Qty Sold': p.totalQty,
                                    Revenue: p.totalRevenue,
                                    Cost: p.totalCost,
                                    Profit: p.profit,
                                    Orders: p.orderCount
                                })),
                                'Product_Sales_Summary'
                            )}
                            className="btn btn-sm btn-ghost gap-1"
                        >
                            <Download size={14} /> Export
                        </button>
                    </div>
                    {loadingProductSales ? (
                        <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th>Product</th>
                                        <th className="cursor-pointer" onClick={() => handleSort("totalQty")}>
                                            <span className="flex items-center gap-1">Qty Sold <SortIcon field="totalQty" /></span>
                                        </th>
                                        <th className="cursor-pointer" onClick={() => handleSort("totalRevenue")}>
                                            <span className="flex items-center gap-1">Revenue <SortIcon field="totalRevenue" /></span>
                                        </th>
                                        <th className="cursor-pointer" onClick={() => handleSort("totalCost")}>
                                            <span className="flex items-center gap-1">Cost <SortIcon field="totalCost" /></span>
                                        </th>
                                        <th className="cursor-pointer" onClick={() => handleSort("profit")}>
                                            <span className="flex items-center gap-1">Profit <SortIcon field="profit" /></span>
                                        </th>
                                        <th>Orders</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortData(productSalesData?.result || [])
                                        .filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map((p, i) => (
                                            <tr key={i} className="hover">
                                                <td className="font-medium">{p.name}</td>
                                                <td className="font-semibold">{p.totalQty}</td>
                                                <td className="text-green-600 font-semibold">₹{p.totalRevenue?.toLocaleString()}</td>
                                                <td className="text-red-500">₹{p.totalCost?.toLocaleString()}</td>
                                                <td className={`font-bold ${p.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    ₹{p.profit?.toLocaleString()}
                                                </td>
                                                <td>{p.orderCount}</td>
                                            </tr>
                                        ))}
                                    {(productSalesData?.result || []).length === 0 && (
                                        <tr><td colSpan="6" className="text-center py-8 text-gray-400">No sales data for this period</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Rate List */}
            {activeReport === "rate_list" && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <DollarSign size={18} className="text-green-600" />
                            Rate List
                        </h3>
                        <button
                            onClick={() => exportToExcel(
                                (rateListData?.result || []).map(p => ({
                                    Product: p.name,
                                    Category: p.category?.name || "-",
                                    'Sub Category': p.subcategory?.name || "-",
                                    Price: p.price,
                                    MRP: p.mrp || p.price,
                                    'Cost Price': p.costPrice || "-",
                                    'Trial Price': p.trialPrice || "-",
                                    'One-Time Price': p.oneTimePrice || "-",
                                    Unit: p.unit || "piece",
                                    Stock: p.stock || 0
                                })),
                                'Rate_List'
                            )}
                            className="btn btn-sm btn-ghost gap-1"
                        >
                            <Download size={14} /> Export
                        </button>
                    </div>
                    {loadingRateList ? (
                        <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th>#</th>
                                        <th>Product</th>
                                        <th>Category</th>
                                        <th>Price</th>
                                        <th>MRP</th>
                                        <th>Cost Price</th>
                                        <th>Trial Price</th>
                                        <th>One-Time Price</th>
                                        <th>Unit</th>
                                        <th>Stock</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(rateListData?.result || [])
                                        .filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map((p, i) => (
                                            <tr key={p._id} className="hover">
                                                <td>{i + 1}</td>
                                                <td className="font-medium">{p.name}</td>
                                                <td>{p.category?.name || "-"}</td>
                                                <td className="font-bold text-green-600">₹{p.price}</td>
                                                <td>₹{p.mrp || p.price}</td>
                                                <td className="text-gray-500">₹{p.costPrice || "-"}</td>
                                                <td className="text-blue-600">{p.trialPrice ? `₹${p.trialPrice}` : "-"}</td>
                                                <td>{p.oneTimePrice ? `₹${p.oneTimePrice}` : "-"}</td>
                                                <td>{p.unit || "piece"}</td>
                                                <td>
                                                    <span className={`badge badge-sm ${(p.stock || 0) <= 0 ? 'badge-error' :
                                                            (p.stock || 0) <= 10 ? 'badge-warning' : 'badge-success'
                                                        }`}>
                                                        {p.stock || 0}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Stock Summary */}
            {activeReport === "stock_summary" && (
                <div className="space-y-4">
                    {/* Summary Cards */}
                    {stockData?.result?.summary && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                <p className="text-xs text-blue-600 font-medium">Total Products</p>
                                <p className="text-2xl font-bold text-blue-700">{stockData.result.summary.totalProducts}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                                <p className="text-xs text-green-600 font-medium">Stock Value</p>
                                <p className="text-2xl font-bold text-green-700">₹{stockData.result.summary.totalStockValue?.toLocaleString()}</p>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                                <p className="text-xs text-yellow-600 font-medium">Low Stock</p>
                                <p className="text-2xl font-bold text-yellow-700">{stockData.result.summary.lowStockCount}</p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                                <p className="text-xs text-red-600 font-medium">Out of Stock</p>
                                <p className="text-2xl font-bold text-red-700">{stockData.result.summary.outOfStockCount}</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-pink-50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <Package size={18} className="text-purple-600" />
                                Stock Summary
                            </h3>
                            <button
                                onClick={() => exportToExcel(
                                    (stockData?.result?.products || []).map(p => ({
                                        Product: p.name,
                                        Category: p.category?.name || "-",
                                        Stock: p.stock || 0,
                                        Price: p.price,
                                        'Cost Price': p.costPrice || "-",
                                        'Stock Value': (p.stock || 0) * (p.costPrice || p.price || 0),
                                        Status: p.isActive ? 'Active' : 'Inactive'
                                    })),
                                    'Stock_Summary'
                                )}
                                className="btn btn-sm btn-ghost gap-1"
                            >
                                <Download size={14} /> Export
                            </button>
                        </div>
                        {loadingStock ? (
                            <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th>#</th>
                                            <th>Product</th>
                                            <th>Category</th>
                                            <th>Stock</th>
                                            <th>Price</th>
                                            <th>Cost Price</th>
                                            <th>Stock Value</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(stockData?.result?.products || [])
                                            .filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                                            .map((p, i) => (
                                                <tr key={p._id} className={`hover ${(p.stock || 0) <= 0 ? 'bg-red-50' : (p.stock || 0) <= 10 ? 'bg-yellow-50' : ''}`}>
                                                    <td>{i + 1}</td>
                                                    <td className="font-medium">{p.name}</td>
                                                    <td>{p.category?.name || "-"}</td>
                                                    <td>
                                                        <span className={`font-bold ${(p.stock || 0) <= 0 ? 'text-red-600' :
                                                                (p.stock || 0) <= 10 ? 'text-yellow-600' : 'text-green-600'
                                                            }`}>
                                                            {p.stock || 0}
                                                        </span>
                                                    </td>
                                                    <td>₹{p.price}</td>
                                                    <td>₹{p.costPrice || "-"}</td>
                                                    <td className="font-semibold">₹{((p.stock || 0) * (p.costPrice || p.price || 0)).toLocaleString()}</td>
                                                    <td>
                                                        <span className={`badge badge-sm ${p.isActive ? 'badge-success' : 'badge-error'}`}>
                                                            {p.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ItemReports;
