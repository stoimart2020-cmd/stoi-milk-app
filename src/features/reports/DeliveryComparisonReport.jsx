import React, { useState, useCallback, useEffect } from "react";
import { axiosInstance as axios } from "../../shared/api/axios";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
    Loader2, Calendar, Download, ArrowUpRight, ArrowDownRight,
    Users, TrendingUp, TrendingDown, Minus, RefreshCw,
    UserPlus, UserMinus, Edit3, CheckCircle, ChevronDown, ChevronRight,
    Wallet, Info, Truck, Building2, MapPin, Filter, X
} from "lucide-react";

// ── reason emoji map ──────────────────────────────────────────────────────────
const REASON_ICONS = {
    VACATION: "🏖️", ALTERNATE_DAY: "🔁", WEEKDAY_OFF: "📅",
    LOW_BALANCE: "💸", SUBSCRIPTION_PAUSED: "⏸️", SUBSCRIPTION_CANCELLED: "❌",
    SUBSCRIPTION_ENDED: "⌛", TRIAL_ENDED: "🧪", CUSTOMER_REQUEST: "🙋",
    PARTIAL_PAUSE: "🔽", LOW_BALANCE_QTY: "💸", ALT_DAY_QTY: "🔁",
    CUSTOMER_MODIFIED_QTY: "✏️", BACK_FROM_VACATION: "🏡", ALTERNATE_DAY_ON: "🔁",
    SCHEDULED_DAY: "📅", WALLET_TOPPED_UP: "💰", NEW_SUBSCRIPTION: "🌟",
    SUBSCRIPTION_ACTIVE: "✅", NEW_DELIVERY: "➕", INCREASED_QTY: "📈", RECHARGED: "🔋",
};

