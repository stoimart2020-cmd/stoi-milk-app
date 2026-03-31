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
    getLogisticsForecast, getDailyStockStatus, addProductionLog
} from "../../shared/api/logistics";
import { getDeliveryOrders } from "../../shared/api/delivery";
import { getAllProducts } from "../../shared/api/products";
import { queryClient } from "../../shared/utils/queryClient";
import { Plus, Edit, Trash, MapPin, Building, Warehouse, Truck, Map as MapIcon, Globe, Route, Package, TrendingUp, Printer, Calendar, Download, ClipboardList, Users, ClipboardCheck, Zap, Scale } from "lucide-react";
import { ServiceAreaManagement } from "./ServiceAreaManagement";
import toast from "react-hot-toast";

// Tab configuration: order follows the hierarchy
const TABS = [
    { key: "forecast", label: "Demand Forecast", icon: TrendingUp, singular: "Forecast" },
    { key: "production-log", label: "Production Log", icon: ClipboardCheck, singular: "Log" },
    { key: "reconciliation", label: "Inventory Reconciliation", icon: Scale, singular: "Reconciliation" },
    { key: "loading-sheets", label: "Rider Loading Sheets", icon: ClipboardList, singular: "Loading Sheet" },
    { key: "factories", label: "Factories", icon: Building, singular: "Factory" },
    { key: "districts", label: "Districts", icon: MapIcon, singular: "District" },
    { key: "cities", label: "Cities", icon: Globe, singular: "City" },
    { key: "hubs", label: "Hubs", icon: Warehouse, singular: "Hub" },
    { key: "areas", label: "Service Areas", icon: MapPin, singular: "Service Area" },
    { key: "deliveryPoints", label: "Delivery Points", icon: Package, singular: "Delivery Point" },
    { key: "deliveryRoutes", label: "Routes", icon: Route, singular: "Delivery Route" },
];

