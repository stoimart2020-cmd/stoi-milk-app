import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "../../shared/api/dashboard";
import {
    Users,
    UserPlus,
    UserX,
    Lightbulb,
    ShoppingCart,
    IndianRupee,
    CalendarCheck,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    Package,
    Truck,
    CheckCircle2,
    XCircle,
    Clock,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    AlertTriangle,
    MessageSquare,
    Cloud,
    Sun,
    CloudRain,
    CloudLightning,
    Snowflake,
    BarChart3,
    PieChart as PieChartIcon,
    Activity,
} from "lucide-react";
import { getWeather, getWeatherCondition } from "../../shared/api/weather";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
    BarChart, Bar, Legend,
    ComposedChart, Line, RadialBarChart, RadialBar,
} from "recharts";

import { useFilters } from "../../shared/context/FilterContext";

// ─── Color Palette ───────────────────────────────────────────────────────────
const COLORS = {
    primary: "#6366F1",    // Indigo
    success: "#10B981",    // Emerald
    danger: "#EF4444",     // Red
    warning: "#F59E0B",    // Amber
    info: "#3B82F6",       // Blue
    purple: "#8B5CF6",     // Purple
    cyan: "#06B6D4",       // Cyan
    pink: "#EC4899",       // Pink
    slate: "#64748B",      // Slate
    teal: "#14B8A6",       // Teal
};

const CHART_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#3B82F6", "#EC4899", "#8B5CF6", "#06B6D4", "#EF4444"];

// ─── Utility Components ──────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, subtitle, children }) => (
    <div className="flex flex-wrap justify-between items-center mb-4">
        <div className="flex items-center gap-3">
            {Icon && (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                    <Icon size={18} className="text-white" />
                </div>
            )}
            <div>
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">{title}</h3>
                {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
            </div>
        </div>
        {children}
    </div>
);

const WeatherIcon = ({ code, size = 24 }) => {
    const { icon } = getWeatherCondition(code || 0);
    if (icon === "Sun") return <Sun size={size} />;
    if (icon === "CloudRain") return <CloudRain size={size} />;
    if (icon === "CloudLightning") return <CloudLightning size={size} />;
    if (icon === "Snowflake") return <Snowflake size={size} />;
    return <Cloud size={size} />;
};

