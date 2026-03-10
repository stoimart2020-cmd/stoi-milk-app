import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    getFactories, createFactory, updateFactory, deleteFactory,
    getDistricts, createDistrict, updateDistrict, deleteDistrict,
    getCities, createCity, updateCity, deleteCity,
    getAreas, createArea, updateArea, deleteArea,
    getHubs, createHub, updateHub, deleteHub,
    getDeliveryPoints, createDeliveryPoint, updateDeliveryPoint, deleteDeliveryPoint,
    getDeliveryRoutes, createDeliveryRoute, updateDeliveryRoute, deleteDeliveryRoute,
} from "../lib/api/logistics";
import { queryClient } from "../lib/queryClient";
import { Plus, Edit, Trash, MapPin, Building, Warehouse, Truck, Map as MapIcon, Globe, Route, Package } from "lucide-react";
import { ServiceAreaManagement } from "./ServiceAreaManagement";

// Tab configuration: order follows the hierarchy
const TABS = [
    { key: "factories", label: "Factories", icon: Building, singular: "Factory" },
    { key: "districts", label: "Districts", icon: MapIcon, singular: "District" },
    { key: "cities", label: "Cities", icon: Globe, singular: "City" },
    { key: "hubs", label: "Hubs", icon: Warehouse, singular: "Hub" },
    { key: "areas", label: "Service Areas", icon: MapPin, singular: "Service Area" },
    { key: "deliveryPoints", label: "Delivery Points", icon: Package, singular: "Delivery Point" },
    { key: "deliveryRoutes", label: "Routes", icon: Route, singular: "Delivery Route" },
];

