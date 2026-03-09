import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Wallet, Package, Truck, Bell, Calendar, ChevronRight,
    Plus, Clock, CheckCircle, Gift, Plane, X, Pause
} from "lucide-react";
import { useAuth } from "../../hook/useAuth";
import { axiosInstance } from "../../lib/axios";
import { VacationModal } from "./VacationModal";
import { ProductOrderModal } from "./CustomerSubscriptions";

const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:4000";



export const CustomerHome = ({ onNavigate, onRecharge }) => {

    const { data: userData } = useAuth();
    const user = userData?.data?.result;
    const [showVacationModal, setShowVacationModal] = useState(false);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [orderType, setOrderType] = useState("subscription");

    const { data: productsData } = useQuery({
        queryKey: ["home-products"],
        queryFn: async () => {
            const response = await axiosInstance.get("/api/products/home-products");
            return response.data;
        }
    });

    const activeProducts = productsData?.result || [];

    // Check if user is on vacation
    const vacation = user?.vacation;
    const now = new Date();
    const vacationStartDate = vacation?.startDate ? new Date(vacation.startDate) : null;
    const vacationEndDate = vacation?.endDate ? new Date(vacation.endDate) : null;
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Currently on vacation (started and not ended)
    const isCurrentlyOnVacation = vacation?.isActive &&
        vacationStartDate &&
        vacationStartDate <= now &&
        (!vacationEndDate || vacationEndDate >= now);

    // Vacation scheduled that affects tomorrow's delivery
    const isVacationScheduled = vacation?.isActive &&
        vacationStartDate &&
        vacationStartDate > now &&
        vacationStartDate <= tomorrow;

    // Either currently on vacation or vacation starts before tomorrow
    const isOnVacation = isCurrentlyOnVacation || isVacationScheduled;

    // Calculate next delivery text
    const getNextDeliveryText = () => {
        if (!isOnVacation) {
            return "Tomorrow, 6 AM";
        }
        if (vacationEndDate) {
            const resumeDate = new Date(vacationEndDate);
            resumeDate.setDate(resumeDate.getDate() + 1);
            return `Resumes ${resumeDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
        }
        return "Paused (Indefinite)";
    };

    // Fetch subscriptions for home display
    const { data: subscriptionsData } = useQuery({
        queryKey: ["my-subscriptions"],
        queryFn: async () => {
            const response = await axiosInstance.get("/api/subscriptions");
            return response.data;
        }
    });

    const activeSubscriptions = subscriptionsData?.result?.filter(sub => sub.status !== 'cancelled') || [];

    // Stats from database
    const stats = {
        walletBalance: user?.walletBalance || 0,
        nextDelivery: getNextDeliveryText(),
        pendingBottles: user?.remainingBottles || 0,
        activeSubscriptions: activeSubscriptions.filter(s => s.status === 'active').length,
    };

    const handleSubscribe = (product, type = "subscription") => {
        setSelectedProduct(product);
        setOrderType(type);
        setShowSubscriptionModal(true);
    };

    return (
        <div className="space-y-6">
            {/* Vacation Banner */}
            {isOnVacation && (
                <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-xl p-4 shadow-sm text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <Plane size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Vacation Mode Active 🏖️</h3>
                                <p className="text-sm text-white/90">
                                    {vacation?.endDate
                                        ? `Deliveries paused until ${new Date(vacation.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                                        : "Deliveries paused indefinitely"
                                    }
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowVacationModal(true)}
                            className="btn btn-sm bg-white/20 border-none text-white hover:bg-white/30"
                        >
                            Edit
                        </button>
                    </div>
                </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div
                    onClick={() => onNavigate('wallet-history')}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50 transition"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <Wallet size={20} className="text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Wallet Balance</p>
                            <p className="text-lg font-bold text-gray-800">
                                ₹{user?.walletBalance !== undefined ? user.walletBalance : '...'}
                            </p>
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => onNavigate('bottle-history')}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50 transition"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <Package size={20} className="text-orange-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Pending Bottles</p>
                            <p className="text-lg font-bold text-gray-800">{stats.pendingBottles}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-3">Quick Actions</h3>
                <div className="grid grid-cols-4 gap-2">
                    <button
                        onClick={onRecharge}
                        className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-gray-50 transition"
                    >
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <Plus size={20} className="text-green-600" />
                        </div>
                        <span className="text-xs text-gray-600">Add Money</span>
                    </button>
                    <button
                        onClick={() => setShowVacationModal(true)}
                        className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-gray-50 transition relative"
                    >
                        <div className={`w-10 h-10 ${isOnVacation ? 'bg-amber-100' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
                            <Plane size={20} className={isOnVacation ? 'text-amber-600' : 'text-blue-600'} />
                        </div>
                        <span className="text-xs text-gray-600">Vacation</span>
                        {isOnVacation && (
                            <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full"></span>
                        )}
                    </button>
                    <button
                        onClick={() => onNavigate('history')}
                        className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-gray-50 transition"
                    >
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <Clock size={20} className="text-purple-600" />
                        </div>
                        <span className="text-xs text-gray-600">History</span>
                    </button>
                    <button
                        onClick={() => onNavigate('referrals')}
                        className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-gray-50 transition"
                    >
                        <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                            <Gift size={20} className="text-pink-600" />
                        </div>
                        <span className="text-xs text-gray-600">Refer</span>
                    </button>
                </div>
            </div>

            {/* Active Subscriptions Preview */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800">My Subscriptions</h3>
                    <button
                        onClick={() => onNavigate('subscriptions')}
                        className="text-green-600 text-sm font-medium flex items-center gap-1"
                    >
                        View All <ChevronRight size={16} />
                    </button>
                </div>

                <div className="space-y-3">
                    {activeSubscriptions.length === 0 ? (
                        <div className="text-center py-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-500 mb-2">No active subscriptions</p>
                            <button
                                onClick={() => onNavigate('products')}
                                className="btn btn-xs btn-outline btn-success"
                            >
                                Browse Products
                            </button>
                        </div>
                    ) : (
                        activeSubscriptions.slice(0, 3).map((sub) => (
                            <div key={sub._id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                                <img
                                    src={
                                        sub.product?.image?.startsWith("http")
                                            ? sub.product.image
                                            : sub.product?.image
                                                ? (sub.product.image.includes("uploads/")
                                                    ? `${BASE_URL}${sub.product.image.startsWith("/") ? "" : "/"}${sub.product.image}`
                                                    : `${BASE_URL}/uploads/${sub.product.image}`)
                                                : "/images/logo.png"
                                    }
                                    onError={(e) => { e.target.onerror = null; e.target.src = "/images/logo.png"; }}
                                    alt={sub.product?.name}
                                    className="w-12 h-12 object-contain bg-white rounded-md"
                                />
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800 line-clamp-1">{sub.product?.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {sub.frequency} • {sub.quantity} qty • ₹{sub.product?.price * sub.quantity}/day
                                    </p>
                                </div>
                                <div className={`flex items-center gap-1 ${sub.status === 'paused' || isOnVacation ? 'text-amber-600' : 'text-green-600'}`}>
                                    {sub.status === 'paused' || isOnVacation ? <Pause size={16} /> : <CheckCircle size={16} />}
                                    <span className="text-xs font-medium">
                                        {isOnVacation ? 'Vacation' : sub.status === 'paused' ? 'Paused' : 'Active'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Featured Products - Instamart Style */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800">Featured Products</h3>
                    <button
                        onClick={() => onNavigate('products')}
                        className="text-[#0C831F] text-sm font-semibold flex items-center gap-1"
                    >
                        See all <ChevronRight size={16} />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {activeProducts.map((product) => {
                        const type = (product.productType || 'both').toLowerCase();
                        const isOneTimeOnly = type === 'one-time';
                        const label = isOneTimeOnly ? "Buy Once" : "Subscribe";
                        const actionType = isOneTimeOnly ? "one-time" : "subscription";
                        const discount = product.mrp && product.mrp > product.price
                            ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
                            : 0;

                        return (
                            <div key={product._id} className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col h-full group hover:shadow-md transition-all duration-200 relative">
                                {/* Image */}
                                <div className="relative bg-gradient-to-b from-gray-50 to-white p-2">
                                    {/* Badges */}
                                    <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5 z-10">
                                        {discount > 0 && (
                                            <span className="bg-[#0C831F] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
                                                {discount}% OFF
                                            </span>
                                        )}
                                        {product.isBestSeller && (
                                            <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
                                                BESTSELLER
                                            </span>
                                        )}
                                        {product.isNewArrival && (
                                            <span className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
                                                NEW
                                            </span>
                                        )}
                                    </div>
                                    <img
                                        src={
                                            product.image?.startsWith("http")
                                                ? product.image
                                                : product.image
                                                    ? (product.image.includes("uploads/")
                                                        ? `${BASE_URL}${product.image.startsWith("/") ? "" : "/"}${product.image}`
                                                        : `${BASE_URL}/uploads/${product.image}`)
                                                    : "/images/logo.png"
                                        }
                                        onError={(e) => { e.target.onerror = null; e.target.src = "/images/logo.png"; }}
                                        alt={product.name}
                                        className="w-full h-24 object-contain rounded-lg bg-white transition-transform duration-300 group-hover:scale-105"
                                    />
                                </div>
                                {/* Info */}
                                <div className="px-2.5 pb-2.5 flex-1 flex flex-col">
                                    <p className="font-semibold text-gray-900 text-[12px] line-clamp-2 min-h-[28px] leading-tight">{product.name}</p>
                                    <div className="mt-auto pt-1.5 flex items-end justify-between gap-1">
                                        <div className="flex flex-col">
                                            <span className="text-[14px] font-bold text-gray-900">₹{product.price}</span>
                                            {product.mrp && product.mrp > product.price && (
                                                <span className="text-[10px] text-gray-400 line-through">₹{product.mrp}</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleSubscribe(product, actionType)}
                                            className="min-w-[56px] h-[28px] border-2 border-[#0C831F] text-[#0C831F] bg-[#E8F5E1] rounded-lg text-[10px] font-bold uppercase hover:bg-[#d4edc9] active:scale-95 transition-all relative"
                                        >
                                            {label === "Subscribe" ? "ADD" : "ADD"}
                                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#0C831F] text-white rounded-full text-[8px] flex items-center justify-center font-bold">+</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Vacation Modal */}
            <VacationModal
                isOpen={showVacationModal}
                onClose={() => setShowVacationModal(false)}
            />

            {/* Subscription Modal */}
            {showSubscriptionModal && (
                <ProductOrderModal
                    isOpen={showSubscriptionModal}
                    onClose={() => {
                        setShowSubscriptionModal(false);
                        setSelectedProduct(null);
                    }}
                    product={selectedProduct}
                    orderType={orderType}
                />
            )}
        </div>
    );
};