export const LogisticsManagement = () => {
    const [activeTab, setActiveTab] = useState("forecast");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const currentTab = TABS.find(t => t.key === activeTab);

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Logistics Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Factory â†’ District â†’ City â†’ Hub â†’ Area â†’ Delivery Point</p>
                </div>
                {!["areas", "forecast", "loading-sheets", "production-log", "reconciliation"].includes(currentTab.key) && (
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
                        <span key={tab.key} className="flex items-center">
                            <a
                                className={`tab transition-all ${activeTab === tab.key ? "tab-active font-bold" : ""}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                <Icon size={16} className="mr-2" /> {tab.label}
                            </a>
                            {/* Separator between Area and Hub */}
                            {idx === 7 && <span className="mx-0.5 text-gray-300">|</span>}
                        </span>
                    );
                })}
            </div>

            {/* Content */}
            <div className="bg-base-100 rounded-lg shadow overflow-hidden">
                {activeTab === "forecast" && <DemandForecast />}
                {activeTab === "production-log" && <ProductionLog />}
                {activeTab === "reconciliation" && <InventoryReconciliation />}
                {activeTab === "loading-sheets" && <RiderLoadingSheets />}
                {activeTab === "factories" && <div className="p-4"><FactoriesList onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }} /></div>}
                {activeTab === "districts" && <div className="p-4"><DistrictsList onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }} /></div>}
                {activeTab === "cities" && <div className="p-4"><CitiesList onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }} /></div>}
                {activeTab === "hubs" && <div className="p-4"><HubsList onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }} /></div>}
                {activeTab === "areas" && <div className="p-4"><ServiceAreaManagement /></div>}
                {activeTab === "deliveryPoints" && <div className="p-4"><DeliveryPointsList onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }} /></div>}
                {activeTab === "deliveryRoutes" && <div className="p-4"><DeliveryRoutesList onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }} /></div>}
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


const DemandForecast = () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(tomorrow);

    const { data: forecast, isLoading, isError, refetch } = useQuery({
        queryKey: ["logistics-forecast", selectedDate],
        queryFn: () => getLogisticsForecast(selectedDate),
    });

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) return <div className="p-10 flex justify-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

    if (isError) return (
        <div className="p-10 text-center text-error">
            <p>Failed to load forecast data.</p>
            <button className="btn btn-outline btn-error mt-4" onClick={() => refetch()}>Retry</button>
        </div>
    );

    const hubIds = Object.keys(forecast?.hubs || {});
    
    // Extract unique products across all hubs
    const productMap = {};
    hubIds.forEach(hid => {
        const products = forecast.hubs[hid].products;
        Object.keys(products).forEach(pid => {
            productMap[pid] = products[pid].name;
        });
    });
    const productIds = Object.keys(productMap);

    return (
        <div className="space-y-6">
            {/* Header Controls */}
            <div className="p-4 bg-base-200 flex flex-wrap gap-4 items-center justify-between no-print">
                <div className="flex items-center gap-3">
                    <Calendar className="text-gray-500" />
                    <input 
                        type="date" 
                        className="input input-bordered"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>
                
                <div className="flex gap-2">
                    <button className="btn btn-outline gap-2" onClick={handlePrint}>
                        <Printer size={18} /> Print Packing List
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => refetch()}>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="px-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="stats shadow bg-primary text-primary-content">
                    <div className="stat">
                        <div className="stat-title text-primary-content opacity-70">Total Demand</div>
                        <div className="stat-value">{forecast?.totalLiters || 0} L</div>
                        <div className="stat-desc text-primary-content opacity-70">Liters for {selectedDate}</div>
                    </div>
                </div>
                
                <div className="stats shadow">
                    <div className="stat">
                        <div className="stat-title">Active Hubs</div>
                        <div className="stat-value">{hubIds.length}</div>
                        <div className="stat-desc">Preparing deliveries</div>
                    </div>
                </div>

                <div className="stats shadow">
                    <div className="stat">
                        <div className="stat-title">Products</div>
                        <div className="stat-value">{productIds.length}</div>
                        <div className="stat-desc">Unique variants</div>
                    </div>
                </div>
            </div>

            {/* Forecast Table */}
            <div className="px-4 pb-8 overflow-x-auto">
                <table className="table table-zebra w-full border border-base-300">
                    <thead className="bg-base-200">
                        <tr>
                            <th className="border-r border-base-300 sticky left-0 bg-base-200 z-10">Hub Name</th>
                            {productIds.map(pid => (
                                <th key={pid} className="text-center border-r border-base-300">
                                    {productMap[pid]}
                                </th>
                            ))}
                            <th className="bg-primary/10 text-primary font-bold text-right">Total (L)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {hubIds.map(hid => {
                            const hub = forecast.hubs[hid];
                            let hubTotalLiters = 0;
                            
                            return (
                                <tr key={hid}>
                                    <td className="font-bold border-r border-base-300 sticky left-0 bg-base-100 z-10">
                                        {hub.name}
                                    </td>
                                    {productIds.map(pid => {
                                        const pData = hub.products[pid];
                                        if (pData) hubTotalLiters += pData.liters;
                                        
                                        return (
                                            <td key={pid} className="text-center border-r border-base-300">
                                                {pData ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-lg">{pData.units}</span>
                                                        <span className="text-xs text-gray-400">({pData.liters.toFixed(1)}L)</span>
                                                    </div>
                                                ) : <span className="text-gray-300">-</span>}
                                            </td>
                                        );
                                    })}
                                    <td className="text-right font-bold text-primary bg-primary/5">
                                        {hubTotalLiters.toFixed(2)} L
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    {/* Grand Totals Footer */}
                    <tfoot className="bg-base-200 font-bold border-t-2 border-base-400">
                        <tr>
                            <td className="border-r border-base-300 sticky left-0 bg-base-200 z-10">GRAND TOTAL</td>
                            {productIds.map(pid => {
                                let totalUnits = 0;
                                let totalLiters = 0;
                                hubIds.forEach(hid => {
                                    const pData = forecast.hubs[hid].products[pid];
                                    if (pData) {
                                        totalUnits += pData.units;
                                        totalLiters += pData.liters;
                                    }
                                });
                                return (
                                    <td key={pid} className="text-center border-r border-base-300 text-primary">
                                        <div className="flex flex-col">
                                            <span className="text-lg">{totalUnits}</span>
                                            <span className="text-xs">({totalLiters.toFixed(1)}L)</span>
                                        </div>
                                    </td>
                                );
                            })}
                            <td className="text-right text-xl text-primary bg-primary/10">
                                {forecast?.totalLiters} L
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Print Header (Visible only on print) */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; font-size: 12pt; }
                    .bg-base-100 { background: white !important; box-shadow: none !important; }
                    .table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #ccc !important; }
                    th, td { border: 1px solid #ccc !important; padding: 8px !important; color: black !important; }
                    .sticky { position: static !important; }
                    .text-primary { color: black !important; }
                    .bg-primary, .bg-primary/10, .bg-primary/5 { background: transparent !important; }
                    tfoot { border-top: 2px solid black !important; }
                }
            `}} />
        </div>
    );
};

