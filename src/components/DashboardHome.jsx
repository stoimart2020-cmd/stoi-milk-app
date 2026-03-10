import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "../lib/api/dashboard";
import {
    User,
    UserPlus,
    UserX,
    Lightbulb,
    ShoppingCart,
    Info,
    Cloud,
    Sun,
    CloudRain,
    CloudLightning,
    Snowflake,
    MoreHorizontal,
    RefreshCw,
    Calendar as CalendarIcon,
    TrendingUp
} from "lucide-react";
import { getWeather, getWeatherCondition } from "../lib/api/weather";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
    BarChart, Bar, Legend,
    ComposedChart, Line
} from "recharts";

import { useFilters } from "../context/FilterContext";

export const DashboardHome = () => {
    const { filters } = useFilters();
    const { data: dashboardData, isLoading, refetch } = useQuery({
        queryKey: ["dashboardStats", filters],
        queryFn: () => getDashboardStats(filters),
    });

    const { data: weatherData } = useQuery({
        queryKey: ["weather"],
        queryFn: () => getWeather(), // Default location (Nagercoil)
        staleTime: 1000 * 60 * 30, // 30 mins cache
    });

    const WeatherIcon = ({ code, size = 24 }) => {
        const { icon } = getWeatherCondition(code || 0);
        if (icon === "Sun") return <Sun size={size} />;
        if (icon === "CloudRain") return <CloudRain size={size} />;
        if (icon === "CloudLightning") return <CloudLightning size={size} />;
        if (icon === "Snowflake") return <Snowflake size={size} />;
        return <Cloud size={size} />;
    };

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

    const stats = dashboardData?.result?.stats || {};
    const salesData = dashboardData?.result?.salesAnalytics || [];
    const categoryData = dashboardData?.result?.categorySplit || [];
    const comparisonData = dashboardData?.result?.comparisonData || [];
    const forecastData = dashboardData?.result?.salesForecast || [];


    // Using real stats from backend
    const kpiData = [
        {
            title: "Active Subscriptions",
            value: stats.activeSubscriptions || 0,
            icon: User,
            bg: "bg-[#E6F4F1]", // Light Cyan
            text: "text-[#2D9CDB]",
            iconBg: "bg-white",
            trend: "neutral"
        },
        {
            title: "New Subscriptions",
            value: stats.newSubscribers || 0,
            icon: UserPlus,
            bg: "bg-[#E8F0FE]", // Light Blue
            text: "text-[#1a73e8]",
            iconBg: "bg-white",
            trend: stats.newSubscribers > 0 ? "up" : "neutral"
        },
        {
            title: "Inactive Subscriptions",
            value: stats.inactiveSubscribers || 0,
            icon: UserX,
            bg: "bg-[#FCE8E6]", // Light Red
            text: "text-[#d93025]",
            iconBg: "bg-white",
            trend: "down"
        },
        {
            title: "Re-Activations",
            value: stats.reactivations || 0,
            icon: Lightbulb,
            bg: "bg-[#FEF7E0]", // Light Yellow
            text: "text-[#f9ab00]",
            iconBg: "bg-white",
            trend: stats.reactivations > 0 ? "up" : "neutral"
        },
        {
            title: "Trial Given",
            value: stats.trialCustomers || 0,
            icon: ShoppingCart,
            bg: "bg-[#F3E8FD]", // Light Purple
            text: "text-[#9334E6]",
            iconBg: "bg-white",
            trend: "neutral"
        },
    ];

    return (
        <div className="space-y-6 font-sans text-gray-700">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {kpiData.map((kpi, index) => (
                    <div key={index} className={`${kpi.bg} rounded-2xl p-4 shadow-sm relative overflow-hidden transition-transform hover:scale-105`}>
                        <div className="absolute top-3 right-3 text-gray-400 cursor-pointer hover:text-gray-600">
                            <Info size={14} />
                        </div>
                        <div className={`w-10 h-10 rounded-xl ${kpi.iconBg} flex items-center justify-center mb-3 shadow-sm`}>
                            <kpi.icon size={20} className={kpi.text} />
                        </div>
                        <div className="flex items-baseline gap-1">
                            <h2 className={`text-2xl font-bold ${kpi.text}`}>
                                {kpi.trend === 'down' ? '-' : kpi.trend === 'up' ? '+' : ''}{kpi.value}
                            </h2>
                            {kpi.trend === 'down' && <span className="text-xs text-red-500 font-bold">↓</span>}
                            {kpi.trend === 'up' && <span className="text-xs text-green-500 font-bold">↑</span>}
                        </div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-1">{kpi.title}</p>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Sales Analytics Chart (Left - Spans 3 cols) */}
                <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex flex-wrap justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">SALES ANALYTICS</h3>
                            <span className="badge badge-info bg-[#00BCD4] text-white border-none badge-sm font-bold">MONTHLY VIEW</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="btn btn-sm bg-[#FF6B6B] hover:bg-[#ff5252] text-white border-none rounded-full px-4 font-normal">Monthly View</button>
                            <select className="select select-sm select-bordered rounded-full text-xs font-normal">
                                <option>Last 30 Days</option>
                            </select>
                            <button className="btn btn-ghost btn-circle btn-sm" onClick={handleRefresh}>
                                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mb-4">
                        <select className="select select-bordered select-xs w-32">
                            <option>All Category</option>
                        </select>
                        <div className="badge badge-success bg-[#00C48C] text-white border-none p-3 gap-2 cursor-pointer">
                            All Products <span className="text-[10px]">✕</span>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#81D4FA" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#81D4FA" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9E9E9E' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9E9E9E' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#29B6F6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                    dot={{ stroke: '#29B6F6', strokeWidth: 2, r: 4, fill: 'white' }}
                                    activeDot={{ r: 6 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Weather Widget (Right - Spans 1 col) */}
                {/* Weather Widget (Right - Spans 1 col) */}
                <div className="bg-[#F5BF55] rounded-2xl p-6 text-white shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[400px]">
                    {/* Background Pattern Effects */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/5 to-transparent"></div>

                    <div>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                <WeatherIcon code={weatherData?.current?.weather_code} size={24} />
                                <span className="font-medium text-lg">
                                    {weatherData ? getWeatherCondition(weatherData.current.weather_code).label : "Loading..."}
                                </span>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold">
                                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </div>
                                <div className="text-xs opacity-80 uppercase tracking-widest">
                                    {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: '2-digit', day: '2-digit' })}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <div className="text-6xl font-light">
                                {weatherData ? Math.round(weatherData.current.temperature_2m) : "--"}°
                            </div>
                            <div className="text-sm mt-2 opacity-90">
                                {weatherData?.daily ?
                                    `${Math.round(weatherData.daily.temperature_2m_max[0])}° / ${Math.round(weatherData.daily.temperature_2m_min[0])}°`
                                    : "-- / --"}
                            </div>
                            <div className="mt-4 font-medium">Nagercoil</div>
                        </div>
                    </div>

                    {/* Weekly Forecast (Next 5 Days) */}
                    <div className="grid grid-cols-5 gap-1 mt-6 text-center">
                        {weatherData?.daily?.time.slice(1, 6).map((dateStr, i) => {
                            const date = new Date(dateStr);
                            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                            const code = weatherData.daily.weather_code[i + 1];
                            const maxTemp = Math.round(weatherData.daily.temperature_2m_max[i + 1]);

                            return (
                                <div key={i} className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-bold opacity-70">{dayName}</span>
                                    <WeatherIcon code={code} size={16} />
                                    <span className="text-xs font-bold mt-1">{maxTemp}°</span>
                                </div>
                            );
                        }) || (
                                // Skeleton / Loading State
                                ['MON', 'TUE', 'WED', 'THU', 'FRI'].map((d, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1 opacity-50">
                                        <span className="text-[10px]">{d}</span>
                                        <Cloud size={16} />
                                        <span className="text-xs">--</span>
                                    </div>
                                ))
                            )}
                    </div>
                </div>
            </div>

            {/* Sales Forecast Section */}
            {forecastData.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex flex-wrap justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                                <TrendingUp size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">SALES FORECAST</h3>
                                <p className="text-xs text-gray-400">Expected revenue for the next 7 days based on active subscriptions</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                                <span className="text-gray-500">Revenue (₹)</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                <span className="text-gray-500">Orders</span>
                            </div>
                        </div>
                    </div>

                    {/* Forecast Summary Cards */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-emerald-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-emerald-600 font-medium">Today's Forecast</p>
                            <p className="text-xl font-bold text-emerald-700">₹{forecastData[0]?.expectedRevenue?.toLocaleString() || 0}</p>
                            <p className="text-[10px] text-emerald-500">{forecastData[0]?.expectedOrders || 0} orders · {forecastData[0]?.expectedQuantity || 0} units</p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-blue-600 font-medium">7-Day Total</p>
                            <p className="text-xl font-bold text-blue-700">
                                ₹{forecastData.reduce((sum, d) => sum + d.expectedRevenue, 0).toLocaleString()}
                            </p>
                            <p className="text-[10px] text-blue-500">
                                {forecastData.reduce((sum, d) => sum + d.expectedOrders, 0)} orders · {forecastData.reduce((sum, d) => sum + d.expectedQuantity, 0)} units
                            </p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-amber-600 font-medium">Daily Average</p>
                            <p className="text-xl font-bold text-amber-700">
                                ₹{Math.round(forecastData.reduce((sum, d) => sum + d.expectedRevenue, 0) / 7).toLocaleString()}
                            </p>
                            <p className="text-[10px] text-amber-500">
                                ~{Math.round(forecastData.reduce((sum, d) => sum + d.expectedOrders, 0) / 7)} orders/day
                            </p>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={forecastData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.2} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                                <XAxis
                                    dataKey="day"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 600 }}
                                />
                                <YAxis
                                    yAxisId="revenue"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#9E9E9E' }}
                                    tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`}
                                />
                                <YAxis
                                    yAxisId="orders"
                                    orientation="right"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#9E9E9E' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                        padding: '12px 16px',
                                    }}
                                    formatter={(value, name) => {
                                        if (name === 'expectedRevenue') return [`₹${value.toLocaleString()}`, 'Revenue'];
                                        if (name === 'expectedOrders') return [value, 'Orders'];
                                        return [value, name];
                                    }}
                                    labelFormatter={(label, payload) => {
                                        const item = payload?.[0]?.payload;
                                        return item ? `${item.dayFull} (${item.date})` : label;
                                    }}
                                />
                                <Bar
                                    yAxisId="revenue"
                                    dataKey="expectedRevenue"
                                    fill="url(#forecastGradient)"
                                    radius={[6, 6, 0, 0]}
                                    barSize={40}
                                />
                                <Line
                                    yAxisId="orders"
                                    dataKey="expectedOrders"
                                    stroke="#F59E0B"
                                    strokeWidth={3}
                                    dot={{ stroke: '#F59E0B', strokeWidth: 2, r: 4, fill: 'white' }}
                                    activeDot={{ r: 6 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Bottom Row Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Sales Split Donut */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">SALES</h3>
                            <h2 className="text-lg font-bold text-gray-800">SPLIT BY CATEGORY</h2>
                        </div>
                        <div className="flex gap-2">
                            <select className="select select-xs select-bordered">
                                <option>February</option>
                            </select>
                            <select className="select select-xs select-bordered">
                                <option>2026</option>
                            </select>
                            <button className="btn btn-ghost btn-xs btn-circle"><RefreshCw size={12} /></button>
                        </div>
                    </div>

                    <div className="h-[250px] w-full relative flex items-center justify-center">
                        <ResponsiveContainer width={300} height={300}>
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    dataKey="value"
                                    innerRadius={60}
                                    outerRadius={90}
                                    startAngle={90}
                                    endAngle={-270}
                                    paddingAngle={0}
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color || '#FF6B6B'} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Value */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            {/* Can put Total or Center Text here */}
                        </div>
                    </div>
                </div>

                {/* Sales Comparison Bar */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">SALES COMPARISON</h3>
                            <h4 className="text-sm text-gray-500 uppercase">(CURRENT VS LAST MONTH)</h4>
                        </div>
                        <div className="flex gap-1">
                            <button className="btn btn-ghost btn-xs btn-circle">-</button>
                            <button className="btn btn-ghost btn-xs btn-circle"><RefreshCw size={12} /></button>
                        </div>
                    </div>

                    <div className="h-[250px] w-full">
                        <div className="text-center text-xs font-medium text-gray-500 mb-2">Order Count Comparison</div>
                        <ResponsiveContainer width="100%" height="80%">
                            <BarChart data={comparisonData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={false} axisLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Legend iconType="rect" />
                                <Bar dataKey="current" name="Current Month" fill="#4CAF50" barSize={40} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="last" name="Last Month" fill="#2196F3" barSize={40} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Order Type Distribution (Bottom Right of layout) */}
                    {/* The image shows a side-by-side or stacked layout here. I'll split this card locally. */}
                    <div className="mt-4 pt-4 border-t">
                        <div className="text-center text-xs font-medium text-gray-500 mb-2">Order Type Distribution (%)</div>
                        <div className="h-4 w-full flex rounded-full overflow-hidden">
                            <div className="bg-green-500 w-[70%]" title="Subscription"></div>
                            <div className="bg-blue-500 w-[25%]" title="One-Time"></div>
                            <div className="bg-yellow-400 w-[5%]" title="Trial"></div>
                        </div>
                        <div className="flex justify-center gap-4 mt-2 text-[10px] text-gray-500 uppercase font-bold">
                            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-sm"></div> Subscription</div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-sm"></div> One-Time</div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-400 rounded-sm"></div> Trial</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
