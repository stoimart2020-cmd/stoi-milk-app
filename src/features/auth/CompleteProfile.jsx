import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { updateCustomer } from "../../shared/api/customers"; // reusing existing api
import { useAuth } from "../../shared/hooks/useAuth";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { axiosInstance } from "../../shared/api/axios";
import { MilkLoader } from "../../components/MilkLoader";

// Fix leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});


// Nagercoil fallback center (used before settings load)
const FALLBACK_CENTER = [8.1833, 77.4119];
const FALLBACK_ZOOM = 13;

// Flies the map to a position — used after geolocation
function FlyToLocation({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo([position.lat, position.lng], 16, { duration: 1.2 });
        }
    }, [position, map]);
    return null;
}

function LocationMarker({ position, setPosition }) {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

export const CompleteProfile = () => {
    const { data: userData, isLoading, logout } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const user = userData?.data?.result;

    // Load map center from admin settings
    const { data: settingsData } = useQuery({
        queryKey: ["settings-public"],
        queryFn: () => axiosInstance.get("/api/settings").then(r => r.data),
        staleTime: 5 * 60 * 1000,
    });
    const mapCenter = [
        settingsData?.result?.maps?.defaultLat ?? FALLBACK_CENTER[0],
        settingsData?.result?.maps?.defaultLng ?? FALLBACK_CENTER[1],
    ];
    const mapZoom = settingsData?.result?.maps?.defaultZoom ?? FALLBACK_ZOOM;

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        houseNo: "",
        floor: "",
        area: "",
        landmark: "",
    });
    const [position, setPosition] = useState(null); // {lat, lng}
    const [isLocating, setIsLocating] = useState(false);
    const [flyTarget, setFlyTarget] = useState(null); // triggers FlyToLocation

    // Initialize with existing data if any
    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || "",
                email: user.email || "",
                houseNo: user.address?.houseNo || "",
                floor: user.address?.floor || "",
                area: user.address?.area || "",
                landmark: user.address?.landmark || "",
            });
            if (user.address?.location?.coordinates?.length === 2) {
                // GeoJSON is [lng, lat]
                setPosition({
                    lat: user.address.location.coordinates[1],
                    lng: user.address.location.coordinates[0]
                });
            }
        }
    }, [user]);

    const updateMutation = useMutation({
        mutationFn: updateCustomer,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["user"] });
            alert("Profile updated successfully! Welcome to the dashboard.");
            navigate("/dashboard", { replace: true });
        },
        onError: (err) => {
            alert(err.response?.data?.message || "Failed to update profile");
        },
    });

    const getCurrentLocation = () => {
        setIsLocating(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const newPos = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    };
                    setPosition(newPos);
                    setFlyTarget(newPos); // triggers map flyTo
                    setIsLocating(false);
                },
                () => {
                    alert("Could not get your location. Please allow location access or pick on map.");
                    setIsLocating(false);
                }
            );
        } else {
            alert("Geolocation is not supported by this browser.");
            setIsLocating(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!position) {
            alert("Please set your location on the map.");
            return;
        }
        if (!formData.name) {
            alert("Name is required.");
            return;
        }

        const payload = {
            name: formData.name,
            email: formData.email,
            address: {
                houseNo: formData.houseNo,
                floor: formData.floor,
                area: formData.area,
                landmark: formData.landmark,
                fullAddress: `${formData.houseNo}, ${formData.floor}, ${formData.area}, ${formData.landmark}`,
                location: {
                    type: "Point",
                    coordinates: [position.lng, position.lat] // GeoJSON: [lng, lat]
                }
            }
        };

        // We use updateCustomer which expects {id, data}
        updateMutation.mutate({ id: user._id, data: payload });
    };

    if (isLoading) return <MilkLoader />;

    return (
        <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
            <div className="card bg-base-100 shadow-xl w-full max-w-2xl">
                <div className="card-body">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="card-title text-2xl font-bold">Complete Your Profile</h2>
                        <button onClick={logout} className="btn btn-sm btn-ghost text-error">
                            Logout
                        </button>
                    </div>
                    <p className="text-center text-gray-500 mb-6">
                        Before we proceed, we need your delivery details to serve you better.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Personal Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Full Name *</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. John Doe"
                                    className="input input-bordered w-full"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Email (Optional)</span>
                                </label>
                                <input
                                    type="email"
                                    placeholder="john@example.com"
                                    className="input input-bordered w-full"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Address Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">House No / Flat *</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered"
                                    value={formData.houseNo}
                                    onChange={(e) => setFormData({ ...formData, houseNo: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Floor</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered"
                                    value={formData.floor}
                                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Area / Street *</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered"
                                    value={formData.area}
                                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Landmark</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered"
                                    value={formData.landmark}
                                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Map */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Pin your Delivery Location *</span>
                                <button
                                    type="button"
                                    className="btn btn-xs btn-outline btn-primary ml-2"
                                    onClick={getCurrentLocation}
                                    disabled={isLocating}
                                >
                                    {isLocating ? "Locating..." : "Use Current Location"}
                                </button>
                            </label>
                            <div className="h-64 rounded-lg overflow-hidden border border-base-300 relative z-0">
                                <MapContainer
                                    center={mapCenter}
                                    zoom={mapZoom}
                                    style={{ height: "100%", width: "100%", zIndex: 0 }}
                                >
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <LocationMarker position={position} setPosition={setPosition} />
                                    <FlyToLocation position={flyTarget} />
                                </MapContainer>
                            </div>
                            <label className="label">
                                <span className="label-text-alt text-gray-400">Tap on the map to adjust the pin exactly at your gate.</span>
                            </label>
                        </div>

                        <div className="card-actions justify-end mt-4">
                            <button
                                type="submit"
                                className="btn btn-primary w-full"
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending ? "Saving..." : "Save & Continue"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
