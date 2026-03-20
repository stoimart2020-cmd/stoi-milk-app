import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { X, Plus, MapPin, Check, Trash, Home, Briefcase, Building } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../../shared/api/axios";

// Fix leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function LocationMarker({ position, setPosition }) {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    // Fly to position when it updates programmatically
    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

const AddressForm = ({ initialData, onSave, onCancel }) => {
    const [form, setForm] = useState({
        tag: initialData?.tag || "Home",
        houseNo: initialData?.houseNo || "",
        floor: initialData?.floor || "",
        area: initialData?.area || "",
        landmark: initialData?.landmark || "",
        fullAddress: initialData?.fullAddress || "",
    });

    const [position, setPosition] = useState(
        initialData?.location?.coordinates ?
            { lat: initialData.location.coordinates[1], lng: initialData.location.coordinates[0] } :
            { lat: 8.1833, lng: 77.4119 } // Default Nagercoil
    );

    const [isLocating, setIsLocating] = useState(false);

    const getCurrentLocation = () => {
        setIsLocating(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setPosition({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    });
                    setIsLocating(false);
                },
                (err) => {
                    toast.error("Could not get location. Pick on map.");
                    setIsLocating(false);
                }
            );
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...form,
            location: {
                type: "Point",
                coordinates: [position.lng, position.lat]
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
                {["Home", "Work", "Other"].map(tag => (
                    <button
                        key={tag}
                        type="button"
                        onClick={() => setForm({ ...form, tag })}
                        className={`btn btn-sm ${form.tag === tag ? "btn-primary text-white" : "btn-outline"}`}
                    >
                        {tag === "Home" && <Home size={14} />}
                        {tag === "Work" && <Briefcase size={14} />}
                        {tag === "Other" && <MapPin size={14} />}
                        {tag}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                    <label className="label-text text-xs font-semibold mb-1">House/Flat No *</label>
                    <input required className="input input-sm input-bordered" value={form.houseNo} onChange={e => setForm({ ...form, houseNo: e.target.value })} />
                </div>
                <div className="form-control">
                    <label className="label-text text-xs font-semibold mb-1">Floor</label>
                    <input className="input input-sm input-bordered" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} />
                </div>
            </div>

            <div className="form-control">
                <label className="label-text text-xs font-semibold mb-1">Area / Locality *</label>
                <input required className="input input-sm input-bordered" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} />
            </div>

            <div className="form-control">
                <label className="label-text text-xs font-semibold mb-1">Landmark</label>
                <input className="input input-sm input-bordered" value={form.landmark} onChange={e => setForm({ ...form, landmark: e.target.value })} />
            </div>

            <div className="form-control">
                <label className="label flex justify-between items-center py-1">
                    <span className="label-text text-xs font-semibold">Location Pin *</span>
                    <button type="button" onClick={getCurrentLocation} className="text-xs text-primary font-medium">Use Current Location</button>
                </label>
                <div className="h-40 rounded-lg overflow-hidden border border-gray-200 z-0 relative">
                    <MapContainer center={[position.lat, position.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <LocationMarker position={position} setPosition={setPosition} />
                    </MapContainer>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onCancel} className="btn btn-sm btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-sm btn-primary text-white">Save Address</button>
            </div>
        </form>
    );
};

export const AddressManagementModal = ({ user, onClose }) => {
    const queryClient = useQueryClient();
    const [view, setView] = useState("list"); // list, add, edit
    const [editingIndex, setEditingIndex] = useState(null);

    // Initial addresses from user object (or simple one if legacy)
    const addresses = user?.addresses?.length > 0 ? user.addresses : (user?.address?.location ? [{ ...user.address, tag: "Home", isDefault: true }] : []);

    const updateProfileMutation = useMutation({
        mutationFn: async (data) => {
            const response = await axiosInstance.put("/api/users/profile", data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["user"] });
            // queryClient.setQueryData(["currentUser"], (old) => ({...old, data: {...old.data, result: data.result}}));
            toast.success("Addresses updated");
            if (view !== 'list') setView('list');
        },
        onError: (err) => toast.error("Failed to update"),
    });

    const handleAdd = (newAddress) => {
        const newAddresses = [...addresses, { ...newAddress, isDefault: addresses.length === 0 }];
        updateProfileMutation.mutate({ addresses: newAddresses, defaultAddressIndex: addresses.length === 0 ? 0 : undefined });
    };

    const handleEdit = (updatedAddress) => {
        const newAddresses = [...addresses];
        newAddresses[editingIndex] = { ...newAddresses[editingIndex], ...updatedAddress };
        updateProfileMutation.mutate({ addresses: newAddresses });
    };

    const handleDelete = (index) => {
        if (confirm("Delete this address?")) {
            const newAddresses = addresses.filter((_, i) => i !== index);
            let defaultIdx = undefined;
            // If we deleted the default one, make the first one default
            if (addresses[index].isDefault && newAddresses.length > 0) {
                defaultIdx = 0;
            }
            updateProfileMutation.mutate({ addresses: newAddresses, defaultAddressIndex: defaultIdx });
        }
    };

    const handleSetDefault = (index) => {
        updateProfileMutation.mutate({ addresses, defaultAddressIndex: index });
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box w-full max-w-md p-0 overflow-hidden bg-gray-50 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-white p-4 flex justify-between items-center shadow-sm z-10">
                    <h3 className="font-bold text-lg text-gray-800">
                        {view === 'list' ? 'Manage Addresses' : (view === 'add' ? 'Add New Address' : 'Edit Address')}
                    </h3>
                    <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto flex-1">
                    {view === 'list' ? (
                        <div className="space-y-4">
                            {addresses.map((addr, idx) => (
                                <div key={idx} className={`bg-white p-4 rounded-xl border-2 transition relative ${addr.isDefault ? 'border-green-500 shadow-sm' : 'border-transparent shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`badge ${addr.tag === 'Home' ? 'badge-primary' : 'badge-ghost'} badge-sm`}>{addr.tag}</span>
                                            {addr.isDefault && <span className="text-xs text-green-600 font-bold flex items-center gap-1"><Check size={12} /> Default</span>}
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => { setEditingIndex(idx); setView('edit'); }} className="btn btn-ghost btn-xs btn-square"><CustomEditIcon size={14} /></button>
                                            {!addr.isDefault && <button onClick={() => handleDelete(idx)} className="btn btn-ghost btn-xs btn-square text-red-500"><Trash size={14} /></button>}
                                        </div>
                                    </div>

                                    <p className="text-sm font-semibold text-gray-800">{addr.houseNo}, {addr.floor ? `Floor ${addr.floor},` : ''} {addr.area}</p>
                                    <p className="text-xs text-gray-500 mt-1">{addr.landmark ? `Near ${addr.landmark}` : ''}</p>

                                    {!addr.isDefault && (
                                        <button
                                            onClick={() => handleSetDefault(idx)}
                                            disabled={updateProfileMutation.isPending}
                                            className="mt-3 text-xs font-medium text-primary hover:underline w-full text-left"
                                        >
                                            Set as Default
                                        </button>
                                    )}
                                </div>
                            ))}

                            <button
                                onClick={() => setView('add')}
                                className="btn btn-outline btn-primary w-full border-dashed gap-2"
                            >
                                <Plus size={18} /> Add New Address
                            </button>
                        </div>
                    ) : (
                        <AddressForm
                            initialData={view === 'edit' ? addresses[editingIndex] : null}
                            onSave={view === 'add' ? handleAdd : handleEdit}
                            onCancel={() => { setView('list'); setEditingIndex(null); }}
                        />
                    )}
                </div>
            </div>
            <div className="modal-backdrop" onClick={onClose}></div>
        </div>
    );
};

// Helper icon
const CustomEditIcon = ({ size }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
);
