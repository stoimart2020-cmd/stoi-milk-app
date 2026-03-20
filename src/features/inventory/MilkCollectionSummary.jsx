import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMilkCollectionSummary, getVendors } from "../../shared/api/vendors";
import {
    Milk, TrendingUp, IndianRupee, Sun, Moon, Calendar,
    ChevronLeft, ChevronRight, Filter, BarChart3, Users,
    Loader, Droplets, Beaker, ArrowUpDown
} from "lucide-react";

const GROUP_OPTIONS = [
    { key: "daily", label: "Daily", icon: Calendar },
    { key: "weekly", label: "Weekly", icon: Calendar },
    { key: "monthly", label: "Monthly", icon: Calendar },
    { key: "yearly", label: "Yearly", icon: BarChart3 },
];

const SHIFT_OPTIONS = [
    { key: "", label: "All Shifts" },
    { key: "Morning", label: "Morning" },
    { key: "Evening", label: "Evening" },
];

export const MilkCollectionSummary = () => {
    const now = new Date();
    const [groupBy, setGroupBy] = useState("daily");
    const [shift, setShift] = useState("");
    const [vendorId, setVendorId] = useState("");
    const [dateMonth, setDateMonth] = useState(now.getMonth() + 1);
    const [dateYear, setDateYear] = useState(now.getFullYear());
    const [sortCol, setSortCol] = useState("totalQuantity");
    const [sortDir, setSortDir] = useState("desc"); // asc | desc

    // Custom date range based on groupBy + month/year selectors
    const dateRange = useMemo(() => {
        if (groupBy === "yearly") {
            return {
                startDate: `${dateYear - 4}-01-01`,
                endDate: `${dateYear}-12-31`,
            };
        } else if (groupBy === "monthly") {
            return {
                startDate: `${dateYear}-01-01`,
                endDate: `${dateYear}-12-31`,
            };
        } else {
            // weekly/daily — current selected month
            const lastDay = new Date(dateYear, dateMonth, 0).getDate();
            return {
                startDate: `${dateYear}-${String(dateMonth).padStart(2, "0")}-01`,
                endDate: `${dateYear}-${String(dateMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
            };
        }
    }, [groupBy, dateMonth, dateYear]);

    const monthName = new Date(dateYear, dateMonth - 1).toLocaleString("default", { month: "long" });

    // ─── Fetch Data ───────────────────────────────────────
    const { data: summaryData, isLoading } = useQuery({
        queryKey: ["milk-collection-summary", groupBy, dateRange.startDate, dateRange.endDate, shift, vendorId],
        queryFn: () => getMilkCollectionSummary({
            groupBy,
            ...dateRange,
            ...(shift ? { shift } : {}),
            ...(vendorId ? { vendorId } : {}),
        }),
    });

    const { data: vendorsData } = useQuery({
        queryKey: ["vendors"],
        queryFn: getVendors,
    });

    const vendors = vendorsData?.result || [];
    const overall = summaryData?.overall || {};
    const periods = summaryData?.periods || [];
    const vendorBreakdown = summaryData?.vendors || [];

    // Sort periods
    const sortedPeriods = useMemo(() => {
        return [...periods].sort((a, b) => {
            const aVal = a[sortCol] ?? 0;
            const bVal = b[sortCol] ?? 0;
            return sortDir === "desc" ? bVal - aVal : aVal - bVal;
        });
    }, [periods, sortCol, sortDir]);

    const toggleSort = (col) => {
        if (sortCol === col) setSortDir(d => d === "desc" ? "asc" : "desc");
        else { setSortCol(col); setSortDir("desc"); }
    };

    // Month navigation
    const prevMonth = () => {
        if (dateMonth === 1) { setDateMonth(12); setDateYear(y => y - 1); }
        else setDateMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (dateMonth === 12) { setDateMonth(1); setDateYear(y => y + 1); }
        else setDateMonth(m => m + 1);
    };
    const prevYear = () => setDateYear(y => y - 1);
    const nextYear = () => setDateYear(y => y + 1);

    // Morning vs Evening percentage for the bar
    const morningPct = overall.totalQuantity > 0
        ? Math.round((overall.morningQty / overall.totalQuantity) * 100)
        : 50;

    return (
        <div className="p-4 space-y-5">
            {/* ═══ Header ═══ */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Milk className="text-teal-600" size={24} />
                        Milk Collection Summary
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">Analyze collections by period, shift & vendor</p>
                </div>
            </div>

            {/* ═══ Filters Bar ═══ */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Group By Tabs */}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                        {GROUP_OPTIONS.map(g => (
                            <button
                                key={g.key}
                                onClick={() => setGroupBy(g.key)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${groupBy === g.key
                                        ? "bg-teal-600 text-white shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>

                    {/* Shift Filter */}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                        {SHIFT_OPTIONS.map(s => (
                            <button
                                key={s.key}
                                onClick={() => setShift(s.key)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${shift === s.key
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                {s.key === "Morning" && <Sun size={12} />}
                                {s.key === "Evening" && <Moon size={12} />}
                                {s.label}
                            </button>
                        ))}
                    </div>

                    {/* Vendor Filter */}
                    <select
                        value={vendorId}
                        onChange={(e) => setVendorId(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                    >
                        <option value="">All Vendors</option>
                        {vendors.map(v => <option key={v._id} value={v._id}>{v.name} ({v.code})</option>)}
                    </select>

                    {/* Date Navigation */}
                    <div className="flex items-center gap-2 ml-auto">
                        {(groupBy === "daily" || groupBy === "weekly") ? (
                            <>
                                <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronLeft size={16} /></button>
                                <span className="text-sm font-bold text-gray-700 min-w-[120px] text-center">{monthName} {dateYear}</span>
                                <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronRight size={16} /></button>
                            </>
                        ) : (
                            <>
                                <button onClick={prevYear} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronLeft size={16} /></button>
                                <span className="text-sm font-bold text-gray-700 min-w-[60px] text-center">{dateYear}</span>
                                <button onClick={nextYear} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronRight size={16} /></button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader className="animate-spin text-teal-600" size={24} />
                    <span className="ml-3 text-gray-500 text-sm">Loading summary...</span>
                </div>
            ) : (
                <>
                    {/* ═══ Overall Summary Cards ═══ */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[
                            { label: "Total Quantity", value: `${overall.totalQuantity?.toLocaleString() || 0} L`, color: "bg-blue-50 border-blue-100 text-blue-700", icon: Droplets },
                            { label: "Total Amount", value: `₹${overall.totalAmount?.toLocaleString() || 0}`, color: "bg-emerald-50 border-emerald-100 text-emerald-700", icon: IndianRupee },
                            { label: "Avg Fat %", value: overall.avgFat || 0, color: "bg-amber-50 border-amber-100 text-amber-700", icon: Beaker },
                            { label: "Avg SNF %", value: overall.avgSNF || 0, color: "bg-purple-50 border-purple-100 text-purple-700", icon: Beaker },
                            { label: "Collections", value: overall.totalCollections || 0, color: "bg-teal-50 border-teal-100 text-teal-700", icon: TrendingUp },
                            { label: "Vendors", value: overall.vendorCount || 0, color: "bg-pink-50 border-pink-100 text-pink-700", icon: Users },
                        ].map(card => (
                            <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{card.label}</p>
                                    <card.icon size={16} className="opacity-40" />
                                </div>
                                <p className="text-xl font-extrabold">{card.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* ═══ Morning vs Evening Split ═══ */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h3 className="text-sm font-bold text-gray-600 mb-3">Morning vs Evening Split</h3>
                        <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center gap-2">
                                <Sun size={16} className="text-amber-500" />
                                <span className="text-sm font-bold text-gray-700">Morning</span>
                                <span className="text-sm font-extrabold text-amber-600">{(overall.morningQty || 0).toLocaleString()} L</span>
                                <span className="text-xs text-gray-400">({morningPct}%)</span>
                            </div>
                            <div className="flex-1" />
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">({100 - morningPct}%)</span>
                                <span className="text-sm font-extrabold text-indigo-600">{(overall.eveningQty || 0).toLocaleString()} L</span>
                                <span className="text-sm font-bold text-gray-700">Evening</span>
                                <Moon size={16} className="text-indigo-500" />
                            </div>
                        </div>
                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500"
                                style={{ width: `${morningPct}%` }}
                            />
                            <div
                                className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-500"
                                style={{ width: `${100 - morningPct}%` }}
                            />
                        </div>
                    </div>

                    {/* ═══ Period-wise Data Table ═══ */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-700 text-sm">
                                {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)} Breakdown
                            </h3>
                            <span className="text-xs text-gray-400">{periods.length} periods</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50/80 border-b">
                                    <tr>
                                        <th className="px-4 py-2.5 font-semibold text-gray-600">Period</th>
                                        <ThSortable label="Qty (L)" col="totalQuantity" sortCol={sortCol} sortDir={sortDir} onClick={toggleSort} />
                                        <ThSortable label="Amount (₹)" col="totalAmount" sortCol={sortCol} sortDir={sortDir} onClick={toggleSort} />
                                        <ThSortable label="Morning (L)" col="morningQty" sortCol={sortCol} sortDir={sortDir} onClick={toggleSort} />
                                        <ThSortable label="Evening (L)" col="eveningQty" sortCol={sortCol} sortDir={sortDir} onClick={toggleSort} />
                                        <ThSortable label="Avg Fat" col="avgFat" sortCol={sortCol} sortDir={sortDir} onClick={toggleSort} />
                                        <ThSortable label="Avg SNF" col="avgSNF" sortCol={sortCol} sortDir={sortDir} onClick={toggleSort} />
                                        <ThSortable label="Avg Rate" col="avgRate" sortCol={sortCol} sortDir={sortDir} onClick={toggleSort} />
                                        <ThSortable label="Count" col="collectionCount" sortCol={sortCol} sortDir={sortDir} onClick={toggleSort} />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {sortedPeriods.length === 0 ? (
                                        <tr><td colSpan="9" className="text-center py-10 text-gray-400">No data for this period</td></tr>
                                    ) : (
                                        sortedPeriods.map((p, i) => (
                                            <tr key={i} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-2.5 font-bold text-gray-800">{p.label}</td>
                                                <td className="px-4 py-2.5 font-semibold text-blue-700">{p.totalQuantity.toLocaleString()}</td>
                                                <td className="px-4 py-2.5 font-semibold text-emerald-700">₹{p.totalAmount.toLocaleString()}</td>
                                                <td className="px-4 py-2.5">
                                                    <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                                                        <Sun size={12} />{p.morningQty.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">
                                                        <Moon size={12} />{p.eveningQty.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5">{p.avgFat}</td>
                                                <td className="px-4 py-2.5">{p.avgSNF}</td>
                                                <td className="px-4 py-2.5">₹{p.avgRate}</td>
                                                <td className="px-4 py-2.5 text-gray-500">{p.collectionCount}</td>
                                            </tr>
                                        ))
                                    )}
                                    {/* Total Row */}
                                    {sortedPeriods.length > 0 && (
                                        <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                                            <td className="px-4 py-3 text-gray-800">TOTAL</td>
                                            <td className="px-4 py-3 text-blue-800">{overall.totalQuantity?.toLocaleString()} L</td>
                                            <td className="px-4 py-3 text-emerald-800">₹{overall.totalAmount?.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-amber-700">{overall.morningQty?.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-indigo-700">{overall.eveningQty?.toLocaleString()}</td>
                                            <td className="px-4 py-3">{overall.avgFat}</td>
                                            <td className="px-4 py-3">{overall.avgSNF}</td>
                                            <td className="px-4 py-3">₹{overall.avgRate}</td>
                                            <td className="px-4 py-3 text-gray-600">{overall.totalCollections}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ═══ Vendor-wise Breakdown ═══ */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-700 text-sm">Vendor-wise Breakdown</h3>
                            <span className="text-xs text-gray-400">{vendorBreakdown.length} vendors</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50/80 border-b">
                                    <tr>
                                        <th className="px-4 py-2.5 font-semibold text-gray-600">Vendor</th>
                                        <th className="px-4 py-2.5 font-semibold text-gray-600 text-right">Total Qty (L)</th>
                                        <th className="px-4 py-2.5 font-semibold text-gray-600 text-right">Total Amt (₹)</th>
                                        <th className="px-4 py-2.5 font-semibold text-gray-600 text-right">Morning (L)</th>
                                        <th className="px-4 py-2.5 font-semibold text-gray-600 text-right">Evening (L)</th>
                                        <th className="px-4 py-2.5 font-semibold text-gray-600 text-right">Avg Fat</th>
                                        <th className="px-4 py-2.5 font-semibold text-gray-600 text-right">Avg SNF</th>
                                        <th className="px-4 py-2.5 font-semibold text-gray-600 text-right">Avg Rate</th>
                                        <th className="px-4 py-2.5 font-semibold text-gray-600 text-right">Count</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {vendorBreakdown.length === 0 ? (
                                        <tr><td colSpan="9" className="text-center py-8 text-gray-400">No vendor data</td></tr>
                                    ) : (
                                        vendorBreakdown.map(v => {
                                            // Bar width for relative quantity
                                            const maxQty = vendorBreakdown[0]?.totalQuantity || 1;
                                            const barWidth = Math.round((v.totalQuantity / maxQty) * 100);
                                            return (
                                                <tr key={v.vendorId} className="hover:bg-gray-50/50">
                                                    <td className="px-4 py-2.5">
                                                        <div className="font-semibold text-gray-800">{v.vendorName}</div>
                                                        <div className="text-xs text-gray-400">{v.vendorCode}</div>
                                                        {/* Mini bar */}
                                                        <div className="h-1 bg-gray-100 rounded-full mt-1 w-24">
                                                            <div className="h-full bg-teal-400 rounded-full transition-all" style={{ width: `${barWidth}%` }} />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-bold text-blue-700">{v.totalQuantity.toLocaleString()}</td>
                                                    <td className="px-4 py-2.5 text-right font-bold text-emerald-700">₹{v.totalAmount.toLocaleString()}</td>
                                                    <td className="px-4 py-2.5 text-right text-amber-600">{v.morningQty.toLocaleString()}</td>
                                                    <td className="px-4 py-2.5 text-right text-indigo-600">{v.eveningQty.toLocaleString()}</td>
                                                    <td className="px-4 py-2.5 text-right">{v.avgFat}</td>
                                                    <td className="px-4 py-2.5 text-right">{v.avgSNF}</td>
                                                    <td className="px-4 py-2.5 text-right">₹{v.avgRate}</td>
                                                    <td className="px-4 py-2.5 text-right text-gray-500">{v.collectionCount}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// ─── Sortable Table Header ─────────────────────────────────
function ThSortable({ label, col, sortCol, sortDir, onClick }) {
    const isActive = sortCol === col;
    return (
        <th
            className="px-4 py-2.5 font-semibold text-gray-600 cursor-pointer hover:text-gray-800 select-none text-right"
            onClick={() => onClick(col)}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                <ArrowUpDown size={12} className={isActive ? "text-teal-600" : "text-gray-300"} />
            </span>
        </th>
    );
}
