import { useState, useRef, useEffect } from "react";
import {
    MapPin, Phone, CheckCircle, Navigation,
    Home, List, History, User, Clock, Wallet, RefreshCw, Package,
    Play, Square, Gauge, TrendingUp, Banknote, ArrowDownCircle,
    ShoppingCart, ArrowUpDown, Filter
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAssignedOrders, updateOrderStatus, getRiderBottleStats, getAllProducts, createOrder } from "../../lib/api";
import { getRiderSelfFinancials, getRiderTodayKmLog, submitRiderSelfKmLog, getRiderCustomersSelf } from "../../lib/api/riders";
import { useAuth } from "../../hook/useAuth";
import toast from "react-hot-toast";
import { SpotSaleModal } from "../../components/modals/SpotSaleModal";
import { RiderCustomersModal } from "../../components/modals/RiderCustomersModal";
import { RiderRouteModal } from "../../components/modals/RiderRouteModal";
import { RiderDeliveryDetailModal } from "../../components/modals/RiderDeliveryDetailModal";



export const RiderDashboard = () => {
    const [activeNav, setActiveNav] = useState("home"); // home, deliveries, history, profile
    const [orderFilter, setOrderFilter] = useState('all'); // all, pending, delivered, cancelled, spot
    const [weather, setWeather] = useState(null);
    const { data: user } = useAuth();
    const queryClient = useQueryClient();

    // Fetch all assigned customers
    const { data: customersData } = useQuery({
        queryKey: ["rider-customers"],
        queryFn: getRiderCustomersSelf,
        enabled: !!user
    });
    const riderCustomers = customersData?.result || [];

    // Modal States
    const [showStopConfirmation, setShowStopConfirmation] = useState(false);
    const [showSessionSummary, setShowSessionSummary] = useState(false);
    const [finalStats, setFinalStats] = useState(null);
    const [isProductWise, setIsProductWise] = useState(false);
    const [historyTab, setHistoryTab] = useState('current');

    // KM Reading States
    const [showKmStartModal, setShowKmStartModal] = useState(false);
    const [showKmEndModal, setShowKmEndModal] = useState(false);
    const [kmStartInput, setKmStartInput] = useState("");
    const [kmEndInput, setKmEndInput] = useState("");

    // Spot Sale States
    const [isSpotSaleModalOpen, setIsSpotSaleModalOpen] = useState(false);
    const [spotSaleCustomer, setSpotSaleCustomer] = useState(null);
    const [isRiderCustomersModalOpen, setIsRiderCustomersModalOpen] = useState(false);
    const [isRiderRouteModalOpen, setIsRiderRouteModalOpen] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState(null);

    // Inventory Modal State
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);

    // Delivery Session State
    const [isDeliveryStarted, setIsDeliveryStarted] = useState(false);
    const [sessionStats, setSessionStats] = useState({
        startTime: null,
        distance: 0.0, // in km
        elapsedTime: 0, // in seconds
    });
    const timerRef = useRef(null);
    const locationWatchId = useRef(null);
    const lastPosition = useRef(null);

    // Fetch all assigned orders to calculate stats
    const { data: ordersData, isLoading, refetch } = useQuery({
        queryKey: ["assignedOrders", "all"],
        queryFn: () => getAssignedOrders(),
        refetchInterval: 5000,
    });

    // Fetch rider bottle stats
    const { data: bottleStatsData } = useQuery({
        queryKey: ["riderBottleStats"],
        queryFn: getRiderBottleStats,
        refetchInterval: 30000,
    });

    // Fetch rider financials
    const { data: financialsData } = useQuery({
        queryKey: ["riderFinancials"],
        queryFn: getRiderSelfFinancials,
        refetchInterval: 30000,
    });

    // Fetch today's KM log
    const { data: kmLogData, refetch: refetchKmLog } = useQuery({
        queryKey: ["riderTodayKmLog"],
        queryFn: getRiderTodayKmLog,
        refetchInterval: 10000,
    });

    // State for bottle collection input per order
    const [bottleInputs, setBottleInputs] = useState({});

    // Fetch Products for Spot Sale
    const { data: productsData } = useQuery({
        queryKey: ["allProducts"],
        queryFn: getAllProducts,
        enabled: activeNav === "deliveries" || isSpotSaleModalOpen
    });

    const products = productsData?.result || [];

    const spotSaleMutation = useMutation({
        mutationFn: (data) => createOrder({ ...data, deliveryBoy: user?.data?.result?._id }),
        onSuccess: () => {
            toast.success("Spot Sale Recorded Successfully!");
            queryClient.invalidateQueries({ queryKey: ["assignedOrders"] });
            queryClient.invalidateQueries({ queryKey: ["riderFinancials"] });
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to record spot sale");
        }
    });

    const deliveries = ordersData?.result || [];
    const financials = financialsData?.result || {};
    const todayKmLog = kmLogData?.result || null;
    const perKmCharge = kmLogData?.perKmCharge || 0;

    // Filter today's deliveries
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

    const todayDeliveries = deliveries.filter(d => {
        if (!d.deliveryDate) return false;
        // Handle ISO strings, Date objects, or YYYY-MM-DD strings
        const dDate = new Date(d.deliveryDate);
        const dStr = dDate.toLocaleDateString('en-CA');
        return dStr === todayStr;
    });

    // Debug logging
    console.log('=== RIDER DASHBOARD DEBUG ===');
    console.log('Total deliveries:', deliveries.length);
    console.log('Today string (local):', todayStr);
    console.log('Today deliveries count:', todayDeliveries.length);

    // Log all deliveries with their dates and status
    deliveries.forEach((d, idx) => {
        console.log(`Order ${idx + 1}:`, {
            orderId: d.orderId || d._id,
            status: d.status,
            deliveryDate: d.deliveryDate,
            updatedAt: d.updatedAt,
            isTodayString: new Date(d.deliveryDate).toLocaleDateString('en-CA') === todayStr
        });
    });

    // For completed count, check if order was delivered TODAY (based on local updatedAt)
    const deliveredToday = deliveries.filter(d => {
        if (d.status !== 'delivered') return false;
        const uDate = new Date(d.updatedAt);
        const uStr = uDate.toLocaleDateString('en-CA');
        return uStr === todayStr;
    });

    console.log('Completed today (by deliveryDate):', todayDeliveries.filter(d => d.status === 'delivered').length);
    console.log('Completed today (by updatedAt):', deliveredToday.length);
    console.log('=== END DEBUG ===');

    // Stats Calculation
    const stats = {
        pending: todayDeliveries.filter(d => d.status === 'pending' || d.status === 'confirmed').length,
        completed: deliveredToday.length, // Count orders delivered TODAY (by updatedAt)
        canceled: todayDeliveries.filter(d => d.status === 'cancelled').length,
        payment: todayDeliveries.reduce((sum, d) => sum + (d.paymentStatus === 'pending' ? d.totalAmount : 0), 0),
        cashToCollect: todayDeliveries.reduce((sum, d) => sum + (d.paymentMode === 'Cash' && d.paymentStatus === 'pending' ? d.totalAmount : 0), 0),
        bottlesToCollect: bottleStatsData?.result?.bottlesToCollect || 0,
        earnings: financials.totalEarnings || 0,
        cashOutstanding: riderCustomers.reduce((sum, customer) => {
            let outstanding = 0;
            if (customer.walletBalance && customer.walletBalance < 0) {
                outstanding += Math.abs(customer.walletBalance);
            }
            if (customer.unbilledConsumption && customer.unbilledConsumption > 0) {
                outstanding += customer.unbilledConsumption;
            }
            return sum + outstanding;
        }, 0)
    };

    // Product Summary Calculation (Required vs Taken)
    const productSummary = todayDeliveries.reduce((summary, delivery) => {
        delivery.products.forEach(p => {
            const name = p.product?.name || 'Unknown Product';
            if (!summary[name]) {
                summary[name] = {
                    name,
                    subtext: p.product?.shortDescription || '',
                    required: 0,
                    taken: 0
                };
            }
            summary[name].required += p.quantity;
            if (delivery.status === 'delivered') {
                summary[name].taken += p.quantity;
            }
        });
        return summary;
    }, {});
    const productSummaryEntries = Object.values(productSummary);

    // KM Log mutations
    const kmMutation = useMutation({
        mutationFn: submitRiderSelfKmLog,
        onSuccess: (data) => {
            toast.success(data.message);
            refetchKmLog();
            queryClient.invalidateQueries({ queryKey: ["riderFinancials"] });
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to submit KM log")
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status, extraData }) => updateOrderStatus(id, status, extraData),
        onSuccess: (data, variables) => {
            toast.success("Order status updated");
            queryClient.invalidateQueries({ queryKey: ["assignedOrders"] });
            queryClient.invalidateQueries({ queryKey: ["riderBottleStats"] });
            queryClient.invalidateQueries({ queryKey: ["riderFinancials"] });

            if (variables.status === 'delivered') {
                const isWhatsAppEnabled = true;
                if (isWhatsAppEnabled) {
                    // WhatsApp Integration placeholder
                }
            }
        },
        onError: (err, variables) => {
            if (err.response?.data?.needsBypass) {
                if (window.confirm(err.response.data.message + "\n\nClick OK to BYPASS this warning and force save.")) {
                    const newExtraData = { ...variables.extraData, bypassAssetWarning: true };
                    updateStatusMutation.mutate({ id: variables.id, status: variables.status, extraData: newExtraData });
                }
            } else {
                toast.error(err.response?.data?.message || "Failed to update status");
            }
        }
    });

    const handleStatusUpdate = (id, status, extraData = {}) => {
        if (!isDeliveryStarted) {
            toast.error("Please START your delivery session first!");
            return;
        }

        const bottlesReturned = extraData.bottlesReturned !== undefined ? extraData.bottlesReturned : (bottleInputs[id] || 0);
        if (extraData.cancelReason || extraData.cashAmount || extraData.products || confirm(`Are you sure you want to mark this order as ${status}?${bottlesReturned > 0 ? ` (Collecting ${bottlesReturned} bottle(s))` : ''}`)) {
            updateStatusMutation.mutate({ id, status, extraData: { ...extraData, bottlesReturned } });
            setBottleInputs(prev => ({ ...prev, [id]: 0 }));
        }
    };

    // Format seconds to HH:MM:SS
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Haversine formula to calculate distance between two GPS coordinates
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Start/Stop Delivery Logic
    const toggleDeliverySession = () => {
        if (isDeliveryStarted) {
            setShowStopConfirmation(true);
        } else {
            // If no KM log exists today, prompt for start reading
            if (!todayKmLog) {
                setShowKmStartModal(true);
            } else {
                startSession();
            }
        }
    };

    const startSession = () => {
        setIsDeliveryStarted(true);
        setSessionStats({ startTime: new Date(), distance: 0, elapsedTime: 0 });
        lastPosition.current = null;

        // Start Timer
        timerRef.current = setInterval(() => {
            setSessionStats(prev => ({ ...prev, elapsedTime: prev.elapsedTime + 1 }));
        }, 1000);

        // Start GPS Location Tracking with accurate distance
        if (navigator.geolocation) {
            locationWatchId.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    if (lastPosition.current) {
                        const dist = calculateDistance(
                            lastPosition.current.lat, lastPosition.current.lon,
                            latitude, longitude
                        );
                        // Only add distance if > 10m (to avoid GPS jitter)
                        if (dist > 0.01) {
                            setSessionStats(prev => ({ ...prev, distance: prev.distance + dist }));
                            lastPosition.current = { lat: latitude, lon: longitude };
                        }
                    } else {
                        lastPosition.current = { lat: latitude, lon: longitude };
                    }
                },
                (error) => console.error("GPS Error:", error),
                { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
            );
        }
        toast.success("Delivery Session Started! Drive safely.");
    };

    const handleKmStart = () => {
        const reading = parseFloat(kmStartInput);
        if (isNaN(reading) || reading < 0) {
            toast.error("Please enter a valid start KM reading");
            return;
        }
        kmMutation.mutate({ startReading: reading }, {
            onSuccess: () => {
                setShowKmStartModal(false);
                setKmStartInput("");
                startSession();
            }
        });
    };

    const confirmStopSession = () => {
        setIsDeliveryStarted(false);
        clearInterval(timerRef.current);
        if (locationWatchId.current) navigator.geolocation.clearWatch(locationWatchId.current);

        // Show end KM modal if log is active
        if (todayKmLog && todayKmLog.status === "active") {
            setShowStopConfirmation(false);
            setShowKmEndModal(true);
        } else {
            setFinalStats({ ...sessionStats, ...stats });
            setShowStopConfirmation(false);
            setShowSessionSummary(true);
        }
    };

    const handleKmEnd = () => {
        const reading = parseFloat(kmEndInput);
        if (isNaN(reading) || reading < 0) {
            toast.error("Please enter a valid end KM reading");
            return;
        }
        if (todayKmLog && reading < todayKmLog.startReading) {
            toast.error("End reading cannot be less than start reading");
            return;
        }
        kmMutation.mutate({
            endReading: reading,
            gpsDistance: parseFloat(sessionStats.distance.toFixed(2))
        }, {
            onSuccess: () => {
                setShowKmEndModal(false);
                setKmEndInput("");
                setFinalStats({ ...sessionStats, ...stats });
                setShowSessionSummary(true);
            }
        });
    };

    // Restore session if KM log is active today
    useEffect(() => {
        if (todayKmLog && todayKmLog.status === "active" && !isDeliveryStarted) {
            // Auto-resume indicator (won't auto-start timer, rider needs to press start)
        }
    }, [todayKmLog]);

    // Fetch Weather Data
    useEffect(() => {
        let lat = 8.1833; // Default Nagercoil
        let lon = 77.4119;

        const fetchWeather = async (latitude, longitude) => {
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
                const data = await res.json();
                if (data && data.current_weather) {
                    setWeather(data.current_weather);
                }
            } catch (err) {
                console.error("Failed to fetch weather:", err);
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
                () => fetchWeather(lat, lon)
            );
        } else {
            fetchWeather(lat, lon);
        }
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return { text: "Good Morning", icon: "☀️" };
        if (hour < 17) return { text: "Good Afternoon", icon: "🌤️" };
        return { text: "Good Evening", icon: "🌙" };
    };

    const greeting = getGreeting();

    const renderHome = () => (
        <div className="p-4 space-y-6 pb-32 pt-6">
            {/* Greeting & Controls Section */}
            <div className="flex justify-between items-start mb-6 bg-gradient-to-r from-teal-500 to-emerald-600 p-6 rounded-3xl text-white shadow-lg">
                <div>
                    <h1 className="text-2xl font-bold">
                        {greeting.text}, {user?.data?.result?.name?.split(' ')[0] || "Rider"}! {greeting.icon}
                    </h1>
                    <p className="text-teal-100 text-sm mt-1">Ready to deliver happiness today?</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="btn btn-ghost btn-circle btn-sm text-white hover:bg-white/20" onClick={() => refetch()}>
                        <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                    </button>
                    <div className="avatar placeholder" onClick={() => setActiveNav('profile')}>
                        <div className="bg-white text-teal-600 rounded-full w-10 cursor-pointer shadow-md transition-all">
                            <span className="text-sm font-bold">{user?.data?.result?.name?.charAt(0) || "R"}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* KM Reading Banner (if active today) */}
            {todayKmLog && (
                <div className={`p-4 rounded-xl border shadow-sm ${todayKmLog.status === 'active'
                    ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200'
                    : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
                    }`}>
                    <div className="flex items-center gap-2 mb-2">
                        <Gauge size={18} className={todayKmLog.status === 'active' ? 'text-indigo-600' : 'text-emerald-600'} />
                        <span className="text-sm font-bold text-gray-700">
                            Odometer Readings
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto ${todayKmLog.status === 'active'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-emerald-100 text-emerald-600'
                            }`}>
                            {todayKmLog.status === 'active' ? '● TRACKING' : '✓ COMPLETED'}
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <p className="text-xs text-gray-500">Start</p>
                            <p className="text-lg font-bold text-gray-800">{todayKmLog.startReading}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">End</p>
                            <p className="text-lg font-bold text-gray-800">{todayKmLog.endReading ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Total KM</p>
                            <p className="text-lg font-bold text-teal-600">
                                {todayKmLog.totalKm || (todayKmLog.gpsDistance || 0).toFixed(1)} km
                            </p>
                        </div>
                    </div>
                    {todayKmLog.status === 'completed' && perKmCharge > 0 && (
                        <div className="mt-2 text-center text-sm text-emerald-700 font-medium">
                            KM Earnings: ₹{todayKmLog.kmCharge} ({todayKmLog.totalKm} km × ₹{perKmCharge}/km)
                        </div>
                    )}
                </div>
            )}

            {/* Session Status Card (if active) */}
            {isDeliveryStarted && (
                <div className="bg-gray-900 text-white p-4 rounded-xl shadow-lg flex justify-between items-center animate-pulse-slow">
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider">Session Active</p>
                        <div className="text-2xl font-mono font-bold">{formatTime(sessionStats.elapsedTime)}</div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase tracking-wider">GPS Distance</p>
                        <div className="text-2xl font-bold text-teal-400">{sessionStats.distance.toFixed(2)} <span className="text-sm text-gray-400">km</span></div>
                    </div>
                </div>
            )}

            {/* 2x2 Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div
                    className="bg-gradient-to-br from-orange-400 to-red-400 p-5 rounded-3xl shadow-md text-white flex flex-col justify-between h-36 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => {
                        setOrderFilter('active');
                        setActiveNav('deliveries');
                    }}
                >
                    <div className="flex justify-between items-start">
                        <span className="font-medium text-sm opacity-90">Pending</span>
                        <div className="bg-white/20 p-2 rounded-full"><Clock size={20} /></div>
                    </div>
                    <div>
                        <div className="text-4xl font-bold">{stats.pending}</div>
                        <div className="text-xs opacity-80 mt-1">Orders left</div>
                    </div>
                </div>

                <div
                    className="bg-gradient-to-br from-teal-400 to-emerald-500 p-5 rounded-3xl shadow-md text-white flex flex-col justify-between h-36 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => {
                        setOrderFilter('completed');
                        setActiveNav('deliveries');
                    }}
                >
                    <div className="flex justify-between items-start">
                        <span className="font-medium text-sm opacity-90">Completed</span>
                        <div className="bg-white/20 p-2 rounded-full"><CheckCircle size={20} /></div>
                    </div>
                    <div>
                        <div className="text-4xl font-bold">{stats.completed}</div>
                        <div className="text-xs opacity-80 mt-1">Orders done</div>
                    </div>
                </div>
            </div>

            {/* Inventory Summary for Today */}
            <div
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all group"
                onClick={() => setIsInventoryModalOpen(true)}
            >
                <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Package size={18} className="text-indigo-600" /> Products to Deliver Today
                    </h3>
                    <RefreshCw
                        size={16}
                        className={`text-gray-400 group-hover:text-indigo-600 transition-colors ${isLoading ? "animate-spin" : ""}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            refetch();
                        }}
                    />
                </div>

                {productSummaryEntries.length > 0 ? (
                    <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-indigo-50 px-4 py-2 rounded-lg text-center">
                                <div className="text-[10px] uppercase font-bold text-indigo-400 mb-0.5">Required</div>
                                <div className="text-xl font-black text-indigo-700 leading-none">
                                    {productSummaryEntries.reduce((acc, curr) => acc + curr.required, 0)}
                                </div>
                            </div>
                            <div className="bg-cyan-50 px-4 py-2 rounded-lg text-center opacity-80">
                                <div className="text-[10px] uppercase font-bold text-cyan-500 mb-0.5">Taken</div>
                                <div className="text-xl font-black text-cyan-700 leading-none">
                                    {productSummaryEntries.reduce((acc, curr) => acc + curr.taken, 0)}
                                </div>
                            </div>
                        </div>
                        <div className="text-sm font-bold text-indigo-600 bg-indigo-50/50 px-3 py-1.5 rounded-full flex gap-1 items-center">
                            View List <List size={14} />
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-gray-500 text-center py-4 mt-2 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        No pending products for today.
                    </div>
                )}
            </div>

            {/* Weather Widget */}
            {weather && (
                <div className="bg-gradient-to-r from-blue-400 to-indigo-500 p-5 rounded-3xl text-white shadow-md flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="flex items-center gap-4 z-10">
                        <span className="text-4xl drop-shadow-md">
                            {weather.weathercode === 0 ? "☀️" : weather.weathercode <= 3 ? "⛅" : weather.weathercode <= 48 ? "🌫️" : weather.weathercode <= 67 ? "🌧️" : weather.weathercode <= 77 ? "❄️" : "⛈️"}
                        </span>
                        <div>
                            <p className="text-3xl font-bold">{Math.round(weather.temperature)}°<span className="text-xl">C</span></p>
                            <p className="text-xs text-blue-100 mt-1 capitalize truncate max-w-[120px]">
                                {weather.weathercode === 0 ? "Clear Sky" : weather.weathercode <= 3 ? "Partly Cloudy" : weather.weathercode <= 48 ? "Foggy" : weather.weathercode <= 67 ? "Rainy" : weather.weathercode <= 77 ? "Snowy" : "Thunderstorm"}
                            </p>
                        </div>
                    </div>
                    <div className="text-right z-10">
                        <p className="text-lg font-bold">{Math.round(weather.windspeed)} <span className="text-xs font-normal">km/h</span></p>
                        <p className="text-xs text-blue-100 mt-1">Wind Speed</p>
                    </div>
                </div>
            )}

            {/* Financial Summary */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Wallet size={18} className="text-teal-600" /> Financial Summary
                </h3>

                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                        <div>
                            <p className="text-sm text-gray-500">Earned Salary</p>
                            <p className="text-xs text-gray-400">From attendance</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold text-teal-600">₹ {financials.earnedSalary || 0}</p>
                        </div>
                    </div>

                    {(financials.kmEarnings || 0) > 0 && (
                        <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                            <div>
                                <p className="text-sm text-gray-500">KM Earnings</p>
                                <p className="text-xs text-gray-400">Per-km charges</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold text-blue-600">₹ {financials.kmEarnings || 0}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                        <div>
                            <p className="text-sm text-gray-500">Cash In Hand</p>
                            <p className="text-xs text-gray-400">Collected from customers</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold text-orange-600">₹ {financials.cashWithRider || 0}</p>
                        </div>
                    </div>

                    <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                        <div>
                            <p className="text-sm text-gray-500">Cash Returned to Admin</p>
                            <p className="text-xs text-gray-400">Already deposited</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold text-emerald-600">₹ {financials.totalAdminCollected || 0}</p>
                        </div>
                    </div>

                    {(financials.totalAdvancePaid || 0) > 0 && (
                        <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                            <div>
                                <p className="text-sm text-gray-500">Advance Paid</p>
                                <p className="text-xs text-gray-400">Salary advance received</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold text-purple-600">₹ {financials.totalAdvancePaid || 0}</p>
                            </div>
                        </div>
                    )}

                    <div className={`flex justify-between items-center p-3 rounded-lg ${(financials.netPayable || 0) >= 0
                        ? 'bg-emerald-50 border border-emerald-100'
                        : 'bg-red-50 border border-red-100'
                        }`}>
                        <div>
                            <p className="text-sm font-bold text-gray-700">
                                {(financials.netPayable || 0) >= 0 ? 'Amount Due to You' : 'Amount You Owe'}
                            </p>
                            <p className="text-xs text-gray-500">
                                {(financials.netPayable || 0) >= 0
                                    ? 'Earnings − Cash − Advance = Net'
                                    : 'Cash collected exceeds salary'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className={`text-2xl font-bold ${(financials.netPayable || 0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                ₹ {Math.abs(financials.netPayable || 0)}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-500">Bottles to Return</p>
                            <p className="text-xs text-gray-400">Collected from customers</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold text-blue-600">{stats.bottlesToCollect}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Salary Ledger */}
            {financials.recentLedger && financials.recentLedger.length > 0 && (
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <TrendingUp size={18} className="text-indigo-600" /> Recent Activity
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {financials.recentLedger.slice(0, 10).map((entry, i) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                                <div>
                                    <p className="text-sm text-gray-700">{entry.description}</p>
                                    <p className="text-xs text-gray-400">{new Date(entry.date).toLocaleDateString()}</p>
                                </div>
                                <span className={`text-sm font-bold ${entry.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {entry.amount >= 0 ? '+' : ''}₹{entry.amount}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderDeliveries = () => {
        // Filter Logic
        let filteredItems = [];
        if (orderFilter === 'all') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toLocaleDateString('en-CA');

            const tomorrowDeliveries = deliveries.filter(d => {
                if (!d.deliveryDate) return false;
                return new Date(d.deliveryDate).toLocaleDateString('en-CA') === tomorrowStr;
            });

            // Combine today's deliveries, tomorrow's deliveries, and any orders that got delivered today
            const combined = [...todayDeliveries, ...tomorrowDeliveries, ...deliveredToday];

            // Remove duplicates by ID (e.g. an order delivered today might be in both todayDeliveries and deliveredToday)
            const uniqueMap = new Map();
            combined.forEach(d => uniqueMap.set(d._id, d));

            filteredItems = Array.from(uniqueMap.values());
        } else if (orderFilter === 'pending') {
            filteredItems = todayDeliveries.filter(d => d.status === 'pending' || d.status === 'confirmed');
        } else if (orderFilter === 'delivered') {
            filteredItems = deliveredToday;
        } else if (orderFilter === 'cancelled') {
            filteredItems = todayDeliveries.filter(d => d.status === 'cancelled');
        } else if (orderFilter === 'spot') {
            filteredItems = deliveredToday.filter(d => d.orderType === 'SPOT_SALE');
        }

        return (
            <div className="p-4 space-y-4 pb-32 pt-6">
                <div className="mb-2 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">My Deliveries</h2>
                        <p className="text-gray-400 text-xs">Manage your daily deliveries and customers</p>
                    </div>
                    <button
                        onClick={() => setIsRiderRouteModalOpen(true)}
                        className="btn btn-circle btn-sm bg-white text-gray-600 border border-gray-200 shadow-sm hover:bg-gray-50 flex items-center justify-center p-1"
                        title="Sort Customers"
                    >
                        <ArrowUpDown size={16} />
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {[
                        { id: 'all', label: 'All Customers', color: 'from-blue-400 to-indigo-500' },
                        { id: 'pending', label: 'Pending', color: 'from-orange-400 to-red-400' },
                        { id: 'delivered', label: 'Delivered', color: 'from-emerald-400 to-teal-500' },
                        { id: 'cancelled', label: 'Cancelled', color: 'from-gray-500 to-gray-700' },
                        { id: 'spot', label: 'Spot Sale', color: 'from-purple-400 to-indigo-500' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            className={`btn btn-sm rounded-full px-5 border-none whitespace-nowrap transition-all duration-300 ${orderFilter === tab.id ? `bg-gradient-to-r ${tab.color} text-white shadow-md scale-105` : 'bg-white text-gray-600 shadow-sm hover:bg-gray-50'}`}
                            onClick={() => setOrderFilter(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {filteredItems.length === 0 ? (
                    <div className="text-center py-20 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
                        <Package size={48} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm font-medium">No {orderFilter} found</p>
                    </div>
                ) : (
                    filteredItems.map((delivery) => (
                        <div
                            key={delivery._id}
                            onClick={() => setSelectedDelivery(delivery)}
                            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden transition-all duration-300 hover:shadow-md cursor-pointer"
                        >
                            {/* Status Strip */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${delivery.isCustomerOnly ? 'bg-blue-500' :
                                delivery.orderType === 'SPOT_SALE' ? 'bg-gradient-to-b from-purple-400 to-indigo-500' :
                                    delivery.status === 'delivered' ? 'bg-teal-500' :
                                        delivery.status === 'cancelled' ? 'bg-red-500' :
                                            'bg-orange-400'
                                }`}></div>

                            <div className="pl-3">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">{delivery.customer?.name}</h3>
                                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                            <MapPin size={12} />
                                            <span className="truncate max-w-[200px]">{delivery.customer?.address?.fullAddress || "No Address"}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="badge bg-gray-100 text-gray-600 border-none text-xs mb-1 font-mono">
                                            #{delivery.isCustomerOnly ? (delivery.customer?.customerId || "NEW") : delivery._id.slice(-4)}
                                        </span>
                                        <div className="text-teal-700 font-bold text-sm">
                                            {delivery.isCustomerOnly ? (
                                                <span className="text-blue-600 text-[10px] uppercase font-bold">Customer</span>
                                            ) : delivery.orderType === 'BOTTLE_COLLECTION' ? (
                                                <span className="text-orange-600">Collection</span>
                                            ) : (
                                                `₹${delivery.totalAmount}`
                                            )}
                                        </div>
                                        {!delivery.isCustomerOnly && delivery.orderType !== 'BOTTLE_COLLECTION' && delivery.paymentMode === 'Cash' && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">CASH</span>
                                        )}
                                    </div>
                                </div>

                                {/* Product Info (Hide if customer only) */}
                                {!delivery.isCustomerOnly && (
                                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                                        {delivery.orderType === 'BOTTLE_COLLECTION' ? (
                                            <div className="flex items-center gap-2 text-orange-600 font-bold justify-center py-1">
                                                <RefreshCw size={16} />
                                                <span>Bottle Collection Request</span>
                                            </div>
                                        ) : (
                                            (delivery.products || []).map((p, idx) => (
                                                <div key={idx} className="flex justify-between text-sm text-gray-700">
                                                    <span>{p.product?.name || p.name}</span>
                                                    <span className="font-bold">x{p.quantity}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* Action Row */}
                                <div className="flex items-center justify-between gap-3 mt-2">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (!isDeliveryStarted) {
                                                    toast.error("Please START your delivery session first!");
                                                    return;
                                                }
                                                setSpotSaleCustomer(delivery.customer);
                                                setIsSpotSaleModalOpen(true);
                                            }}
                                            className="btn btn-circle btn-sm bg-orange-50 text-orange-600 border-none hover:bg-orange-100"
                                            title="Extra Product / Spot Sale"
                                        >
                                            <ShoppingCart size={16} />
                                        </button>
                                        <a href={`tel:${delivery.customer?.mobile}`} onClick={e => e.stopPropagation()} className="btn btn-circle btn-sm bg-teal-50 text-teal-600 border-none hover:bg-teal-100">
                                            <Phone size={16} />
                                        </a>
                                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.customer?.address?.fullAddress || "")}`} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="btn btn-circle btn-sm bg-blue-50 text-blue-600 border-none hover:bg-blue-100">
                                            <Navigation size={16} />
                                        </a>
                                    </div>

                                    {!delivery.isCustomerOnly && (
                                        <div className="flex gap-2 items-center">
                                            {delivery.status === 'cancelled' ? (
                                                <span className="badge badge-error gap-1 py-3 px-4 text-white">
                                                    Cancelled
                                                </span>
                                            ) : delivery.status !== 'delivered' && delivery.status !== 'cancelled' ? (
                                                <>
                                                    <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100" onClick={e => e.stopPropagation()}>
                                                        <Package size={14} className="text-orange-500" />
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            className="input input-xs w-10 text-center bg-transparent p-0 focus:outline-none"
                                                            placeholder="0"
                                                            value={bottleInputs[delivery._id] || ""}
                                                            onChange={(e) => setBottleInputs(prev => ({ ...prev, [delivery._id]: parseInt(e.target.value) || 0 }))}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleStatusUpdate(delivery._id, "delivered");
                                                        }}
                                                        className="btn btn-sm bg-gray-900 text-white hover:bg-black gap-2 border-none shadow-md"
                                                    >
                                                        <CheckCircle size={14} />
                                                        {delivery.orderType === 'BOTTLE_COLLECTION' ? 'Mark Collected' : 'Delivered'}
                                                    </button>
                                                </>
                                            ) : delivery.status === 'delivered' ? (
                                                <span className="badge badge-success gap-1 py-3 px-4 text-white">
                                                    <CheckCircle size={14} /> Completed
                                                </span>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        );
    };

    const renderHistory = () => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        const lastMonth = lastMonthDate.getMonth();
        const lastMonthYear = lastMonthDate.getFullYear();

        // Group delivered orders
        const deliveredOrders = deliveries.filter(d => {
            if (d.status !== 'delivered') return false;
            const dDate = new Date(d.deliveryDate || d.updatedAt);
            const dMonth = dDate.getMonth();
            const dYear = dDate.getFullYear();

            if (historyTab === 'current') {
                return dMonth === currentMonth && dYear === currentYear;
            } else if (historyTab === 'last') {
                return dMonth === lastMonth && dYear === lastMonthYear;
            }
            return true;
        });

        // Group by Date
        const groupedByDate = deliveredOrders.reduce((acc, curr) => {
            const dDate = new Date(curr.deliveryDate || curr.updatedAt);
            const day = dDate.getDate();
            const suffix = (day === 1 || day === 21 || day === 31) ? 'st' : (day === 2 || day === 22) ? 'nd' : (day === 3 || day === 23) ? 'rd' : 'th';
            const month = dDate.toLocaleString('en-GB', { month: 'short' });
            const year = dDate.getFullYear();
            const dateStr = `${day}${suffix} ${month} ${year}`;

            if (!acc[dateStr]) {
                acc[dateStr] = { label: dateStr, count: 0, amount: 0, date: dDate };
            }
            acc[dateStr].count += curr.products?.reduce((sum, p) => sum + p.quantity, 0) || 0;
            if (!curr.products || curr.products.length === 0) acc[dateStr].count += 1;
            acc[dateStr].amount += curr.totalAmount || 0;
            return acc;
        }, {});

        // Group by Product
        const groupedByProduct = deliveredOrders.reduce((acc, curr) => {
            (curr.products || []).forEach(p => {
                const name = p.product?.name || p.name || 'Unknown Product';
                if (!acc[name]) {
                    acc[name] = { label: name, count: 0, amount: 0 };
                }
                acc[name].count += p.quantity;
                acc[name].amount += (p.price || 0) * p.quantity;
            });
            return acc;
        }, {});

        const historyListDate = Object.values(groupedByDate).sort((a, b) => b.date - a.date);
        const historyListProduct = Object.values(groupedByProduct).sort((a, b) => b.count - a.count);

        const currentList = isProductWise ? historyListProduct : historyListDate;

        return (
            <div className="p-4 space-y-4 pb-32 pt-6 bg-white min-h-screen">
                {/* Header */}
                <div className="flex justify-between items-center mb-1">
                    <h1 className="text-[28px] font-normal text-[#12b8b0]">Account</h1>
                    <button className="text-[#12b8b0] p-1" onClick={() => refetch()}>
                        <RefreshCw size={22} className={isLoading ? "animate-spin" : ""} />
                    </button>
                </div>
                <p className="text-sm text-gray-500 mb-6 font-medium">Monthly report of payment and deliveries</p>

                {/* Cards */}
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    <div className="bg-[#b3ddd9] min-w-[105px] flex-1 p-3 rounded-[20px] shadow-sm flex flex-col justify-between h-28">
                        <div>
                            <div className="text-[15px] font-medium text-slate-800">Payment</div>
                            <div className="text-[11px] text-slate-500 font-medium">To Collect</div>
                        </div>
                        <div className="text-[28px] text-slate-800 tracking-tight leading-none pt-2">{stats.cashToCollect || 0}</div>
                    </div>
                    <div className="bg-[#b6e2df] min-w-[105px] flex-1 p-3 rounded-[20px] shadow-sm flex flex-col justify-between h-28">
                        <div>
                            <div className="text-[15px] font-medium text-slate-800">Bottle</div>
                            <div className="text-[11px] text-slate-500 font-medium">To Collect</div>
                        </div>
                        <div className="text-[28px] text-slate-800 tracking-tight leading-none pt-2">{stats.bottlesToCollect || 0}</div>
                    </div>
                    <div className="bg-[#dad5f5] min-w-[105px] flex-1 p-3 rounded-[20px] shadow-sm flex flex-col justify-between h-28">
                        <div>
                            <div className="text-[15px] font-medium text-slate-800">Cash</div>
                            <div className="text-[11px] text-slate-500 font-medium">Outstanding</div>
                        </div>
                        <div className="text-[28px] text-slate-800 tracking-tight leading-none pt-2">{stats.cashOutstanding || 0}</div>
                    </div>
                </div>

                {/* Toggle - Aligned Right */}
                <div className="flex justify-end mt-4 mb-2">
                    <div
                        className="bg-[#00cec9] rounded-full p-1 flex items-center cursor-pointer relative shadow-sm"
                        style={{ width: '120px', height: '34px' }}
                        onClick={() => setIsProductWise(!isProductWise)}
                    >
                        <div className={`w-7 h-7 bg-white rounded-full shadow-md z-10 transition-transform duration-300 flex items-center justify-center ${isProductWise ? 'translate-x-[83px]' : 'translate-x-0'}`}>
                        </div>
                        <span className={`text-white text-[11px] font-medium absolute inset-0 flex items-center ${isProductWise ? 'pl-3' : 'pl-10'} transition-all duration-300`}>
                            Product Wise
                        </span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-[#f0f2f5] rounded-t-xl overflow-hidden mt-6">
                    <button
                        className={`flex-1 py-3 text-[14px] font-medium transition-colors ${historyTab === 'current' ? 'bg-[#12b8b0] text-white rounded-tr-xl shadow-md z-10' : 'text-gray-400 hover:text-gray-600 hover:bg-[#e4e6e9]'}`}
                        onClick={() => setHistoryTab('current')}
                    >
                        Current Month
                    </button>
                    <button
                        className={`flex-1 py-3 text-[14px] font-medium transition-colors ${historyTab === 'last' ? 'bg-[#12b8b0] text-white rounded-tl-xl shadow-md z-10' : 'text-gray-400 hover:text-gray-600 hover:bg-[#e4e6e9]'}`}
                        onClick={() => setHistoryTab('last')}
                    >
                        Last Month
                    </button>
                </div>

                {/* List Container */}
                <div className="bg-[#f5f6f8] -mt-1 pt-2 rounded-b-xl overflow-hidden shadow-sm">
                    {currentList.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">No data available</div>
                    ) : (
                        currentList.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center py-4 px-4 border-b border-gray-200/50 last:border-none">
                                <div className="text-gray-600 text-[15px] font-medium truncate pr-4">{item.label}</div>
                                <div className="flex items-center">
                                    <div className="bg-white min-w-[36px] px-2 py-1 rounded-full text-sm font-medium text-gray-700 shadow-sm text-center">
                                        {item.count}
                                    </div>
                                    <div className="w-16 text-right text-gray-600 text-[15px] font-medium font-mono">
                                        {item.amount > 0 ? item.amount : '—'}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    const renderProfile = () => (
        <div className="p-4 space-y-6 pb-32 pt-6">
            {/* Profile Header */}
            <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8 rounded-3xl shadow-lg flex flex-col items-center text-center text-white relative overflow-hidden">
                <div className="avatar placeholder mb-4 z-10">
                    <div className="bg-white text-purple-600 rounded-full w-24 ring-4 ring-white/30 shadow-xl">
                        <span className="text-4xl font-bold">{user?.data?.result?.name?.charAt(0) || "R"}</span>
                    </div>
                </div>
                <h2 className="font-bold text-2xl z-10">{user?.data?.result?.name || "Rider Name"}</h2>
                <p className="text-white/80 text-sm z-10">{user?.data?.result?.mobile}</p>
                <div className="badge border-none bg-white text-purple-600 gap-1 mt-3 text-xs font-bold py-3 px-4 shadow-sm z-10">
                    Verified Partner
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-4 rounded-xl">
                    <div className="text-xs text-blue-600 font-bold uppercase mb-1">Total Earnings</div>
                    <div className="text-2xl font-bold text-blue-700">₹{financials.totalEarnings || 0}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl">
                    <div className="text-xs text-purple-600 font-bold uppercase mb-1">Cash In Hand</div>
                    <div className="text-2xl font-bold text-purple-700">₹{financials.cashWithRider || 0}</div>
                </div>
            </div>

            {/* Salary Info */}
            {financials.salaryDetails && (
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Banknote size={18} className="text-indigo-600" /> Salary Details
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Salary Type</span>
                            <span className="font-medium">{financials.salaryDetails.salaryType}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Rate</span>
                            <span className="font-medium">₹{financials.salaryDetails.salary}/{financials.salaryDetails.salaryType?.toLowerCase()?.replace('ly', '')}</span>
                        </div>
                        {financials.salaryDetails.perKmCharge > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Per KM Charge</span>
                                <span className="font-medium">₹{financials.salaryDetails.perKmCharge}/km</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Settlement Summary */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <ArrowDownCircle size={18} className="text-emerald-600" /> Settlement
                </h3>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                        <span className="text-gray-500">Earned Salary</span>
                        <span className="font-bold text-emerald-600">+ ₹{financials.earnedSalary || 0}</span>
                    </div>
                    {(financials.kmEarnings || 0) > 0 && (
                        <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                            <span className="text-gray-500">KM Earnings</span>
                            <span className="font-bold text-blue-600">+ ₹{financials.kmEarnings || 0}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                        <span className="text-gray-500">Cash In Hand</span>
                        <span className="font-bold text-orange-600">- ₹{financials.cashWithRider || 0}</span>
                    </div>
                    {(financials.totalAdvancePaid || 0) > 0 && (
                        <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                            <span className="text-gray-500">Advance Paid</span>
                            <span className="font-bold text-purple-600">- ₹{financials.totalAdvancePaid || 0}</span>
                        </div>
                    )}
                    <div className={`flex justify-between text-sm font-bold p-2 rounded-lg ${(financials.netPayable || 0) >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        <span>{(financials.netPayable || 0) >= 0 ? 'Admin Pays You' : 'You Pay Admin'}</span>
                        <span className={(financials.netPayable || 0) >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                            ₹ {Math.abs(financials.netPayable || 0)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 relative">
            {/* Content Area */}
            {activeNav === 'home' && renderHome()}
            {activeNav === 'deliveries' && renderDeliveries()}
            {activeNav === 'history' && renderHistory()}
            {activeNav === 'profile' && renderProfile()}

            {/* KM Start Reading Modal */}
            {showKmStartModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="text-center mb-4">
                            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Gauge size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Start KM Reading</h3>
                            <p className="text-gray-500 text-sm mt-1">Enter your odometer reading before starting</p>
                        </div>
                        <input
                            type="number"
                            className="input input-bordered w-full text-center text-2xl font-mono mb-4"
                            placeholder="e.g. 12345"
                            value={kmStartInput}
                            onChange={(e) => setKmStartInput(e.target.value)}
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button className="btn btn-ghost flex-1" onClick={() => {
                                setShowKmStartModal(false);
                                startSession(); // Start without KM log
                            }}>
                                Skip
                            </button>
                            <button
                                className="btn btn-primary flex-1"
                                onClick={handleKmStart}
                                disabled={kmMutation.isPending}
                            >
                                {kmMutation.isPending ? "Saving..." : "Start"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* KM End Reading Modal */}
            {showKmEndModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="text-center mb-4">
                            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Gauge size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">End KM Reading</h3>
                            <p className="text-gray-500 text-sm mt-1">
                                Start: <strong>{todayKmLog?.startReading}</strong> | GPS: <strong>{sessionStats.distance.toFixed(2)} km</strong>
                            </p>
                        </div>
                        <input
                            type="number"
                            className="input input-bordered w-full text-center text-2xl font-mono mb-4"
                            placeholder="e.g. 12390"
                            value={kmEndInput}
                            onChange={(e) => setKmEndInput(e.target.value)}
                            autoFocus
                        />
                        {perKmCharge > 0 && kmEndInput && todayKmLog && (
                            <div className="text-center text-sm text-emerald-700 bg-emerald-50 p-2 rounded-lg mb-4">
                                Estimated KM pay: ₹{Math.round((parseFloat(kmEndInput) - todayKmLog.startReading) * perKmCharge)}
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button className="btn btn-ghost flex-1" onClick={() => {
                                setShowKmEndModal(false);
                                setFinalStats({ ...sessionStats, ...stats });
                                setShowSessionSummary(true);
                            }}>
                                Skip
                            </button>
                            <button
                                className="btn btn-success text-white flex-1"
                                onClick={handleKmEnd}
                                disabled={kmMutation.isPending}
                            >
                                {kmMutation.isPending ? "Saving..." : "Complete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stop Confirmation Modal */}
            {showStopConfirmation && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">End Session?</h3>
                        <p className="text-gray-500 mb-6">Are you sure you want to stop your delivery session? Tracking will stop.</p>
                        <div className="flex gap-3">
                            <button
                                className="btn btn-ghost flex-1"
                                onClick={() => setShowStopConfirmation(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-error text-white flex-1"
                                onClick={confirmStopSession}
                            >
                                End Session
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Session Summary Modal */}
            {showSessionSummary && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800">Great Job!</h3>
                            <p className="text-gray-500">Session Summary</p>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <span className="text-gray-500">Duration</span>
                                <span className="font-mono font-bold text-gray-800">{formatTime(finalStats?.elapsedTime || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <span className="text-gray-500">GPS Distance</span>
                                <span className="font-mono font-bold text-gray-800">{finalStats?.distance?.toFixed(2)} km</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <span className="text-gray-500">Earnings</span>
                                <span className="font-mono font-bold text-teal-600">₹{finalStats?.earnings || 0}</span>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary w-full"
                            onClick={() => setShowSessionSummary(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30 px-2 py-2 flex justify-around items-center pb-safe">
                <button
                    className={`flex flex-col items-center gap-1 w-16 ${activeNav === 'home' ? 'text-teal-600' : 'text-gray-400'}`}
                    onClick={() => setActiveNav('home')}
                >
                    <Home size={24} strokeWidth={activeNav === 'home' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Home</span>
                </button>

                <button
                    className={`flex flex-col items-center gap-1 w-16 ${activeNav === 'deliveries' ? 'text-teal-600' : 'text-gray-400'}`}
                    onClick={() => setActiveNav('deliveries')}
                >
                    <List size={24} strokeWidth={activeNav === 'deliveries' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Orders</span>
                </button>

                {/* Central Start/Stop Button */}
                <div className="relative -top-6">
                    <button
                        onClick={toggleDeliverySession}
                        className={`btn btn-circle w-16 h-16 shadow-xl border-4 border-gray-50 ${isDeliveryStarted ? 'btn-error' : 'btn-primary'}`}
                    >
                        {isDeliveryStarted ? <Square size={24} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                    </button>
                </div>

                <button
                    className={`flex flex-col items-center gap-1 w-16 ${activeNav === 'history' ? 'text-teal-600' : 'text-gray-400'}`}
                    onClick={() => setActiveNav('history')}
                >
                    <TrendingUp size={24} strokeWidth={activeNav === 'history' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">History</span>
                </button>

                <button
                    className={`flex flex-col items-center gap-1 w-16 ${activeNav === 'profile' ? 'text-teal-600' : 'text-gray-400'}`}
                    onClick={() => setActiveNav('profile')}
                >
                    <User size={24} strokeWidth={activeNav === 'profile' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Profile</span>
                </button>
            </div>
            <SpotSaleModal
                customer={spotSaleCustomer}
                products={products}
                isOpen={isSpotSaleModalOpen}
                onClose={() => { setIsSpotSaleModalOpen(false); setSpotSaleCustomer(null); }}
                onSave={(data) => spotSaleMutation.mutate(data)}
            />
            <RiderCustomersModal
                isOpen={isRiderCustomersModalOpen}
                onClose={() => setIsRiderCustomersModalOpen(false)}
                rider={user?.data?.result}
                onSelect={(customer) => {
                    setSpotSaleCustomer(customer);
                    setIsSpotSaleModalOpen(true);
                }}
            />
            <RiderRouteModal
                isOpen={isRiderRouteModalOpen}
                onClose={() => setIsRiderRouteModalOpen(false)}
                onSaveSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["assignedOrders"] });
                    queryClient.invalidateQueries({ queryKey: ["rider-customers"] });
                    queryClient.invalidateQueries({ queryKey: ["user"] });
                }}
            />

            {/* Inventory Modal */}
            {isInventoryModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="overflow-y-auto pt-6 px-4 pb-4 flex-1">
                            <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-bold text-gray-800 mb-4 pb-2">
                                <div className="col-span-6"></div>
                                <div className="col-span-2 text-center">Required</div>
                                <div className="col-span-2 text-center">Balance</div>
                                <div className="col-span-2 text-center">Taken</div>
                            </div>

                            <div className="space-y-6">
                                {productSummaryEntries.map((item, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-start">
                                        <div className="col-span-6 pr-2">
                                            <div className="text-sm text-gray-800 leading-tight">{item.name}</div>
                                            {item.subtext && <div className="text-xs text-gray-400 mt-1">{item.subtext}</div>}
                                        </div>
                                        <div className="col-span-2 text-center text-sm text-gray-800 mt-0.5">
                                            {item.required}
                                        </div>
                                        <div className="col-span-2 text-center text-sm text-cyan-400 mt-0.5">
                                            {(item.taken - item.required) === 0 ? 0 : (item.taken - item.required)}
                                        </div>
                                        <div className="col-span-2 text-center text-sm text-cyan-400 mt-0.5">
                                            {item.taken}
                                        </div>
                                    </div>
                                ))}

                                {productSummaryEntries.length === 0 && (
                                    <div className="text-center text-gray-500 py-8">
                                        No upcoming deliveries today
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 flex justify-center bg-white">
                            <button
                                onClick={() => setIsInventoryModalOpen(false)}
                                className="bg-[#f44336] hover:bg-red-600 text-white rounded-xl px-10 py-3 font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <RiderDeliveryDetailModal
                isOpen={!!selectedDelivery}
                onClose={() => setSelectedDelivery(null)}
                delivery={selectedDelivery}
                onSaveDetails={(payload) => {
                    handleStatusUpdate(payload.deliveryId, payload.status, payload);
                    setSelectedDelivery(null);
                }}
                onDeliverNewProduct={(customer) => {
                    setSpotSaleCustomer(customer);
                    setIsSpotSaleModalOpen(true);
                }}
            />
        </div>
    );
};