const RiderLoadingSheets = () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(tomorrow);
    const [selectedHub, setSelectedHub] = useState("");

    const { data: hubsData } = useQuery({ queryKey: ["hubs"], queryFn: getHubs });

    const { data: ordersData, isLoading, isError, refetch } = useQuery({
        queryKey: ["logistics-loading-sheets", selectedDate, selectedHub],
        queryFn: () => getDeliveryOrders({ date: selectedDate, hub: selectedHub, limit: 1000 }),
        enabled: !!selectedHub,
    });

    const handlePrint = () => {
        window.print();
    };

    const riderGroups = React.useMemo(() => {
        if (!ordersData?.result) return {};
        const groups = {};
        ordersData.result.forEach(order => {
            const riderId = order.assignedRider?._id || "unassigned";
            const riderName = order.assignedRider?.name || "Unassigned Orders";
            
            if (!groups[riderId]) {
                groups[riderId] = { name: riderName, orders: [], products: {} };
            }
            
            groups[riderId].orders.push(order);
            
            order.products?.forEach(p => {
                const prod = p.product;
                if (!prod) return;
                const pId = prod._id;
                if (!groups[riderId].products[pId]) {
                    groups[riderId].products[pId] = { 
                        name: prod.name, 
                        unit: prod.unit, 
                        count: 0, 
                        unitsPerCrate: prod.unitsPerCrate || 12 
                    };
                }
                groups[riderId].products[pId].count += p.quantity;
            });
        });
        return groups;
    }, [ordersData]);

    const riders = Object.keys(riderGroups);

    return (
        <div className="space-y-6">
            <div className="p-4 bg-base-200 flex flex-wrap gap-4 items-center justify-between no-print">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <Warehouse size={18} className="text-gray-500" />
                        <select 
                            className="select select-bordered"
                            value={selectedHub}
                            onChange={(e) => setSelectedHub(e.target.value)}
                        >
                            <option value="">Select Hub</option>
                            {hubsData?.result?.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-gray-500" />
                        <input 
                            type="date" 
                            className="input input-bordered"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button className="btn btn-primary gap-2" onClick={handlePrint} disabled={!selectedHub || riders.length === 0}>
                        <Printer size={18} /> Print All Sheets
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => refetch()} disabled={!selectedHub}>
                        Refresh
                    </button>
                </div>
            </div>

            {!selectedHub ? (
                <div className="p-20 text-center text-gray-400">
                    <Warehouse size={64} className="mx-auto mb-4 opacity-20" />
                    <p className="text-xl">Please select a Hub to view loading sheets</p>
                </div>
            ) : isLoading ? (
                <div className="p-10 flex justify-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>
            ) : riders.length === 0 ? (
                <div className="p-20 text-center text-gray-400">
                    <Package size={64} className="mx-auto mb-4 opacity-20" />
                    <p className="text-xl">No assigned orders found for this hub on {selectedDate}</p>
                </div>
            ) : (
                <div className="space-y-8 p-4">
                    {riders.map(rid => {
                        const group = riderGroups[rid];
                        const productList = Object.values(group.products);
                        
                        return (
                            <div key={rid} className="bg-white rounded-xl border border-base-300 overflow-hidden break-after-page rider-sheet-container shadow-sm p-0 mb-8">
                                <div className="bg-base-200 px-6 py-4 border-b border-base-300 flex justify-between items-center bg-teal-50">
                                    <div>
                                        <h3 className="text-xl font-black text-teal-800 uppercase tracking-tight">{group.name}</h3>
                                        <p className="text-xs font-bold text-teal-600">LOADING SHEET â€¢ {selectedDate} â€¢ {hubsData?.result?.find(h => h._id === selectedHub)?.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Total Drops</p>
                                        <p className="text-2xl font-black text-teal-700">{group.orders.length}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                                    <div className="p-6 border-r border-base-200 bg-gray-50/10">
                                        <h4 className="text-xs font-black uppercase text-gray-400 mb-4 flex items-center gap-2">
                                            <Package size={14}/> Items to Load
                                        </h4>
                                        <div className="space-y-3">
                                            {productList.map((p, idx) => {
                                                const crates = Math.ceil(p.count / (p.unitsPerCrate || 12));
                                                return (
                                                    <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100 shadow-sm transition-all hover:border-primary/30">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-gray-700">{p.name}</span>
                                                            {p.unitsPerCrate > 1 && (
                                                                <span className="text-[10px] font-black text-primary uppercase">
                                                                    {crates} {crates === 1 ? 'Crate' : 'Crates'} ({p.unitsPerCrate} per crate)
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-2xl font-black text-primary">{p.count}</span>
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase">{p.unit}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        <h4 className="text-xs font-black uppercase text-gray-400 mb-4 flex items-center gap-2">
                                            <Users size={14}/> Customer Sequence
                                        </h4>
                                        <div className="text-[11px] text-gray-500 space-y-2 max-h-[300px] overflow-y-auto no-print">
                                            {group.orders.map((o, idx) => (
                                                <div key={o._id} className="flex gap-2 items-start border-b border-gray-50 pb-2">
                                                    <span className="font-black text-gray-300">{idx + 1}.</span>
                                                    <div>
                                                        <p className="font-bold text-gray-800">{o.customer?.name}</p>
                                                        <p className="truncate opacity-70">{o.customer?.address?.fullAddress}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="hidden print:block text-xs italic text-gray-400 mt-10 border-t pt-4">
                                            Signature of Hub Manager: _______________________
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; font-size: 11pt; padding: 0; margin: 0; }
                    .rider-sheet-container { 
                        box-shadow: none !important; 
                        border: 2px solid #eee !important;
                        page-break-after: always !important;
                        margin-bottom: 0 !important;
                    }
                    .bg-base-200, .bg-teal-50 { background: #f0fdfa !important; -webkit-print-color-adjust: exact; }
                }
            `}} />
        </div>
    );
};

const ProductionLog = () => {
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);
    const [outputs, setOutputs] = useState({}); // { productId: qty }
    const [wastage, setWastage] = useState(0);
    const [notes, setNotes] = useState("");

    // Queries
    const { data: productsData } = useQuery({ queryKey: ["products"], queryFn: getAllProducts });
    const { data: statusData, isLoading, refetch } = useQuery({
        queryKey: ["logistics-status", selectedDate],
        queryFn: () => getDailyStockStatus(selectedDate),
    });

    // Submitting Log
    const mutation = useMutation({
        mutationFn: addProductionLog,
        onSuccess: () => {
            toast.success("Production log saved successfully!");
            refetch();
        },
        onError: (err) => toast.error(`Error: ${err.message}`)
    });

    // Populate initial state from existing log if found
    React.useEffect(() => {
        if (statusData?.details?.productionLogId) {
            // Need to fetch details perhaps, but we can also use the stock status metrics
            // For now, let's assume we want to enter fresh for the day or we'd need another endpoint
        }
    }, [statusData]);

    const handleSave = () => {
        const prodData = Object.entries(outputs).map(([pid, qty]) => ({
            product: pid,
            quantityProduced: parseInt(qty) || 0
        })).filter(p => p.quantityProduced > 0);

        if (prodData.length === 0) return toast.error("Please enter at least one product quantity");
        
        mutation.mutate({
            date: selectedDate,
            productsProduced: prodData,
            wastage: parseFloat(wastage) || 0,
            notes
        });
    };

    const metrics = statusData?.metrics || {};

    return (
        <div className="p-6 space-y-8">
            {/* Header / Date Pick */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-base-200 p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-3 rounded-lg text-primary">
                        <ClipboardCheck size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Daily Production Log</h2>
                        <p className="text-xs font-bold text-gray-500 uppercase">Input Actual Production Output</p>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    <input 
                        type="date" 
                        className="input input-bordered font-bold"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Input Form (2 Cols) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white border border-base-300 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-base-200 px-6 py-3 border-b border-base-300 font-bold uppercase text-xs text-gray-500 tracking-wider">
                            Actual Packing Output
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                {productsData?.result?.map(product => (
                                    <div key={product._id} className="flex items-center justify-between group">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-700">{product.name}</span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase">{product.unitValue}{product.unit} Unit</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="number" 
                                                placeholder="0"
                                                className="input input-bordered input-sm w-24 text-center font-black text-primary"
                                                value={outputs[product._id] || ""}
                                                onChange={(e) => setOutputs({...outputs, [product._id]: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-base-300 rounded-xl overflow-hidden shadow-sm">
                             <div className="bg-base-200 px-6 py-3 border-b border-base-300 font-bold uppercase text-xs text-gray-500 tracking-wider">
                                Wastage & Notes
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="form-control">
                                    <label className="label"><span className="label-text font-bold">Process Wastage (Liters)</span></label>
                                    <input 
                                        type="number" 
                                        className="input input-bordered" 
                                        value={wastage}
                                        onChange={(e) => setWastage(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label"><span className="label-text font-bold">Special Notes</span></label>
                                    <textarea 
                                        className="textarea textarea-bordered h-24"
                                        placeholder="Maintenance, batch issues, etc."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        <div className="bg-primary/5 rounded-xl border border-primary/20 p-8 flex flex-col justify-center items-center text-center space-y-6">
                            <Zap size={48} className="text-primary opacity-30" />
                            <div>
                                <h3 className="text-lg font-black text-primary uppercase">Ready to Sync?</h3>
                                <p className="text-sm text-gray-500 mt-2 font-medium">This will update your daily inventory metrics and calculate variance.</p>
                            </div>
                            <button 
                                className={`btn btn-primary btn-lg w-full gap-2 ${mutation.isPending ? 'loading' : ''}`}
                                onClick={handleSave}
                                disabled={mutation.isPending}
                            >
                                <ClipboardCheck size={20} /> Save Daily Log
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Metrics & Comparison (1 Col) */}
                <div className="space-y-6">
                     <div className="bg-gray-900 rounded-xl p-6 text-white shadow-xl">
                        <h4 className="text-xs font-black uppercase text-gray-400 mb-6 flex items-center gap-2">
                             Logistics Reconciliation
                        </h4>
                        
                        <div className="space-y-6">
                            <div className="flex justify-between items-center group">
                                <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">Collected Milk</span>
                                <span className="text-xl font-black">{metrics.collected?.toFixed(1) || 0} L</span>
                            </div>
                            <div className="flex justify-between items-center group">
                                <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">System Demand</span>
                                <span className="text-xl font-black text-blue-400">{metrics.demand?.toFixed(1) || 0} L</span>
                            </div>
                            <div className="flex justify-between items-center group">
                                <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">Actual Packed</span>
                                <span className="text-xl font-black text-primary">{metrics.packed?.toFixed(1) || 0} L</span>
                            </div>
                            
                            <div className="h-px bg-white/10 my-2"></div>

                            <div className="bg-white/5 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-gray-500">Inventory Variance</p>
                                    <p className="text-xs text-gray-400 italic">Surplus / Deficit</p>
                                </div>
                                <span className={`text-2xl font-black ${metrics.variance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {metrics.variance > 0 ? '+' : ''}{metrics.variance?.toFixed(1) || 0} L
                                </span>
                            </div>

                             <div className="bg-white/5 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-gray-500">Sales Gap</p>
                                    <p className="text-xs text-gray-400 italic">Production vs Sold</p>
                                </div>
                                <span className={`text-2xl font-black ${metrics.surplus >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {metrics.surplus > 0 ? '+' : ''}{metrics.surplus?.toFixed(1) || 0} L
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                        <div className="flex items-start gap-4">
                            <div className="bg-amber-100 p-2 rounded text-amber-600">
                                <TrendingUp size={20} />
                            </div>
                            <div>
                                <h5 className="font-bold text-amber-900 text-sm">Efficiency Tip</h5>
                                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                    Maintaining a variance below 2% is ideal for high-performing factory floors. High variance may indicate incorrect collection records or high processing wastage.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InventoryReconciliation = () => {
    const today = new Date().toISOString().split("T")[0];
    const [selectedDate, setSelectedDate] = useState(today);
    const [selectedHub, setSelectedHub] = useState("");

    const { data: hubsData } = useQuery({ queryKey: ["hubs"], queryFn: getHubs });
    
    // Fetch Forecast for the date (all hubs, will filter in UI)
    const { data: forecastData, isLoading: forecastLoading } = useQuery({
        queryKey: ["logistics-forecast", selectedDate],
        queryFn: () => getLogisticsForecast({ date: selectedDate }),
    });

    // Fetch Actual Orders for that hub to get "Loaded" and "Delivered"
    const { data: ordersData, isLoading: ordersLoading } = useQuery({
        queryKey: ["logistics-orders-recon", selectedDate, selectedHub],
        queryFn: () => getDeliveryOrders({ date: selectedDate, hub: selectedHub, limit: 1000 }),
        enabled: !!selectedHub
    });

    const reconData = React.useMemo(() => {
        if (!selectedHub || !forecastData?.hubs?.[selectedHub]) return [];
        
        const hubForecast = forecastData.hubs[selectedHub].products;
        const products = {};

        Object.entries(hubForecast).forEach(([pid, p]) => {
            products[pid] = {
                name: p.name,
                forecast: p.units || 0,
                loaded: 0,
                delivered: 0,
                unitsPerCrate: p.unitsPerCrate || 12
            };
        });

        ordersData?.result?.forEach(o => {
            o.products?.forEach(p => {
                const pid = p.product?._id;
                if (!pid) return;
                
                if (!products[pid]) {
                    products[pid] = { name: p.product.name, forecast: 0, loaded: 0, delivered: 0, unitsPerCrate: p.product.unitsPerCrate || 12 };
                }

                if (["confirmed", "out_for_delivery", "delivered"].includes(o.status)) {
                    products[pid].loaded += p.quantity;
                }
                
                if (o.status === "delivered") {
                    products[pid].delivered += p.quantity;
                }
            });
        });

        return Object.values(products);
    }, [selectedHub, forecastData, ordersData]);

    const assetSummary = React.useMemo(() => {
        if (!ordersData?.result) return { issued: 0, returned: 0 };
        return ordersData.result.reduce((acc, o) => ({
            issued: acc.issued + (o.bottlesIssued || 0),
            returned: acc.returned + (o.bottlesReturned || 0)
        }), { issued: 0, returned: 0 });
    }, [ordersData]);

    const isLoading = forecastLoading || ordersLoading;

    return (
        <div className="p-6 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-base-200 p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-3 rounded-lg text-primary">
                        <Scale size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Hub Reconciliation</h2>
                        <p className="text-xs font-bold text-gray-500 uppercase">Inventory & Asset Tracking</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                    <select 
                        className="select select-bordered font-bold"
                        value={selectedHub}
                        onChange={(e) => setSelectedHub(e.target.value)}
                    >
                        <option value="">Select Hub</option>
                        {hubsData?.result?.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                    </select>
                    <input 
                        type="date" 
                        className="input input-bordered font-bold"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>
            </div>

            {!selectedHub ? (
                <div className="p-20 text-center text-gray-400 bg-white border border-base-300 rounded-xl">
                    <Warehouse size={64} className="mx-auto mb-4 opacity-20" />
                    <p className="text-xl">Please select a Hub to view reconciliation</p>
                </div>
            ) : isLoading ? (
                <div className="p-20 flex flex-col items-center justify-center">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                    <p className="mt-4 text-sm font-bold uppercase text-gray-400">Syncing hub data...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white border border-base-300 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-base-200 px-6 py-4 border-b border-base-300 flex justify-between items-center">
                                <h3 className="font-black text-xs uppercase text-gray-500 tracking-widest">Product Reconciliation</h3>
                                <div className="flex gap-4">
                                    <span className="flex items-center gap-1 text-[10px] font-bold"><div className="w-2 h-2 rounded-full bg-blue-400"></div> Forecast</span>
                                    <span className="flex items-center gap-1 text-[10px] font-bold"><div className="w-2 h-2 rounded-full bg-primary"></div> Loaded</span>
                                    <span className="flex items-center gap-1 text-[10px] font-bold"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Delivered</span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="table w-full">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="text-xs uppercase font-black">Product</th>
                                            <th className="text-center text-xs uppercase font-black">Forecast</th>
                                            <th className="text-center text-xs uppercase font-black">Loaded</th>
                                            <th className="text-center text-xs uppercase font-black">Filled (%)</th>
                                            <th className="text-center text-xs uppercase font-black">Delivered</th>
                                            <th className="text-right text-xs uppercase font-black">Variance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {reconData.map((p, idx) => {
                                            const fillRate = p.forecast > 0 ? (p.loaded / p.forecast) * 100 : 0;
                                            const variance = p.delivered - p.loaded;
                                            return (
                                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                    <td>
                                                        <p className="font-bold text-gray-800">{p.name}</p>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase">
                                                            {p.unitsPerCrate} Per Crate • {Math.ceil(p.loaded / p.unitsPerCrate)} Crates Loaded
                                                        </p>
                                                    </td>
                                                    <td className="text-center font-bold text-blue-500">{p.forecast}</td>
                                                    <td className="text-center font-bold text-primary">{p.loaded}</td>
                                                    <td className="text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                                <div 
                                                                    className={`h-full ${fillRate >= 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                                                                    style={{ width: `${Math.min(fillRate, 100)}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-[9px] font-black">{Math.round(fillRate)}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center font-bold text-emerald-600">{p.delivered}</td>
                                                    <td className={`text-right font-black ${variance === 0 ? "text-gray-400" : "text-red-500"}`}>
                                                        {variance > 0 ? "+" : ""}{variance}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gray-900 rounded-xl p-6 text-white shadow-xl">
                            <h4 className="text-xs font-black uppercase text-gray-400 mb-6 flex items-center gap-2">
                                <Package size={14}/> Asset Reconciliation
                            </h4>
                            <div className="space-y-8">
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <p className="text-[10px] font-black uppercase text-gray-500">Bottle Circulation</p>
                                        <p className="text-xs font-bold">{assetSummary.returned} / {assetSummary.issued}</p>
                                    </div>
                                    <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                                        <div 
                                            className="bg-primary h-full rounded-full"
                                            style={{ width: `${assetSummary.issued > 0 ? (assetSummary.returned / assetSummary.issued) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-[9px] font-bold text-gray-400 mt-2 text-right uppercase tracking-wider">
                                        Return Rate: {assetSummary.issued > 0 ? Math.round((assetSummary.returned / assetSummary.issued) * 100) : 0}%
                                    </p>
                                </div>

                                <div className="pt-6 border-t border-white/5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-gray-400 uppercase">Bottles Issued</span>
                                        <span className="text-lg font-black">{assetSummary.issued}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-gray-400 uppercase">Bottles Collected</span>
                                        <span className="text-lg font-black text-primary">{assetSummary.returned}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                                        <span className="text-xs font-bold text-gray-400 uppercase">Bottles Owed</span>
                                        <span className="text-lg font-black text-red-400">{Math.max(0, assetSummary.issued - assetSummary.returned)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
