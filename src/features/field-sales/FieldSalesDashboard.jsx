import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
    Home, Users, Plus, User, MapPin, Phone, Mail,
    Search, ChevronRight, CheckCircle, Clock, ArrowLeft,
    QrCode, CreditCard, Package, Calendar, Briefcase,
    LogOut, RefreshCw, X, Navigation, AlertCircle, Loader2
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import toast from "react-hot-toast";
import { queryClient } from "../../shared/utils/queryClient";
import { useCurrentAdmin } from "../../shared/hooks/useCurrentAdmin";

import { getAllCustomers, createCustomer, updateCustomer } from "../../shared/api/customers";
import { getAllProducts } from "../../shared/api/products";
import { createSubscription } from "../../shared/api/subscriptions";
import { createOrder } from "../../shared/api/orders";
import { createQrCode } from "../../shared/api/payments";
import { getPublicSettings } from "../../shared/api/settings";
import { axiosInstance } from "../../shared/api/axios";

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Nagercoil default coordinates
const DEFAULT_CENTER = [8.1833, 77.4119];

// Map click handler component
const LocationPicker = ({ onLocationSelect }) => {
    useMapEvents({
        click(e) {
            onLocationSelect([e.latlng.lng, e.latlng.lat]);
        },
    });
    return null;
};

// Fly to location when it changes
const MapFlyTo = ({ coords }) => {
    const map = useMap();
    useEffect(() => {
        if (coords) {
            map.flyTo([coords[1], coords[0]], 16, { duration: 1.5 });
        }
    }, [coords, map]);
    return null;
};

