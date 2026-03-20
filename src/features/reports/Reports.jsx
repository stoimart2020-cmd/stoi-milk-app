import React, { useState, useEffect } from "react";
import { axiosInstance as axios } from "../../shared/api/axios";
import DeliveryComparisonReport from "./DeliveryComparisonReport";
import ItemReports from "./ItemReports";
import PartyReports from "./PartyReports";
import TransactionReports from "./TransactionReports";
import GSTReports from "./GSTReports";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    ComposedChart
} from "recharts";
import {
    Loader2,
    TrendingUp,
    TrendingDown,
    Users,
    Package,
    AlertTriangle,
    DollarSign,
    Download,
    Calendar,
    FileText,
    ShoppingCart,
    Activity,
    Target,
    Percent,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    GitCompare,
    Wallet,
    BadgeDollarSign,
    ReceiptText,
    CircleDollarSign,
    Truck,
    Factory,
    UserCheck,
    Shield
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from 'xlsx';

// Enhanced color palette
const COLORS = {
    primary: "#3b82f6",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#06b6d4",
    purple: "#8b5cf6",
    pink: "#ec4899",
    chart: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]
};

const Reports = () => {
    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState("month");
    const [customDateRange, setCustomDateRange] = useState({ start: "", end: "" });

    // Data States
    const [dashboardStats, setDashboardStats] = useState(null);
    const [salesData, setSalesData] = useState([]);
    const [profitLoss, setProfitLoss] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [customerData, setCustomerData] = useState([]);
    const [inventoryData, setInventoryData] = useState({ lowStock: [], topSelling: [] });
    const [performanceMetrics, setPerformanceMetrics] = useState(null);
    const [financialReport, setFinancialReport] = useState(null);

    const fetchingRef = React.useRef(false);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, dateRange]);

    const safeFetch = async (url) => {
        try {
            const { data } = await axios.get(url);
            return data;
        } catch {
            return null;
        }
    };

    const fetchData = async () => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        setLoading(true);

        try {
            let queryParams = `period=${dateRange}`;
            if (dateRange === 'custom' && customDateRange.start && customDateRange.end) {
                queryParams += `&startDate=${customDateRange.start}&endDate=${customDateRange.end}`;
            }

            if (activeTab === 'overview') {
                const [statsRes, salesRes, plRes, forecastRes] = await Promise.all([
                    safeFetch('/api/analytics/dashboard-stats'),
                    safeFetch(`/api/analytics/sales?${queryParams}`),
                    safeFetch(`/api/analytics/profit-loss?${queryParams}`),
                    safeFetch('/api/analytics/forecast'),
                ]);
                if (statsRes) setDashboardStats(statsRes.result);
                if (salesRes) setSalesData(salesRes.result || []);
                if (plRes) setProfitLoss(plRes.result);
                if (forecastRes) setForecast(forecastRes.result);
                if (salesRes && plRes) calculatePerformanceMetrics(salesRes.result, plRes.result);
            }

            if (activeTab === 'sales') {
                const [salesRes, plRes, forecastRes] = await Promise.all([
                    safeFetch(`/api/analytics/sales?${queryParams}`),
                    safeFetch(`/api/analytics/profit-loss?${queryParams}`),
                    safeFetch('/api/analytics/forecast'),
                ]);
                if (salesRes) setSalesData(salesRes.result || []);
                if (plRes) setProfitLoss(plRes.result);
                if (forecastRes) setForecast(forecastRes.result);
                if (salesRes && plRes) calculatePerformanceMetrics(salesRes.result, plRes.result);
            }

            if (activeTab === 'customers') {
                const res = await safeFetch(`/api/analytics/customers?${queryParams}`);
                if (res) setCustomerData(res.result || []);
            }

            if (activeTab === 'inventory') {
                const res = await safeFetch('/api/analytics/inventory');
                if (res) setInventoryData(res.result || { lowStock: [], topSelling: [] });
            }

            if (activeTab === 'profitloss') {
                const res = await safeFetch(`/api/analytics/financial-report?${queryParams}`);
                if (res) setFinancialReport(res.result);
            }

        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    };


    const calculatePerformanceMetrics = (sales, pl) => {
        if (!sales || sales.length === 0) return;

        const totalOrders = sales.reduce((sum, day) => sum + (day.count || 0), 0);
        const totalRevenue = sales.reduce((sum, day) => sum + (day.totalSales || 0), 0);
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Calculate growth (compare first half vs second half)
        const midPoint = Math.floor(sales.length / 2);
        const firstHalf = sales.slice(0, midPoint);
        const secondHalf = sales.slice(midPoint);

        const firstHalfRevenue = firstHalf.reduce((sum, day) => sum + (day.totalSales || 0), 0);
        const secondHalfRevenue = secondHalf.reduce((sum, day) => sum + (day.totalSales || 0), 0);
        const growthRate = firstHalfRevenue > 0
            ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100
            : 0;

        setPerformanceMetrics({
            totalOrders,
            totalRevenue,
            avgOrderValue,
            growthRate,
            profitMargin: pl?.margin || 0
        });
    };

    // Export Functions
    const exportToExcel = (data, filename) => {
        try {
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Report");
            XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("Report exported successfully!");
        } catch (error) {
            toast.error("Failed to export report");
            console.error(error);
        }
    };

    const exportSalesReport = () => {
        const exportData = salesData.map(item => ({
            Date: item._id,
            Revenue: item.totalSales,
            Orders: item.count,
            'Avg Order Value': item.count > 0 ? (item.totalSales / item.count).toFixed(2) : 0
        }));
        exportToExcel(exportData, 'Sales_Report');
    };

    const exportInventoryReport = () => {
        const exportData = [
            ...inventoryData.lowStock.map(item => ({
                Category: 'Low Stock',
                Product: item.name,
                Stock: item.stock,
                Price: item.price,
                Status: 'Critical'
            })),
            ...inventoryData.topSelling.map(item => ({
                Category: 'Top Selling',
                Product: item.name,
                'Total Sold': item.totalSold,
                Revenue: item.revenue,
                Status: 'High Demand'
            }))
        ];
        exportToExcel(exportData, 'Inventory_Report');
    };

    // Render Metric Card Component
    const MetricCard = ({ title, value, icon: Icon, trend, trendValue, color = "primary", subtitle }) => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                    <h3 className={`text-2xl font-bold text-${color}-600 mb-2`}>{value}</h3>
                    {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
                    {trend && (
                        <div className={`flex items-center gap-1 text-sm mt-2 ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
                            }`}>
                            {trend === 'up' && <ArrowUpRight size={16} />}
                            {trend === 'down' && <ArrowDownRight size={16} />}
                            {trend === 'neutral' && <Minus size={16} />}
                            <span className="font-medium">{trendValue}</span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-lg bg-${color}-50`}>
                    <Icon className={`text-${color}-600`} size={24} />
                </div>
            </div>
        </div>
    );

    // --- Render Components ---

    const renderOverview = () => (
        <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Revenue"
                    value={`₹${dashboardStats?.totalRevenue?.toLocaleString() || 0}`}
                    icon={DollarSign}
                    color="primary"
                    subtitle="Lifetime earnings"
                />
                <MetricCard
                    title="Active Customers"
                    value={dashboardStats?.totalCustomers || 0}
                    icon={Users}
                    color="success"
                    subtitle="Currently active"
                />
                <MetricCard
                    title="Pending Orders"
                    value={dashboardStats?.pendingOrders || 0}
                    icon={ShoppingCart}
                    color="warning"
                    subtitle="Needs attention"
                />
                <MetricCard
                    title="Low Stock Items"
                    value={dashboardStats?.lowStockCount || 0}
                    icon={AlertTriangle}
                    color="danger"
                    subtitle="Products < 10 units"
                />
            </div>

            {/* Performance Metrics */}
            {performanceMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MetricCard
                        title="Avg Order Value"
                        value={`₹${performanceMetrics.avgOrderValue.toFixed(2)}`}
                        icon={Target}
                        color="info"
                    />
                    <MetricCard
                        title="Growth Rate"
                        value={`${performanceMetrics.growthRate.toFixed(1)}%`}
                        icon={TrendingUp}
                        trend={performanceMetrics.growthRate > 0 ? 'up' : performanceMetrics.growthRate < 0 ? 'down' : 'neutral'}
                        trendValue={`${Math.abs(performanceMetrics.growthRate).toFixed(1)}% vs previous period`}
                        color="purple"
                    />
                    <MetricCard
                        title="Profit Margin"
                        value={`${profitLoss?.margin || 0}%`}
                        icon={Percent}
                        color="success"
                    />
                </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Trend Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800">Sales Trend</h3>
                        <button
                            onClick={exportSalesReport}
                            className="btn btn-sm btn-ghost gap-2"
                        >
                            <Download size={16} />
                            Export
                        </button>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={salesData}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Sales']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="totalSales"
                                    stroke={COLORS.primary}
                                    fillOpacity={1}
                                    fill="url(#colorSales)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold mb-4 text-gray-800">Financial Summary</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-2">
                                <DollarSign size={20} className="text-blue-600" />
                                <span className="font-medium text-gray-700">Revenue</span>
                            </div>
                            <span className="font-bold text-lg text-blue-600">
                                ₹{profitLoss?.revenue?.toLocaleString() || 0}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg border border-red-100">
                            <div className="flex items-center gap-2">
                                <Package size={20} className="text-red-600" />
                                <span className="font-medium text-gray-700">COGS</span>
                            </div>
                            <span className="font-bold text-lg text-red-600">
                                -₹{profitLoss?.cost?.toLocaleString() || 0}
                            </span>
                        </div>
                        <div className="divider my-2"></div>
                        <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={20} className="text-green-600" />
                                <span className="font-bold text-gray-700">Gross Profit</span>
                            </div>
                            <span className="font-bold text-xl text-green-600">
                                ₹{profitLoss?.profit?.toLocaleString() || 0}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-gray-500">Profit Margin: </span>
                            <span className="text-sm font-bold text-green-600">{profitLoss?.margin}%</span>
                        </div>
                        {forecast && (
                            <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
                                <p className="text-xs text-purple-700 font-medium mb-1">Next Week Forecast</p>
                                <p className="text-lg font-bold text-purple-600">
                                    ₹{forecast.predictedRevenue?.toFixed(2)}
                                </p>
                                <p className="text-xs text-purple-600">{forecast.confidence}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Order Volume Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4 text-gray-800">Order Volume Analysis</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={salesData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                            <Legend />
                            <Bar yAxisId="left" dataKey="count" fill={COLORS.info} name="Order Count" radius={[4, 4, 0, 0]} />
                            <Line yAxisId="right" type="monotone" dataKey="totalSales" stroke={COLORS.success} strokeWidth={2} name="Revenue (₹)" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );

    const renderSales = () => (
        <div className="space-y-6">
            {/* Sales KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Orders"
                    value={performanceMetrics?.totalOrders || 0}
                    icon={ShoppingCart}
                    color="primary"
                />
                <MetricCard
                    title="Total Revenue"
                    value={`₹${performanceMetrics?.totalRevenue?.toLocaleString() || 0}`}
                    icon={DollarSign}
                    color="success"
                />
                <MetricCard
                    title="Avg Order Value"
                    value={`₹${performanceMetrics?.avgOrderValue?.toFixed(2) || 0}`}
                    icon={Target}
                    color="info"
                />
                <MetricCard
                    title="Growth Rate"
                    value={`${performanceMetrics?.growthRate?.toFixed(1) || 0}%`}
                    icon={Activity}
                    trend={performanceMetrics?.growthRate > 0 ? 'up' : 'down'}
                    color="purple"
                />
            </div>

            {/* Detailed Sales Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Detailed Sales Analysis</h3>
                        <p className="text-sm text-gray-500 mt-1">Revenue and order trends over time</p>
                    </div>
                    <button onClick={exportSalesReport} className="btn btn-primary btn-sm gap-2">
                        <Download size={16} />
                        Export Report
                    </button>
                </div>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                formatter={(value, name) => [
                                    name === 'Revenue (₹)' ? `₹${value.toLocaleString()}` : value,
                                    name
                                ]}
                            />
                            <Legend />
                            <Bar dataKey="totalSales" fill={COLORS.success} name="Revenue (₹)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="count" fill={COLORS.warning} name="Orders Count" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Forecast Section */}
            {forecast && (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl border border-purple-100">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Activity className="text-purple-600" size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-800 mb-2">Revenue Forecast</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Based on historical trends and predictive analytics
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-1">Predicted Next Week Revenue</p>
                                    <p className="text-2xl font-bold text-purple-600">
                                        ₹{forecast.predictedRevenue?.toFixed(2)}
                                    </p>
                                </div>
                                <div className="bg-white p-4 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-1">Confidence Level</p>
                                    <p className="text-2xl font-bold text-blue-600">{forecast.confidence}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderCustomers = () => (
        <div className="space-y-6">
            {/* Customer Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                    title="Total Customers"
                    value={dashboardStats?.totalCustomers || 0}
                    icon={Users}
                    color="primary"
                    subtitle="Active customers"
                />
                <MetricCard
                    title="New Signups"
                    value={customerData.reduce((sum, day) => sum + (day.count || 0), 0)}
                    icon={TrendingUp}
                    color="success"
                    subtitle={`In selected period`}
                />
                <MetricCard
                    title="Avg Daily Signups"
                    value={(customerData.reduce((sum, day) => sum + (day.count || 0), 0) / (customerData.length || 1)).toFixed(1)}
                    icon={Activity}
                    color="info"
                />
            </div>

            {/* Customer Acquisition Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Customer Acquisition Trend</h3>
                        <p className="text-sm text-gray-500 mt-1">New customer signups over time</p>
                    </div>
                </div>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={customerData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                formatter={(value) => [value, 'New Signups']}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke={COLORS.danger}
                                strokeWidth={3}
                                name="New Signups"
                                dot={{ fill: COLORS.danger, r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Customer Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Users size={20} className="text-blue-600" />
                        Customer Growth Insights
                    </h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Peak Signup Day</span>
                            <span className="font-bold text-blue-600">
                                {customerData.length > 0
                                    ? customerData.reduce((max, day) => day.count > max.count ? day : max, customerData[0])._id
                                    : 'N/A'
                                }
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Total New Customers</span>
                            <span className="font-bold text-blue-600">
                                {customerData.reduce((sum, day) => sum + (day.count || 0), 0)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Target size={20} className="text-green-600" />
                        Retention Metrics
                    </h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Active Customers</span>
                            <span className="font-bold text-green-600">{dashboardStats?.totalCustomers || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Avg Lifetime Value</span>
                            <span className="font-bold text-green-600">₹{((profitLoss?.revenue || 0) / (dashboardStats?.totalCustomers || 1)).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderInventory = () => (
        <div className="space-y-6">
            {/* Inventory Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                    title="Low Stock Items"
                    value={inventoryData?.lowStock?.length || 0}
                    icon={AlertTriangle}
                    color="danger"
                    subtitle="Requires restocking"
                />
                <MetricCard
                    title="Top Products"
                    value={inventoryData?.topSelling?.length || 0}
                    icon={TrendingUp}
                    color="success"
                    subtitle="Best performers"
                />
                <MetricCard
                    title="Total Revenue"
                    value={`₹${inventoryData?.topSelling?.reduce((sum, item) => sum + (item.revenue || 0), 0).toLocaleString() || 0}`}
                    icon={DollarSign}
                    color="primary"
                    subtitle="From top products"
                />
            </div>

            {/* Export Button */}
            <div className="flex justify-end">
                <button onClick={exportInventoryReport} className="btn btn-primary gap-2">
                    <Download size={16} />
                    Export Inventory Report
                </button>
            </div>

            {/* Inventory Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Low Stock Alert */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-red-50 to-orange-50">
                        <h3 className="font-bold text-red-700 flex items-center gap-2">
                            <AlertTriangle size={18} />
                            Low Stock Alerts
                        </h3>
                        <p className="text-xs text-red-600 mt-1">Products requiring immediate attention</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-xs">Product</th>
                                    <th className="text-xs">Stock</th>
                                    <th className="text-xs">Price</th>
                                    <th className="text-xs">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inventoryData?.lowStock?.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="text-center py-8 text-gray-500">
                                            <Package size={32} className="mx-auto mb-2 opacity-50" />
                                            <p>No low stock items</p>
                                        </td>
                                    </tr>
                                ) : (
                                    inventoryData?.lowStock?.map((item) => (
                                        <tr key={item._id} className="hover">
                                            <td className="font-medium">{item.name}</td>
                                            <td>
                                                <span className="font-bold text-red-600">{item.stock}</span>
                                            </td>
                                            <td>₹{item.price}</td>
                                            <td>
                                                <span className="badge badge-error badge-sm">Critical</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Selling */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                        <h3 className="font-bold text-green-700 flex items-center gap-2">
                            <TrendingUp size={18} />
                            Top Selling Products
                        </h3>
                        <p className="text-xs text-green-600 mt-1">Best performing products by sales</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-xs">Rank</th>
                                    <th className="text-xs">Product</th>
                                    <th className="text-xs">Sold</th>
                                    <th className="text-xs">Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inventoryData?.topSelling?.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="text-center py-8 text-gray-500">
                                            <ShoppingCart size={32} className="mx-auto mb-2 opacity-50" />
                                            <p>No sales data available</p>
                                        </td>
                                    </tr>
                                ) : (
                                    inventoryData?.topSelling?.map((item, idx) => (
                                        <tr key={idx} className="hover">
                                            <td>
                                                <div className={`badge ${idx === 0 ? 'badge-warning' : idx === 1 ? 'badge-ghost' : 'badge-ghost'}`}>
                                                    #{idx + 1}
                                                </div>
                                            </td>
                                            <td className="font-medium">{item.name}</td>
                                            <td>
                                                <span className="font-bold text-green-600">{item.totalSold}</span>
                                            </td>
                                            <td className="font-semibold">₹{item.revenue.toLocaleString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Product Performance Chart */}
            {inventoryData?.topSelling?.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold mb-4 text-gray-800">Product Performance Comparison</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={inventoryData.topSelling} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                <XAxis type="number" tick={{ fontSize: 12 }} />
                                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                    formatter={(value, name) => [
                                        name === 'revenue' ? `₹${value.toLocaleString()}` : value,
                                        name === 'revenue' ? 'Revenue' : 'Units Sold'
                                    ]}
                                />
                                <Legend />
                                <Bar dataKey="revenue" fill={COLORS.success} name="Revenue (₹)" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );

    const renderProfitLoss = () => {
        const f = financialReport;
        if (!f) return <div className="text-center py-20 text-gray-400">No financial data available for this period.</div>;

        const fmt = (v) => `₹${(v || 0).toLocaleString('en-IN')}`;
        const fmtK = (v) => {
            if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
            if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
            return `₹${v.toLocaleString('en-IN')}`;
        };

        const paymentPie = (f.collections?.paymentModeSplit || []).map((p, i) => ({
            name: p._id || 'Unknown', value: p.total, count: p.count
        }));
        const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

        const exportPL = () => {
            const rows = [
                { Item: 'REVENUE', Amount: '' },
                { Item: 'Order Sales', Amount: f.revenue.orderSales },
                { Item: 'Wallet Recharges', Amount: f.revenue.walletRecharges },
                { Item: 'Total Revenue', Amount: f.revenue.totalRevenue },
                { Item: '', Amount: '' },
                { Item: 'COST OF GOODS SOLD', Amount: '' },
                { Item: 'Product COGS', Amount: f.costOfGoods.totalCOGS },
                { Item: '', Amount: '' },
                { Item: 'GROSS PROFIT', Amount: f.grossProfit.amount },
                { Item: 'Gross Margin %', Amount: f.grossProfit.margin + '%' },
                { Item: '', Amount: '' },
                { Item: 'OPERATING EXPENSES', Amount: '' },
                { Item: 'Milk Procurement', Amount: f.operatingExpenses.milkProcurement },
                { Item: 'Salary Expense (est.)', Amount: f.operatingExpenses.salaryExpense },
                { Item: 'Total Operating Expenses', Amount: f.operatingExpenses.totalOperatingExpenses },
                { Item: '', Amount: '' },
                { Item: 'OPERATING PROFIT', Amount: f.operatingProfit.amount },
                { Item: 'Operating Margin %', Amount: f.operatingProfit.margin + '%' },
                { Item: '', Amount: '' },
                { Item: 'NET PROFIT', Amount: f.netProfit.amount },
                { Item: 'Net Margin %', Amount: f.netProfit.margin + '%' },
            ];
            exportToExcel(rows, 'Profit_Loss_Report');
        };

        return (
            <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        title="Total Revenue"
                        value={fmtK(f.revenue.totalRevenue)}
                        icon={DollarSign}
                        color="primary"
                        subtitle={`${f.revenue.orderCount} orders in ${f.period.days} days`}
                    />
                    <MetricCard
                        title="Total Expenses"
                        value={fmtK(f.totalExpenses)}
                        icon={ReceiptText}
                        color="danger"
                        subtitle={`COGS + Operating Expenses`}
                    />
                    <MetricCard
                        title="Net Profit"
                        value={fmtK(f.netProfit.amount)}
                        icon={TrendingUp}
                        trend={f.netProfit.amount >= 0 ? 'up' : 'down'}
                        trendValue={`${f.netProfit.margin}% margin`}
                        color={f.netProfit.amount >= 0 ? 'success' : 'danger'}
                    />
                    <MetricCard
                        title="Gross Margin"
                        value={`${f.grossProfit.margin}%`}
                        icon={Percent}
                        color="info"
                        subtitle={`Gross Profit: ${fmtK(f.grossProfit.amount)}`}
                    />
                </div>

                {/* P&L Statement + Trend Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Income Statement */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <ReceiptText size={20} className="text-indigo-600" />
                                    Income Statement (P&L)
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">{new Date(f.period.start).toLocaleDateString()} – {new Date(f.period.end).toLocaleDateString()}</p>
                            </div>
                            <button onClick={exportPL} className="btn btn-sm btn-ghost gap-1">
                                <Download size={14} /> Export
                            </button>
                        </div>
                        <div className="p-5 space-y-1 text-sm">
                            {/* Revenue Section */}
                            <div className="font-bold text-gray-700 uppercase tracking-wider text-xs pb-2 border-b border-gray-200">Revenue</div>
                            <div className="flex justify-between py-1.5 px-2">
                                <span className="text-gray-600">Order Sales</span>
                                <span className="font-semibold text-blue-700">{fmt(f.revenue.orderSales)}</span>
                            </div>
                            <div className="flex justify-between py-1.5 px-2">
                                <span className="text-gray-600">Wallet Recharges</span>
                                <span className="font-semibold text-blue-600">{fmt(f.revenue.walletRecharges)}</span>
                            </div>
                            <div className="flex justify-between py-2 px-2 bg-blue-50 rounded-lg font-bold">
                                <span className="text-blue-800">Total Revenue</span>
                                <span className="text-blue-800">{fmt(f.revenue.totalRevenue)}</span>
                            </div>

                            {/* COGS */}
                            <div className="font-bold text-gray-700 uppercase tracking-wider text-xs pt-3 pb-2 border-b border-gray-200">Cost of Goods Sold</div>
                            <div className="flex justify-between py-1.5 px-2">
                                <span className="text-gray-600">Product COGS</span>
                                <span className="font-semibold text-red-600">-{fmt(f.costOfGoods.totalCOGS)}</span>
                            </div>

                            {/* Gross Profit */}
                            <div className={`flex justify-between py-2 px-2 rounded-lg font-bold ${f.grossProfit.amount >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                                <span className={f.grossProfit.amount >= 0 ? 'text-green-800' : 'text-red-800'}>Gross Profit ({f.grossProfit.margin}%)</span>
                                <span className={f.grossProfit.amount >= 0 ? 'text-green-800' : 'text-red-800'}>{fmt(f.grossProfit.amount)}</span>
                            </div>

                            {/* Operating Expenses */}
                            <div className="font-bold text-gray-700 uppercase tracking-wider text-xs pt-3 pb-2 border-b border-gray-200">Operating Expenses</div>
                            <div className="flex justify-between py-1.5 px-2">
                                <span className="text-gray-600 flex items-center gap-1"><Factory size={14} /> Milk Procurement</span>
                                <span className="font-semibold text-red-600">-{fmt(f.operatingExpenses.milkProcurement)}</span>
                            </div>
                            <div className="flex justify-between py-1.5 px-2">
                                <span className="text-gray-600 flex items-center gap-1"><UserCheck size={14} /> Salary ({f.operatingExpenses.employeeCount} staff)</span>
                                <span className="font-semibold text-red-600">-{fmt(f.operatingExpenses.salaryExpense)}</span>
                            </div>
                            <div className="flex justify-between py-1.5 px-2 bg-orange-50 rounded-lg">
                                <span className="font-bold text-orange-800">Total OpEx</span>
                                <span className="font-bold text-orange-800">-{fmt(f.operatingExpenses.totalOperatingExpenses)}</span>
                            </div>

                            {/* Operating Profit */}
                            <div className={`flex justify-between py-2 px-2 rounded-lg font-bold mt-2 ${f.operatingProfit.amount >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                <span className={f.operatingProfit.amount >= 0 ? 'text-emerald-800' : 'text-red-800'}>Operating Profit ({f.operatingProfit.margin}%)</span>
                                <span className={f.operatingProfit.amount >= 0 ? 'text-emerald-800' : 'text-red-800'}>{fmt(f.operatingProfit.amount)}</span>
                            </div>

                            {/* Net Profit */}
                            <div className={`flex justify-between py-3 px-3 rounded-xl font-bold text-lg mt-3 border-2 ${f.netProfit.amount >= 0 ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-300'
                                }`}>
                                <span className={f.netProfit.amount >= 0 ? 'text-green-900' : 'text-red-900'}>
                                    {f.netProfit.amount >= 0 ? '✅' : '⚠️'} Net Profit ({f.netProfit.margin}%)
                                </span>
                                <span className={f.netProfit.amount >= 0 ? 'text-green-900' : 'text-red-900'}>{fmt(f.netProfit.amount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Revenue vs Expense Trend */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-1">Revenue vs Expenses Trend</h3>
                        <p className="text-sm text-gray-500 mb-4">Daily breakdown over the selected period</p>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={f.trend || []}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                        formatter={(value, name) => [
                                            `₹${(value || 0).toLocaleString('en-IN')}`,
                                            name === 'revenue' ? 'Revenue' : name === 'expense' ? 'Expenses' : 'Profit'
                                        ]}
                                    />
                                    <Legend />
                                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#colorRevenue)" strokeWidth={2} name="Revenue" />
                                    <Bar dataKey="expense" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} opacity={0.75} />
                                    <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={false} name="Profit" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Bottom Row — Payment Split + Expense Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Payment Mode Split */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Wallet size={20} className="text-purple-600" />
                            Revenue by Payment Mode
                        </h3>
                        {paymentPie.length > 0 ? (
                            <div className="flex items-center">
                                <div className="h-64 flex-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={paymentPie} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                {paymentPie.map((_, idx) => (
                                                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-2 ml-2">
                                    {paymentPie.map((p, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                                            <span className="text-gray-700 font-medium">{p.name}</span>
                                            <span className="text-gray-500 text-xs">({p.count})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-400">No payment data</div>
                        )}
                    </div>

                    {/* Expense Breakdown Visual */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <BadgeDollarSign size={20} className="text-red-500" />
                            Expense Breakdown
                        </h3>
                        <div className="space-y-4">
                            {[{
                                label: 'Product COGS',
                                value: f.costOfGoods.totalCOGS,
                                total: f.totalExpenses,
                                color: 'bg-red-500',
                                icon: Package
                            }, {
                                label: `Milk Procurement (${(f.operatingExpenses.milkQuantityLiters || 0).toFixed(0)} L)`,
                                value: f.operatingExpenses.milkProcurement,
                                total: f.totalExpenses,
                                color: 'bg-orange-500',
                                icon: Factory
                            }, {
                                label: `Salary (${f.operatingExpenses.employeeCount} staff)`,
                                value: f.operatingExpenses.salaryExpense,
                                total: f.totalExpenses,
                                color: 'bg-yellow-500',
                                icon: UserCheck
                            }].map((exp, idx) => {
                                const pct = f.totalExpenses > 0 ? (exp.value / f.totalExpenses * 100).toFixed(1) : 0;
                                return (
                                    <div key={idx}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                                <exp.icon size={14} className="text-gray-500" />
                                                {exp.label}
                                            </span>
                                            <span className="text-sm font-bold text-gray-800">{fmt(exp.value)} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                                            <div className={`${exp.color} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex justify-between font-bold text-gray-900">
                                    <span>Total Expenses</span>
                                    <span className="text-red-600">{fmt(f.totalExpenses)}</span>
                                </div>
                            </div>
                        </div>
                        {/* Vendor Payments Aside */}
                        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                            <p className="text-xs text-amber-700 font-medium">Vendor Payments Made (Cash Outflow)</p>
                            <p className="text-lg font-bold text-amber-800">{fmt(f.operatingExpenses.vendorPaymentsMade)}</p>
                            <p className="text-xs text-amber-600">Amount actually paid to milk vendors in this period</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                            <FileText className="text-primary" size={32} />
                            Reports & Analytics
                        </h1>
                        <p className="text-gray-500 mt-1">Comprehensive business insights and performance metrics</p>
                    </div>

                    {/* Date Range Filter */}
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <select
                            className="select select-bordered w-full sm:w-auto"
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                        >
                            <option value="week">Last 7 Days</option>
                            <option value="month">Last 30 Days</option>
                            <option value="this_month">This Month</option>
                            <option value="last_month">Last Month</option>
                            <option value="this_quarter">This Quarter</option>
                            <option value="this_year">This Year</option>
                            <option value="custom">Custom Range</option>
                        </select>
                        {dateRange === 'custom' && (
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    className="input input-bordered input-sm"
                                    value={customDateRange.start}
                                    onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                                />
                                <input
                                    type="date"
                                    className="input input-bordered input-sm"
                                    value={customDateRange.end}
                                    onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                                />
                                <button onClick={fetchData} className="btn btn-primary btn-sm">Apply</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="tabs tabs-boxed bg-gray-100 p-1 mt-6 flex-wrap">
                    <button
                        className={`tab flex-1 sm:flex-none ${activeTab === 'overview' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <Activity size={16} className="mr-2" />
                        Overview
                    </button>
                    <button
                        className={`tab flex-1 sm:flex-none ${activeTab === 'sales' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('sales')}
                    >
                        <DollarSign size={16} className="mr-2" />
                        Sales & Finance
                    </button>
                    <button
                        className={`tab flex-1 sm:flex-none ${activeTab === 'customers' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('customers')}
                    >
                        <Users size={16} className="mr-2" />
                        Customers
                    </button>
                    <button
                        className={`tab flex-1 sm:flex-none ${activeTab === 'inventory' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('inventory')}
                    >
                        <Package size={16} className="mr-2" />
                        Inventory
                    </button>
                    <button
                        className={`tab flex-1 sm:flex-none ${activeTab === 'profitloss' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('profitloss')}
                    >
                        <CircleDollarSign size={16} className="mr-2" />
                        Profit & Loss
                    </button>
                    <button
                        className={`tab flex-1 sm:flex-none ${activeTab === 'delivery' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('delivery')}
                    >
                        <GitCompare size={16} className="mr-2" />
                        Delivery Comparison
                    </button>
                    <button
                        className={`tab flex-1 sm:flex-none ${activeTab === 'item_reports' ? 'tab-active' : ''}`}
                        onClick={() => { setActiveTab('item_reports'); setLoading(false); }}
                    >
                        <Package size={16} className="mr-2" />
                        Item Reports
                    </button>
                    <button
                        className={`tab flex-1 sm:flex-none ${activeTab === 'party_reports' ? 'tab-active' : ''}`}
                        onClick={() => { setActiveTab('party_reports'); setLoading(false); }}
                    >
                        <Users size={16} className="mr-2" />
                        Party Reports
                    </button>
                    <button
                        className={`tab flex-1 sm:flex-none ${activeTab === 'txn_reports' ? 'tab-active' : ''}`}
                        onClick={() => { setActiveTab('txn_reports'); setLoading(false); }}
                    >
                        <Wallet size={16} className="mr-2" />
                        Transaction Reports
                    </button>
                    <button
                        className={`tab flex-1 sm:flex-none ${activeTab === 'gst_reports' ? 'tab-active' : ''}`}
                        onClick={() => { setActiveTab('gst_reports'); setLoading(false); }}
                    >
                        <Shield size={16} className="mr-2" />
                        GST & E-Way Bill
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col justify-center items-center h-96 bg-white rounded-xl">
                    <Loader2 className="animate-spin text-primary mb-4" size={48} />
                    <p className="text-gray-500 font-medium">Loading report data...</p>
                </div>
            ) : (
                <>
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'sales' && renderSales()}
                    {activeTab === 'customers' && renderCustomers()}
                    {activeTab === 'inventory' && renderInventory()}
                    {activeTab === 'profitloss' && renderProfitLoss()}
                    {activeTab === 'delivery' && <DeliveryComparisonReport />}
                    {activeTab === 'item_reports' && <ItemReports dateRange={dateRange} customDateRange={customDateRange} />}
                    {activeTab === 'party_reports' && <PartyReports dateRange={dateRange} customDateRange={customDateRange} />}
                    {activeTab === 'txn_reports' && <TransactionReports dateRange={dateRange} customDateRange={customDateRange} />}
                    {activeTab === 'gst_reports' && <GSTReports dateRange={dateRange} customDateRange={customDateRange} />}
                </>
            )}
        </div>
    );
};

export default Reports;
