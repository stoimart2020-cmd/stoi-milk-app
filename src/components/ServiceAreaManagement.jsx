import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getAreas } from "../lib/api/logistics";
import { queryClient } from "../lib/queryClient";
import { axiosInstance } from "../lib/axios";
import {
    MapPin,
    Plus,
    Trash2,
    Edit,
    Save,
    X,
    IndianRupee,
    Truck,
} from "lucide-react";
import toast from "react-hot-toast";
import { MapContainer, TileLayer, FeatureGroup, Polygon, Popup } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import L from "leaflet";

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// API functions
const getServiceAreas = async () => {
    const response = await axiosInstance.get("/api/service-areas");
    return response.data;
};

const createServiceArea = async (data) => {
    const response = await axiosInstance.post("/api/service-areas", data);
    return response.data;
};

const updateServiceArea = async ({ id, data }) => {
    const response = await axiosInstance.put(`/api/service-areas/${id}`, data);
    return response.data;
};

const deleteServiceArea = async (id) => {
    const response = await axiosInstance.delete(`/api/service-areas/${id}`);
    return response.data;
};

export const ServiceAreaManagement = () => {
    const [selectedArea, setSelectedArea] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [drawnPolygonCoords, setDrawnPolygonCoords] = useState(null);
    const [map, setMap] = useState(null); // Map instance
    const [isDrawing, setIsDrawing] = useState(false); // Track drawing state
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        deliveryCharge: 0,
        minimumOrderValue: 0,
        freeDeliveryAbove: 500,
        estimatedDeliveryTime: "30-45 mins",
        color: "#22c55e",
        serviceStartTime: "06:00",
        serviceEndTime: "21:00",
        isActive: true,
        area: "", // Linked Area ID
    });

    const featureGroupRef = useRef();

    const { data, isLoading } = useQuery({
        queryKey: ["serviceAreas"],
        queryFn: getServiceAreas,
    });

    const serviceAreas = data?.result || [];

    const createMutation = useMutation({
        mutationFn: createServiceArea,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["serviceAreas"] });
            closeModal();
            toast.success("Service area created successfully!");
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to create service area"),
    });

    const updateMutation = useMutation({
        mutationFn: updateServiceArea,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["serviceAreas"] });
            closeModal();
            toast.success("Service area updated successfully!");
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to update service area"),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteServiceArea,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["serviceAreas"] });
            toast.success("Service area deleted!");
        },
    });

    // Handle Manual Draw Start
    const startDrawing = () => {
        if (!map) return;
        setIsDrawing(true);
        const drawer = new L.Draw.Polygon(map, {
            showArea: false,
            allowIntersection: false,
            shapeOptions: {
                color: '#22c55e',
                weight: 2
            }
        });
        drawer.enable();
    };

    // Initialize Map Events
    useEffect(() => {
        if (!map) return;

        const handleCreated = (e) => {
            const { layer } = e;
            const latlngs = layer.getLatLngs()[0];
            const coordinates = latlngs.map(ll => [ll.lng, ll.lat]);
            coordinates.push([latlngs[0].lng, latlngs[0].lat]);

            setDrawnPolygonCoords([coordinates]);

            // Reset form
            setFormData({
                name: "",
                description: "",
                deliveryCharge: 0,
                minimumOrderValue: 0,
                freeDeliveryAbove: 500,
                estimatedDeliveryTime: "30-45 mins",
                color: "#22c55e",
                serviceStartTime: "06:00",
                serviceEndTime: "21:00",
                isActive: true,
                area: "",
            });
            setSelectedArea(null);
            setIsModalOpen(true);
            setIsDrawing(false);

            // map.addLayer(layer); // Optional: add to map to show whilst editing formatted? 
            // Actually we remove it seamlessly by not adding it to a permanent featureGroup or by creating it in modal
        };

        map.on(L.Draw.Event.CREATED, handleCreated);

        return () => {
            map.off(L.Draw.Event.CREATED, handleCreated);
        };
    }, [map]);


    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedArea(null);
        setDrawnPolygonCoords(null);
        setIsDrawing(false);
    };

    const openEditModal = (area) => {
        setSelectedArea(area);
        setFormData({
            name: area.name,
            description: area.description || "",
            deliveryCharge: area.deliveryCharge || 0,
            minimumOrderValue: area.minimumOrderValue || 0,
            freeDeliveryAbove: area.freeDeliveryAbove || 500,
            estimatedDeliveryTime: area.estimatedDeliveryTime || "30-45 mins",
            color: area.color || "#22c55e",
            serviceStartTime: area.serviceStartTime || "06:00",
            serviceEndTime: area.serviceEndTime || "21:00",
            isActive: area.isActive,
            area: area.area?._id || area.area || "",
        });
        setIsModalOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Sanitize payload
        const payload = { ...formData };
        if (!payload.area) delete payload.area;
        // Also sanitize legacy hub field if present (though not in form yet)
        if (!payload.hub) delete payload.hub;

        if (selectedArea?._id) {
            updateMutation.mutate({ id: selectedArea._id, data: payload });
        } else if (drawnPolygonCoords) {
            createMutation.mutate({
                ...payload,
                polygon: {
                    type: "Polygon",
                    coordinates: drawnPolygonCoords,
                },
            });
        }
    };

    const handleDelete = (id) => {
        if (confirm("Are you sure you want to delete this service area?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleEdited = (e) => {
        let editedCount = 0;
        e.layers.eachLayer((layer) => {
            // Leaflet Draw strips custom properties sometimes.
            // But we know the original positions roughly. Better yet, we can attach the ID to the layer directly.
            const areaId = layer.options.areaId;
            if (areaId) {
                const latlngs = layer.getLatLngs()[0];
                const coordinates = latlngs.map(ll => [ll.lng, ll.lat]);
                coordinates.push([latlngs[0].lng, latlngs[0].lat]); // Close polygon

                updateMutation.mutate({
                    id: areaId,
                    data: {
                        polygon: {
                            type: "Polygon",
                            coordinates: [coordinates]
                        }
                    }
                });
                editedCount++;
            } else {
                console.warn("Could not determine area ID for edited layer.");
            }
        });
    };

    return (
        <div className="space-y-4 pt-2">
            <div className="flex justify-end">
                <button
                    className={`btn btn-sm ${isDrawing ? 'btn-disabled loading' : 'btn-primary'}`}
                    onClick={startDrawing}
                >
                    <Plus size={16} />
                    {isDrawing ? "Drawing..." : "Draw New Area"}
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Map */}
                <div className="lg:col-span-2 card bg-base-100 shadow-lg overflow-hidden z-0">
                    <div className="h-[500px] w-full relative z-0">
                        <MapContainer
                            center={[8.1833, 77.4119]} // Nagercoil Coordinates
                            zoom={13}
                            style={{ height: "100%", width: "100%", zIndex: 0 }}
                            ref={setMap}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {/* EditControl added to enable editing existing polygons */}
                            <FeatureGroup ref={featureGroupRef}>
                                <EditControl
                                    position="topright"
                                    onEdited={handleEdited}
                                    edit={{ edit: {}, remove: false }}
                                    draw={{
                                        polygon: false,
                                        rectangle: false,
                                        circle: false,
                                        circlemarker: false,
                                        marker: false,
                                        polyline: false
                                    }}
                                />
                                {serviceAreas.map(area => {
                                    if (!area.polygon?.coordinates?.[0]) return null;
                                    // GeoJSON is [lng, lat], Leaflet needs [lat, lng]
                                    const positions = area.polygon.coordinates[0].map(c => [c[1], c[0]]);
                                    return (
                                        <Polygon
                                            key={`${area._id}-${JSON.stringify(positions)}`}
                                            positions={positions}
                                            pathOptions={{
                                                color: area.color || "#22c55e",
                                                fillOpacity: area.isActive ? 0.2 : 0.05,
                                                weight: 2,
                                                areaId: area._id // Essential for EditControl to locate the DB record
                                            }}
                                        >
                                            <Popup>
                                                <strong>{area.name}</strong><br />
                                                {area.estimatedDeliveryTime}<br />
                                                Min: ₹{area.minimumOrderValue}
                                            </Popup>
                                        </Polygon>
                                    );
                                })}
                            </FeatureGroup>
                        </MapContainer>

                        {isDrawing && (
                            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-base-100 px-4 py-2 rounded-full shadow-lg z-[1000] text-sm font-bold animate-pulse border border-primary">
                                Click points on map to draw polygon. Click first point to finish.
                            </div>
                        )}
                    </div>
                </div>

                {/* List */}
                <div className="card bg-base-100 shadow-lg">
                    <div className="card-body p-4">
                        <h3 className="font-bold text-lg mb-3">Service Areas ({serviceAreas.length})</h3>
                        <div className="text-xs text-gray-500 mb-2">
                            Use the polygon tool on the map to draw new areas. Click on existing areas to edit.
                        </div>

                        {isLoading ? (
                            <div className="loading loading-spinner mx-auto"></div>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {serviceAreas.map((area) => (
                                    <div
                                        key={area._id}
                                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedArea?._id === area._id
                                            ? "border-primary bg-primary/5"
                                            : "border-base-300 hover:border-primary/50"
                                            }`}
                                        onClick={() => openEditModal(area)}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: area.color || "#22c55e" }}></div>
                                            <span className="font-bold">{area.name}</span>
                                            {area.isActive ? <span className="badge badge-success badge-xs">Active</span> : <span className="badge badge-ghost badge-xs">Inactive</span>}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {area.area?.name ? `Linked: ${area.area.name}` : "Not linked"}
                                        </div>
                                        <div className="flex justify-end mt-2">
                                            <button className="btn btn-xs btn-ghost text-error" onClick={(e) => { e.stopPropagation(); handleDelete(area._id); }}>
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">
                                {selectedArea?._id ? "Edit Service Area" : "New Service Area"}
                            </h3>
                            <button className="btn btn-ghost btn-sm btn-square" onClick={closeModal}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="label text-sm">Area Name *</label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="e.g., Koramangala"
                                />
                            </div>

                            <div>
                                <label className="label text-sm">Description</label>
                                <textarea
                                    className="textarea textarea-bordered w-full"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Optional description"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="label text-sm">Delivery Charge (₹)</label>
                                    <input
                                        type="number"
                                        className="input input-bordered w-full"
                                        value={formData.deliveryCharge}
                                        onChange={(e) => setFormData({ ...formData, deliveryCharge: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="label text-sm">Min Order Value (₹)</label>
                                    <input
                                        type="number"
                                        className="input input-bordered w-full"
                                        value={formData.minimumOrderValue}
                                        onChange={(e) => setFormData({ ...formData, minimumOrderValue: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="label text-sm">Free Delivery Above (₹)</label>
                                    <input
                                        type="number"
                                        className="input input-bordered w-full"
                                        value={formData.freeDeliveryAbove}
                                        onChange={(e) => setFormData({ ...formData, freeDeliveryAbove: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="label text-sm">Est. Delivery Time</label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={formData.estimatedDeliveryTime}
                                        onChange={(e) => setFormData({ ...formData, estimatedDeliveryTime: e.target.value })}
                                        placeholder="30-45 mins"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="label text-sm">Service Start</label>
                                    <input
                                        type="time"
                                        className="input input-bordered w-full"
                                        value={formData.serviceStartTime}
                                        onChange={(e) => setFormData({ ...formData, serviceStartTime: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label text-sm">Service End</label>
                                    <input
                                        type="time"
                                        className="input input-bordered w-full"
                                        value={formData.serviceEndTime}
                                        onChange={(e) => setFormData({ ...formData, serviceEndTime: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="label text-sm">Color</label>
                                    <input
                                        type="color"
                                        className="w-full h-10 rounded cursor-pointer"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label text-sm">Status</label>
                                    <label className="flex items-center gap-2 cursor-pointer mt-2">
                                        <input
                                            type="checkbox"
                                            className="toggle toggle-success"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        />
                                        <span>{formData.isActive ? "Active" : "Inactive"}</span>
                                    </label>
                                </div>
                            </div>


                            {/* Link to Hierarchy Area */}
                            <div className="form-control">
                                <label className="label text-sm">Linked Area (Hierarchy)</label>
                                <AreaSelect
                                    value={formData.area}
                                    onChange={(val) => setFormData({ ...formData, area: val })}
                                />
                                <label className="label-text-alt text-gray-400 mt-1">
                                    Linking this polygon to an Area allows auto-assigning customers.
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" className="btn btn-ghost" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                >
                                    {createMutation.isPending || updateMutation.isPending ? (
                                        <span className="loading loading-spinner loading-sm"></span>
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            {selectedArea?._id ? "Update" : "Create"}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const AreaSelect = ({ value, onChange }) => {
    const { data: areas } = useQuery({ queryKey: ["areas"], queryFn: getAreas });
    return (
        <select
            className="select select-bordered w-full"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="">-- Select Area --</option>
            {areas?.result?.map(a => (
                <option key={a._id} value={a._id}>
                    {a.name} ({a.hub?.city?.name}, {a.hub?.city?.district?.name})
                </option>
            ))}
        </select>
    );
};
