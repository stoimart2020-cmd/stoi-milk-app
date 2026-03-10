import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Package, CheckCircle, XCircle, Clock, Truck } from "lucide-react";
import { axiosInstance } from "../../lib/axios";

const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:4000";

// Helper: get image URL
const getImageUrl = (image) => {
    if (!image) return "/images/logo.png";
    if (image.startsWith("http")) return image;
    if (image.includes("uploads/"))
        return `${BASE_URL}${image.startsWith("/") ? "" : "/"}${image}`;
    return `${BASE_URL}/uploads/${image}`;
};

// ─── Day Names ─────────────────────────────────────────────────────────────
const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ─── Generate week days around a center date ───────────────────────────────
const getWeekDays = (centerDate) => {
    const days = [];
    const d = new Date(centerDate);
    // Start from Monday of that week
    const dayOfWeek = d.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + mondayOffset);

    for (let i = 0; i < 7; i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        day.setHours(0, 0, 0, 0);
        days.push(day);
    }
    return days;
};

// ─── Format date key ──────────────────────────────────────────────────────
const dateKey = (d) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// ─── Check if same day ────────────────────────────────────────────────────
const isSameDay = (d1, d2) => dateKey(d1) === dateKey(d2);

const isToday = (d) => isSameDay(d, new Date());

// ─── Status Config ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    delivered: { color: "#0C831F", bg: "#E8F5E1", icon: CheckCircle, label: "Delivered" },
    cancelled: { color: "#dc2626", bg: "#fef2f2", icon: XCircle, label: "Cancelled" },
    pending: { color: "#f59e0b", bg: "#fef3c7", icon: Clock, label: "Pending" },
    confirmed: { color: "#3b82f6", bg: "#dbeafe", icon: Truck, label: "Confirmed" },
    out_for_delivery: { color: "#7c3aed", bg: "#ede9fe", icon: Truck, label: "Out for Delivery" },
};

