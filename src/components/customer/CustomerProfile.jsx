import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
    User, Phone, MapPin, Edit2, Wallet, Package, Calendar,
    Settings, HelpCircle, LogOut, ChevronRight, Plus, Bell,
    CreditCard, Mail, Clock, Shield, FileText, Gift, X, Check,
    Home, Building, Navigation, Palmtree, Lock
} from "lucide-react";
import { useAuth } from "../../hook/useAuth";
import { axiosInstance } from "../../lib/axios";
import { queryClient } from "../../lib/queryClient";
import toast from "react-hot-toast";
import { VacationModal } from "./VacationModal";
import { AddressManagementModal } from "./AddressManagementModal";

// API calls
const updateProfile = async (data) => {
    const response = await axiosInstance.put("/api/users/profile", data);
    return response.data;
};

const getTransactions = async () => {
    const response = await axiosInstance.get("/api/payments/transactions?limit=5");
    return response.data;
};

const getUnreadNotifications = async () => {
    const response = await axiosInstance.get("/api/notifications?read=false&limit=1");
    return response.data;
};

export const CustomerProfile = ({ onNavigate }) => {
    const { data: userData, logout } = useAuth();
    const user = userData?.data?.result;

    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [showPreferencesModal, setShowPreferencesModal] = useState(false);
    const [showVacationModal, setShowVacationModal] = useState(false);
    const [showChangePinModal, setShowChangePinModal] = useState(false);

    const { data: transactionsData } = useQuery({
        queryKey: ["myTransactions"],
        queryFn: getTransactions,
    });

    const { data: notificationsData } = useQuery({
        queryKey: ["unreadNotifications"],
        queryFn: getUnreadNotifications,
        refetchInterval: 60000, // Refetch every 60 seconds
    });

    const transactions = transactionsData?.result?.slice(0, 5) || [];
    const unreadCount = notificationsData?.unreadCount || 0;

    const handleLogout = () => {
        if (confirm("Are you sure you want to logout?")) {
            logout();
            toast.success("Logged out successfully");
        }
    };

    const quickStats = [
        {
            icon: Wallet,
            label: "Wallet",
            value: `₹${user?.walletBalance || 0}`,
            color: "bg-green-100",
            iconColor: "text-green-600"
        },
        {
            icon: Package,
            label: "Bottles",
            value: user?.remainingBottles || 0,
            color: "bg-orange-100",
            iconColor: "text-orange-600"
        },
        {
            icon: Gift,
            label: "Referrals",
            value: user?.totalReferrals || 0,
            color: "bg-purple-100",
            iconColor: "text-purple-600"
        },
    ];

    const menuSections = [
        {
            title: "Account",
            items: [
                { icon: User, label: "Edit Profile", action: () => setShowEditModal(true) },
                { icon: MapPin, label: "Manage Address", action: () => setShowAddressModal(true) },
                { icon: Lock, label: "Change Login PIN", action: () => setShowChangePinModal(true) },
                { icon: Settings, label: "Delivery Preferences", value: user?.deliveryPreference || "Ring Bell", action: () => setShowPreferencesModal(true) },
            ]
        },
        {
            title: "Subscriptions",
            items: [
                {
                    icon: Palmtree,
                    label: "Vacation Mode",
                    value: user?.vacation?.isActive ? "Active" : "Off",
                    valueColor: user?.vacation?.isActive ? "text-amber-600" : "text-gray-500",
                    action: () => setShowVacationModal(true)
                },
                {
                    icon: Bell,
                    label: "Notifications",
                    badge: unreadCount > 0 ? unreadCount.toString() : undefined,
                    action: () => onNavigate?.('notifications')
                },
            ]
        },
        {
            title: "Support",
            items: [
                { icon: HelpCircle, label: "Help & Support", action: () => onNavigate('support') },
                { icon: FileText, label: "Terms & Conditions" },
                { icon: Shield, label: "Privacy Policy" },
                {
                    icon: LogOut,
                    label: "Logout",
                    action: handleLogout,
                    iconClassName: "text-red-600",
                    textClassName: "text-red-600",
                    bgClassName: "bg-red-50"
                },
            ]
        },
    ];

    return (
        <div className="space-y-4 pb-4">
            {/* Profile Header Card */}
            <div className="bg-gradient-to-br from-green-600 to-teal-500 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-4">
                    <div className="w-18 h-18 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                        <span className="text-3xl font-bold">{user?.name?.charAt(0)?.toUpperCase() || "U"}</span>
                    </div>
                    <div className="flex-1">
                        <h2 className="font-bold text-xl">{user?.name || "User"}</h2>
                        <div className="flex items-center gap-2 text-green-100 text-sm mt-1">
                            <Phone size={14} />
                            <span>{user?.mobile}</span>
                        </div>
                        {user?.email && (
                            <div className="flex items-center gap-2 text-green-100 text-sm mt-0.5">
                                <Mail size={14} />
                                <span>{user.email}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Address Preview */}
                <div className="mt-4 bg-white/15 backdrop-blur rounded-xl p-3">
                    <div className="flex items-start gap-2">
                        <Home size={16} className="text-green-100 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">
                                {user?.address?.fullAddress ||
                                    [user?.address?.houseNo, user?.address?.floor && `Floor ${user.address.floor}`, user?.address?.area]
                                        .filter(Boolean).join(", ") ||
                                    "No address set"}
                            </p>
                            {user?.address?.landmark && (
                                <p className="text-xs text-green-200">Near {user.address.landmark}</p>
                            )}
                        </div>
                        <button
                            onClick={() => setShowAddressModal(true)}
                            className="text-xs bg-white/20 px-2 py-1 rounded"
                        >
                            Edit
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
                {quickStats.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div key={idx} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
                            <div className={`w-10 h-10 ${stat.color} rounded-full flex items-center justify-center mx-auto mb-2`}>
                                <Icon size={20} className={stat.iconColor} />
                            </div>
                            <p className="text-lg font-bold text-gray-800">{stat.value}</p>
                            <p className="text-xs text-gray-500">{stat.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Menu Sections */}
            {
                menuSections.map((section, sIdx) => (
                    <div key={sIdx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{section.title}</h3>
                        </div>
                        {section.items.map((item, idx) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={idx}
                                    onClick={item.action}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition ${idx !== section.items.length - 1 ? "border-b border-gray-100" : ""
                                        }`}
                                >
                                    <div className={`w-9 h-9 ${item.bgClassName || "bg-gray-100"} rounded-full flex items-center justify-center`}>
                                        <Icon size={18} className={item.iconClassName || "text-gray-600"} />
                                    </div>
                                    <span className={`flex-1 text-left ${item.textClassName || "text-gray-800"}`}>{item.label}</span>
                                    {item.value && (
                                        <span className={`text-sm ${item.valueColor || "text-gray-500"}`}>{item.value}</span>
                                    )}
                                    {item.badge && (
                                        <span className="badge badge-sm badge-primary">{item.badge}</span>
                                    )}
                                    <ChevronRight size={18} className="text-gray-400" />
                                </button>
                            );
                        })}
                    </div>
                ))
            }

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-800">Recent Transactions</h3>
                    <button className="text-green-600 text-sm font-medium">View All</button>
                </div>

                {transactions.length === 0 ? (
                    <div className="text-center py-6 text-gray-400">
                        <CreditCard size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No transactions yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.map((txn, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${txn.type === "credit" ? "bg-green-100" : "bg-red-100"
                                    }`}>
                                    <CreditCard size={18} className={txn.type === "credit" ? "text-green-600" : "text-red-600"} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800 text-sm">{txn.description || txn.purpose}</p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(txn.createdAt || txn.date).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className={`font-bold ${txn.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                                    {txn.type === "credit" ? "+" : "-"}₹{txn.amount}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            {
                showEditModal && (
                    <EditProfileModal
                        user={user}
                        onClose={() => setShowEditModal(false)}
                    />
                )
            }
            {
                showAddressModal && (
                    <AddressManagementModal
                        user={user}
                        onClose={() => setShowAddressModal(false)}
                    />
                )
            }
            {
                showPreferencesModal && (
                    <DeliveryPreferencesModal
                        preferences={user?.deliveryPreferences}
                        currentPreference={user?.deliveryPreference}
                        onClose={() => setShowPreferencesModal(false)}
                    />
                )
            }
            {
                showVacationModal && (
                    <VacationModal
                        isOpen={showVacationModal}
                        onClose={() => setShowVacationModal(false)}
                    />
                )
            }
            {
                showChangePinModal && (
                    <ChangePinModal
                        onClose={() => setShowChangePinModal(false)}
                    />
                )
            }
        </div >
    );
};

// Change Pin Modal
const ChangePinModal = ({ onClose }) => {
    const [form, setForm] = useState({
        oldPin: "",
        newPin: "",
        confirmPin: ""
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (form.newPin.length !== 4) return toast.error("PIN must be 4 digits");
        if (form.newPin !== form.confirmPin) return toast.error("New PINs do not match");
        
        setLoading(true);
        try {
            const res = await axiosInstance.post("/api/auth/change-pin", form);
            if (res.data.success) {
                toast.success("PIN changed successfully!");
                onClose();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to change PIN");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">Change Login PIN</h3>
                    <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="form-control">
                        <label className="label"><span className="label-text">Old 4-digit PIN</span></label>
                        <input
                            type="password"
                            maxLength={4}
                            className="input input-bordered text-center tracking-widest text-xl"
                            value={form.oldPin}
                            onChange={(e) => setForm({ ...form, oldPin: e.target.value.replace(/\D/g, "") })}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label"><span className="label-text">New 4-digit PIN</span></label>
                        <input
                            type="password"
                            maxLength={4}
                            className="input input-bordered text-center tracking-widest text-xl"
                            value={form.newPin}
                            onChange={(e) => setForm({ ...form, newPin: e.target.value.replace(/\D/g, "") })}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label"><span className="label-text">Confirm New PIN</span></label>
                        <input
                            type="password"
                            maxLength={4}
                            className="input input-bordered text-center tracking-widest text-xl"
                            value={form.confirmPin}
                            onChange={(e) => setForm({ ...form, confirmPin: e.target.value.replace(/\D/g, "") })}
                        />
                    </div>
                </div>

                <div className="modal-action">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary text-white"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? <span className="loading loading-spinner loading-sm"></span> : "Update PIN"}
                    </button>
                </div>
            </div>
            <div className="modal-backdrop" onClick={onClose}></div>
        </div>
    );
};

// Edit Profile Modal
const EditProfileModal = ({ user, onClose }) => {
    const [form, setForm] = useState({
        name: user?.name || "",
        email: user?.email || "",
        alternateMobile: user?.alternateMobile || "",
        dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split("T")[0] : "",
    });

    const mutation = useMutation({
        mutationFn: updateProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user"] });
            toast.success("Profile updated successfully!");
            onClose();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to update profile");
        },
    });

    const handleSubmit = () => {
        if (!form.name.trim()) {
            toast.error("Name is required");
            return;
        }
        mutation.mutate(form);
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-md">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">Edit Profile</h3>
                    <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="label"><span className="label-text">Full Name *</span></label>
                        <input
                            type="text"
                            className="input input-bordered w-full"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Enter your name"
                        />
                    </div>

                    <div>
                        <label className="label"><span className="label-text">Email</span></label>
                        <input
                            type="email"
                            className="input input-bordered w-full"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="Enter your email"
                        />
                    </div>

                    <div>
                        <label className="label"><span className="label-text">Alternate Mobile</span></label>
                        <input
                            type="tel"
                            className="input input-bordered w-full"
                            value={form.alternateMobile}
                            onChange={(e) => setForm({ ...form, alternateMobile: e.target.value })}
                            placeholder="Enter alternate number"
                        />
                    </div>

                    <div>
                        <label className="label"><span className="label-text">Date of Birth</span></label>
                        <input
                            type="date"
                            className="input input-bordered w-full"
                            value={form.dateOfBirth}
                            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                        />
                    </div>
                </div>

                <div className="modal-action">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary text-white"
                        onClick={handleSubmit}
                        disabled={mutation.isPending}
                    >
                        {mutation.isPending ? <span className="loading loading-spinner loading-sm"></span> : "Save Changes"}
                    </button>
                </div>
            </div>
            <div className="modal-backdrop" onClick={onClose}></div>
        </div>
    );
};



// Delivery Preferences Modal
const DeliveryPreferencesModal = ({ preferences, currentPreference, onClose }) => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const options = ["Ring Bell", "Doorstep", "In Hand", "Bag/Basket"];

    const [defaultPreference, setDefaultPreference] = useState(currentPreference || "Ring Bell");
    const [dayPreferences, setDayPreferences] = useState(
        preferences || days.reduce((acc, day) => ({ ...acc, [day]: currentPreference || "Ring Bell" }), {})
    );
    const [useDefault, setUseDefault] = useState(true);

    const mutation = useMutation({
        mutationFn: (data) => updateProfile(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["user"] });
            queryClient.invalidateQueries({ queryKey: ["calendar"] });
            toast.success(data.message);
            onClose();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to update preferences");
        },
    });

    const handleSubmit = () => {
        const data = useDefault
            ? { deliveryPreference: defaultPreference }
            : { deliveryPreference: defaultPreference, deliveryPreferences: dayPreferences };
        mutation.mutate(data);
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-md max-h-[80vh]">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">Delivery Preferences</h3>
                    <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Default Preference */}
                    <div>
                        <label className="label"><span className="label-text font-medium">Default Preference</span></label>
                        <div className="grid grid-cols-2 gap-2">
                            {options.map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setDefaultPreference(opt)}
                                    className={`btn btn-sm ${defaultPreference === opt ? "btn-primary text-white" : "btn-outline"}`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Toggle for day-wise */}
                    <div className="form-control">
                        <label className="label cursor-pointer justify-start gap-3">
                            <input
                                type="checkbox"
                                className="toggle toggle-primary toggle-sm"
                                checked={!useDefault}
                                onChange={(e) => setUseDefault(!e.target.checked)}
                            />
                            <span className="label-text">Set different preferences for each day</span>
                        </label>
                    </div>

                    {/* Day-wise Preferences */}
                    {!useDefault && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {days.map((day) => (
                                <div key={day} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                    <span className="text-sm font-medium">{day}</span>
                                    <select
                                        className="select select-bordered select-sm"
                                        value={dayPreferences[day]}
                                        onChange={(e) => setDayPreferences({ ...dayPreferences, [day]: e.target.value })}
                                    >
                                        {options.map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="modal-action">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary text-white"
                        onClick={handleSubmit}
                        disabled={mutation.isPending}
                    >
                        {mutation.isPending ? <span className="loading loading-spinner loading-sm"></span> : "Save Preferences"}
                    </button>
                </div>
            </div>
            <div className="modal-backdrop" onClick={onClose}></div>
        </div>
    );
};
