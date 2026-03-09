import React, { useState, useEffect, useRef } from "react";
import { axiosInstance as axios } from "../../lib/axios";
import toast from "react-hot-toast";
import {
    Download, Upload, Database, Shield, RefreshCw, CheckCircle,
    AlertTriangle, Clock, FileArchive, Loader2, ChevronDown,
    ChevronRight, Info, Trash2, HardDrive
} from "lucide-react";

// ── collection display name map ────────────────────────────────────────────────
const COLLECTION_LABELS = {
    User: "Customers & Users",
    Order: "Orders",
    Subscription: "Subscriptions",
    SubscriptionModification: "Subscription Changes",
    Product: "Products",
    Category: "Categories",
    ServiceArea: "Service Areas",
    Hub: "Hubs",
    Area: "Areas",
    Factory: "Factories",
    District: "Districts",
    City: "Cities",
    DeliveryPoint: "Delivery Points",
    DeliveryRoute: "Delivery Routes",
    Employee: "Riders & Employees",
    Transaction: "Payment Transactions",
    Invoice: "Invoices",
    Complaint: "Complaints / Tickets",
    Notification: "Notifications",
    Setting: "Settings",
    Referral: "Referrals",
    Lead: "CRM Leads",
    Role: "Roles",
    Distributor: "Distributors",
    Vendor: "Vendors",
    BottleTransaction: "Bottle Transactions",
    ActivityLog: "Activity Logs",
    Counter: "ID Counters (critical)",
    MilkCollection: "Milk Collections",
    ProductionLog: "Production Logs",
    StockPoint: "Stock Points",
};