// ─── Product Item Card (Instamart Style) ──────────────────────────────────
const OrderItemCard = ({ item }) => {
    const product = item.product || {};
    const unitLabel = product.unitValue && product.unit
        ? `${product.unitValue} ${product.unit}`
        : product.unit && product.unit !== "piece"
            ? `1 ${product.unit}`
            : "";

    return (
        <div className="oh-item">
            <div className="oh-item-img">
                <img
                    src={getImageUrl(product.image)}
                    onError={(e) => { e.target.onerror = null; e.target.src = "/images/logo.png"; }}
                    alt={product.name || "Product"}
                />
            </div>
            <div className="oh-item-info">
                <h4 className="oh-item-name">{product.name || "Product"}</h4>
                <div className="oh-item-meta">
                    {unitLabel && <span className="oh-item-unit">{unitLabel}</span>}
                    {unitLabel && <span className="oh-item-dot">•</span>}
                    <span className="oh-item-qty">Qty: {item.quantity}</span>
                </div>
            </div>
            <div className="oh-item-price">
                ₹{((item.price || product.price || 0) * item.quantity).toFixed(0)}/-
            </div>
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────
export const CustomerOrderHistory = () => {
    const [weekOffset, setWeekOffset] = useState(0);
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    });
    const dayScrollRef = useRef(null);

    // Calculate week days
    const baseDate = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + weekOffset * 7);
        return d;
    }, [weekOffset]);

    const weekDays = useMemo(() => getWeekDays(baseDate), [baseDate]);

    // Get month display
    const monthDisplay = useMemo(() => {
        const firstDay = weekDays[0];
        const lastDay = weekDays[6];
        if (firstDay.getMonth() === lastDay.getMonth()) {
            return firstDay.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
        }
        return `${firstDay.toLocaleDateString("en-IN", { month: "short" })} - ${lastDay.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;
    }, [weekDays]);

    // Fetch ALL orders (we'll filter client-side by date)
    const { data, isLoading } = useQuery({
        queryKey: ["customerOrderHistory"],
        queryFn: async () => {
            const response = await axiosInstance.get("/api/delivery/history", {
                params: { limit: 200 }
            });
            return response.data;
        }
    });

    const allOrders = data?.result || [];

    // Group orders by delivery date
    const ordersByDate = useMemo(() => {
        const map = {};
        allOrders.forEach(order => {
            const key = dateKey(order.deliveryDate || order.createdAt);
            if (!map[key]) map[key] = [];
            map[key].push(order);
        });
        return map;
    }, [allOrders]);

    // Get orders for selected date
    const selectedDateOrders = ordersByDate[dateKey(selectedDate)] || [];

    // Check which days have orders (for dot indicators)
    const daysWithOrders = useMemo(() => {
        const set = new Set();
        Object.keys(ordersByDate).forEach(key => set.add(key));
        return set;
    }, [ordersByDate]);

    // Get the day name for the card header
    const selectedDayName = DAY_NAMES_FULL[selectedDate.getDay()];

    // Navigate weeks
    const goToPrevWeek = () => setWeekOffset(w => w - 1);
    const goToNextWeek = () => {
        if (weekOffset < 0) setWeekOffset(w => w + 1);
    };
    const goToCurrentWeek = () => {
        setWeekOffset(0);
        setSelectedDate(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return today;
        });
    };

    // Calculate totals for selected date orders
    const calculateTotals = (orders) => {
        let subTotal = 0;
        orders.forEach(order => {
            subTotal += order.totalAmount || 0;
        });
        return { subTotal, total: subTotal };
    };

    const totals = calculateTotals(selectedDateOrders);

    return (
        <div className="oh-root">
            <style>{`
                .oh-root {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    margin: -24px -16px -80px;
                    background: #f5f5f5;
                    min-height: calc(100vh - 64px - 64px);
                    display: flex;
                    flex-direction: column;
                }

                /* ─── Header / Day Slider ─── */
                .oh-header {
                    background: #fff;
                    padding: 16px 16px 0;
                    position: sticky;
                    top: 0;
                    z-index: 20;
                    border-bottom: 1px solid #f0f0f0;
                }
                .oh-title-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 12px;
                }
                .oh-title {
                    font-size: 18px;
                    font-weight: 700;
                    color: #1f2937;
                    margin: 0;
                }
                .oh-month {
                    font-size: 12px;
                    color: #6b7280;
                    font-weight: 500;
                }

                /* Week Navigation */
                .oh-week-nav {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                }
                .oh-week-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: 1px solid #e5e7eb;
                    background: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #374151;
                    transition: all 0.15s;
                    flex-shrink: 0;
                }
                .oh-week-btn:hover { background: #f9fafb; }
                .oh-week-btn:disabled { opacity: 0.3; cursor: not-allowed; }

                .oh-today-btn {
                    padding: 4px 12px;
                    border-radius: 16px;
                    border: 1px solid #0C831F;
                    background: #E8F5E1;
                    color: #0C831F;
                    font-size: 11px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .oh-today-btn:hover { background: #d4edc9; }

                /* Day Slider */
                .oh-days {
                    display: flex;
                    align-items: stretch;
                    border-top: 1px solid #f3f4f6;
                }
                .oh-day {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 10px 4px 12px;
                    cursor: pointer;
                    border: none;
                    background: none;
                    transition: all 0.15s;
                    position: relative;
                    gap: 2px;
                }
                .oh-day:hover { background: #f9fafb; }
                .oh-day-name {
                    font-size: 11px;
                    font-weight: 500;
                    color: #9ca3af;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }
                .oh-day-num {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: 600;
                    color: #374151;
                    transition: all 0.15s;
                }
                .oh-day-dot {
                    width: 4px;
                    height: 4px;
                    border-radius: 50%;
                    background: #0C831F;
                    margin-top: 2px;
                }
                .oh-day-dot-empty {
                    width: 4px;
                    height: 4px;
                    margin-top: 2px;
                }

                /* Selected Day */
                .oh-day-selected .oh-day-num {
                    background: #2563eb;
                    color: #fff;
                }
                .oh-day-selected .oh-day-name {
                    color: #2563eb;
                    font-weight: 700;
                }

                /* Today Indicator */
                .oh-day-today .oh-day-num {
                    border: 2px solid #2563eb;
                }
                .oh-day-today.oh-day-selected .oh-day-num {
                    border-color: transparent;
                }

                /* Active bar under selected */
                .oh-day-selected::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 24px;
                    height: 3px;
                    background: #2563eb;
                    border-radius: 3px 3px 0 0;
                }

                /* ─── Content Area ─── */
                .oh-content {
                    flex: 1;
                    padding: 16px;
                    padding-bottom: 80px;
                }

                /* Order Card */
                .oh-order-card {
                    background: #fff;
                    border-radius: 16px;
                    border: 1px solid #f0f0f0;
                    overflow: hidden;
                    margin-bottom: 12px;
                }
                .oh-order-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px;
                    border-bottom: 1px solid #f5f5f5;
                }
                .oh-order-day-label {
                    font-size: 14px;
                    font-weight: 600;
                    color: #1f2937;
                    font-style: italic;
                }
                .oh-order-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 3px 10px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 600;
                }

                /* Product Items */
                .oh-items {
                    padding: 4px 0;
                }
                .oh-item {
                    display: flex;
                    align-items: center;
                    padding: 12px 16px;
                    gap: 12px;
                    transition: background 0.1s;
                }
                .oh-item + .oh-item {
                    border-top: 1px solid #f9f9f9;
                }
                .oh-item-img {
                    width: 56px;
                    height: 56px;
                    border-radius: 10px;
                    background: #f8f8f8;
                    border: 1px solid #f0f0f0;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .oh-item-img img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    padding: 4px;
                }
                .oh-item-info {
                    flex: 1;
                    min-width: 0;
                }
                .oh-item-name {
                    font-size: 14px;
                    font-weight: 600;
                    color: #1f2937;
                    margin: 0 0 2px;
                    line-height: 1.3;
                }
                .oh-item-meta {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    flex-wrap: wrap;
                }
                .oh-item-unit {
                    font-size: 12px;
                    color: #6b7280;
                    font-weight: 500;
                }
                .oh-item-dot {
                    font-size: 8px;
                    color: #d1d5db;
                }
                .oh-item-qty {
                    font-size: 12px;
                    color: #6b7280;
                    font-weight: 500;
                }
                .oh-item-price {
                    font-size: 14px;
                    font-weight: 700;
                    color: #1f2937;
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                /* ─── Totals ─── */
                .oh-totals {
                    padding: 12px 16px 16px;
                    border-top: 1px dashed #e5e7eb;
                }
                .oh-total-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 4px 0;
                }
                .oh-total-label {
                    font-size: 13px;
                    color: #6b7280;
                    font-weight: 500;
                }
                .oh-total-value {
                    font-size: 13px;
                    color: #374151;
                    font-weight: 600;
                }
                .oh-total-row-final {
                    padding-top: 8px;
                    margin-top: 4px;
                    border-top: 1px solid #f0f0f0;
                }
                .oh-total-row-final .oh-total-label {
                    font-size: 14px;
                    font-weight: 700;
                    color: #1f2937;
                }
                .oh-total-row-final .oh-total-value {
                    font-size: 15px;
                    font-weight: 700;
                    color: #1f2937;
                }

                /* ─── Rider Info ─── */
                .oh-rider {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 16px;
                    background: #f9fafb;
                    border-top: 1px solid #f0f0f0;
                    font-size: 12px;
                    color: #6b7280;
                }
                .oh-rider-name {
                    font-weight: 600;
                    color: #374151;
                }

                /* ─── Empty State ─── */
                .oh-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 24px;
                    text-align: center;
                }
                .oh-empty-icon {
                    width: 80px;
                    height: 80px;
                    background: #f3f4f6;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 16px;
                }
                .oh-empty-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 4px;
                }
                .oh-empty-text {
                    font-size: 13px;
                    color: #9ca3af;
                    max-width: 260px;
                }

                /* ─── Loading ─── */
                .oh-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 60px;
                }
                .oh-spinner {
                    width: 32px;
                    height: 32px;
                    border: 3px solid #e5e7eb;
                    border-top-color: #2563eb;
                    border-radius: 50%;
                    animation: oh-spin 0.7s linear infinite;
                }
                @keyframes oh-spin {
                    to { transform: rotate(360deg); }
                }

                /* ─── Skeleton Cards ─── */
                .oh-skel-card {
                    background: #fff;
                    border-radius: 16px;
                    border: 1px solid #f0f0f0;
                    overflow: hidden;
                    margin-bottom: 12px;
                }
                .oh-skel-header {
                    height: 44px;
                    background: linear-gradient(110deg, #f5f5f5 8%, #ebebeb 18%, #f5f5f5 33%);
                    background-size: 200% 100%;
                    animation: oh-shimmer 1.5s infinite;
                }
                .oh-skel-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                }
                .oh-skel-img {
                    width: 56px;
                    height: 56px;
                    border-radius: 10px;
                    background: linear-gradient(110deg, #f5f5f5 8%, #ebebeb 18%, #f5f5f5 33%);
                    background-size: 200% 100%;
                    animation: oh-shimmer 1.5s infinite;
                    flex-shrink: 0;
                }
                .oh-skel-lines {
                    flex: 1;
                }
                .oh-skel-line {
                    height: 10px;
                    border-radius: 4px;
                    background: linear-gradient(110deg, #f5f5f5 8%, #ebebeb 18%, #f5f5f5 33%);
                    background-size: 200% 100%;
                    animation: oh-shimmer 1.5s infinite;
                    margin-bottom: 6px;
                }
                .oh-skel-line:last-child { width: 50%; margin-bottom: 0; }
                @keyframes oh-shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                /* Scrollbar styling */
                .oh-root *::-webkit-scrollbar { display: none; }
                .oh-root * { scrollbar-width: none; }
            `}</style>

            {/* ─── Header ─── */}
            <div className="oh-header">
                <div className="oh-title-row">
                    <h2 className="oh-title">Order History</h2>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="oh-month">{monthDisplay}</span>
                        {weekOffset !== 0 && (
                            <button className="oh-today-btn" onClick={goToCurrentWeek}>
                                Today
                            </button>
                        )}
                    </div>
                </div>

                {/* Week Navigation */}
                <div className="oh-week-nav">
                    <button className="oh-week-btn" onClick={goToPrevWeek}>
                        <ChevronLeft size={16} />
                    </button>

                    {/* Day Slider */}
                    <div className="oh-days" ref={dayScrollRef} style={{ flex: 1 }}>
                        {weekDays.map((day) => {
                            const selected = isSameDay(day, selectedDate);
                            const today = isToday(day);
                            const hasOrders = daysWithOrders.has(dateKey(day));
                            const isFuture = day > new Date();

                            return (
                                <button
                                    key={dateKey(day)}
                                    className={`oh-day ${selected ? "oh-day-selected" : ""} ${today ? "oh-day-today" : ""}`}
                                    onClick={() => setSelectedDate(new Date(day))}
                                    style={isFuture ? { opacity: 0.4 } : {}}
                                >
                                    <span className="oh-day-name">{DAY_NAMES_SHORT[day.getDay()]}</span>
                                    <span className="oh-day-num">{day.getDate()}</span>
                                    {hasOrders ? <span className="oh-day-dot" /> : <span className="oh-day-dot-empty" />}
                                </button>
                            );
                        })}
                    </div>

                    <button className="oh-week-btn" onClick={goToNextWeek} disabled={weekOffset >= 0}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* ─── Content ─── */}
            <div className="oh-content">
                {isLoading ? (
                    // Skeleton
                    <div>
                        {[1, 2].map(i => (
                            <div key={i} className="oh-skel-card">
                                <div className="oh-skel-header" />
                                {[1, 2, 3].map(j => (
                                    <div key={j} className="oh-skel-item">
                                        <div className="oh-skel-img" />
                                        <div className="oh-skel-lines">
                                            <div className="oh-skel-line" />
                                            <div className="oh-skel-line" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                ) : selectedDateOrders.length === 0 ? (
                    // Empty State
                    <div className="oh-empty">
                        <div className="oh-empty-icon">
                            <Package size={32} style={{ color: "#d1d5db" }} />
                        </div>
                        <div className="oh-empty-title">No Orders</div>
                        <div className="oh-empty-text">
                            No orders found for {selectedDayName}, {selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </div>
                    </div>
                ) : (
                    // Order Cards
                    selectedDateOrders.map((order) => {
                        const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                        const StatusIcon = status.icon;

                        return (
                            <div key={order._id} className="oh-order-card">
                                {/* Order Header */}
                                <div className="oh-order-header">
                                    <span className="oh-order-day-label">
                                        {selectedDayName}'s Order
                                    </span>
                                    <span
                                        className="oh-order-status"
                                        style={{ background: status.bg, color: status.color }}
                                    >
                                        <StatusIcon size={12} />
                                        {status.label}
                                    </span>
                                </div>

                                {/* Product Items */}
                                <div className="oh-items">
                                    {(order.products || []).map((item, idx) => (
                                        <OrderItemCard key={idx} item={item} />
                                    ))}
                                </div>

                                {/* Rider Info */}
                                {order.assignedRider && (
                                    <div className="oh-rider">
                                        <Truck size={14} />
                                        <span>Delivered by</span>
                                        <span className="oh-rider-name">
                                            {order.assignedRider.name || "Rider"}
                                        </span>
                                    </div>
                                )}

                                {/* Totals */}
                                <div className="oh-totals">
                                    {(order.products || []).length > 1 && (
                                        <div className="oh-total-row">
                                            <span className="oh-total-label">Sub Total :</span>
                                            <span className="oh-total-value">
                                                Rs {(order.totalAmount || 0).toFixed(2)}/-
                                            </span>
                                        </div>
                                    )}
                                    <div className="oh-total-row oh-total-row-final">
                                        <span className="oh-total-label">Total :</span>
                                        <span className="oh-total-value">
                                            Rs {(order.totalAmount || 0).toFixed(2)}/-
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Day Summary (if multiple orders) */}
                {selectedDateOrders.length > 1 && (
                    <div className="oh-order-card" style={{ marginTop: 8 }}>
                        <div className="oh-totals" style={{ borderTop: "none" }}>
                            <div className="oh-total-row oh-total-row-final" style={{ borderTop: "none", marginTop: 0 }}>
                                <span className="oh-total-label">Day Total ({selectedDateOrders.length} orders) :</span>
                                <span className="oh-total-value" style={{ color: "#0C831F" }}>
                                    Rs {totals.total.toFixed(2)}/-
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
