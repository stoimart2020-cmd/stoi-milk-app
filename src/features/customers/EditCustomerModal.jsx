import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllRiders } from "../../shared/api/riders";
import { uploadImage } from "../../shared/api/upload";
import { getHubs, getServiceAreas } from "../../shared/api/logistics";
import { toast } from "react-hot-toast";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Polygon, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function LocationPicker({ setLocation }) {
    useMapEvents({
        click(e) {
            setLocation([e.latlng.lat, e.latlng.lng]);
        },
    });
    return null;
}

function RecenterMap({ lat, lng }) {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) {
            map.setView([lat, lng], map.getZoom());
        }
    }, [lat, lng, map]);
    return null;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DELIVERY_OPTIONS = ["Ring Bell", "Doorstep", "In Hand", "Bag/Basket"];

export const EditCustomerModal = ({ customer, isOpen, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState("general");
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        // General Information
        profilePicture: "",
        name: "",
        mobile: "",
        alternateMobile: "",
        email: "",
        gstNumber: "",
        type: "Consumer",
        referrerMobile: "",
        isPostPaid: false,
        notificationSubscription: "",
        notes: "",
        source: "",
        subSource: "",
        createdBy: "",
        paymentMode: "Online",
        dateOfBirth: "",
        tempCustomerStatus: "",
        isActive: true,
        dnd: false,
        referralCode: "",
        subscribedToNewsletters: false,

        // Address
        houseNo: "",
        floor: "",
        area: "",
        landmark: "",
        deliveryShift: "Morning",
        latitude: "",
        longitude: "",

        // Delivery Preferences (per day)
        deliveryPreferences: DAYS.reduce((acc, day) => {
            acc[day] = "Ring Bell";
            return acc;
        }, {}),
        deliveryInstruction: "",

        // Delivery Boy
        deliveryBoy: "",
        hub: "",
        serviceArea: "",
    });

    const { data: ridersData } = useQuery({
        queryKey: ["riders"],
        queryFn: getAllRiders,
        enabled: isOpen
    });

    const { data: hubsData } = useQuery({
        queryKey: ["hubs"],
        queryFn: getHubs,
        enabled: isOpen
    });

    const { data: serviceAreasData } = useQuery({
        queryKey: ["serviceAreas"],
        queryFn: getServiceAreas,
        enabled: isOpen
    });

    useEffect(() => {
        if (customer) {
            setFormData({
                profilePicture: customer.profilePicture || "",
                name: customer.name || "",
                mobile: customer.mobile || "",
                alternateMobile: customer.alternateMobile || "",
                email: customer.email || "",
                gstNumber: customer.gstNumber || "",
                type: customer.type || "Consumer",
                referrerMobile: customer.referrerMobile || "",
                isPostPaid: customer.isPostPaid || false,
                notificationSubscription: customer.notificationSubscription || "",
                notes: customer.notes || "",
                source: customer.source || "",
                subSource: customer.subSource || "",
                createdBy: customer.createdBy || "",
                paymentMode: customer.paymentMode || "Online",
                dateOfBirth: customer.dateOfBirth?.split("T")[0] || "",
                tempCustomerStatus: customer.tempCustomerStatus || "",
                isActive: customer.isActive ?? true,
                dnd: customer.dnd || false,
                referralCode: customer.referralCode || "",
                subscribedToNewsletters: customer.subscribedToNewsletters || false,
                houseNo: customer.address?.houseNo || "",
                floor: customer.address?.floor || "",
                area: customer.address?.area || "",
                landmark: customer.address?.landmark || "",
                deliveryShift: customer.deliveryShift || "Morning",
                latitude: customer.address?.location?.coordinates?.[1] || "",
                longitude: customer.address?.location?.coordinates?.[0] || "",
                deliveryPreferences: customer.deliveryPreferences || DAYS.reduce((acc, day) => {
                    acc[day] = "Ring Bell";
                    return acc;
                }, {}),
                deliveryInstruction: customer.deliveryInstruction || "",
                deliveryBoy: customer.deliveryBoy?._id || customer.deliveryBoy || "",
                hub: customer.hub?._id || customer.hub || "",
                serviceArea: customer.serviceArea?._id || customer.serviceArea || "",
            });
        }
    }, [customer]);

    // Re-center map when service area changes
    useEffect(() => {
        if (formData.serviceArea && serviceAreasData?.result) {
            const selectedSA = serviceAreasData.result.find(sa => sa._id === formData.serviceArea);
            if (selectedSA?.center?.lat && selectedSA?.center?.lng) {
                setFormData(prev => ({
                    ...prev,
                    latitude: prev.latitude || selectedSA.center.lat,
                    longitude: prev.longitude || selectedSA.center.lng
                }));
            }
        }
    }, [formData.serviceArea, serviceAreasData]);

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleDeliveryPrefChange = (day, value) => {
        setFormData((prev) => ({
            ...prev,
            deliveryPreferences: { ...prev.deliveryPreferences, [day]: value },
        }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const result = await uploadImage(file);
            // Result structure is { status: 'success', message: '...', url: '...' }
            if (result.url) {
                setFormData(prev => ({ ...prev, profilePicture: result.url }));
                toast.success("Image uploaded successfully");
            }
        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = () => {
        onUpdate(formData);
    };

    if (!isOpen) return null;

    const tabs = [
        { id: "general", label: "General Information" },
        { id: "address", label: "Address" },
        { id: "delivery", label: "Delivery Preference" },
        { id: "deliveryBoy", label: "Update Delivery Boy" },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 overflow-y-auto py-8">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4">
                {/* Header */}
                <div className="bg-teal-600 text-white p-4 rounded-t-lg flex justify-between items-center">
                    <h3 className="text-lg font-bold">Edit Customer</h3>
                    <button onClick={onClose} className="text-white hover:text-gray-200 text-xl">×</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-3 font-medium text-sm ${activeTab === tab.id
                                ? "text-teal-600 border-b-2 border-teal-600"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {/* General Information Tab */}
                    {activeTab === "general" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 flex flex-col items-center gap-2 mb-4">
                                <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
                                <div className="avatar">
                                    <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                                        {formData.profilePicture ? (
                                            <img src={formData.profilePicture} alt="Profile" />
                                        ) : (
                                            <div className="bg-neutral text-neutral-content w-full h-full flex items-center justify-center text-3xl">
                                                {formData.name?.charAt(0) || "C"}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    className="file-input file-input-bordered file-input-sm w-full max-w-xs"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                />
                                {uploading && <span className="loading loading-spinner loading-sm"></span>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    value={formData.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                                <div className="flex">
                                    <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 rounded-l-md text-gray-500">+91</span>
                                    <input
                                        type="text"
                                        className="input input-bordered rounded-l-none flex-1"
                                        value={formData.mobile}
                                        onChange={(e) => handleChange("mobile", e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Contact Number</label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    placeholder="Alternate Mobile Number"
                                    value={formData.alternateMobile}
                                    onChange={(e) => handleChange("alternateMobile", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    className="input input-bordered w-full"
                                    value={formData.email}
                                    onChange={(e) => handleChange("email", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    placeholder="GST Number"
                                    value={formData.gstNumber}
                                    onChange={(e) => handleChange("gstNumber", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    className="select select-bordered w-full"
                                    value={formData.type}
                                    onChange={(e) => handleChange("type", e.target.value)}
                                >
                                    <option>Consumer</option>
                                    <option>Business</option>
                                    <option>Reseller</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Referrer Customer (Mobile Number)</label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    placeholder="Referrer Customer (Mobile Number)"
                                    value={formData.referrerMobile}
                                    onChange={(e) => handleChange("referrerMobile", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Is Post Paid?</label>
                                <div className="flex gap-2 mt-2">
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${!formData.isPostPaid ? "btn-error text-white" : "btn-outline"}`}
                                        onClick={() => handleChange("isPostPaid", false)}
                                    >No</button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${formData.isPostPaid ? "btn-success text-white" : "btn-outline"}`}
                                        onClick={() => handleChange("isPostPaid", true)}
                                    >Yes</button>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notification Subscription</label>
                                <textarea
                                    className="textarea textarea-bordered w-full"
                                    rows="2"
                                    placeholder="Notification Subscription"
                                    value={formData.notificationSubscription}
                                    onChange={(e) => handleChange("notificationSubscription", e.target.value)}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                                <textarea
                                    className="textarea textarea-bordered w-full"
                                    rows="2"
                                    placeholder="Notes"
                                    value={formData.notes}
                                    onChange={(e) => handleChange("notes", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                                <select
                                    className="select select-bordered w-full"
                                    value={formData.source}
                                    onChange={(e) => handleChange("source", e.target.value)}
                                >
                                    <option value="">Select Source</option>
                                    <option>Website</option>
                                    <option>App</option>
                                    <option>Referral</option>
                                    <option>Social Media</option>
                                    <option>Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sub Source</label>
                                <select
                                    className="select select-bordered w-full"
                                    value={formData.subSource}
                                    onChange={(e) => handleChange("subSource", e.target.value)}
                                >
                                    <option value="">Select Sub Source</option>
                                    <option>Google Ads</option>
                                    <option>Facebook</option>
                                    <option>Instagram</option>
                                    <option>Friend</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Created by</label>
                                <select
                                    className="select select-bordered w-full"
                                    value={formData.createdBy}
                                    onChange={(e) => handleChange("createdBy", e.target.value)}
                                >
                                    <option value="">Select Created by</option>
                                    <option>Admin</option>
                                    <option>Self</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                                <select
                                    className="select select-bordered w-full"
                                    value={formData.paymentMode}
                                    onChange={(e) => handleChange("paymentMode", e.target.value)}
                                >
                                    <option>Online</option>
                                    <option>Cash</option>
                                    <option>UPI</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                                <input
                                    type="date"
                                    className="input input-bordered w-full"
                                    value={formData.dateOfBirth}
                                    onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Temp Customer Status</label>
                                <select
                                    className="select select-bordered w-full"
                                    value={formData.tempCustomerStatus}
                                    onChange={(e) => handleChange("tempCustomerStatus", e.target.value)}
                                >
                                    <option value="">Select Temp Customer Status</option>
                                    <option>Trial</option>
                                    <option>Vacation</option>
                                    <option>Paused</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <div className="flex gap-2 mt-2">
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${!formData.isActive ? "btn-neutral text-white" : "btn-outline"}`}
                                        onClick={() => handleChange("isActive", false)}
                                    >InActive</button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${formData.isActive ? "btn-success text-white" : "btn-outline"}`}
                                        onClick={() => handleChange("isActive", true)}
                                    >Active</button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">(DND) Do Not Disturb</label>
                                <div className="flex gap-2 mt-2">
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${!formData.dnd ? "btn-info text-white" : "btn-outline"}`}
                                        onClick={() => handleChange("dnd", false)}
                                    >No</button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${formData.dnd ? "btn-success text-white" : "btn-outline"}`}
                                        onClick={() => handleChange("dnd", true)}
                                    >Yes</button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Referral Code</label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full bg-teal-500 text-white"
                                    value={formData.referralCode}
                                    onChange={(e) => handleChange("referralCode", e.target.value)}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subscribed to News Letters</label>
                                <div className="flex gap-2 mt-2">
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${!formData.subscribedToNewsletters ? "btn-error text-white" : "btn-outline"}`}
                                        onClick={() => handleChange("subscribedToNewsletters", false)}
                                    >No</button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${formData.subscribedToNewsletters ? "btn-success text-white" : "btn-outline"}`}
                                        onClick={() => handleChange("subscribedToNewsletters", true)}
                                    >Yes</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Address Tab */}
                    {activeTab === "address" && (
                        <div className="space-y-4">
                            {/* Map Input Section */}
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-xs font-bold text-blue-700 uppercase">Location Entry</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData(prev => ({
                                                ...prev,
                                                houseNo: "",
                                                floor: "",
                                                area: "",
                                                landmark: "",
                                                latitude: "",
                                                longitude: ""
                                            }));
                                            toast.success("Address fields cleared");
                                        }}
                                        className="btn btn-xs btn-error btn-outline normal-case"
                                    >
                                        Clear Address Fields
                                    </button>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-medium text-gray-500 uppercase">Paste Google Maps Link or "Lat, Lng"</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Paste link or coordinates here..."
                                            className="input input-sm input-bordered flex-1 border-blue-300 focus:border-blue-500"
                                            onPaste={(e) => {
                                                const pastedData = e.clipboardData.getData('text');
                                                // Handle Lat, Lng format
                                                const coordMatch = pastedData.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
                                                if (coordMatch) {
                                                    handleChange("latitude", parseFloat(coordMatch[1]));
                                                    handleChange("longitude", parseFloat(coordMatch[2]));
                                                    toast.success("Coordinates extracted from text");
                                                    return;
                                                }
                                                // Handle Google Maps @lat,lng format
                                                const urlMatch = pastedData.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                                                if (urlMatch) {
                                                    handleChange("latitude", parseFloat(urlMatch[1]));
                                                    handleChange("longitude", parseFloat(urlMatch[2]));
                                                    toast.success("Location extracted from URL");
                                                    return;
                                                }
                                                // Handle ?q=lat,lng format
                                                const qMatch = pastedData.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
                                                if (qMatch) {
                                                    handleChange("latitude", parseFloat(qMatch[1]));
                                                    handleChange("longitude", parseFloat(qMatch[2]));
                                                    toast.success("Location extracted from query");
                                                }
                                            }}
                                        />
                                        <div className="tooltip" data-tip="Paste a Google Maps URL or 'lat, lng' text to auto-fill coordinates">
                                            <span className="btn btn-sm btn-circle btn-ghost text-blue-500 border border-blue-200">?</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Map Picker */}
                            <div className="h-60 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative z-0">
                                <MapContainer
                                    center={formData.latitude && formData.longitude ? [formData.latitude, formData.longitude] : [8.1833, 77.4119]}
                                    zoom={12}
                                    className="h-full w-full"
                                >
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    {formData.latitude && formData.longitude && (
                                        <>
                                            <Marker
                                                position={[Number(formData.latitude), Number(formData.longitude)]}
                                                draggable={true}
                                                eventHandlers={{
                                                    dragend: (e) => {
                                                        const marker = e.target;
                                                        const position = marker.getLatLng();
                                                        handleChange("latitude", position.lat);
                                                        handleChange("longitude", position.lng);
                                                    },
                                                }}
                                            />
                                            <RecenterMap lat={formData.latitude} lng={formData.longitude} />
                                        </>
                                    )}

                                    {/* Render Service Area Polygons */}
                                    {serviceAreasData?.result?.map((sa) => (
                                        <Polygon
                                            key={sa._id}
                                            positions={sa.polygon.coordinates[0].map(coord => [coord[1], coord[0]])}
                                            pathOptions={{
                                                fillColor: sa.color || '#22c55e',
                                                fillOpacity: sa._id === formData.serviceArea ? 0.4 : 0.1,
                                                color: sa.color || '#16a34a',
                                                weight: sa._id === formData.serviceArea ? 3 : 1
                                            }}
                                            interactive={false} // Make polygons non-interactive so clicks pass through to map
                                        >
                                            <Popup>
                                                <div className="text-xs font-bold">{sa.name}</div>
                                                <div className="text-[10px] text-gray-500">Service Area</div>
                                            </Popup>
                                        </Polygon>
                                    ))}

                                    <LocationPicker
                                        setLocation={(loc) => {
                                            handleChange("latitude", loc[0]);
                                            handleChange("longitude", loc[1]);
                                        }}
                                    />
                                </MapContainer>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Flat / House no / Building name</label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={formData.houseNo}
                                        onChange={(e) => handleChange("houseNo", e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Shift</label>
                                    <select
                                        className="select select-bordered w-full"
                                        value={formData.deliveryShift}
                                        onChange={(e) => handleChange("deliveryShift", e.target.value)}
                                    >
                                        <option>Morning</option>
                                        <option>Evening</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Floor (optional)</label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full bg-yellow-100"
                                        value={formData.floor}
                                        onChange={(e) => handleChange("floor", e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nearby landmark (optional)</label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full bg-teal-100"
                                        value={formData.landmark}
                                        onChange={(e) => handleChange("landmark", e.target.value)}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Area / Locality</label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={formData.area}
                                        onChange={(e) => handleChange("area", e.target.value)}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Associated Hub</label>
                                    <select
                                        className="select select-bordered w-full"
                                        value={formData.hub}
                                        onChange={(e) => handleChange("hub", e.target.value)}
                                    >
                                        <option value="">Select Hub</option>
                                        {hubsData?.result?.map((hub) => (
                                            <option key={hub._id} value={hub._id}>
                                                {hub.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Note: Changing the address coordinates will automatically recalculate the Hub, but you can override it here.
                                    </p>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Area (Block/Apartment)</label>
                                    <select
                                        className="select select-bordered w-full"
                                        value={formData.serviceArea}
                                        onChange={(e) => handleChange("serviceArea", e.target.value)}
                                    >
                                        <option value="">Select Service Area</option>
                                        {serviceAreasData?.result?.map((sa) => (
                                            <option key={sa._id} value={sa._id}>
                                                {sa.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Associated service area for address validation and delivery routing.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Delivery Preference Tab */}
                    {activeTab === "delivery" && (
                        <div className="space-y-4">
                            <h4 className="font-semibold text-gray-700">◉ DELIVERY PREFERENCE</h4>
                            <div className="space-y-3">
                                {DAYS.map((day) => (
                                    <div key={day} className="flex items-center gap-4">
                                        <span className="w-24 font-medium">{day}</span>
                                        <div className="flex gap-3 flex-wrap">
                                            {DELIVERY_OPTIONS.map((option) => (
                                                <label key={option} className="flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name={`delivery-${day}`}
                                                        className="radio radio-sm radio-primary"
                                                        checked={formData.deliveryPreferences[day] === option}
                                                        onChange={() => handleDeliveryPrefChange(day, option)}
                                                    />
                                                    <span className="text-sm">{option}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6">
                                <h4 className="font-semibold text-gray-700 mb-2">◉ DELIVERY INSTRUCTION</h4>
                                <textarea
                                    className="textarea textarea-bordered w-full"
                                    rows="4"
                                    placeholder="Delivery Instruction"
                                    value={formData.deliveryInstruction}
                                    onChange={(e) => handleChange("deliveryInstruction", e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Update Delivery Boy Tab */}
                    {activeTab === "deliveryBoy" && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Boy</label>
                                <select
                                    className="select select-bordered w-full"
                                    value={formData.deliveryBoy}
                                    onChange={(e) => handleChange("deliveryBoy", e.target.value)}
                                >
                                    <option value="">Select Delivery Boy</option>
                                    {ridersData?.result?.map((rider) => (
                                        <option key={rider._id} value={rider._id}>
                                            {rider.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="btn btn-error text-white">
                        ✕ Close
                    </button>
                    <button onClick={handleSubmit} className="btn btn-success text-white">
                        ⬆️ Update
                    </button>
                    <button onClick={() => { handleSubmit(); onClose(); }} className="btn btn-info text-white">
                        ⬆️ Update & Close
                    </button>
                </div>
            </div>
        </div>
    );
};
