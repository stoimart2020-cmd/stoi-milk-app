import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../../shared/api/axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Search, Filter, RefreshCw, RotateCcw, Download, Eye } from "lucide-react";

const fetchLogs = async (roleType, page, limit, filters) => {
    let url = `/api/logs?roleType=${roleType}&page=${page}&limit=${limit}`;
    const { data } = await axiosInstance.get(url);
    return data;
};

export const ActivityLogs = () => {
    const [activeTab, setActiveTab] = useState("customer"); // 'customer' (Change Status Log) or 'employee' (Activity Log)
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [selectedLog, setSelectedLog] = useState(null);

    // Unified filter state - in a real app, you might want to separate these or use a reducer
    const [filters, setFilters] = useState({});

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["activityLogs", activeTab, page, limit],
        queryFn: () => fetchLogs(activeTab, page, limit, filters),
    });

    const logs = data?.result || [];
    const totalPages = data?.pagination?.pages || 1;
    const totalEntries = data?.pagination?.total || 0;

    // Client-side filtering helper
    const matchesFilter = (value, filterValue) => {
        if (!filterValue) return true;
        if (!value) return false;
        return String(value).toLowerCase().includes(filterValue.toLowerCase());
    };

    const filteredLogs = logs.filter(log => {
        if (activeTab === "customer") {
            const m = log.metadata || {};
            return (
                matchesFilter(log._id, filters.id) &&
                matchesFilter(m.subscriptionId, filters.subscriptionId) &&
                matchesFilter(m.customerId, filters.customerId) &&
                matchesFilter(m.customerName, filters.name) &&
                matchesFilter(m.mobile, filters.mobile) &&
                matchesFilter(m.newStatus, filters.newStatus) &&
                matchesFilter(m.hubName, filters.hubName)
            );
        } else {
            const m = log.metadata || {};
            return (
                matchesFilter(log._id, filters.id) &&
                matchesFilter(m.actorType, filters.actorType) &&
                matchesFilter(m.changedBy, filters.changedBy) &&
                matchesFilter(log.entityType, filters.entityType) &&
                matchesFilter(log.entityId, filters.entityId)
            );
        }
    });

    const handleSeed = async () => {
        await axiosInstance.post("/api/logs/seed");
        refetch();
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // Render Helper for Change Status Log Table
    const renderChangeStatusTable = () => (
        <table className="table table-xs w-full border whitespace-nowrap">
            <thead className="bg-gray-100">
                <tr>
                    <th>Created</th>
                    <th>Subscription Id</th>
                    <th>Customer Id</th>
                    <th>Name</th>
                    <th>Mobile number</th>
                    <th>Start Date</th>
                    <th>New Status</th>
                    <th>Current Status</th>
                    <th>Previous Status</th>
                    <th>Suspend From</th>
                    <th>Hub name</th>
                    <th>Address</th>
                    <th>Resume From</th>
                    <th>Is Retained</th>
                    <th>Reason</th>
                    <th>Note</th>
                    <th>Admin User</th>
                    <th>Last delivery date</th>
                    <th>Id</th>
                </tr>
                {/* Filter Row */}
                <tr>
                    <th><input type="text" className="input input-bordered input-xs w-full" placeholder="Search" disabled /></th>
                    <th><input type="text" className="input input-bordered input-xs w-20" placeholder="Sub Id" onChange={(e) => handleFilterChange("subscriptionId", e.target.value)} /></th>
                    <th><input type="text" className="input input-bordered input-xs w-20" placeholder="Cust Id" onChange={(e) => handleFilterChange("customerId", e.target.value)} /></th>
                    <th><input type="text" className="input input-bordered input-xs w-24" placeholder="Name" onChange={(e) => handleFilterChange("name", e.target.value)} /></th>
                    <th><input type="text" className="input input-bordered input-xs w-24" placeholder="Mobile" onChange={(e) => handleFilterChange("mobile", e.target.value)} /></th>
                    <th></th>
                    <th><input type="text" className="input input-bordered input-xs w-24" placeholder="Status" onChange={(e) => handleFilterChange("newStatus", e.target.value)} /></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th><input type="text" className="input input-bordered input-xs w-24" placeholder="Hub" onChange={(e) => handleFilterChange("hubName", e.target.value)} /></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th><input type="text" className="input input-bordered input-xs w-20" placeholder="Id" onChange={(e) => handleFilterChange("id", e.target.value)} /></th>
                </tr>
            </thead>
            <tbody>
                {filteredLogs.map((log) => {
                    const m = log.metadata || {};
                    return (
                        <tr key={log._id} className="hover">
                            <td>
                                {new Date(log.createdAt).toLocaleDateString()} <br />
                                <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleTimeString()}</span>
                            </td>
                            <td>{m.subscriptionId || "-"}</td>
                            <td>{m.customerId || "-"}</td>
                            <td className="text-blue-600 cursor-pointer hover:underline">{m.customerName || "-"}</td>
                            <td>{m.mobile || "-"}</td>
                            <td>{m.startDate ? new Date(m.startDate).toLocaleDateString() : "-"}</td>
                            <td>{m.newStatus || "-"}</td>
                            <td>{m.currentStatus || "-"}</td>
                            <td>{m.previousStatus || "-"}</td>
                            <td>{m.suspendFrom ? new Date(m.suspendFrom).toLocaleDateString() : "-"}</td>
                            <td>{m.hubName || "-"}</td>
                            <td>
                                <div className="tooltip" data-tip={m.address || "No address"}>
                                    <Eye size={14} className="cursor-pointer text-gray-500" />
                                </div>
                            </td>
                            <td>{m.resumeFrom ? new Date(m.resumeFrom).toLocaleDateString() : "-"}</td>
                            <td>{m.isRetained || "-"}</td>
                            <td>{m.reason || "-"}</td>
                            <td>{m.note || "-"}</td>
                            <td>{m.adminUser || "-"}</td>
                            <td>{m.lastDeliveryDate ? new Date(m.lastDeliveryDate).toLocaleDateString() : "-"}</td>
                            <td className="font-mono text-xs">{log._id.slice(-6)}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );

    // Render Helper for Activity Log Table
    const renderActivityTable = () => (
        <table className="table table-xs w-full border">
            <thead className="bg-gray-100">
                <tr>
                    <th className="w-24">Id</th>
                    <th className="w-32">Created</th>
                    <th>Actor Type</th>
                    <th>Changed by</th>
                    <th className="w-64">Log</th>
                    <th>Entity Type</th>
                    <th>Entity Id</th>
                    <th>Actor Id</th>
                    <th>Customer Id</th>
                    <th>Old Data</th>
                </tr>
                {/* Filter Row */}
                <tr>
                    <th><input type="text" className="input input-bordered input-xs w-full" placeholder="Id" onChange={(e) => handleFilterChange("id", e.target.value)} /></th>
                    <th></th>
                    <th><input type="text" className="input input-bordered input-xs w-full" placeholder="Actor Type" onChange={(e) => handleFilterChange("actorType", e.target.value)} /></th>
                    <th><input type="text" className="input input-bordered input-xs w-full" placeholder="Changed By" onChange={(e) => handleFilterChange("changedBy", e.target.value)} /></th>
                    <th></th>
                    <th><input type="text" className="input input-bordered input-xs w-full" placeholder="Entity Type" onChange={(e) => handleFilterChange("entityType", e.target.value)} /></th>
                    <th><input type="text" className="input input-bordered input-xs w-full" placeholder="Entity Id" onChange={(e) => handleFilterChange("entityId", e.target.value)} /></th>
                    <th></th>
                    <th></th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {filteredLogs.map((log) => {
                    const m = log.metadata || {};
                    return (
                        <tr key={log._id} className="hover">
                            <td className="font-mono text-blue-600">{log._id.slice(-6)}</td>
                            <td>
                                {new Date(log.createdAt).toLocaleDateString()} <br />
                                <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleTimeString()}</span>
                            </td>
                            <td>{m.actorType || "system"}</td>
                            <td>{m.changedBy || "-"}</td>
                            <td>
                                <div className="text-xs">{log.description}</div>
                                {m.logDetails && <div className="text-[10px] text-gray-400 mt-1">{m.logDetails}</div>}
                            </td>
                            <td>{log.entityType || "-"}</td>
                            <td>{log.entityId || "-"}</td>
                            <td>{m.actorId || "-"}</td>
                            <td>{m.customerId || "-"}</td>
                            <td>
                                {(log.oldData || log.newData) && (
                                    <button className="btn btn-ghost btn-xs text-primary" onClick={() => setSelectedLog(log)}>
                                        <Eye size={14} />
                                    </button>
                                )}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );

    return (
        <div className="p-4 space-y-4 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">
                        {activeTab === "customer" ? "CHANGE STATUS LOG" : "ACTIVITY LOG"}
                    </h1>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-sm btn-outline gap-2" onClick={handleSeed}>
                        <RefreshCw size={14} /> Seed Data
                    </button>
                    <button className="btn btn-sm btn-primary gap-2">
                        <Download size={14} /> Export
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs tabs-boxed bg-white p-1 w-fit">
                <a className={`tab ${activeTab === "customer" ? "tab-active" : ""} `} onClick={() => setActiveTab("customer")}>Change Status Log</a>
                <a className={`tab ${activeTab === "employee" ? "tab-active" : ""} `} onClick={() => setActiveTab("employee")}>Activity Log</a>
            </div>

            <div className="bg-white rounded shadow p-4">
                {/* Controls */}
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-sm">
                        Show
                        <select className="select select-bordered select-xs" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        entries
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn-xs btn-ghost gap-1" onClick={() => refetch()}>
                            <RefreshCw size={12} /> Refresh
                        </button>
                        <button className="btn btn-xs btn-ghost gap-1" onClick={() => setFilters({})}>
                            <RotateCcw size={12} /> Reset
                        </button>
                    </div>
                </div>

                {/* Table Container */}
                <div className="overflow-x-auto pb-4">
                    {isLoading ? (
                        <div className="text-center py-10">Loading...</div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-10">No data found</div>
                    ) : (
                        activeTab === "customer" ? renderChangeStatusTable() : renderActivityTable()
                    )}
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4 text-sm text-gray-500 border-t pt-4">
                    <div>Showing {filteredLogs.length} of {totalEntries} entries</div>
                    <div className="join">
                        <button className="join-item btn btn-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>«</button>
                        <button className="join-item btn btn-xs">Page {page}</button>
                        <button className="join-item btn btn-xs" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>»</button>
                    </div>
                </div>
            </div>

            {/* Data Modal */}
            {selectedLog && (
                <dialog className="modal modal-open">
                    <div className="modal-box w-11/12 max-w-3xl">
                        <h3 className="font-bold text-lg mb-4">Log Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-red-50 p-4 rounded border border-red-100">
                                <h4 className="font-bold text-red-800 mb-2">Old Data</h4>
                                <pre className="text-xs overflow-auto max-h-60">{JSON.stringify(selectedLog.oldData, null, 2) || "No previous data"}</pre>
                            </div>
                            <div className="bg-green-50 p-4 rounded border border-green-100">
                                <h4 className="font-bold text-green-800 mb-2">New Data</h4>
                                <pre className="text-xs overflow-auto max-h-60">{JSON.stringify(selectedLog.newData, null, 2) || "No new data"}</pre>
                            </div>
                        </div>
                        <div className="modal-action">
                            <button className="btn" onClick={() => setSelectedLog(null)}>Close</button>
                        </div>
                    </div>
                </dialog>
            )}
        </div>
    );
};