const CollectionRow = ({ name, count }) => (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${count > 0 ? "bg-emerald-400" : "bg-gray-300"}`} />
            <span className="text-sm text-gray-700">{COLLECTION_LABELS[name] || name}</span>
            {name === "Counter" && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Required for IDs</span>
            )}
        </div>
        <span className={`text-sm font-bold ${count > 0 ? "text-gray-800" : "text-gray-400"}`}>
            {count.toLocaleString()}
        </span>
    </div>
);

const BackupRestore = () => {
    const [backupInfo, setBackupInfo] = useState(null);
    const [loadingInfo, setLoadingInfo] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [restoreResult, setRestoreResult] = useState(null);
    const [showCollections, setShowCollections] = useState(false);
    const [confirmRestore, setConfirmRestore] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef();

    useEffect(() => {
        loadInfo();
    }, []);

    const loadInfo = async () => {
        setLoadingInfo(true);
        try {
            const { data } = await axios.get("/api/backup/info");
            setBackupInfo(data.result);
        } catch {
            toast.error("Failed to load backup info");
        } finally {
            setLoadingInfo(false);
        }
    };

    const handleDownload = async () => {
        setDownloading(true);
        const toastId = toast.loading("Preparing backup archive…");
        try {
            const response = await axios.get("/api/backup/download", {
                responseType: "blob",
                timeout: 300000, // 5 min timeout for large exports
            });

            // Extract filename from header
            const disposition = response.headers["content-disposition"] || "";
            const match = disposition.match(/filename="?([^"]+)"?/);
            const filename = match?.[1] || `stoi_backup_${Date.now()}.zip`;

            const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/zip" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            toast.success("Backup downloaded successfully!", { id: toastId });
        } catch (err) {
            toast.error(err.response?.data?.message || "Backup download failed", { id: toastId });
        } finally {
            setDownloading(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.endsWith(".zip")) {
            toast.error("Please select a .zip backup file");
            return;
        }
        setSelectedFile(file);
        setConfirmRestore(false);
        setRestoreResult(null);
    };

    const handleRestore = async () => {
        if (!selectedFile) return toast.error("Please select a backup file first");
        if (!confirmRestore) return;

        setRestoring(true);
        const toastId = toast.loading("Restoring database… this may take a while");

        try {
            const formData = new FormData();
            formData.append("backup", selectedFile);

            const { data } = await axios.post("/api/backup/restore", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 600000, // 10 min
            });

            setRestoreResult(data);
            toast.success(`Restore complete! ${data.results?.length || 0} collections restored.`, { id: toastId });

            // Reload info
            await loadInfo();
        } catch (err) {
            toast.error(err.response?.data?.message || "Restore failed", { id: toastId });
        } finally {
            setRestoring(false);
        }
    };

    const totalRecords = backupInfo?.totalRecords || 0;

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-blue-600 rounded-xl">
                        <Database size={22} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Backup & Restore</h1>
                </div>
                <p className="text-gray-500 text-sm ml-13">
                    Export your entire database as a ZIP file and restore it on any fresh installation.
                </p>
            </div>

            {/* Warning banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">Important — Read before restoring</p>
                    <ul className="list-disc list-inside space-y-1 text-amber-700">
                        <li>Restoring will <strong>completely replace</strong> all existing data in the database.</li>
                        <li>Make sure the target server is on the same app version.</li>
                        <li>User passwords and wallet balances are preserved exactly as they were.</li>
                        <li>Uploaded files (images, documents) are included in the backup when present.</li>
                    </ul>
                </div>
            </div>

            {/* Database snapshot */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <HardDrive size={18} className="text-gray-500" />
                        <h2 className="font-bold text-gray-800">Current Database Snapshot</h2>
                    </div>
                    <button onClick={loadInfo} className="btn btn-ghost btn-sm gap-1" disabled={loadingInfo}>
                        {loadingInfo ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Refresh
                    </button>
                </div>

                {loadingInfo ? (
                    <div className="flex items-center gap-2 text-gray-400 py-4">
                        <Loader2 size={16} className="animate-spin" /> Loading snapshot…
                    </div>
                ) : backupInfo ? (
                    <>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="bg-blue-50 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-blue-700">{totalRecords.toLocaleString()}</p>
                                <p className="text-xs text-blue-500 mt-1">Total Records</p>
                            </div>
                            <div className="bg-purple-50 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-purple-700">{backupInfo.collections.length}</p>
                                <p className="text-xs text-purple-500 mt-1">Collections</p>
                            </div>
                            <div className="bg-emerald-50 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-emerald-700">~{backupInfo.estimatedSizeMB} MB</p>
                                <p className="text-xs text-emerald-500 mt-1">Estimated Size</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowCollections(c => !c)}
                            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 mb-2"
                        >
                            {showCollections ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            {showCollections ? "Hide" : "Show"} collection details
                        </button>

                        {showCollections && (
                            <div className="border border-gray-100 rounded-xl overflow-hidden">
                                {backupInfo.collections.map(c => (
                                    <CollectionRow key={c.collection} name={c.collection} count={c.count} />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <p className="text-gray-400 text-sm">Could not load database info.</p>
                )}
            </div>

            {/* Download section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-3">
                    <Download size={18} className="text-emerald-600" />
                    <h2 className="font-bold text-gray-800">Download Backup</h2>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                    Downloads a complete <strong>.zip</strong> file containing all your data (every collection + uploaded files).
                    Store this file safely — it's your complete data snapshot.
                </p>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownload}
                        className="btn btn-success gap-2"
                        disabled={downloading || totalRecords === 0}
                    >
                        {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        {downloading ? "Preparing…" : "Download Full Backup"}
                    </button>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <FileArchive size={14} />
                        ZIP format · all collections included
                    </div>
                </div>
            </div>

            {/* Restore section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-3">
                    <Upload size={18} className="text-blue-600" />
                    <h2 className="font-bold text-gray-800">Restore from Backup</h2>
                </div>
                <p className="text-sm text-gray-500 mb-5">
                    Upload a previously downloaded backup <strong>.zip</strong> file. All current data will be replaced with the backup data.
                </p>

                {/* File picker */}
                <div
                    className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all mb-4"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        accept=".zip"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    {selectedFile ? (
                        <div className="flex flex-col items-center gap-2">
                            <FileArchive size={32} className="text-blue-500" />
                            <p className="font-semibold text-gray-800">{selectedFile.name}</p>
                            <p className="text-xs text-gray-400">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB — click to change
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                            <Upload size={32} />
                            <p className="font-medium">Click to select backup .zip file</p>
                            <p className="text-xs">Max 500 MB</p>
                        </div>
                    )}
                </div>

                {/* Confirm checkbox */}
                {selectedFile && (
                    <label className="flex items-start gap-3 cursor-pointer mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                        <input
                            type="checkbox"
                            className="checkbox checkbox-error mt-0.5"
                            checked={confirmRestore}
                            onChange={e => setConfirmRestore(e.target.checked)}
                        />
                        <span className="text-sm text-red-700 font-medium">
                            I understand this will <strong>permanently replace all current data</strong> in the database with the backup data. This cannot be undone.
                        </span>
                    </label>
                )}

                <button
                    onClick={handleRestore}
                    className="btn btn-error gap-2"
                    disabled={!selectedFile || !confirmRestore || restoring}
                >
                    {restoring ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {restoring ? "Restoring… please wait" : "Restore Database"}
                </button>
            </div>

            {/* Restore result */}
            {restoreResult && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle size={20} className="text-emerald-500" />
                        <h2 className="font-bold text-gray-800">Restore Complete</h2>
                    </div>
                    {restoreResult.manifest && (
                        <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-600">
                            <p>📦 Backup created: <span className="font-medium">{new Date(restoreResult.manifest.createdAt).toLocaleString()}</span></p>
                            <p>🗄️ Collections in backup: <span className="font-medium">{restoreResult.manifest.collections?.length}</span></p>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                        {restoreResult.results?.map((r, i) => (
                            <div key={i} className="flex justify-between bg-emerald-50 rounded-lg px-3 py-1.5 text-sm">
                                <span className="text-emerald-800">{COLLECTION_LABELS[r.collection] || r.collection}</span>
                                <span className="font-bold text-emerald-700">{r.restored}</span>
                            </div>
                        ))}
                    </div>
                    {restoreResult.errors?.length > 0 && (
                        <div className="mt-3 bg-red-50 rounded-xl p-3">
                            <p className="text-sm font-semibold text-red-700 mb-2">Warnings / Errors:</p>
                            {restoreResult.errors.map((e, i) => (
                                <p key={i} className="text-xs text-red-600">{e}</p>
                            ))}
                        </div>
                    )}
                    <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                        <Info size={12} /> Restart the server to ensure all changes take effect.
                    </p>
                </div>
            )}
        </div>
    );
};

export default BackupRestore;