// ── summary card ──────────────────────────────────────────────────────────────
const SummaryCard = ({ icon: Icon, label, value, color, delta }) => (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
        <div className={`p-3 rounded-xl ${color}`}><Icon size={22} className="text-white" /></div>
        <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
            {delta !== undefined && (
                <div className={`flex items-center gap-1 text-xs mt-1 font-semibold ${delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-gray-400"}`}>
                    {delta > 0 ? <ArrowUpRight size={12} /> : delta < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
                    {delta > 0 ? `+${delta}` : delta} vs base day
                </div>
            )}
        </div>
    </div>
);

// ── customer row ──────────────────────────────────────────────────────────────
const CustomerRow = ({ entry, type }) => {
    const [expanded, setExpanded] = useState(false);
    const rowColors = {
        added: "border-l-4 border-emerald-400 bg-emerald-50/40",
        removed: "border-l-4 border-red-400 bg-red-50/40",
        modified: "border-l-4 border-amber-400 bg-amber-50/40",
        unchanged: "border-l-4 border-gray-200 bg-gray-50/30",
    };
    const badgeColors = {
        added: "bg-emerald-100 text-emerald-700",
        removed: "bg-red-100 text-red-700",
        modified: entry?.delta > 0 ? "bg-amber-100 text-amber-700" : "bg-orange-100 text-orange-700",
        unchanged: "bg-gray-100 text-gray-600",
    };
    const qty1 = entry.qty1 ?? entry.qty;
    const qty2 = entry.qty2 ?? entry.qty;

    return (
        <div className={`rounded-xl mb-2 overflow-hidden shadow-sm ${rowColors[type]}`}>
            <button className="w-full text-left px-4 py-3 flex items-center gap-3" onClick={() => setExpanded(e => !e)}>
                {expanded ? <ChevronDown size={16} className="text-gray-400 shrink-0" /> : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800 text-sm">{entry.customer.name}</span>
                        <span className="text-xs text-gray-400">#{entry.customer.customerId}</span>
                        <span className="text-xs text-gray-400">{entry.customer.mobile}</span>
                        {entry.customer.rider && entry.customer.rider !== "—" && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Truck size={10} /> {entry.customer.rider}
                            </span>
                        )}
                    </div>
                </div>
                <div className="shrink-0 flex items-center gap-2 text-xs">
                    {type === "modified" ? (
                        <span className={`px-2 py-0.5 rounded-full font-bold ${badgeColors[type]}`}>
                            {qty1} → {qty2} ({entry.delta > 0 ? `+${entry.delta}` : entry.delta})
                        </span>
                    ) : (
                        <span className={`px-2 py-0.5 rounded-full font-bold ${badgeColors[type]}`}>
                            {type === "added" ? `+${entry.qty2} units` : type === "removed" ? `-${entry.qty1} units` : `${qty1} units`}
                        </span>
                    )}
                    {entry.customer.walletBalance < 50 && (
                        <span title="Low wallet" className="text-red-400 text-xs flex items-center gap-0.5">
                            <Wallet size={12} /> ₹{entry.customer.walletBalance?.toFixed(0)}
                        </span>
                    )}
                </div>
            </button>

            {expanded && (
                <div className="px-5 pb-4 pt-1 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/50">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            {type === "modified" ? "Base Day Products" : "Products"}
                        </p>
                        <div className="space-y-1">
                            {(entry.products || entry.products1 || []).map((p, i) => (
                                <div key={i} className="flex justify-between text-sm text-gray-700 bg-white rounded-lg px-3 py-1.5 shadow-xs">
                                    <span>{p.name}</span>
                                    <span className="font-semibold">{p.quantity} × ₹{p.price}</span>
                                </div>
                            ))}
                        </div>
                        {type === "modified" && entry.products2?.length > 0 && (
                            <>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 mt-3">Compare Day Products</p>
                                <div className="space-y-1">
                                    {entry.products2.map((p, i) => (
                                        <div key={i} className="flex justify-between text-sm text-gray-700 bg-white rounded-lg px-3 py-1.5 shadow-xs">
                                            <span>{p.name}</span>
                                            <span className="font-semibold">{p.quantity} × ₹{p.price}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            {type === "added" ? "Why Added?" : type === "removed" ? "Why Removed?" : "Why Changed?"}
                        </p>
                        <div className="space-y-1.5">
                            {(entry.reasons || []).map((r, i) => (
                                <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 text-sm shadow-xs">
                                    <span>{REASON_ICONS[r.code] || "•"}</span>
                                    <span className="text-gray-700">{r.label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                            <Info size={11} /> System-inferred from subscription & account data
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── section ───────────────────────────────────────────────────────────────────
const Section = ({ title, icon: Icon, color, items, type, emptyMsg }) => {
    const [collapsed, setCollapsed] = useState(false);
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button onClick={() => setCollapsed(c => !c)} className={`w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 ${color}`}>
                <div className="flex items-center gap-3">
                    <Icon size={20} className="opacity-80" />
                    <span className="font-bold text-base">{title}</span>
                    <span className="text-sm font-medium opacity-70">({items.length})</span>
                </div>
                {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
            </button>
            {!collapsed && (
                <div className="p-4">
                    {items.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 text-sm">{emptyMsg}</div>
                    ) : (
                        items.map((entry, idx) => <CustomerRow key={idx} entry={entry} type={type} />)
                    )}
                </div>
            )}
        </div>
    );
};

// ── filter type config ─────────────────────────────────────────────────────────
const FILTER_TYPES = [
    { value: "", label: "All (No Filter)", icon: Users },
    { value: "rider", label: "By Rider", icon: Truck },
    { value: "hub", label: "By Hub", icon: Building2 },
    { value: "serviceArea", label: "By Service Area", icon: MapPin },
];

// ── main component ─────────────────────────────────────────────────────────────
const DeliveryComparisonReport = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const tomorrowStr = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })();

    const [date1, setDate1] = useState(todayStr);
    const [date2, setDate2] = useState(tomorrowStr);
    const [filterType, setFilterType] = useState("");
    const [filterId, setFilterId] = useState("");

    const [loading, setLoading] = useState(false);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [filterOptions, setFilterOptions] = useState({ riders: [], hubs: [], serviceAreas: [] });
    const [data, setData] = useState(null);

    // Load filter options once on mount
    useEffect(() => {
        setLoadingOptions(true);
        axios.get("/api/analytics/delivery-comparison/filter-options")
            .then(res => setFilterOptions(res.data.result || { riders: [], hubs: [], serviceAreas: [] }))
            .catch(() => { }) // silent - optional enhancement
            .finally(() => setLoadingOptions(false));
    }, []);

    // Reset filterId when filterType changes
    useEffect(() => { setFilterId(""); }, [filterType]);

    const getFilterList = () => {
        if (filterType === "rider") return filterOptions.riders;
        if (filterType === "hub") return filterOptions.hubs;
        if (filterType === "serviceArea") return filterOptions.serviceAreas;
        return [];
    };

    const getActiveFilterLabel = () => {
        const list = getFilterList();
        const item = list.find(i => i._id === filterId);
        return item?.name || "";
    };

    const fetchComparison = useCallback(async () => {
        if (!date1 || !date2) return toast.error("Please select both dates");
        setLoading(true);
        try {
            let url = `/api/analytics/delivery-comparison?date1=${date1}&date2=${date2}`;
            if (filterType && filterId) url += `&filterType=${filterType}&filterId=${filterId}`;
            const { data: res } = await axios.get(url);
            setData(res.result);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to load comparison data");
        } finally {
            setLoading(false);
        }
    }, [date1, date2, filterType, filterId]);

    const exportReport = () => {
        if (!data) return;
        const toRows = (items, section) =>
            items.map(e => ({
                Section: section,
                "Customer Name": e.customer.name,
                "Customer ID": e.customer.customerId,
                Mobile: e.customer.mobile,
                Rider: e.customer.rider || "",
                "Wallet Balance": e.customer.walletBalance,
                "Base Qty": e.qty1 ?? e.qty ?? "-",
                "Compare Qty": e.qty2 ?? e.qty ?? "-",
                Delta: e.delta ?? 0,
                Reasons: (e.reasons || []).map(r => r.label).join("; ")
            }));

        const rows = [
            ...toRows(data.added, "Added"),
            ...toRows(data.removed, "Removed"),
            ...toRows(data.modified, "Modified"),
            ...toRows(data.unchanged, "Unchanged"),
        ];
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Delivery Comparison");
        XLSX.writeFile(wb, `delivery_comparison_${date1}_vs_${date2}.xlsx`);
        toast.success("Report exported!");
    };

    const activeFilterName = getActiveFilterLabel();

    return (
        <div className="space-y-6">
            {/* ── Controls ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
                {/* Date row */}
                <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
                    <div className="flex flex-col sm:flex-row gap-4 flex-1">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">📅 Base Date</label>
                            <input type="date" className="input input-bordered w-full text-sm" value={date1} onChange={e => setDate1(e.target.value)} />
                        </div>
                        <div className="flex items-end pb-1 text-gray-400 font-bold text-lg">vs</div>
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">📅 Compare Date</label>
                            <input type="date" className="input input-bordered w-full text-sm" value={date2} onChange={e => setDate2(e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Filter row */}
                <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Filter size={14} className="text-gray-400" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Narrow by</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                        {/* Filter type toggle pills */}
                        <div className="flex gap-2 flex-wrap">
                            {FILTER_TYPES.map(ft => {
                                const Icon = ft.icon;
                                const active = filterType === ft.value;
                                return (
                                    <button
                                        key={ft.value}
                                        onClick={() => setFilterType(ft.value)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${active
                                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                            : "bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300"
                                            }`}
                                    >
                                        <Icon size={14} />
                                        {ft.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Value select */}
                        {filterType && (
                            <div className="flex items-center gap-2">
                                <select
                                    className="select select-bordered select-sm min-w-[200px]"
                                    value={filterId}
                                    onChange={e => setFilterId(e.target.value)}
                                    disabled={loadingOptions}
                                >
                                    <option value="">
                                        {loadingOptions ? "Loading..." : `Select ${filterType === "rider" ? "Rider" : filterType === "hub" ? "Hub" : "Service Area"}...`}
                                    </option>
                                    {getFilterList().map(item => (
                                        <option key={item._id} value={item._id}>{item.name}</option>
                                    ))}
                                </select>
                                {filterId && (
                                    <button onClick={() => setFilterId("")} className="text-gray-400 hover:text-red-400">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Active filter badge */}
                    {filterType && filterId && activeFilterName && (
                        <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full">
                            {filterType === "rider" && <Truck size={12} />}
                            {filterType === "hub" && <Building2 size={12} />}
                            {filterType === "serviceArea" && <MapPin size={12} />}
                            Filtered by: {activeFilterName}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end border-t border-gray-100 pt-4">
                    <button onClick={fetchComparison} className="btn btn-primary gap-2" disabled={loading}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        Compare
                    </button>
                    {data && (
                        <button onClick={exportReport} className="btn btn-ghost gap-2 border border-gray-200">
                            <Download size={16} /> Export
                        </button>
                    )}
                </div>
            </div>

            {/* ── Loading ── */}
            {loading && (
                <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-100">
                    <Loader2 className="animate-spin text-primary mb-3" size={40} />
                    <p className="text-gray-500">Analysing deliveries...</p>
                </div>
            )}

            {/* ── Results ── */}
            {!loading && data && (
                <>
                    {/* Summary KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <SummaryCard icon={Calendar} label="Base Day" value={data.summary.totalDate1} color="bg-blue-500" />
                        <SummaryCard icon={Calendar} label="Compare Day" value={data.summary.totalDate2} color="bg-indigo-500" delta={data.summary.netChange} />
                        <SummaryCard icon={UserPlus} label="Added" value={data.summary.added} color="bg-emerald-500" />
                        <SummaryCard icon={UserMinus} label="Removed" value={data.summary.removed} color="bg-red-500" />
                        <SummaryCard icon={Edit3} label="Qty Changed" value={data.summary.modified} color="bg-amber-500" />
                        <SummaryCard icon={CheckCircle} label="Unchanged" value={data.summary.unchanged} color="bg-gray-400" />
                    </div>

                    {/* Filter context label */}
                    {data.summary.filterType !== "all" && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm">
                            {data.summary.filterType === "rider" && <Truck size={16} className="text-blue-500" />}
                            {data.summary.filterType === "hub" && <Building2 size={16} className="text-purple-500" />}
                            {data.summary.filterType === "serviceArea" && <MapPin size={16} className="text-green-500" />}
                            <span>Showing deliveries filtered by <strong>{data.summary.filterType}</strong></span>
                        </div>
                    )}

                    {/* Net change banner */}
                    <div className={`rounded-2xl p-4 flex items-center gap-4 border ${data.summary.netChange > 0 ? "bg-emerald-50 border-emerald-200"
                        : data.summary.netChange < 0 ? "bg-red-50 border-red-200"
                            : "bg-gray-50 border-gray-200"
                        }`}>
                        {data.summary.netChange > 0 ? <TrendingUp size={28} className="text-emerald-600 shrink-0" />
                            : data.summary.netChange < 0 ? <TrendingDown size={28} className="text-red-500 shrink-0" />
                                : <Minus size={28} className="text-gray-400 shrink-0" />}
                        <div>
                            <p className="font-bold text-gray-800">
                                {data.summary.netChange > 0
                                    ? `+${data.summary.netChange} more deliveries on ${data.summary.date2}`
                                    : data.summary.netChange < 0
                                        ? `${data.summary.netChange} fewer deliveries on ${data.summary.date2}`
                                        : "No net change in delivery count"}
                            </p>
                            <p className="text-sm text-gray-500">
                                {data.summary.date1} → {data.summary.date2} · {data.summary.totalDate1} to {data.summary.totalDate2} active deliveries
                            </p>
                        </div>
                    </div>

                    <Section title="Added Deliveries" icon={UserPlus} color="bg-emerald-50 text-emerald-800" items={data.added} type="added" emptyMsg="No new deliveries were added." />
                    <Section title="Removed Deliveries" icon={UserMinus} color="bg-red-50 text-red-800" items={data.removed} type="removed" emptyMsg="No deliveries were removed." />
                    <Section title="Quantity Modified" icon={Edit3} color="bg-amber-50 text-amber-800" items={data.modified} type="modified" emptyMsg="No quantity changes found." />
                    <Section title="Unchanged Deliveries" icon={CheckCircle} color="bg-gray-50 text-gray-700" items={data.unchanged} type="unchanged" emptyMsg="All deliveries have changed." />
                </>
            )}

            {!loading && !data && (
                <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-dashed border-gray-200 text-center px-4">
                    <Calendar size={40} className="text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">Select two dates and click <strong>Compare</strong> to generate the report.</p>
                    <p className="text-gray-400 text-sm mt-1">Optionally narrow by Rider, Hub, or Service Area.</p>
                </div>
            )}
        </div>
    );
};

export default DeliveryComparisonReport;