export const LogisticsManagement = () => {
    const [activeTab, setActiveTab] = useState("factories");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const currentTab = TABS.find(t => t.key === activeTab);

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Logistics Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Factory → District → City → Hub → Area → Delivery Point</p>
                </div>
                {currentTab.key !== "areas" && (
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setEditingItem(null);
                            setIsModalOpen(true);
                        }}
                    >
                        <Plus size={20} /> Add {currentTab?.singular}
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="tabs tabs-boxed bg-base-200 w-fit flex-wrap h-auto">
                {TABS.map((tab, idx) => {
                    const Icon = tab.icon;
                    return (
                        <span key={tab.key}>
                            <a
                                className={`tab ${activeTab === tab.key ? "tab-active" : ""}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                <Icon size={16} className="mr-2" /> {tab.label}
                            </a>
                            {/* Separator between Area and Hub */}
                            {idx === 3 && <span className="mx-0.5 text-gray-300">|</span>}
                        </span>
                    );
                })}
            </div>

            {/* Content */}
            <div className="bg-base-100 rounded-lg shadow p-4">
                {activeTab === "factories" && <FactoriesList onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }} />}
                {activeTab === "districts" && <DistrictsList onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }} />}
                {activeTab === "cities" && <CitiesList onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }} />}
                {activeTab === "hubs" && <HubsList onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }} />}
                {activeTab === "areas" && <ServiceAreaManagement />}
                {activeTab === "deliveryPoints" && <DeliveryPointsList onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }} />}
                {activeTab === "deliveryRoutes" && <DeliveryRoutesList onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }} />}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <LogisticsModal
                    type={activeTab}
                    item={editingItem}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
};

// ========================
// LIST COMPONENTS
// ========================

const FactoriesList = ({ onEdit }) => {
    const { data, isLoading } = useQuery({ queryKey: ["factories"], queryFn: getFactories });
    const deleteMutation = useMutation({ mutationFn: deleteFactory, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["factories"] }) });

    if (isLoading) return <div className="loading loading-spinner"></div>;

    return (
        <div className="overflow-x-auto">
            <table className="table">
                <thead><tr><th>Name</th><th>Code</th><th>Location</th><th>Contact</th><th>Actions</th></tr></thead>
                <tbody>
                    {data?.result?.map((d) => (
                        <tr key={d._id}>
                            <td className="font-bold">{d.name}</td>
                            <td>{d.code || "-"}</td>
                            <td>{d.address?.city || d.address?.fullAddress || "-"}</td>
                            <td>{d.contactPerson || "-"}</td>
                            <td className="flex gap-2">
                                <button className="btn btn-sm btn-ghost" onClick={() => onEdit(d)}><Edit size={16} /></button>
                                <button className="btn btn-sm btn-ghost text-error" onClick={() => confirm("Are you sure?") && deleteMutation.mutate(d._id)}><Trash size={16} /></button>
                            </td>
                        </tr>
                    ))}
                    {data?.result?.length === 0 && <tr><td colSpan="5" className="text-center">No factories found</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

const DistrictsList = ({ onEdit }) => {
    const { data, isLoading } = useQuery({ queryKey: ["districts"], queryFn: getDistricts });
    const deleteMutation = useMutation({ mutationFn: deleteDistrict, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["districts"] }) });

    if (isLoading) return <div className="loading loading-spinner"></div>;

    return (
        <div className="overflow-x-auto">
            <table className="table">
                <thead><tr><th>Name</th><th>Factory</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                    {data?.result?.map((d) => (
                        <tr key={d._id}>
                            <td className="font-bold">{d.name}</td>
                            <td>{d.factory?.name || "-"}</td>
                            <td><div className={`badge ${d.isActive ? 'badge-success' : 'badge-ghost'}`}>{d.isActive ? 'Active' : 'Inactive'}</div></td>
                            <td className="flex gap-2">
                                <button className="btn btn-sm btn-ghost" onClick={() => onEdit(d)}><Edit size={16} /></button>
                                <button className="btn btn-sm btn-ghost text-error" onClick={() => confirm("Are you sure?") && deleteMutation.mutate(d._id)}><Trash size={16} /></button>
                            </td>
                        </tr>
                    ))}
                    {data?.result?.length === 0 && <tr><td colSpan="4" className="text-center">No districts found</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

const CitiesList = ({ onEdit }) => {
    const { data, isLoading } = useQuery({ queryKey: ["cities"], queryFn: getCities });
    const deleteMutation = useMutation({ mutationFn: deleteCity, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cities"] }) });

    if (isLoading) return <div className="loading loading-spinner"></div>;

    return (
        <div className="overflow-x-auto">
            <table className="table">
                <thead><tr><th>Name</th><th>District</th><th>Factory</th><th>Actions</th></tr></thead>
                <tbody>
                    {data?.result?.map((d) => (
                        <tr key={d._id}>
                            <td className="font-bold">{d.name}</td>
                            <td>{d.district?.name || "-"}</td>
                            <td>{d.district?.factory?.name || "-"}</td>
                            <td className="flex gap-2">
                                <button className="btn btn-sm btn-ghost" onClick={() => onEdit(d)}><Edit size={16} /></button>
                                <button className="btn btn-sm btn-ghost text-error" onClick={() => confirm("Are you sure?") && deleteMutation.mutate(d._id)}><Trash size={16} /></button>
                            </td>
                        </tr>
                    ))}
                    {data?.result?.length === 0 && <tr><td colSpan="4" className="text-center">No cities found</td></tr>}
                </tbody>
            </table>
        </div>
    );
};


const HubsList = ({ onEdit }) => {
    const { data, isLoading } = useQuery({ queryKey: ["hubs"], queryFn: getHubs });
    const deleteMutation = useMutation({ mutationFn: deleteHub, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hubs"] }) });

    if (isLoading) return <div className="loading loading-spinner"></div>;

    return (
        <div className="overflow-x-auto">
            <table className="table">
                <thead><tr><th>Name</th><th>Code</th><th>City</th><th>Contact</th><th>Actions</th></tr></thead>
                <tbody>
                    {data?.result?.map((h) => (
                        <tr key={h._id}>
                            <td className="font-bold">{h.name}</td>
                            <td>{h.code || "-"}</td>
                            <td>{h.city?.name || "-"}</td>
                            <td>{h.contactPerson || "-"}</td>
                            <td className="flex gap-2">
                                <button className="btn btn-sm btn-ghost" onClick={() => onEdit(h)}><Edit size={16} /></button>
                                <button className="btn btn-sm btn-ghost text-error" onClick={() => confirm("Are you sure?") && deleteMutation.mutate(h._id)}><Trash size={16} /></button>
                            </td>
                        </tr>
                    ))}
                    {data?.result?.length === 0 && <tr><td colSpan="5" className="text-center">No hubs found</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

const DeliveryPointsList = ({ onEdit }) => {
    const { data, isLoading } = useQuery({ queryKey: ["deliveryPoints"], queryFn: getDeliveryPoints });
    const deleteMutation = useMutation({ mutationFn: deleteDeliveryPoint, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deliveryPoints"] }) });

    if (isLoading) return <div className="loading loading-spinner"></div>;

    return (
        <div className="overflow-x-auto">
            <table className="table">
                <thead><tr><th>Name</th><th>Code</th><th>Hub</th><th>Areas</th><th>Capacity</th><th>Stock</th><th>Actions</th></tr></thead>
                <tbody>
                    {data?.result?.map((dp) => (
                        <tr key={dp._id}>
                            <td className="font-bold">{dp.name}</td>
                            <td>{dp.code || "-"}</td>
                            <td>{dp.hub?.name || "-"}</td>
                            <td>{dp.hub?.city?.name || "-"}</td>
                            <td>{dp.capacity}</td>
                            <td>{dp.currentStock}</td>
                            <td className="flex gap-2">
                                <button className="btn btn-sm btn-ghost" onClick={() => onEdit(dp)}><Edit size={16} /></button>
                                <button className="btn btn-sm btn-ghost text-error" onClick={() => confirm("Are you sure?") && deleteMutation.mutate(dp._id)}><Trash size={16} /></button>
                            </td>
                        </tr>
                    ))}
                    {data?.result?.length === 0 && <tr><td colSpan="7" className="text-center">No delivery points found</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

const DeliveryRoutesList = ({ onEdit }) => {
    const { data: routes, isLoading } = useQuery({ queryKey: ["deliveryRoutes"], queryFn: getDeliveryRoutes });
    const deleteMutation = useMutation({ mutationFn: deleteDeliveryRoute, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deliveryRoutes"] }) });

    if (isLoading) return <div className="loading loading-spinner"></div>;

    return (
        <div className="overflow-x-auto">
            <table className="table">
                <thead><tr><th>Name</th><th>Code</th><th>Area</th><th>City</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                    {routes?.result?.map((d) => (
                        <tr key={d._id}>
                            <td className="font-bold">{d.name}</td>
                            <td>{d.code || "-"}</td>
                            <td>{d.area?.name || "-"}</td>
                            <td>{d.area?.city?.name || "-"}</td>
                            <td><div className={`badge ${d.isActive ? 'badge-success' : 'badge-ghost'}`}>{d.isActive ? 'Active' : 'Inactive'}</div></td>
                            <td className="flex gap-2">
                                <button className="btn btn-sm btn-ghost" onClick={() => onEdit(d)}><Edit size={16} /></button>
                                <button className="btn btn-sm btn-ghost text-error" onClick={() => confirm("Are you sure?") && deleteMutation.mutate(d._id)}><Trash size={16} /></button>
                            </td>
                        </tr>
                    ))}
                    {routes?.result?.length === 0 && <tr><td colSpan="6" className="text-center">No delivery routes found</td></tr>}
                </tbody>
            </table>
        </div>
    );
};


// ========================
// MODAL - Add/Edit Form
// ========================

const LogisticsModal = ({ type, item, onClose }) => {
    const isEdit = !!item;
    const [form, setForm] = useState(item || {});

    // Fetch lists for dropdowns
    const { data: factories } = useQuery({ queryKey: ["factories"], queryFn: getFactories, enabled: type === "districts" });
    const { data: districts } = useQuery({ queryKey: ["districts"], queryFn: getDistricts, enabled: type === "cities" });
    const { data: cities } = useQuery({ queryKey: ["cities"], queryFn: getCities, enabled: ["hubs"].includes(type) });
    const { data: hubs } = useQuery({ queryKey: ["hubs"], queryFn: getHubs, enabled: ["areas", "deliveryPoints"].includes(type) });
    const { data: areas } = useQuery({ queryKey: ["areas"], queryFn: getAreas, enabled: ["deliveryRoutes"].includes(type) });

    const mutation = useMutation({
        mutationFn: (data) => {
            if (type === "factories") return isEdit ? updateFactory({ id: item._id, data }) : createFactory(data);
            if (type === "districts") return isEdit ? updateDistrict({ id: item._id, data }) : createDistrict(data);
            if (type === "cities") return isEdit ? updateCity({ id: item._id, data }) : createCity(data);
            if (type === "areas") return isEdit ? updateArea({ id: item._id, data }) : createArea(data);
            if (type === "hubs") return isEdit ? updateHub({ id: item._id, data }) : createHub(data);
            if (type === "deliveryPoints") return isEdit ? updateDeliveryPoint({ id: item._id, data }) : createDeliveryPoint(data);
            if (type === "deliveryRoutes") return isEdit ? updateDeliveryRoute({ id: item._id, data }) : createDeliveryRoute(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [type] });
            onClose();
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate(form);
    };

    const currentTab = TABS.find(t => t.key === type);

    return (
        <div className="modal modal-open">
            <div className="modal-box">
                <h3 className="font-bold text-lg mb-4">{isEdit ? "Edit" : "Add"} {currentTab?.singular || "Item"}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name (all types) */}
                    <div className="form-control">
                        <label className="label">Name</label>
                        <input required className="input input-bordered" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>

                    {/* ===== Factory Fields ===== */}
                    {type === "factories" && (
                        <>
                            <div className="form-control">
                                <label className="label">Code</label>
                                <input className="input input-bordered" value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                            </div>
                            <div className="form-control">
                                <label className="label">City</label>
                                <input className="input input-bordered" value={form.address?.city || ""} onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })} />
                            </div>
                            <div className="form-control">
                                <label className="label">Contact Person</label>
                                <input className="input input-bordered" value={form.contactPerson || ""} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
                            </div>
                            <div className="form-control">
                                <label className="label">Contact Number</label>
                                <input className="input input-bordered" value={form.contactNumber || ""} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
                            </div>
                        </>
                    )}

                    {/* ===== District: select Factory ===== */}
                    {type === "districts" && (
                        <div className="form-control">
                            <label className="label">Factory</label>
                            <select required className="select select-bordered" value={form.factory?._id || form.factory || ""} onChange={(e) => setForm({ ...form, factory: e.target.value })}>
                                <option value="">Select Factory</option>
                                {factories?.result?.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                            </select>
                        </div>
                    )}

                    {/* ===== City: select District ===== */}
                    {type === "cities" && (
                        <div className="form-control">
                            <label className="label">District</label>
                            <select required className="select select-bordered" value={form.district?._id || form.district || ""} onChange={(e) => setForm({ ...form, district: e.target.value })}>
                                <option value="">Select District</option>
                                {districts?.result?.map(d => <option key={d._id} value={d._id}>{d.name} ({d.factory?.name})</option>)}
                            </select>
                        </div>
                    )}


                    {/* ===== Hub: select City ===== */}
                    {type === "hubs" && (
                        <>
                            <div className="form-control">
                                <label className="label">City</label>
                                <select required className="select select-bordered" value={form.city?._id || form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                                    <option value="">Select City</option>
                                    {cities?.result?.map(c => <option key={c._id} value={c._id}>{c.name} ({c.district?.name})</option>)}
                                </select>
                            </div>
                            <div className="form-control">
                                <label className="label">Code</label>
                                <input className="input input-bordered" value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                            </div>
                            <div className="form-control">
                                <label className="label">Capacity</label>
                                <input type="number" className="input input-bordered" value={form.capacity || 0} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="form-control">
                                <label className="label">Contact Person</label>
                                <input className="input input-bordered" value={form.contactPerson || ""} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
                            </div>
                            <div className="form-control">
                                <label className="label">Contact Number</label>
                                <input className="input input-bordered" value={form.contactNumber || ""} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
                            </div>
                        </>
                    )}

                    {/* ===== Delivery Point: select Hub ===== */}
                    {type === "deliveryPoints" && (
                        <>
                            <div className="form-control">
                                <label className="label">Hub</label>
                                <select required className="select select-bordered" value={form.hub?._id || form.hub || ""} onChange={(e) => setForm({ ...form, hub: e.target.value })}>
                                    <option value="">Select Hub</option>
                                    {hubs?.result?.map(h => <option key={h._id} value={h._id}>{h.name} ({h.city?.name})</option>)}
                                </select>
                            </div>
                            <div className="form-control">
                                <label className="label">Code</label>
                                <input className="input input-bordered" value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                            </div>
                            <div className="form-control">
                                <label className="label">Capacity</label>
                                <input type="number" className="input input-bordered" value={form.capacity || 0} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="form-control">
                                <label className="label">Contact Person</label>
                                <input className="input input-bordered" value={form.contactPerson || ""} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
                            </div>
                            <div className="form-control">
                                <label className="label">Contact Number</label>
                                <input className="input input-bordered" value={form.contactNumber || ""} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
                            </div>
                            <div className="form-control">
                                <label className="label">Notes</label>
                                <textarea className="textarea textarea-bordered" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                            </div>
                        </>
                    )}

                    {/* ===== Delivery Route: select Area ===== */}
                    {type === "deliveryRoutes" && (
                        <>
                            <div className="form-control">
                                <label className="label">Code</label>
                                <input className="input input-bordered" value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                            </div>
                            <div className="form-control">
                                <label className="label">Area</label>
                                <select required className="select select-bordered" value={form.area?._id || form.area || ""} onChange={(e) => setForm({ ...form, area: e.target.value })}>
                                    <option value="">Select Area</option>
                                    {areas?.result?.map(a => <option key={a._id} value={a._id}>{a.name} ({a.city?.name})</option>)}
                                </select>
                            </div>
                            <div className="form-control">
                                <label className="label">Description</label>
                                <textarea className="textarea textarea-bordered" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            </div>
                        </>
                    )}

                    <div className="modal-action">
                        <button type="button" className="btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save"}</button>
                    </div>
                </form>
            </div>
        </div >
    );
};