const StatusBadge = ({ status }) => {
    const styles = {
        delivered: "bg-emerald-100 text-emerald-700",
        confirmed: "bg-blue-100 text-blue-700",
        pending: "bg-amber-100 text-amber-700",
        cancelled: "bg-red-100 text-red-700",
        out_for_delivery: "bg-cyan-100 text-cyan-700",
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${styles[status] || "bg-gray-100 text-gray-600"}`}>
            {status?.replace(/_/g, " ")}
        </span>
    );
};

const CustomTooltipStyle = {
    borderRadius: '12px',
    border: 'none',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    padding: '12px 16px',
    fontSize: '12px',
};

// ─── Main Dashboard Component ────────────────────────────────────────────────
export const DashboardHome = () => {
    const { filters } = useFilters();
    const { data: dashboardData, isLoading, refetch } = useQuery({
        queryKey: ["dashboardStats", filters],
        queryFn: () => getDashboardStats(filters),
    });

    const { data: weatherData } = useQuery({
        queryKey: ["weather"],
        queryFn: () => getWeather(),
        staleTime: 1000 * 60 * 30,
    });

    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const [refreshing, setRefreshing] = useState(false);
    const handleRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    // ─── Extract Data ─────────────────────────────────────────────────────────
    const stats = dashboardData?.result?.stats || {};
    const deliveryStats = dashboardData?.result?.deliveryStats || {};
    const salesData = dashboardData?.result?.salesAnalytics || [];
    const categoryData = dashboardData?.result?.categorySplit || [];
    const forecastData = dashboardData?.result?.salesForecast || [];
    const topProducts = dashboardData?.result?.topProducts || [];
    const lowStockItems = dashboardData?.result?.lowStockItems || [];
    const recentOrders = dashboardData?.result?.recentOrders || [];
    const customerGrowth = dashboardData?.result?.customerGrowth || [];
    const deliveryPerf = dashboardData?.result?.deliveryPerformance7Day || [];
    const walletSummary = dashboardData?.result?.walletSummary || {};
    const complaintStats = dashboardData?.result?.complaintStats || {};
    const frequencySplit = dashboardData?.result?.frequencySplit || [];

    // ─── KPI Data ─────────────────────────────────────────────────────────
    const kpis = [
        { title: "Total Customers", value: stats.totalCustomers || 0, icon: Users, gradient: "from-blue-500 to-blue-600", light: "bg-blue-50", text: "text-blue-600" },
        { title: "Active Subscriptions", value: stats.activeSubscriptions || 0, icon: CheckCircle2, gradient: "from-emerald-500 to-teal-600", light: "bg-emerald-50", text: "text-emerald-600" },
        { title: "New Subscribers", value: stats.newSubscribers || 0, icon: UserPlus, gradient: "from-indigo-500 to-purple-600", light: "bg-indigo-50", text: "text-indigo-600", trend: "up" },
        { title: "Inactive Subs", value: stats.inactiveSubscribers || 0, icon: UserX, gradient: "from-red-500 to-rose-600", light: "bg-red-50", text: "text-red-600", trend: "down" },
        { title: "Re-Activations", value: stats.reactivations || 0, icon: Lightbulb, gradient: "from-amber-500 to-orange-600", light: "bg-amber-50", text: "text-amber-600" },
        { title: "Trials Active", value: stats.trialCustomers || 0, icon: ShoppingCart, gradient: "from-purple-500 to-fuchsia-600", light: "bg-purple-50", text: "text-purple-600" },
        { title: "Today's Revenue", value: `₹${(stats.todayRevenue || 0).toLocaleString()}`, icon: IndianRupee, gradient: "from-teal-500 to-cyan-600", light: "bg-teal-50", text: "text-teal-600" },
        { title: "Monthly Revenue", value: `₹${(stats.monthlyRevenue || 0).toLocaleString()}`, icon: TrendingUp, gradient: "from-cyan-500 to-sky-600", light: "bg-cyan-50", text: "text-cyan-600" },
    ];

    const deliveryCompletionRate = deliveryStats.total > 0
        ? Math.round((deliveryStats.completed / deliveryStats.total) * 100)
        : 0;

    const completionRadial = [{ name: "Completion", value: deliveryCompletionRate, fill: COLORS.success }];

    const categoryTotal = categoryData.reduce((sum, c) => sum + c.value, 0);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw size={32} className="animate-spin text-indigo-500" />
                    <p className="text-sm text-gray-500 font-medium">Loading dashboard analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 font-sans text-gray-700">

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 1: Executive KPI Cards
               ═══════════════════════════════════════════════════════════════════ */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Command Center</h1>
                    <p className="text-xs text-gray-400">Real-time business analytics overview</p>
                </div>
                <button
                    onClick={handleRefresh}
                    className="btn btn-sm bg-indigo-500 hover:bg-indigo-600 text-white border-none rounded-xl gap-2 shadow-md"
                >
                    <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {kpis.map((kpi, i) => (
                    <div key={i} className={`${kpi.light} rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden group`}>
                        <div className="absolute -top-6 -right-6 w-16 h-16 bg-gradient-to-br opacity-10 rounded-full group-hover:opacity-20 transition-opacity" />
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${kpi.gradient} flex items-center justify-center mb-2 shadow-sm`}>
                            <kpi.icon size={16} className="text-white" />
                        </div>
                        <div className="flex items-baseline gap-1">
                            <h2 className={`text-lg font-bold ${kpi.text}`}>{kpi.value}</h2>
                            {kpi.trend === "up" && <ArrowUpRight size={12} className="text-emerald-500" />}
                            {kpi.trend === "down" && <ArrowDownRight size={12} className="text-red-500" />}
                        </div>
                        <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5 leading-tight">{kpi.title}</p>
                    </div>
                ))}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 2: Today's Operations Strip
               ═══════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
                <SectionHeader icon={Truck} title="Today's Operations" subtitle="Delivery performance for today" />
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <Package size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-gray-800">{deliveryStats.total || 0}</p>
                            <p className="text-[10px] text-gray-500 font-semibold uppercase">Total Orders</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <CheckCircle2 size={20} className="text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-emerald-700">{deliveryStats.completed || 0}</p>
                            <p className="text-[10px] text-gray-500 font-semibold uppercase">Delivered</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-amber-50 rounded-xl p-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <Clock size={20} className="text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-amber-700">{deliveryStats.pending || 0}</p>
                            <p className="text-[10px] text-gray-500 font-semibold uppercase">Pending</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-red-50 rounded-xl p-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                            <XCircle size={20} className="text-red-600" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-red-700">{deliveryStats.failed || 0}</p>
                            <p className="text-[10px] text-gray-500 font-semibold uppercase">Failed</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-3">
                        <div className="w-12 h-12">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={completionRadial} startAngle={90} endAngle={-270}>
                                    <RadialBar background={{ fill: '#E5E7EB' }} dataKey="value" cornerRadius={10} />
                                </RadialBarChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <p className="text-xl font-bold text-indigo-700">{deliveryCompletionRate}%</p>
                            <p className="text-[10px] text-gray-500 font-semibold uppercase">Success Rate</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 3 & 13: Revenue Trend + Weather
               ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Revenue Trend Chart */}
                <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm">
                    <SectionHeader icon={BarChart3} title="Revenue Trend" subtitle="Monthly revenue for the last 12 months" />
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                                <Tooltip contentStyle={CustomTooltipStyle} formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']} />
                                <Area type="monotone" dataKey="value" stroke={COLORS.primary} strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevTrend)" dot={{ stroke: COLORS.primary, strokeWidth: 2, r: 3, fill: 'white' }} activeDot={{ r: 5 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Compact Weather */}
                <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/10 to-transparent" />
                    <div>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                <WeatherIcon code={weatherData?.current?.weather_code} size={20} />
                                <span className="text-sm font-medium opacity-90">
                                    {weatherData ? getWeatherCondition(weatherData.current.weather_code).label : "..."}
                                </span>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold">
                                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </div>
                                <div className="text-[10px] opacity-70 uppercase tracking-widest">
                                    {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit' })}
                                </div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="text-5xl font-light">
                                {weatherData ? Math.round(weatherData.current.temperature_2m) : "--"}°
                            </div>
                            <div className="text-xs mt-1 opacity-80">
                                {weatherData?.daily ? `H: ${Math.round(weatherData.daily.temperature_2m_max[0])}° · L: ${Math.round(weatherData.daily.temperature_2m_min[0])}°` : "-- / --"}
                            </div>
                            <div className="mt-2 text-sm font-medium opacity-90">Nagercoil</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1 mt-4 text-center">
                        {weatherData?.daily?.time.slice(1, 6).map((dateStr, i) => {
                            const date = new Date(dateStr);
                            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                            return (
                                <div key={i} className="flex flex-col items-center gap-0.5 opacity-80 hover:opacity-100 transition-opacity">
                                    <span className="text-[9px] font-bold">{dayName}</span>
                                    <WeatherIcon code={weatherData.daily.weather_code[i + 1]} size={14} />
                                    <span className="text-[10px] font-bold">{Math.round(weatherData.daily.temperature_2m_max[i + 1])}°</span>
                                </div>
                            );
                        }) || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d, i) => (
                            <div key={i} className="flex flex-col items-center gap-0.5 opacity-50">
                                <span className="text-[9px]">{d}</span>
                                <Cloud size={14} />
                                <span className="text-[10px]">--</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 4: Sales Forecast (7-Day)
               ═══════════════════════════════════════════════════════════════════ */}
            {forecastData.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <SectionHeader icon={TrendingUp} title="Sales Forecast" subtitle="Expected revenue for the next 7 days based on active subscriptions">
                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-500" /><span className="text-gray-500">Revenue (₹)</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-gray-500">Orders</span></div>
                        </div>
                    </SectionHeader>
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="bg-emerald-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-emerald-600 font-medium">Today's Forecast</p>
                            <p className="text-lg font-bold text-emerald-700">₹{forecastData[0]?.expectedRevenue?.toLocaleString() || 0}</p>
                            <p className="text-[10px] text-emerald-500">{forecastData[0]?.expectedOrders || 0} orders · {forecastData[0]?.expectedQuantity || 0} units</p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-blue-600 font-medium">7-Day Total</p>
                            <p className="text-lg font-bold text-blue-700">₹{forecastData.reduce((sum, d) => sum + d.expectedRevenue, 0).toLocaleString()}</p>
                            <p className="text-[10px] text-blue-500">{forecastData.reduce((sum, d) => sum + d.expectedOrders, 0)} orders</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-amber-600 font-medium">Daily Average</p>
                            <p className="text-lg font-bold text-amber-700">₹{Math.round(forecastData.reduce((sum, d) => sum + d.expectedRevenue, 0) / 7).toLocaleString()}</p>
                            <p className="text-[10px] text-amber-500">~{Math.round(forecastData.reduce((sum, d) => sum + d.expectedOrders, 0) / 7)} orders/day</p>
                        </div>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={forecastData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.8} />
                                        <stop offset="95%" stopColor={COLORS.success} stopOpacity={0.2} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 600 }} />
                                <YAxis yAxisId="revenue" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
                                <YAxis yAxisId="orders" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                                <Tooltip contentStyle={CustomTooltipStyle} formatter={(value, name) => { if (name === 'expectedRevenue') return [`₹${value.toLocaleString()}`, 'Revenue']; if (name === 'expectedOrders') return [value, 'Orders']; return [value, name]; }} labelFormatter={(label, payload) => { const item = payload?.[0]?.payload; return item ? `${item.dayFull} (${item.date})` : label; }} />
                                <Bar yAxisId="revenue" dataKey="expectedRevenue" fill="url(#forecastGrad)" radius={[6, 6, 0, 0]} barSize={36} />
                                <Line yAxisId="orders" dataKey="expectedOrders" stroke={COLORS.warning} strokeWidth={3} dot={{ stroke: COLORS.warning, strokeWidth: 2, r: 4, fill: 'white' }} activeDot={{ r: 6 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 5 & 6: Customer Growth + Delivery Performance Heatmap
               ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customer Growth & Churn */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <SectionHeader icon={Users} title="Customer Growth vs Churn" subtitle="Last 6 months — new signups vs cancellations" />
                    <div className="h-[260px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={customerGrowth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                                <Tooltip contentStyle={CustomTooltipStyle} />
                                <Bar dataKey="newCustomers" name="New Customers" fill={COLORS.success} radius={[4, 4, 0, 0]} barSize={28} />
                                <Line dataKey="churned" name="Churned" stroke={COLORS.danger} strokeWidth={2.5} dot={{ r: 4, fill: 'white', stroke: COLORS.danger, strokeWidth: 2 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 7-Day Delivery Performance */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <SectionHeader icon={Activity} title="7-Day Delivery Performance" subtitle="Daily success rate heatmap" />
                    <div className="space-y-2.5">
                        {deliveryPerf.map((day, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-xs font-bold text-gray-500 w-10">{day.day}</span>
                                <div className="flex-1 bg-gray-100 rounded-full h-7 relative overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                                        style={{
                                            width: `${Math.max(day.successRate, 4)}%`,
                                            background: day.successRate >= 90 ? `linear-gradient(90deg, ${COLORS.success}, ${COLORS.teal})`
                                                : day.successRate >= 70 ? `linear-gradient(90deg, ${COLORS.warning}, #FBBF24)`
                                                    : `linear-gradient(90deg, ${COLORS.danger}, #F87171)`,
                                        }}
                                    >
                                        {day.total > 0 && <span className="text-[10px] font-bold text-white">{day.successRate}%</span>}
                                    </div>
                                </div>
                                <span className="text-[10px] text-gray-400 w-20 text-right">{day.delivered}/{day.total} done</span>
                            </div>
                        ))}
                    </div>
                    {deliveryPerf.length > 0 && (
                        <div className="flex gap-4 mt-4 text-[10px] text-gray-500 justify-center">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> ≥90%</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> 70-89%</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> &lt;70%</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 7 & 8: Top Products + Category Revenue Donut
               ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Selling Products */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <SectionHeader icon={Package} title="Top Selling Products" subtitle="By quantity sold (all time)" />
                    {topProducts.length > 0 ? (
                        <div className="space-y-3">
                            {topProducts.map((product, i) => {
                                const maxSold = topProducts[0]?.sold || 1;
                                const pct = Math.round((product.sold / maxSold) * 100);
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-semibold text-gray-700 truncate max-w-[140px]">{product.name}</span>
                                                <span className="text-xs text-gray-500">{product.sold} units · ₹{product.revenue?.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2">
                                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">No product data available</div>
                    )}
                </div>

                {/* Revenue by Category Donut */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <SectionHeader icon={PieChartIcon} title="Revenue by Category" subtitle="This month's split by product category" />
                    <div className="flex items-center">
                        <div className="w-1/2 h-[230px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={categoryData} dataKey="value" innerRadius={55} outerRadius={85} startAngle={90} endAngle={-270} paddingAngle={2}>
                                        {categoryData.map((entry, index) => (
                                            <Cell key={index} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={CustomTooltipStyle} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <p className="text-lg font-bold text-gray-800">{categoryTotal}</p>
                                    <p className="text-[9px] text-gray-400 uppercase font-bold">Total Units</p>
                                </div>
                            </div>
                        </div>
                        <div className="w-1/2 space-y-2">
                            {categoryData.map((cat, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: cat.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                                    <span className="text-xs text-gray-600 truncate flex-1">{cat.name}</span>
                                    <span className="text-xs font-bold text-gray-700">{cat.value}</span>
                                    <span className="text-[10px] text-gray-400">({categoryTotal > 0 ? Math.round((cat.value / categoryTotal) * 100) : 0}%)</span>
                                </div>
                            ))}
                            {categoryData.length === 0 && <p className="text-sm text-gray-400">No data</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 9 & 10: Wallet Overview + Low Stock Alerts
               ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Wallet & Payments */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <SectionHeader icon={Wallet} title="Wallet & Payments" subtitle="This month's wallet activity" />
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-emerald-50 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-emerald-600 font-semibold uppercase">Credits</p>
                            <p className="text-lg font-bold text-emerald-700">₹{(walletSummary.totalCredits || 0).toLocaleString()}</p>
                            <p className="text-[10px] text-emerald-500">{walletSummary.creditCount || 0} txns</p>
                        </div>
                        <div className="bg-red-50 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-red-600 font-semibold uppercase">Debits</p>
                            <p className="text-lg font-bold text-red-700">₹{(walletSummary.totalDebits || 0).toLocaleString()}</p>
                            <p className="text-[10px] text-red-500">{walletSummary.debitCount || 0} txns</p>
                        </div>
                        <div className={`rounded-xl p-3 text-center ${(walletSummary.netFlow || 0) >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                            <p className="text-[10px] text-gray-600 font-semibold uppercase">Net Flow</p>
                            <p className={`text-lg font-bold ${(walletSummary.netFlow || 0) >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                                {(walletSummary.netFlow || 0) >= 0 ? '+' : ''}₹{(walletSummary.netFlow || 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    {walletSummary.modeSplit?.length > 0 && (
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Collection by Mode</p>
                            <div className="space-y-1.5">
                                {walletSummary.modeSplit.map((m, i) => {
                                    const maxAmt = walletSummary.modeSplit[0]?.amount || 1;
                                    return (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="text-[10px] font-semibold text-gray-500 w-20 uppercase">{m.mode}</span>
                                            <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                                                <div className="h-full rounded-full" style={{ width: `${(m.amount / maxAmt) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-600 w-16 text-right">₹{m.amount.toLocaleString()}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Low Stock Alerts */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <SectionHeader icon={AlertTriangle} title="Low Stock Alerts" subtitle="Products below reorder threshold" />
                    {lowStockItems.length > 0 ? (
                        <div className="space-y-3">
                            {lowStockItems.map((item, i) => {
                                const pct = item.threshold > 0 ? Math.min(Math.round((item.stock / item.threshold) * 100), 100) : 0;
                                const color = pct <= 25 ? COLORS.danger : pct <= 50 ? COLORS.warning : COLORS.success;
                                return (
                                    <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                                            <Package size={16} style={{ color }} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-semibold text-gray-700">{item.name}</span>
                                                <span className="text-xs font-bold" style={{ color }}>{item.stock} / {item.threshold}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">All products are well stocked</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 11 & 12: Recent Orders + Complaints + Frequency Split
               ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <SectionHeader icon={ShoppingCart} title="Recent Orders" subtitle="Latest 5 orders" />
                    {recentOrders.length > 0 ? (
                        <div className="space-y-2.5">
                            {recentOrders.map((order, i) => (
                                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                            <span className="text-xs font-bold text-indigo-600">{order.customer?.charAt(0)}</span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-700 truncate max-w-[100px]">{order.customer}</p>
                                            <p className="text-[10px] text-gray-400">{new Date(order.time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-gray-700">₹{order.amount}</p>
                                        <StatusBadge status={order.status} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">No recent orders</div>
                    )}
                </div>

                {/* Complaints Summary */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <SectionHeader icon={MessageSquare} title="Complaints Overview" subtitle="Current complaint status breakdown" />
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        {[
                            { label: "Open", count: complaintStats.open || 0, color: COLORS.danger, bg: "bg-red-50" },
                            { label: "In Progress", count: complaintStats.in_progress || 0, color: COLORS.warning, bg: "bg-amber-50" },
                            { label: "Resolved", count: complaintStats.resolved || 0, color: COLORS.success, bg: "bg-emerald-50" },
                            { label: "Closed", count: complaintStats.closed || 0, color: COLORS.slate, bg: "bg-gray-50" },
                        ].map((s, i) => (
                            <div key={i} className={`${s.bg} rounded-xl p-3 text-center`}>
                                <p className="text-xl font-bold" style={{ color: s.color }}>{s.count}</p>
                                <p className="text-[10px] text-gray-500 font-semibold uppercase">{s.label}</p>
                            </div>
                        ))}
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-500">Total Complaints</p>
                        <p className="text-2xl font-bold text-gray-700">{complaintStats.total || 0}</p>
                    </div>
                </div>

                {/* Subscription Frequency Split */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <SectionHeader icon={CalendarCheck} title="Subscription Mix" subtitle="Distribution by delivery frequency" />
                    {frequencySplit.length > 0 ? (
                        <>
                            <div className="h-[180px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={frequencySplit} dataKey="value" innerRadius={40} outerRadius={70} startAngle={90} endAngle={-270} paddingAngle={3}>
                                            {frequencySplit.map((_, idx) => (
                                                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={CustomTooltipStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-1.5 mt-2">
                                {frequencySplit.map((f, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                            <span className="text-xs text-gray-600">{f.name}</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-700">{f.value}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">No subscription data</div>
                    )}
                </div>
            </div>
        </div>
    );
};
