import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllRidersTracking, getRiderLocationHistory } from "../../shared/api/tracking";
import {
    MapPin,
    Bike,
    RefreshCw,
    Search,
    Signal,
    SignalZero,
    Battery,
    Clock,
    Navigation,
    Gauge,
    Phone,
    Warehouse,
    ChevronRight,
    Maximize2,
    Minimize2,
    Layers,
    X,
    Crosshair,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatDistanceToNow } from "date-fns";

// ─── Custom Marker Icons ────────────────────────────────────
const createRiderIcon = (isOnline, heading = 0, role = 'RIDER') => {
    const isFieldSales = role === 'FIELD_MARKETING';
    const color = isOnline ? (isFieldSales ? "#3b82f6" : "#10b981") : "#6b7280";
    const glowColor = isOnline ? (isFieldSales ? "rgba(59,130,246,0.4)" : "rgba(16,185,129,0.4)") : "transparent";

    return L.divIcon({
        className: "rider-marker-icon",
        html: `
            <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
                <div style="position:absolute;inset:0;border-radius:50%;background:${glowColor};animation:${isOnline ? 'pulse 2s infinite' : 'none'};"></div>
                <div style="
                    width:36px;height:36px;border-radius:50%;
                    background:linear-gradient(135deg,${isOnline ? (isFieldSales ? '#2563eb,#3b82f6' : '#059669,#10b981') : '#4b5563,#6b7280'});
                    border:3px solid white;
                    box-shadow:0 2px 8px rgba(0,0,0,0.3);
                    display:flex;align-items:center;justify-content:center;
                    transform:rotate(${heading}deg);
                    transition:transform 0.3s ease;
                ">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        ${isFieldSales ? 
                            '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>' :
                            '<circle cx="18.5" cy="17.5" r="3.5"></circle><circle cx="5.5" cy="17.5" r="3.5"></circle><circle cx="15" cy="5" r="1"></circle><path d="m12 17.5V14l-3-3 4-3 2 3h2"></path>'
                        }
                    </svg>
                </div>
            </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22],
    });
};

// ─── Map Controller: Fly to location ────────────────────────
const FlyToLocation = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom || map.getZoom(), { duration: 1 });
        }
    }, [center, zoom, map]);
    return null;
};

// ─── Battery Icon Component ─────────────────────────────────
const BatteryIndicator = ({ level }) => {
    if (level === null || level === undefined) return null;
    const color = level > 50 ? "#10b981" : level > 20 ? "#f59e0b" : "#ef4444";
    return (
        <div className="flex items-center gap-1 text-xs">
            <Battery size={14} style={{ color }} />
            <span style={{ color }}>{level}%</span>
        </div>
    );
};

// ─── Main Component ─────────────────────────────────────────
export const LiveTracking = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRider, setSelectedRider] = useState(null);
    const [flyTo, setFlyTo] = useState(null);
    const [flyZoom, setFlyZoom] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [filterStatus, setFilterStatus] = useState("all"); // all | online | offline
    const [riderHistory, setRiderHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [showHistory, setShowHistory] = useState(true);
    const mapRef = useRef(null);

    // ─── Fetch Data ─────────────────────────────────────
    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ["liveTracking"],
        queryFn: getAllRidersTracking,
        refetchInterval: 10000, // Auto-refresh every 10 seconds
        refetchIntervalInBackground: false,
    });

    const riders = data?.riders || [];

    // ─── Filtering ──────────────────────────────────────
    const filteredRiders = useMemo(() => {
        return riders.filter((r) => {
            const matchesSearch =
                !searchQuery ||
                r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.mobile?.includes(searchQuery) ||
                r.hub?.name?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus =
                filterStatus === "all" ||
                (filterStatus === "online" && r.isOnline) ||
                (filterStatus === "offline" && !r.isOnline);

            return matchesSearch && matchesStatus;
        });
    }, [riders, searchQuery, filterStatus]);

    const ridersOnMap = useMemo(() => filteredRiders.filter((r) => r.location), [filteredRiders]);

    // ─── Center Map on All Riders ───────────────────────
    const centerMapOnAll = useCallback(() => {
        if (ridersOnMap.length === 0) return;
        // Calculate bounds
        const lats = ridersOnMap.map((r) => r.location.lat);
        const lngs = ridersOnMap.map((r) => r.location.lng);
        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
        const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
        setFlyTo([centerLat, centerLng]);
        setFlyZoom(12);
    }, [ridersOnMap]);

    // ─── Focus on a specific rider ──────────────────────
    const focusOnRider = useCallback(async (rider) => {
        setSelectedRider(rider);
        if (rider.location) {
            setFlyTo([rider.location.lat, rider.location.lng]);
            setFlyZoom(16);
        }

        // Fetch history
        setIsLoadingHistory(true);
        try {
            const historyData = await getRiderLocationHistory(rider._id, 100);
            if (historyData.success) {
                setRiderHistory(historyData.history || []);
            }
        } catch (err) {
            console.error("Failed to fetch history:", err);
            setRiderHistory([]);
        } finally {
            setIsLoadingHistory(false);
        }
    }, []);

    // ─── Default center (India) ─────────────────────────
    const defaultCenter = useMemo(() => {
        if (ridersOnMap.length > 0) {
            const lats = ridersOnMap.map((r) => r.location.lat);
            const lngs = ridersOnMap.map((r) => r.location.lng);
            return [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2];
        }
        return [20.5937, 78.9629]; // India center
    }, [ridersOnMap]);

    // ─── Summary Stats ─────────────────────────────────
    const stats = useMemo(() => ({
        total: riders.length,
        online: riders.filter((r) => r.isOnline).length,
        offline: riders.filter((r) => !r.isOnline).length,
        withLocation: riders.filter((r) => r.location).length,
    }), [riders]);

    return (
        <div className={`live-tracking-container ${isFullscreen ? "fullscreen" : ""}`}>
            {/* ── Inline Styles ── */}
            <style>{`
                .live-tracking-container {
                    display: flex;
                    flex-direction: column;
                    height: calc(100vh - 140px);
                    background: #0f172a;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
                }
                .live-tracking-container.fullscreen {
                    position: fixed;
                    inset: 0;
                    z-index: 9999;
                    height: 100vh;
                    border-radius: 0;
                }

                /* Header Bar */
                .lt-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 20px;
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                    flex-shrink: 0;
                }
                .lt-header-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .lt-header-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .lt-header-title h1 {
                    color: #f1f5f9;
                    font-size: 18px;
                    font-weight: 700;
                    margin: 0;
                }
                .lt-live-badge {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    border-radius: 20px;
                    background: rgba(239,68,68,0.15);
                    color: #ef4444;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .lt-live-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #ef4444;
                    animation: pulse-dot 1.5s infinite;
                }
                @keyframes pulse-dot {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.3); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 0.6; }
                    50% { transform: scale(1.4); opacity: 0; }
                }

                /* Stats Pills */
                .lt-stats {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                .lt-stat-pill {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 5px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    border: 1px solid rgba(255,255,255,0.08);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .lt-stat-pill:hover { background: rgba(255,255,255,0.08); }
                .lt-stat-pill.active { border-color: rgba(59,130,246,0.5); background: rgba(59,130,246,0.1); }
                .lt-stat-pill .count { font-weight: 800; }

                /* Header Actions */
                .lt-header-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .lt-btn-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: rgba(255,255,255,0.05);
                    color: #94a3b8;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .lt-btn-icon:hover { background: rgba(255,255,255,0.12); color: #e2e8f0; }
                .lt-btn-icon.spinning svg { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                /* Main Area */
                .lt-main {
                    display: flex;
                    flex: 1;
                    overflow: hidden;
                    position: relative;
                }

                /* Sidebar */
                .lt-sidebar {
                    width: 340px;
                    background: #1e293b;
                    border-right: 1px solid rgba(255,255,255,0.06);
                    display: flex;
                    flex-direction: column;
                    flex-shrink: 0;
                    transition: width 0.3s ease, margin 0.3s ease;
                }
                .lt-sidebar.collapsed {
                    width: 0;
                    overflow: hidden;
                    border-right: none;
                }

                /* Search */
                .lt-search {
                    padding: 12px 16px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    flex-shrink: 0;
                }
                .lt-search-input {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(255,255,255,0.06);
                    border-radius: 10px;
                    padding: 8px 12px;
                    border: 1px solid rgba(255,255,255,0.08);
                    transition: border-color 0.2s;
                }
                .lt-search-input:focus-within { border-color: rgba(59,130,246,0.5); }
                .lt-search-input input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    outline: none;
                    color: #e2e8f0;
                    font-size: 13px;
                }
                .lt-search-input input::placeholder { color: #475569; }

                /* Filter Tabs */
                .lt-filter-tabs {
                    display: flex;
                    gap: 4px;
                    padding: 8px 16px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    flex-shrink: 0;
                }
                .lt-filter-tab {
                    flex: 1;
                    padding: 6px 10px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 600;
                    text-align: center;
                    cursor: pointer;
                    border: none;
                    transition: all 0.2s;
                    color: #94a3b8;
                    background: transparent;
                }
                .lt-filter-tab:hover { background: rgba(255,255,255,0.06); }
                .lt-filter-tab.active {
                    background: rgba(59,130,246,0.15);
                    color: #60a5fa;
                }

                /* Rider List */
                .lt-rider-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                }
                .lt-rider-list::-webkit-scrollbar { width: 4px; }
                .lt-rider-list::-webkit-scrollbar-track { background: transparent; }
                .lt-rider-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

                .lt-rider-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                    margin-bottom: 4px;
                }
                .lt-rider-card:hover {
                    background: rgba(255,255,255,0.05);
                    border-color: rgba(255,255,255,0.08);
                }
                .lt-rider-card.selected {
                    background: rgba(59,130,246,0.1);
                    border-color: rgba(59,130,246,0.3);
                }

                .lt-rider-avatar {
                    position: relative;
                    width: 42px;
                    height: 42px;
                    flex-shrink: 0;
                }
                .lt-rider-avatar-img {
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 2px solid #334155;
                }
                .lt-rider-avatar-placeholder {
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #334155, #475569);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #94a3b8;
                    font-weight: 700;
                    font-size: 16px;
                    border: 2px solid #334155;
                }
                .lt-rider-status-dot {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    border: 2px solid #1e293b;
                }
                .lt-rider-status-dot.online { background: #10b981; }
                .lt-rider-status-dot.offline { background: #6b7280; }

                .lt-rider-info {
                    flex: 1;
                    min-width: 0;
                }
                .lt-rider-name {
                    font-size: 14px;
                    font-weight: 600;
                    color: #e2e8f0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .lt-rider-meta {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 2px;
                }
                .lt-rider-meta-item {
                    display: flex;
                    align-items: center;
                    gap: 3px;
                    font-size: 11px;
                    color: #64748b;
                }

                .lt-rider-card-action {
                    color: #475569;
                    flex-shrink: 0;
                    transition: color 0.2s;
                }
                .lt-rider-card:hover .lt-rider-card-action { color: #94a3b8; }

                /* Map */
                .lt-map-wrapper {
                    flex: 1;
                    position: relative;
                }
                .lt-map-wrapper .leaflet-container {
                    height: 100%;
                    width: 100%;
                    background: #0b1120;
                }

                /* Toggle sidebar button on map */
                .lt-sidebar-toggle {
                    position: absolute;
                    top: 12px;
                    left: 12px;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    background: rgba(15,23,42,0.9);
                    border: 1px solid rgba(255,255,255,0.12);
                    color: #94a3b8;
                    cursor: pointer;
                    backdrop-filter: blur(8px);
                    transition: all 0.2s;
                }
                .lt-sidebar-toggle:hover { background: rgba(30,41,59,0.95); color: #e2e8f0; }

                /* No Data */
                .lt-no-data {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    color: #475569;
                    text-align: center;
                    gap: 12px;
                }
                .lt-no-data p { font-size: 13px; margin: 0; }

                /* Popup Styles */
                .rider-popup {
                    min-width: 220px;
                }
                .rider-popup-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #e2e8f0;
                }
                .rider-popup-avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #0ea5e9, #6366f1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 700;
                    font-size: 14px;
                    flex-shrink: 0;
                }
                .rider-popup-name {
                    font-size: 14px;
                    font-weight: 700;
                    color: #0f172a;
                }
                .rider-popup-hub {
                    font-size: 11px;
                    color: #64748b;
                }
                .rider-popup-stats {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 6px;
                }
                .rider-popup-stat {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 12px;
                    color: #475569;
                    padding: 4px 6px;
                    border-radius: 6px;
                    background: #f8fafc;
                }
                .rider-popup-stat svg { flex-shrink: 0; }

                /* Loading */
                .lt-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: #94a3b8;
                    gap: 10px;
                    font-size: 14px;
                }
                .lt-loading svg { animation: spin 1s linear infinite; }

                /* Responsive */
                @media (max-width: 768px) {
                    .lt-sidebar { width: 280px; position: absolute; z-index: 1001; left: 0; top: 0; bottom: 0; }
                    .lt-sidebar.collapsed { width: 0; }
                    .lt-stats { display: none; }
                }
            `}</style>

            {/* ────── Header ────── */}
            <div className="lt-header">
                <div className="lt-header-left">
                    <div className="lt-header-title">
                        <MapPin size={20} style={{ color: "#3b82f6" }} />
                        <h1>Live Tracking</h1>
                        <div className="lt-live-badge">
                            <div className="lt-live-dot"></div>
                            LIVE
                        </div>
                    </div>

                    <div className="lt-stats">
                        <div
                            className={`lt-stat-pill ${filterStatus === "all" ? "active" : ""}`}
                            onClick={() => setFilterStatus("all")}
                            style={{ color: "#94a3b8" }}
                        >
                            <Bike size={14} />
                            <span>All</span>
                            <span className="count">{stats.total}</span>
                        </div>
                        <div
                            className={`lt-stat-pill ${filterStatus === "online" ? "active" : ""}`}
                            onClick={() => setFilterStatus("online")}
                            style={{ color: "#10b981" }}
                        >
                            <Signal size={14} />
                            <span>Online</span>
                            <span className="count">{stats.online}</span>
                        </div>
                        <div
                            className={`lt-stat-pill ${filterStatus === "offline" ? "active" : ""}`}
                            onClick={() => setFilterStatus("offline")}
                            style={{ color: "#6b7280" }}
                        >
                            <SignalZero size={14} />
                            <span>Offline</span>
                            <span className="count">{stats.offline}</span>
                        </div>

                        <div
                            className={`lt-stat-pill ${showHistory ? "active" : ""}`}
                            onClick={() => setShowHistory(!showHistory)}
                            style={{ color: showHistory ? "#3b82f6" : "#64748b" }}
                        >
                            <Clock size={14} />
                            <span>Trails</span>
                        </div>
                    </div>
                </div>

                <div className="lt-header-actions">
                    <button
                        className={`lt-btn-icon ${isFetching ? "spinning" : ""}`}
                        onClick={() => refetch()}
                        title="Refresh"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button
                        className="lt-btn-icon"
                        onClick={centerMapOnAll}
                        title="Fit all riders"
                    >
                        <Crosshair size={16} />
                    </button>
                    <button
                        className="lt-btn-icon"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    >
                        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                </div>
            </div>

            {/* ────── Main Area ────── */}
            <div className="lt-main">
                {/* ── Sidebar ── */}
                <div className={`lt-sidebar ${!showSidebar ? "collapsed" : ""}`}>
                    {/* Search */}
                    <div className="lt-search">
                        <div className="lt-search-input">
                            <Search size={16} style={{ color: "#475569", flexShrink: 0 }} />
                            <input
                                type="text"
                                placeholder="Search riders, hubs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <X
                                    size={14}
                                    style={{ color: "#475569", cursor: "pointer", flexShrink: 0 }}
                                    onClick={() => setSearchQuery("")}
                                />
                            )}
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="lt-filter-tabs">
                        {[
                            { key: "all", label: `All (${stats.total})` },
                            { key: "online", label: `Online (${stats.online})` },
                            { key: "offline", label: `Offline (${stats.offline})` },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                className={`lt-filter-tab ${filterStatus === tab.key ? "active" : ""}`}
                                onClick={() => setFilterStatus(tab.key)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Rider List */}
                    <div className="lt-rider-list">
                        {isLoading ? (
                            <div className="lt-loading">
                                <RefreshCw size={18} />
                                Loading riders...
                            </div>
                        ) : filteredRiders.length === 0 ? (
                            <div className="lt-no-data">
                                <Bike size={36} />
                                <p>No riders found</p>
                            </div>
                        ) : (
                            filteredRiders.map((rider) => (
                                <div
                                    key={rider._id}
                                    className={`lt-rider-card ${selectedRider?._id === rider._id ? "selected" : ""}`}
                                    onClick={() => focusOnRider(rider)}
                                >
                                    <div className="lt-rider-avatar">
                                        {rider.photo ? (
                                            <img src={rider.photo} alt={rider.name} className="lt-rider-avatar-img" />
                                        ) : (
                                            <div className="lt-rider-avatar-placeholder">
                                                {rider.name?.charAt(0)?.toUpperCase() || "R"}
                                            </div>
                                        )}
                                        <div className={`lt-rider-status-dot ${rider.isOnline ? "online" : "offline"}`}></div>
                                    </div>
                                    <div className="lt-rider-info">
                                        <div className="lt-rider-name">{rider.name}</div>
                                        <div className="lt-rider-meta">
                                            {rider.hub?.name && (
                                                <span className="lt-rider-meta-item">
                                                    <Warehouse size={10} />
                                                    {rider.hub.name}
                                                </span>
                                            )}
                                            {rider.isOnline && rider.location?.speed > 0 && (
                                                <span className="lt-rider-meta-item">
                                                    <Gauge size={10} />
                                                    {(rider.location.speed * 3.6).toFixed(0)} km/h
                                                </span>
                                            )}
                                            {rider.lastSeen && (
                                                <span className="lt-rider-meta-item">
                                                    <Clock size={10} />
                                                    {formatDistanceToNow(new Date(rider.lastSeen), { addSuffix: true })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="lt-rider-card-action">
                                        {rider.location ? (
                                            <ChevronRight size={16} />
                                        ) : (
                                            <SignalZero size={16} style={{ color: "#475569" }} />
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Map ── */}
                <div className="lt-map-wrapper">
                    <button
                        className="lt-sidebar-toggle"
                        onClick={() => setShowSidebar(!showSidebar)}
                        title={showSidebar ? "Hide sidebar" : "Show sidebar"}
                    >
                        <Layers size={18} />
                    </button>

                    <MapContainer
                        center={defaultCenter}
                        zoom={ridersOnMap.length > 0 ? 12 : 5}
                        style={{ height: "100%", width: "100%" }}
                        ref={mapRef}
                        zoomControl={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        />

                        {flyTo && <FlyToLocation center={flyTo} zoom={flyZoom} />}

                        {/* Movement History Trails */}
                        {showHistory && riderHistory.length > 1 && (
                            <Polyline
                                positions={riderHistory.map(loc => [loc.lat, loc.lng])}
                                pathOptions={{
                                    color: selectedRider?.role === 'FIELD_MARKETING' ? '#3b82f6' : '#10b981',
                                    weight: 4,
                                    opacity: 0.6,
                                    dashArray: '10, 10',
                                    lineJoin: 'round'
                                }}
                            />
                        )}

                        {ridersOnMap.map((rider) => (
                            <Marker
                                key={rider._id}
                                position={[rider.location.lat, rider.location.lng]}
                                icon={createRiderIcon(rider.isOnline, rider.location.heading, rider.role)}
                                eventHandlers={{
                                    click: () => setSelectedRider(rider),
                                }}
                            >
                                <Popup>
                                    <div className="rider-popup">
                                        <div className="rider-popup-header">
                                            <div className="rider-popup-avatar">
                                                {rider.name?.charAt(0)?.toUpperCase() || "R"}
                                            </div>
                                            <div>
                                                <div className="rider-popup-name">{rider.name}</div>
                                                {rider.hub?.name && (
                                                    <div className="rider-popup-hub">{rider.hub.name}</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="rider-popup-stats">
                                            <div className="rider-popup-stat">
                                                <Signal size={12} color={rider.isOnline ? "#10b981" : "#6b7280"} />
                                                {rider.isOnline ? "Online" : "Offline"}
                                            </div>
                                            {rider.location.speed > 0 && (
                                                <div className="rider-popup-stat">
                                                    <Gauge size={12} color="#3b82f6" />
                                                    {(rider.location.speed * 3.6).toFixed(0)} km/h
                                                </div>
                                            )}
                                            {rider.location.battery !== null && rider.location.battery !== undefined && (
                                                <div className="rider-popup-stat">
                                                    <Battery size={12} color={rider.location.battery > 50 ? "#10b981" : rider.location.battery > 20 ? "#f59e0b" : "#ef4444"} />
                                                    {rider.location.battery}%
                                                </div>
                                            )}
                                            <div className="rider-popup-stat">
                                                <Phone size={12} color="#64748b" />
                                                {rider.mobile}
                                            </div>
                                            {rider.lastSeen && (
                                                <div className="rider-popup-stat" style={{ gridColumn: "1/3" }}>
                                                    <Clock size={12} color="#64748b" />
                                                    {formatDistanceToNow(new Date(rider.lastSeen), { addSuffix: true })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                        {/* Accuracy circle for selected rider */}
                        {selectedRider?.location && selectedRider.location.accuracy > 0 && (
                            <CircleMarker
                                center={[selectedRider.location.lat, selectedRider.location.lng]}
                                radius={Math.min(selectedRider.location.accuracy / 2, 50)}
                                pathOptions={{
                                    color: "#3b82f6",
                                    fillColor: "#3b82f6",
                                    fillOpacity: 0.1,
                                    weight: 1,
                                }}
                            />
                        )}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
};