export const FieldSalesDashboard = () => {
    const { data: currentAdmin } = useCurrentAdmin();
    const user = currentAdmin?.user;
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState("home");
    const [subView, setSubView] = useState(null); // "add_lead", "convert", "payment"
    const [selectedLead, setSelectedLead] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Add Lead form
    const [leadForm, setLeadForm] = useState({
        name: "", mobile: "", email: "", address: "",
    });
    const [leadLocation, setLeadLocation] = useState(null);
    const [detectingLocation, setDetectingLocation] = useState(false);

    // Convert form
    const [convertType, setConvertType] = useState("trial"); // "trial" or "subscription"
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [frequency, setFrequency] = useState("daily");
    const [startDate, setStartDate] = useState(
        new Date(Date.now() + 86400000).toISOString().split("T")[0]
    );
    const [endDate, setEndDate] = useState("");

    // Payment
    const [paymentMethod, setPaymentMethod] = useState("razorpay"); // "razorpay" | "company_qr"
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [qrData, setQrData] = useState(null);

    // --- Queries ---
    const { data: customersData, refetch: refetchCustomers } = useQuery({
        queryKey: ["fs-customers"],
        queryFn: () => getAllCustomers("", {}),
    });

    const { data: productsData } = useQuery({
        queryKey: ["fs-products"],
        queryFn: getAllProducts,
    });

    const { data: settingsData } = useQuery({
        queryKey: ["fs-settings"],
        queryFn: getPublicSettings,
    });

    const leads = customersData?.result?.filter(
        (c) => c.role === "LEAD" || c.role === "CUSTOMER"
    ) || [];

    const filteredLeads = leads.filter((l) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            l.name?.toLowerCase().includes(term) ||
            l.mobile?.includes(term) ||
            l.email?.toLowerCase().includes(term)
        );
    });

    const products = productsData?.result || [];
    const companyQrImage = settingsData?.result?.paymentGateway?.companyQrImage;

    // --- Mutations ---
    const createLeadMutation = useMutation({
        mutationFn: createCustomer,
        onSuccess: (data) => {
            toast.success("Lead created successfully!");
            refetchCustomers();
            setLeadForm({ name: "", mobile: "", email: "", address: "" });
            setLeadLocation(null);
            setSubView(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to create lead");
        },
    });

    const createSubMutation = useMutation({
        mutationFn: createSubscription,
        onSuccess: () => {
            toast.success(
                `${convertType === "trial" ? "Trial" : "Subscription"} request submitted! Pending admin approval.`
            );
            refetchCustomers();
            setSubView(null);
            setSelectedLead(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to create");
        },
    });

    const createQrMutation = useMutation({
        mutationFn: createQrCode,
        onSuccess: (data) => {
            setQrData(data.result || data);
            toast.success("QR Code generated!");
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to generate QR");
        },
    });

    const searchCustomerMutation = useMutation({
        mutationFn: async (mobile) => {
            const res = await axiosInstance.get(`/api/customers/mobile/${mobile}`);
            return res.data.result;
        },
        onSuccess: (data) => {
            setSelectedLead(data);
            setSubView(null);
            toast.success("Customer found!");
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Customer not found");
        },
    });

    const updateLeadMutation = useMutation({
        mutationFn: updateCustomer,
        onSuccess: (data) => {
            toast.success("Lead updated successfully!");
            refetchCustomers();
            setSelectedLead(data.result || data);
            setSubView(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to update lead");
        },
    });

    const updateLocationMutation = useMutation({
        mutationFn: async (coords) => {
            await axiosInstance.post("/api/tracking/update-location", coords);
        }
    });

    // Tracking useEffect
    useEffect(() => {
        if (!user || user.role !== 'FIELD_MARKETING') return;

        const updateLocation = () => {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    updateLocationMutation.mutate({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                        speed: pos.coords.speed,
                        heading: pos.coords.heading,
                        battery: null // Optional
                    });
                },
                (err) => console.error("Tracking error:", err),
                { enableHighAccuracy: true }
            );
        };

        // Initial update
        updateLocation();

        // Update every 30 seconds
        const interval = setInterval(updateLocation, 30000);

        return () => clearInterval(interval);
    }, [user]);

    // --- Handlers ---
    const handleDetectLocation = () => {
        setDetectingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLeadLocation([pos.coords.longitude, pos.coords.latitude]);
                setDetectingLocation(false);
                toast.success("Location detected!");
            },
            (err) => {
                toast.error("Location access denied. Please tap on map instead.");
                setDetectingLocation(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const handleCreateLead = (e) => {
        e.preventDefault();
        if (!leadForm.name || !leadForm.mobile) {
            toast.error("Name and Mobile are required");
            return;
        }
        if (leadForm.mobile.length !== 10) {
            toast.error("Enter a valid 10-digit mobile number");
            return;
        }

        const payload = {
            name: leadForm.name,
            mobile: leadForm.mobile,
            email: leadForm.email || undefined,
            role: (selectedLead && subView === "edit_lead") ? selectedLead.role : "LEAD",
            address: leadForm.address
                ? {
                    fullAddress: leadForm.address,
                    location: {
                        type: "Point",
                        coordinates: leadLocation || [77.4119, 8.1833],
                    },
                }
                : undefined,
            location: leadLocation
                ? { type: "Point", coordinates: leadLocation }
                : undefined,
        };

        if (selectedLead && subView === "edit_lead") {
            updateLeadMutation.mutate({ id: selectedLead._id, data: payload });
        } else {
            createLeadMutation.mutate(payload);
        }
    };

    const handleConvert = () => {
        if (!selectedProduct) {
            toast.error("Please select a product");
            return;
        }
        if (!startDate) {
            toast.error("Please select a start date");
            return;
        }

        const payload = {
            userId: selectedLead._id,
            product: selectedProduct._id,
            quantity,
            frequency,
            startDate,
            endDate: endDate || undefined,
            isTrial: convertType === "trial",
            createdBy: user?._id,
        };

        createSubMutation.mutate(payload);
    };

    const handleGenerateQr = () => {
        if (!paymentAmount || paymentAmount <= 0) {
            toast.error("Enter a valid amount");
            return;
        }
        createQrMutation.mutate({
            amount: paymentAmount,
            customerId: selectedLead?._id,
            description: `Field Sales Collection - ${selectedLead?.name}`,
        });
    };

    const handleLogout = async () => {
        try {
            document.cookie = "adminToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            await queryClient.invalidateQueries();
            navigate("/fieldsales/login");
        } catch {
            navigate("/fieldsales/login");
        }
    };

    // --- Renders ---
    const renderHome = () => (
        <div className="p-4 space-y-6 pb-24">
            {/* Greeting */}
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl p-6 text-white shadow-lg">
                <p className="text-sm opacity-80">Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"}</p>
                <h1 className="text-2xl font-bold mt-1">{user?.name || "Field Officer"}</h1>
                <p className="text-sm opacity-70 mt-2 flex items-center gap-1">
                    <Briefcase className="w-4 h-4" /> Field Sales Officer
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                    <p className="text-3xl font-bold text-teal-600">
                        {leads.filter((l) => l.role === "LEAD").length}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Total Leads</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                    <p className="text-3xl font-bold text-emerald-600">
                        {leads.filter((l) => l.role === "CUSTOMER").length}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Converted</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => { setActiveTab("leads"); setSubView("add_lead"); }}
                        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:border-teal-300 hover:shadow-md transition-all active:scale-95"
                    >
                        <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
                            <Plus className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700">Add Lead</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("leads")}
                        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:border-teal-300 hover:shadow-md transition-all active:scale-95"
                    >
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                            <Users className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700">View Leads</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab("leads"); setSubView(null); }}
                        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:border-teal-300 hover:shadow-md transition-all active:scale-95"
                    >
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                            <Package className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700">Convert Lead</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab("leads"); setSubView(null); }}
                        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:border-teal-300 hover:shadow-md transition-all active:scale-95"
                    >
                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                            <QrCode className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700">Collect Payment</span>
                    </button>
                </div>
            </div>

            {/* Recent Leads */}
            <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Recent Leads</h2>
                <div className="space-y-2">
                    {leads.slice(0, 5).map((lead) => (
                        <div
                            key={lead._id}
                            onClick={() => { setSelectedLead(lead); setActiveTab("leads"); setSubView(null); }}
                            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 font-bold">
                                    {lead.name?.charAt(0) || "?"}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800 text-sm">{lead.name}</p>
                                    <p className="text-xs text-gray-400">{lead.mobile}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`badge badge-xs px-2 py-1 ${lead.role === "LEAD" ? "badge-warning" : "badge-success text-white"}`}>
                                    {lead.role}
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-300" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderAddLead = () => (
        <div className="p-4 pb-24 space-y-4">
            <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setSubView(null)} className="btn btn-ghost btn-sm btn-circle">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-gray-800">
                    {subView === "edit_lead" ? "Edit Lead" : "Add New Lead"}
                </h2>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4">
                {/* Name */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                        <User className="w-3 h-3 inline mr-1" /> Name *
                    </label>
                    <input
                        type="text"
                        className="input input-bordered w-full"
                        placeholder="Customer name"
                        value={leadForm.name}
                        onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                        required
                        disabled={subView === 'edit_lead' && selectedLead?.createdBy && selectedLead.createdBy !== user?._id}
                    />
                </div>

                {/* Mobile */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                        <Phone className="w-3 h-3 inline mr-1" /> Mobile Number *
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="tel"
                            className="input input-bordered flex-1"
                            placeholder="10-digit mobile number"
                            value={leadForm.mobile}
                            onChange={(e) => setLeadForm({ ...leadForm, mobile: e.target.value })}
                            maxLength={10}
                            required
                            disabled={subView === 'edit_lead' && selectedLead?.createdBy && selectedLead.createdBy !== user?._id}
                        />
                        <button
                            type="button"
                            onClick={async () => {
                                if (leadForm.mobile.length !== 10) {
                                    toast.error("Enter a valid 10-digit mobile number");
                                    return;
                                }
                                try {
                                    const res = await axiosInstance.get(`/api/users/check-existence?mobile=${leadForm.mobile}`);
                                    if (res.data.exists) {
                                        toast.success(`Found: ${res.data.result.name} (${res.data.result.role})`, { icon: '🔍' });
                                    } else {
                                        toast.error("Not found in system", { icon: '✅' });
                                    }
                                } catch (err) {
                                    toast.error("Failed to check existence");
                                }
                            }}
                            className="btn btn-teal btn-outline btn-sm h-auto"
                        >
                            Check
                        </button>
                    </div>
                </div>

                {/* Email */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                        <Mail className="w-3 h-3 inline mr-1" /> Email (Optional)
                    </label>
                    <input
                        type="email"
                        className="input input-bordered w-full"
                        placeholder="email@example.com"
                        value={leadForm.email}
                        onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                        disabled={subView === 'edit_lead' && selectedLead?.createdBy && selectedLead.createdBy !== user?._id}
                    />
                </div>

                {/* Address */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                        <MapPin className="w-3 h-3 inline mr-1" /> Address
                    </label>
                    <textarea
                        className="textarea textarea-bordered w-full"
                        placeholder="Full address"
                        rows={2}
                        value={leadForm.address}
                        onChange={(e) => setLeadForm({ ...leadForm, address: e.target.value })}
                        disabled={subView === 'edit_lead' && selectedLead?.createdBy && selectedLead.createdBy !== user?._id}
                    />
                </div>

                {/* Location */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <Navigation className="w-3 h-3 inline mr-1" /> Geo Location
                        </label>
                        <button
                            type="button"
                            onClick={handleDetectLocation}
                            className="btn btn-xs btn-outline btn-teal gap-1"
                            disabled={detectingLocation || (subView === 'edit_lead' && selectedLead?.createdBy && selectedLead.createdBy !== user?._id)}
                        >
                            {detectingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                            {detectingLocation ? "Detecting..." : "Auto Detect"}
                        </button>
                    </div>
                    {leadLocation && (
                        <p className="text-xs text-teal-600 mb-2 font-mono">
                            📍 {leadLocation[1]?.toFixed(6)}, {leadLocation[0]?.toFixed(6)}
                        </p>
                    )}
                    <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: "200px" }}>
                        <MapContainer
                            center={leadLocation ? [leadLocation[1], leadLocation[0]] : DEFAULT_CENTER}
                            zoom={13}
                            style={{ height: "100%", width: "100%" }}
                            zoomControl={false}
                        >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <LocationPicker
                                onLocationSelect={(coords) => {
                                    setLeadLocation(coords);
                                    toast.success("Location pinned!");
                                }}
                            />
                            <MapFlyTo coords={leadLocation} />
                            {leadLocation && (
                                <Marker position={[leadLocation[1], leadLocation[0]]} />
                            )}
                        </MapContainer>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Tap on the map to pin location or use Auto Detect</p>
                </div>

                    <button
                        type="submit"
                        className="btn w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-0 text-base shadow-lg"
                        disabled={createLeadMutation.isPending || updateLeadMutation.isPending || (subView === 'edit_lead' && selectedLead?.createdBy && selectedLead.createdBy !== user?._id)}
                    >
                    {createLeadMutation.isPending || updateLeadMutation.isPending ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> {subView === "edit_lead" ? "Updating..." : "Creating..."}</>
                    ) : (
                        <>{subView === "edit_lead" ? <RefreshCw className="w-5 h-5" /> : <Plus className="w-5 h-5" />} {subView === "edit_lead" ? "Update Lead" : "Create Lead"}</>
                    )}
                </button>
            </form>
        </div>
    );

    const renderLeadDetail = () => {
        if (!selectedLead) return null;
        return (
            <div className="p-4 pb-24 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => { setSelectedLead(null); setSubView(null); }} className="btn btn-ghost btn-sm btn-circle">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-lg font-bold text-gray-800">Lead Details</h2>
                </div>

                {/* Profile Card */}
                <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl">
                            {selectedLead.name?.charAt(0) || "?"}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">{selectedLead.name}</h3>
                            <p className="text-sm opacity-80 flex items-center gap-1 mt-1">
                                <Phone className="w-3 h-3" /> {selectedLead.mobile}
                            </p>
                            {selectedLead.email && (
                                <p className="text-sm opacity-70 flex items-center gap-1">
                                    <Mail className="w-3 h-3" /> {selectedLead.email}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <span className={`badge ${selectedLead.role === "LEAD" ? "badge-warning" : "badge-success"} text-xs`}>
                            {selectedLead.role}
                        </span>
                        <span className="badge bg-white text-teal-600 border-none font-bold text-[10px] px-2 py-0.5 h-auto shadow-sm">
                            ID: {selectedLead.customerId || "N/A"}
                        </span>
                    </div>
                </div>

                {/* Address */}
                {selectedLead.address?.fullAddress && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Address</p>
                        <p className="text-sm text-gray-700">{selectedLead.address.fullAddress}</p>
                    </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Actions</h3>

                    {/* Edit option - Greyed out if not owner, but still accessible */}
                    <button
                        onClick={() => {
                            setLeadForm({
                                name: selectedLead.name || "",
                                mobile: selectedLead.mobile || "",
                                email: selectedLead.email || "",
                                address: selectedLead.address?.fullAddress || "",
                            });
                            setLeadLocation(selectedLead.address?.location?.coordinates || null);
                            setSubView("edit_lead");
                            if (selectedLead.createdBy && selectedLead.createdBy !== user?._id) {
                                toast("Viewing read-only details", { icon: '👁️' });
                            }
                        }}
                        className={`w-full rounded-2xl p-4 shadow-sm border flex items-center gap-4 transition-all ${
                            (selectedLead.createdBy === user?._id || !selectedLead.createdBy)
                            ? "bg-white border-gray-100 hover:border-teal-300 hover:shadow-md active:scale-[0.98]"
                            : "bg-gray-100 border-gray-200 opacity-70 cursor-pointer"
                        }`}
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            (selectedLead.createdBy === user?._id || !selectedLead.createdBy)
                            ? "bg-teal-50 text-teal-600"
                            : "bg-gray-200 text-gray-500"
                        }`}>
                            <Plus className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <p className={`font-semibold ${
                                (selectedLead.createdBy === user?._id || !selectedLead.createdBy)
                                ? "text-gray-800"
                                : "text-gray-500"
                            }`}>
                                Edit Lead Info {(selectedLead.createdBy && selectedLead.createdBy !== user?._id) && "(Read-only)"}
                            </p>
                            <p className="text-xs text-gray-400">
                                {(selectedLead.createdBy === user?._id || !selectedLead.createdBy) 
                                    ? "Update name, mobile, address or location"
                                    : "You can only view details of this customer"
                                }
                            </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 ml-auto" />
                    </button>

                    <button
                        onClick={() => setSubView("convert")}
                        className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 hover:border-teal-300 hover:shadow-md transition-all active:scale-[0.98]"
                    >
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                            <Package className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <p className="font-semibold text-gray-800">Create Trial / Subscription</p>
                            <p className="text-xs text-gray-400">Convert this lead into a paying customer</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 ml-auto" />
                    </button>

                    <button
                        onClick={() => setSubView("payment")}
                        className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 hover:border-teal-300 hover:shadow-md transition-all active:scale-[0.98]"
                    >
                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                            <QrCode className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <p className="font-semibold text-gray-800">Collect Payment</p>
                            <p className="text-xs text-gray-400">Show QR code or generate Razorpay QR</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 ml-auto" />
                    </button>

                    <a
                        href={`tel:${selectedLead.mobile}`}
                        className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 hover:border-green-300 hover:shadow-md transition-all active:scale-[0.98]"
                    >
                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                            <Phone className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <p className="font-semibold text-gray-800">Call Customer</p>
                            <p className="text-xs text-gray-400">{selectedLead.mobile}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 ml-auto" />
                    </a>
                </div>
            </div>
        );
    };

    const renderConvert = () => (
        <div className="p-4 pb-24 space-y-4">
            <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setSubView(null)} className="btn btn-ghost btn-sm btn-circle">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-gray-800">
                    Create {convertType === "trial" ? "Trial" : "Subscription"}
                </h2>
            </div>

            {/* Customer Info */}
            <div className="bg-teal-50 rounded-2xl p-4 border border-teal-100">
                <p className="text-xs text-teal-600 font-semibold uppercase">Customer</p>
                <p className="font-bold text-gray-800">{selectedLead?.name} • {selectedLead?.mobile}</p>
            </div>

            {/* Type Toggle */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">Order Type</label>
                <div className="flex gap-2">
                    <button
                        onClick={() => setConvertType("trial")}
                        className={`flex-1 btn btn-sm ${convertType === "trial" ? "bg-teal-500 text-white border-teal-500" : "btn-outline"}`}
                    >
                        Trial
                    </button>
                    <button
                        onClick={() => setConvertType("subscription")}
                        className={`flex-1 btn btn-sm ${convertType === "subscription" ? "bg-teal-500 text-white border-teal-500" : "btn-outline"}`}
                    >
                        Subscription
                    </button>
                </div>
            </div>

            {/* Product Selection */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">
                    Select Product
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {products.map((product) => (
                        <div
                            key={product._id}
                            onClick={() => {
                                setSelectedProduct(product);
                                setPaymentAmount(product.price * quantity);
                            }}
                            className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.98] flex items-center justify-between ${selectedProduct?._id === product._id
                                ? "border-teal-400 bg-teal-50"
                                : "border-gray-100 hover:border-gray-200"
                                }`}
                        >
                            <div>
                                <p className="font-semibold text-sm text-gray-800">{product.name}</p>
                                <p className="text-xs text-gray-400">{product.category?.name || ""}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-teal-600">₹{product.price}</p>
                                {selectedProduct?._id === product._id && (
                                    <CheckCircle className="w-4 h-4 text-teal-500 ml-auto mt-1" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quantity & Frequency */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Quantity</label>
                    <input
                        type="number"
                        className="input input-bordered w-full"
                        min={1}
                        value={quantity}
                        onChange={(e) => {
                            setQuantity(Number(e.target.value));
                            if (selectedProduct) setPaymentAmount(selectedProduct.price * Number(e.target.value));
                        }}
                    />
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Frequency</label>
                    <select
                        className="select select-bordered w-full"
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                    >
                        <option value="daily">Daily</option>
                        <option value="alternate">Alternate</option>
                        <option value="weekly">Weekly</option>
                        <option value="weekdays">Weekdays</option>
                        <option value="weekends">Weekends</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
            </div>

            {/* Date */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                        <Calendar className="w-3 h-3 inline mr-1" /> Start Date
                    </label>
                    <input
                        type="date"
                        className="input input-bordered w-full"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                        <Calendar className="w-3 h-3 inline mr-1" /> End Date
                    </label>
                    <input
                        type="date"
                        className="input input-bordered w-full"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
            </div>

            {/* Summary */}
            {selectedProduct && (
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border border-gray-200">
                    <p className="text-xs text-gray-400 mb-2 font-semibold uppercase">Summary</p>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{selectedProduct.name} × {quantity}</span>
                        <span className="font-bold text-gray-800">₹{selectedProduct.price * quantity}/day</span>
                    </div>
                    <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Pending admin approval after creation
                    </div>
                </div>
            )}

            <button
                onClick={handleConvert}
                className="btn w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0 text-base shadow-lg"
                disabled={createSubMutation.isPending}
            >
                {createSubMutation.isPending ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</>
                ) : (
                    <><Package className="w-5 h-5" /> Submit for Approval</>
                )}
            </button>
        </div>
    );

    const renderPayment = () => (
        <div className="p-4 pb-24 space-y-4">
            <div className="flex items-center gap-3 mb-2">
                <button onClick={() => { setSubView(null); setQrData(null); }} className="btn btn-ghost btn-sm btn-circle">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-gray-800">Collect Payment</h2>
            </div>

            {/* Customer Info */}
            <div className="bg-teal-50 rounded-2xl p-4 border border-teal-100">
                <p className="text-xs text-teal-600 font-semibold uppercase">Customer</p>
                <p className="font-bold text-gray-800">{selectedLead?.name} • {selectedLead?.mobile}</p>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">Payment Method</label>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setPaymentMethod("razorpay"); setQrData(null); }}
                        className={`flex-1 btn btn-sm gap-1 ${paymentMethod === "razorpay" ? "bg-blue-500 text-white border-blue-500" : "btn-outline"}`}
                    >
                        <CreditCard className="w-4 h-4" /> Razorpay QR
                    </button>
                    <button
                        onClick={() => { setPaymentMethod("company_qr"); setQrData(null); }}
                        className={`flex-1 btn btn-sm gap-1 ${paymentMethod === "company_qr" ? "bg-amber-500 text-white border-amber-500" : "btn-outline"}`}
                    >
                        <QrCode className="w-4 h-4" /> Company QR
                    </button>
                </div>
            </div>

            {paymentMethod === "razorpay" && (
                <>
                    {/* Amount Input */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                            Amount (₹)
                        </label>
                        <input
                            type="number"
                            className="input input-bordered w-full text-2xl font-bold text-center"
                            placeholder="0"
                            value={paymentAmount || ""}
                            onChange={(e) => setPaymentAmount(Number(e.target.value))}
                            min={1}
                        />
                    </div>

                    <button
                        onClick={handleGenerateQr}
                        className="btn w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 text-base shadow-lg"
                        disabled={createQrMutation.isPending}
                    >
                        {createQrMutation.isPending ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</>
                        ) : (
                            <><QrCode className="w-5 h-5" /> Generate QR Code</>
                        )}
                    </button>

                    {/* QR / Payment Link Result */}
                    {qrData && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center space-y-4">
                            <p className="text-sm font-bold text-gray-700">Payment of ₹{paymentAmount}</p>
                            {qrData.short_url ? (
                                <>
                                    {/* Show QR from API service */}
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData.short_url)}`}
                                        alt="Payment QR"
                                        className="mx-auto w-64 h-64 rounded-xl border border-gray-200 p-2 bg-white"
                                    />
                                    <p className="text-xs text-gray-500">Customer can scan this QR or use the link below</p>
                                    <a
                                        href={qrData.short_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-sm bg-blue-500 text-white border-0 gap-1"
                                    >
                                        <CreditCard className="w-4 h-4" /> Open Payment Page
                                    </a>
                                </>
                            ) : (
                                <div className="bg-gray-100 rounded-xl p-8 text-gray-400">
                                    <QrCode className="w-16 h-16 mx-auto" />
                                    <p className="mt-2 text-sm">Payment link created — check Razorpay dashboard</p>
                                </div>
                            )}
                            <p className="text-xs text-gray-400">Ref: {qrData.reference_id || qrData.id || ""}</p>
                        </div>
                    )}
                </>
            )}

            {paymentMethod === "company_qr" && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center space-y-3">
                    <p className="text-sm font-bold text-gray-700">Company Payment QR</p>
                    {companyQrImage ? (
                        <img src={companyQrImage} alt="Company QR" className="mx-auto max-w-[280px] rounded-xl shadow-md" />
                    ) : (
                        <div className="bg-gray-50 rounded-xl p-8 text-gray-400">
                            <QrCode className="w-16 h-16 mx-auto" />
                            <p className="mt-2 text-sm">No company QR uploaded yet</p>
                            <p className="text-xs">Ask admin to upload in Settings → Payment Gateway</p>
                        </div>
                    )}
                    <p className="text-xs text-gray-400">Show this QR to the customer for payment</p>
                </div>
            )}
        </div>
    );

    const renderLeads = () => {
        // Sub-views
        if (subView === "add_lead" || subView === "edit_lead") return renderAddLead();
        if (subView === "convert" && selectedLead) return renderConvert();
        if (subView === "payment" && selectedLead) return renderPayment();
        if (selectedLead) return renderLeadDetail();

        return (
            <div className="p-4 pb-24 space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-gray-800">Leads & Customers</h2>
                    <div className="flex gap-2">
                        <button onClick={() => refetchCustomers()} className="btn btn-ghost btn-sm btn-circle">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setSubView("add_lead")}
                            className="btn btn-sm bg-teal-500 text-white border-0 gap-1"
                        >
                            <Plus className="w-4 h-4" /> Add
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            className="input input-bordered w-full pl-10"
                            placeholder="Search name, mobile, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        )}
                    </div>
                    {searchTerm.length === 10 && !isNaN(searchTerm) && (
                        <button 
                            onClick={() => searchCustomerMutation.mutate(searchTerm)}
                            className="btn btn-teal shadow-md"
                            disabled={searchCustomerMutation.isPending}
                        >
                            {searchCustomerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                        </button>
                    )}
                </div>

                {/* List */}
                <div className="space-y-2">
                    {filteredLeads.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="font-semibold">No leads found</p>
                            <p className="text-sm">Tap "Add" to create your first lead</p>
                        </div>
                    ) : (
                        filteredLeads.map((lead) => (
                            <div
                                key={lead._id}
                                onClick={() => setSelectedLead(lead)}
                                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 font-bold text-sm">
                                        {lead.name?.charAt(0) || "?"}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm">{lead.name}</p>
                                        <p className="text-xs text-gray-400">{lead.mobile}</p>
                                        {lead.address?.fullAddress && (
                                            <p className="text-xs text-gray-300 line-clamp-1 mt-0.5">{lead.address.fullAddress}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`badge badge-xs px-2 py-1 ${lead.role === "LEAD" ? "badge-warning" : "badge-success text-white"
                                            }`}
                                    >
                                        {lead.role}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-gray-300" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    const renderProfile = () => (
        <div className="p-4 pb-24 space-y-4">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Profile</h2>

            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl p-6 text-white shadow-lg text-center">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-3">
                    {user?.name?.charAt(0) || "F"}
                </div>
                <h3 className="text-xl font-bold">{user?.name || "Field Officer"}</h3>
                <p className="text-sm opacity-80">{user?.mobile || ""}</p>
                <span className="badge badge-ghost text-white/80 mt-2">{user?.role || "FIELD_MARKETING"}</span>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Email</span>
                    <span className="text-gray-800 font-medium">{user?.email || "Not set"}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Status</span>
                    <span className={`font-medium ${user?.isActive ? "text-green-600" : "text-red-500"}`}>
                        {user?.isActive ? "Active" : "Inactive"}
                    </span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Joined</span>
                    <span className="text-gray-800 font-medium">
                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                    </span>
                </div>
            </div>

            <button
                onClick={handleLogout}
                className="btn w-full btn-outline btn-error gap-2"
            >
                <LogOut className="w-5 h-5" /> Logout
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 max-w-lg mx-auto relative">
            {/* Content */}
            <div className="min-h-screen">
                {activeTab === "home" && renderHome()}
                {activeTab === "leads" && renderLeads()}
                {activeTab === "profile" && renderProfile()}
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-50">
                <div className="max-w-lg mx-auto flex">
                    {[
                        { key: "home", icon: Home, label: "Home" },
                        { key: "leads", icon: Users, label: "Leads" },
                        { key: "add", icon: Plus, label: "Add", special: true },
                        { key: "profile", icon: User, label: "Profile" },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => {
                                if (tab.key === "add") {
                                    setActiveTab("leads");
                                    setSubView("add_lead");
                                    setSelectedLead(null);
                                } else {
                                    setActiveTab(tab.key);
                                    setSubView(null);
                                    setSelectedLead(null);
                                }
                            }}
                            className={`flex-1 flex flex-col items-center py-3 transition-all ${tab.special
                                ? ""
                                : activeTab === tab.key
                                    ? "text-teal-600"
                                    : "text-gray-400"
                                }`}
                        >
                            {tab.special ? (
                                <div className="w-12 h-12 -mt-6 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-200">
                                    <tab.icon className="w-6 h-6" />
                                </div>
                            ) : (
                                <>
                                    <tab.icon className="w-5 h-5" />
                                    <span className="text-xs mt-1 font-medium">{tab.label}</span>
                                </>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
