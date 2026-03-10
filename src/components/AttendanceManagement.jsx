import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import {
    CalendarCheck, ChevronLeft, ChevronRight, Search, Bike, UserCog,
    RefreshCw, CheckCircle, XCircle, Clock, Sun, Filter, Users,
    Loader, AlertCircle, Download, IndianRupee, TrendingUp, Wallet,
    Banknote, Briefcase
} from "lucide-react";
import { toast } from "react-hot-toast";

// ─── API Helpers ───────────────────────────────────────────
const getAllEmployees = async () => {
    const { data } = await axiosInstance.get("/api/users?type=employee");
    return data;
};

const getEmployeeAttendance = async (id, month, year) => {
    const params = {};
    if (month) params.month = month;
    if (year) params.year = year;
    const { data } = await axiosInstance.get(`/api/riders/${id}/attendance`, { params });
    return data;
};

const markEmployeeAttendance = async (id, attendanceData) => {
    const { data } = await axiosInstance.post(`/api/riders/${id}/attendance`, attendanceData);
    return data;
};

const getSalarySummary = async (month, year) => {
    const { data } = await axiosInstance.get("/api/riders/salary-summary", { params: { month, year } });
    return data;
};

// ─── Constants ─────────────────────────────────────────────
const STATUS_OPTIONS = ["Present", "Absent", "Half Day", "Leave"];
const STATUS_COLORS = {
    Present: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", dot: "#10b981" },
    Absent: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200", dot: "#ef4444" },
    "Half Day": { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", dot: "#f59e0b" },
    Leave: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", dot: "#3b82f6" },
};
const STATUS_SHORT = { Present: "P", Absent: "A", "Half Day": "H", Leave: "L" };

// ─── Main Component ─────────────────────────────────────────
export default function AttendanceManagement() {
    const queryClient = useQueryClient();
    const now = new Date();

    // ─── State ──────────────────────────────────────────
    const [activeGroup, setActiveGroup] = useState("riders"); // riders | staff
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [attMonth, setAttMonth] = useState(now.getMonth() + 1);
    const [attYear, setAttYear] = useState(now.getFullYear());
    const [editingDay, setEditingDay] = useState(null);

    // ─── Get All Employees ──────────────────────────────
    const { data: employeesData, isLoading: empLoading } = useQuery({
        queryKey: ["all-employees"],
        queryFn: getAllEmployees,
    });

    const allEmployees = employeesData?.result || [];

    // Separate riders from staff
    const riders = useMemo(() =>
        allEmployees.filter(e => e.role === "RIDER" && e.isActive !== false),
        [allEmployees]
    );
    const staffMembers = useMemo(() =>
        allEmployees.filter(e => e.role !== "RIDER" && e.isActive !== false),
        [allEmployees]
    );

    const currentList = activeGroup === "riders" ? riders : staffMembers;

    // ─── Search Filter ──────────────────────────────────
    const filteredList = useMemo(() => {
        if (!searchQuery) return currentList;
        const q = searchQuery.toLowerCase();
        return currentList.filter(e =>
            e.name?.toLowerCase().includes(q) ||
            e.mobile?.includes(q) ||
            e.role?.toLowerCase().includes(q)
        );
    }, [currentList, searchQuery]);

    // Auto-select first employee when switching groups
    const handleGroupSwitch = useCallback((group) => {
        setActiveGroup(group);
        setSelectedEmployee(null);
        setEditingDay(null);
        setSearchQuery("");
    }, []);

    // Select employee
    const handleSelectEmployee = useCallback((emp) => {
        setSelectedEmployee(emp);
        setEditingDay(null);
    }, []);

    // ─── Attendance Data for Selected Employee ──────────
    const { data: attendanceData, isLoading: attLoading, refetch: refetchAttendance } = useQuery({
        queryKey: ["employee-attendance", selectedEmployee?._id, attMonth, attYear],
        queryFn: () => getEmployeeAttendance(selectedEmployee._id, attMonth, attYear),
        enabled: !!selectedEmployee?._id,
    });

    // ─── Salary Summary (Overall) ───────────────────────
    const { data: salaryData, isLoading: salaryLoading } = useQuery({
        queryKey: ["salary-summary", attMonth, attYear],
        queryFn: () => getSalarySummary(attMonth, attYear),
    });

    // ─── Mark Attendance Mutation ────────────────────────
    const attendanceMutation = useMutation({
        mutationFn: ({ id, data }) => markEmployeeAttendance(id, data),
        onSuccess: () => {
            toast.success("Attendance marked");
            refetchAttendance();
            queryClient.invalidateQueries(["salary-summary", attMonth, attYear]);
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to mark attendance"),
    });

    const handleMarkAttendance = useCallback((date, status) => {
        if (!selectedEmployee) return;
        attendanceMutation.mutate({ id: selectedEmployee._id, data: { date, status } });
        setEditingDay(null);
    }, [selectedEmployee, attendanceMutation]);

    // ─── Attendance Helpers ─────────────────────────────
    const attResult = attendanceData?.result || {};
    const attRecords = attResult.attendance || [];
    const attSummary = attResult.summary || {};
    const attSalary = attResult.salary || {};
    const daysInMonth = new Date(attYear, attMonth, 0).getDate();
    const monthName = new Date(attYear, attMonth - 1).toLocaleString("default", { month: "long" });
    const firstDayOffset = new Date(attYear, attMonth - 1, 1).getDay();

    // Overall salary data
    const salaryOverall = salaryData?.overall || {};
    const salaryEmployees = salaryData?.employees || [];

    // Find salary for the current group (riders or staff)
    const groupSalary = useMemo(() => {
        if (activeGroup === "riders") {
            return {
                total: salaryOverall.riderSalary || 0,
                count: salaryOverall.riderCount || 0,
                employees: salaryEmployees.filter(e => e.role === "RIDER"),
            };
        } else {
            return {
                total: salaryOverall.staffSalary || 0,
                count: salaryOverall.staffCount || 0,
                employees: salaryEmployees.filter(e => e.role !== "RIDER"),
            };
        }
    }, [activeGroup, salaryOverall, salaryEmployees]);

    // Build map from salary summary for quick lookup
    const salaryMap = useMemo(() => {
        const map = {};
        salaryEmployees.forEach(e => { map[e._id] = e; });
        return map;
    }, [salaryEmployees]);

    const getAttendanceForDay = useCallback((day) => {
        return attRecords.find(a => {
            const d = new Date(a.date);
            return d.getDate() === day && d.getMonth() === attMonth - 1 && d.getFullYear() === attYear;
        });
    }, [attRecords, attMonth, attYear]);

    // ─── Month Navigation ───────────────────────────────
    const prevMonth = () => {
        if (attMonth === 1) { setAttMonth(12); setAttYear(y => y - 1); }
        else { setAttMonth(m => m - 1); }
    };
    const nextMonth = () => {
        if (attMonth === 12) { setAttMonth(1); setAttYear(y => y + 1); }
        else { setAttMonth(m => m + 1); }
    };

    // ─── Quick Mark All Present Today ───────────────────
    const markAllPresent = useCallback(async () => {
        const today = new Date().toISOString().split("T")[0];
        const list = activeGroup === "riders" ? riders : staffMembers;
        let count = 0;
        for (const emp of list) {
            try {
                await markEmployeeAttendance(emp._id, { date: today, status: "Present" });
                count++;
            } catch { /* ignore errors for individual */ }
        }
        toast.success(`Marked ${count} ${activeGroup} as Present today`);
        if (selectedEmployee) refetchAttendance();
        queryClient.invalidateQueries(["salary-summary"]);
    }, [activeGroup, riders, staffMembers, selectedEmployee, refetchAttendance, queryClient]);

    if (empLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader className="animate-spin text-teal-600" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            <style>{`
                .att-card { transition: all 0.2s ease; }
                .att-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
                .att-day-cell { transition: all 0.15s ease; }
                .att-day-cell:hover { transform: scale(1.02); }
                .att-badge { transition: all 0.15s ease; cursor: pointer; }
                .att-badge:hover { opacity: 0.85; transform: scale(1.05); }
                .att-btn { transition: all 0.15s ease; }
                .att-btn:hover { transform: scale(1.08); }
                .att-status-btn { transition: all 0.1s ease; }
                .att-status-btn:hover { transform: scale(1.1); }
                .emp-list::-webkit-scrollbar { width: 4px; }
                .emp-list::-webkit-scrollbar-track { background: transparent; }
                .emp-list::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
            `}</style>

            {/* ═══ Header ═══ */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <CalendarCheck className="text-teal-600" size={28} />
                        Attendance Management
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Mark & track attendance for riders and staff
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={markAllPresent}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition text-sm font-medium border border-emerald-200"
                        title={`Mark all ${activeGroup} as Present for today`}
                    >
                        <CheckCircle size={16} />
                        Mark All Present
                    </button>
                </div>
            </div>

            {/* ═══ Overall Salary Banner ═══ */}
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white rounded-xl p-5 shadow-lg">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-white/70">Total Salary Earned — {monthName} {attYear}</p>
                        <p className="text-3xl font-extrabold mt-1 tracking-tight">
                            ₹{(salaryOverall.totalSalary || 0).toLocaleString()}
                        </p>
                    </div>
                    <div className="flex gap-6">
                        <div className="text-center">
                            <p className="text-xs text-white/60 uppercase tracking-wider font-semibold">Riders</p>
                            <p className="text-xl font-bold mt-0.5">₹{(salaryOverall.riderSalary || 0).toLocaleString()}</p>
                            <p className="text-xs text-white/50">{salaryOverall.riderCount || 0} people</p>
                        </div>
                        <div className="w-px bg-white/20" />
                        <div className="text-center">
                            <p className="text-xs text-white/60 uppercase tracking-wider font-semibold">Staff</p>
                            <p className="text-xl font-bold mt-0.5">₹{(salaryOverall.staffSalary || 0).toLocaleString()}</p>
                            <p className="text-xs text-white/50">{salaryOverall.staffCount || 0} people</p>
                        </div>
                        <div className="w-px bg-white/20" />
                        <div className="text-center">
                            <p className="text-xs text-white/60 uppercase tracking-wider font-semibold">Total Employees</p>
                            <p className="text-xl font-bold mt-0.5">{salaryOverall.employeeCount || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ Group Tabs ═══ */}
            <div className="flex gap-3">
                <button
                    onClick={() => handleGroupSwitch("riders")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${activeGroup === "riders"
                        ? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-200"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}
                >
                    <Bike size={18} />
                    Riders
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${activeGroup === "riders" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                        }`}>
                        {riders.length}
                    </span>
                </button>
                <button
                    onClick={() => handleGroupSwitch("staff")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${activeGroup === "staff"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}
                >
                    <UserCog size={18} />
                    Staff
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${activeGroup === "staff" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                        }`}>
                        {staffMembers.length}
                    </span>
                </button>
            </div>

            {/* ═══ Group Salary Summary Bar ═══ */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${activeGroup === "riders" ? "bg-teal-100 text-teal-700" : "bg-indigo-100 text-indigo-700"}`}>
                            <Wallet size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{activeGroup === "riders" ? "Rider" : "Staff"} Salary — {monthName}</p>
                            <p className="text-lg font-extrabold text-gray-800">₹{(groupSalary.total || 0).toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="text-center">
                            <p className="text-xs font-semibold text-gray-400">People</p>
                            <p className="font-bold text-gray-700">{groupSalary.count}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-semibold text-gray-400">Avg Salary</p>
                            <p className="font-bold text-gray-700">₹{(groupSalary.count > 0 ? Math.round(groupSalary.total / groupSalary.count) : 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ Main Grid ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* ─── Employee List (Left Panel) ─── */}
                <div className="lg:col-span-4 xl:col-span-3">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* Search */}
                        <div className="p-3 border-b border-gray-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder={`Search ${activeGroup}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Employee List */}
                        <div className="emp-list max-h-[calc(100vh-340px)] overflow-y-auto">
                            {filteredList.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No {activeGroup} found</p>
                                </div>
                            ) : (
                                filteredList.map((emp) => {
                                    const empSalary = salaryMap[emp._id];
                                    return (
                                        <div
                                            key={emp._id}
                                            onClick={() => handleSelectEmployee(emp)}
                                            className={`att-card flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 ${selectedEmployee?._id === emp._id
                                                ? "bg-teal-50 border-l-4 border-l-teal-500"
                                                : "hover:bg-gray-50 border-l-4 border-l-transparent"
                                                }`}
                                        >
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm ${activeGroup === "riders"
                                                ? "bg-gradient-to-br from-teal-400 to-teal-600"
                                                : "bg-gradient-to-br from-indigo-400 to-indigo-600"
                                                }`}>
                                                {emp.name?.charAt(0)?.toUpperCase() || "?"}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-800 truncate">{emp.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs text-gray-400">{emp.mobile}</p>
                                                    {empSalary && empSalary.monthEarned > 0 && (
                                                        <span className="text-xs font-bold text-emerald-600">
                                                            ₹{empSalary.monthEarned.toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {activeGroup === "staff" && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">
                                                    {emp.role?.replace(/_/g, " ")}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* ─── Calendar + Details (Right Panel) ─── */}
                <div className="lg:col-span-8 xl:col-span-9">
                    {!selectedEmployee ? (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-20 text-gray-400">
                            <CalendarCheck size={48} className="mb-4 opacity-40" />
                            <p className="text-lg font-medium">Select a {activeGroup === "riders" ? "rider" : "staff member"}</p>
                            <p className="text-sm mt-1">Choose from the list to view and manage attendance</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Employee Header Card */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${activeGroup === "riders"
                                            ? "bg-gradient-to-br from-teal-400 to-teal-600"
                                            : "bg-gradient-to-br from-indigo-400 to-indigo-600"
                                            }`}>
                                            {selectedEmployee.name?.charAt(0)?.toUpperCase() || "?"}
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-800">{selectedEmployee.name}</h2>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-sm text-gray-500">{selectedEmployee.mobile}</span>
                                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                                    {selectedEmployee.role?.replace(/_/g, " ")}
                                                </span>
                                                {selectedEmployee.employeeType && (
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedEmployee.employeeType === "Full Time"
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : "bg-amber-100 text-amber-700"
                                                        }`}>
                                                        {selectedEmployee.employeeType}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => refetchAttendance()}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-600"
                                        title="Refresh Attendance"
                                    >
                                        <RefreshCw size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* ─── Individual Salary Card ─── */}
                            {attSalary.isSalaried && (
                                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-5">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-emerald-100 rounded-xl">
                                                <IndianRupee size={22} className="text-emerald-700" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Salary Earned — {monthName}</p>
                                                <p className="text-2xl font-extrabold text-emerald-800 mt-0.5">
                                                    ₹{(attSalary.monthEarnedSalary || 0).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-4">
                                            <div className="text-center bg-white/70 rounded-lg px-4 py-2 border border-emerald-100">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Salary Type</p>
                                                <p className="text-sm font-bold text-gray-700">{attSalary.salaryType}</p>
                                            </div>
                                            <div className="text-center bg-white/70 rounded-lg px-4 py-2 border border-emerald-100">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Base Salary</p>
                                                <p className="text-sm font-bold text-gray-700">₹{(attSalary.salaryAmount || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="text-center bg-white/70 rounded-lg px-4 py-2 border border-emerald-100">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Working Days</p>
                                                <p className="text-sm font-bold text-gray-700">{attSalary.totalWorkingDays || 0}</p>
                                            </div>
                                            <div className="text-center bg-white/70 rounded-lg px-4 py-2 border border-emerald-100">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Total Earned</p>
                                                <p className="text-sm font-bold text-emerald-700">₹{(attSalary.totalEarnedSalary || 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: "Present", count: attSummary.present || 0, color: STATUS_COLORS.Present, icon: CheckCircle },
                                    { label: "Absent", count: attSummary.absent || 0, color: STATUS_COLORS.Absent, icon: XCircle },
                                    { label: "Half Day", count: attSummary.halfDay || 0, color: STATUS_COLORS["Half Day"], icon: Sun },
                                    { label: "Leave", count: attSummary.leave || 0, color: STATUS_COLORS.Leave, icon: Clock },
                                ].map(({ label, count, color, icon: Icon }) => (
                                    <div key={label} className={`${color.bg} rounded-xl p-4 border ${color.border}`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className={`text-xs font-bold ${color.text} uppercase tracking-wide`}>{label}</p>
                                                <p className={`text-2xl font-extrabold ${color.text} mt-1`}>{count}</p>
                                            </div>
                                            <Icon size={24} className={color.text} style={{ opacity: 0.5 }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Calendar */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                {/* Month Navigator */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                    <button onClick={prevMonth} className="p-2 hover:bg-gray-200 rounded-lg transition">
                                        <ChevronLeft size={20} />
                                    </button>
                                    <h3 className="text-lg font-bold text-gray-800">
                                        {monthName} {attYear}
                                    </h3>
                                    <button onClick={nextMonth} className="p-2 hover:bg-gray-200 rounded-lg transition">
                                        <ChevronRight size={20} />
                                    </button>
                                </div>

                                {attLoading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <Loader className="animate-spin text-teal-600" size={24} />
                                        <span className="ml-3 text-gray-500 text-sm">Loading attendance...</span>
                                    </div>
                                ) : (
                                    <div className="p-5">
                                        {/* Day headers */}
                                        <div className="grid grid-cols-7 gap-2 mb-3">
                                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                                                <div key={d} className="text-center text-xs font-bold text-gray-400 uppercase py-1">
                                                    {d}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Calendar Grid */}
                                        <div className="grid grid-cols-7 gap-2">
                                            {/* Empty cells */}
                                            {Array.from({ length: firstDayOffset }).map((_, i) => (
                                                <div key={`empty-${i}`} />
                                            ))}

                                            {/* Day cells */}
                                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                                const day = i + 1;
                                                const record = getAttendanceForDay(day);
                                                const isToday = day === now.getDate() && attMonth === now.getMonth() + 1 && attYear === now.getFullYear();
                                                const isFuture = new Date(attYear, attMonth - 1, day) > now;
                                                const isEditing = editingDay === day;
                                                const dateStr = `${attYear}-${String(attMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                                                return (
                                                    <div
                                                        key={day}
                                                        className={`att-day-cell border rounded-xl p-2.5 min-h-[80px] relative ${isToday
                                                            ? "border-teal-400 bg-teal-50/60 ring-1 ring-teal-200"
                                                            : "border-gray-200 bg-white"
                                                            } ${isFuture ? "opacity-35" : ""}`}
                                                    >
                                                        {/* Day number */}
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className={`text-xs font-bold ${isToday ? "text-teal-600" : "text-gray-500"}`}>
                                                                {day}
                                                            </span>
                                                            {isToday && (
                                                                <span className="text-[8px] font-bold text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded-full">
                                                                    TODAY
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Status display or buttons */}
                                                        {record && !isEditing ? (
                                                            <div
                                                                onClick={() => !isFuture && setEditingDay(day)}
                                                                className={`att-badge text-[11px] font-bold px-2 py-1 rounded-lg border text-center ${STATUS_COLORS[record.status]?.bg || "bg-gray-100"
                                                                    } ${STATUS_COLORS[record.status]?.text || "text-gray-600"} ${STATUS_COLORS[record.status]?.border || "border-gray-200"
                                                                    }`}
                                                                title="Click to change"
                                                            >
                                                                {record.status}
                                                            </div>
                                                        ) : !isFuture ? (
                                                            <div className="mt-1">
                                                                <div className="grid grid-cols-2 gap-1">
                                                                    {STATUS_OPTIONS.map(s => (
                                                                        <button
                                                                            key={s}
                                                                            onClick={() => handleMarkAttendance(dateStr, s)}
                                                                            className={`att-status-btn text-[9px] font-bold px-1 py-1 rounded-md transition-colors ${record?.status === s
                                                                                ? "bg-teal-500 text-white shadow-sm"
                                                                                : "bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                                                                                }`}
                                                                            title={s}
                                                                        >
                                                                            {STATUS_SHORT[s]}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                {record && (
                                                                    <button
                                                                        onClick={() => setEditingDay(null)}
                                                                        className="text-[8px] text-gray-400 hover:text-gray-600 mt-1 w-full text-center"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Legend */}
                            <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
                                {STATUS_OPTIONS.map(s => (
                                    <div key={s} className="flex items-center gap-1.5">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: STATUS_COLORS[s]?.dot }}
                                        />
                                        <span>{s}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
