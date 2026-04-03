import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    getFactories, createFactory, updateFactory, deleteFactory,
    getDistricts, createDistrict, updateDistrict, deleteDistrict,
    getCities, createCity, updateCity, deleteCity,
    getAreas, createArea, updateArea, deleteArea,
    getHubs, createHub, updateHub, deleteHub,
    getDeliveryPoints, createDeliveryPoint, updateDeliveryPoint, deleteDeliveryPoint,
    getDeliveryRoutes, createDeliveryRoute, updateDeliveryRoute, deleteDeliveryRoute,
    getLogisticsForecast, getDailyStockStatus, addProductionLog,
    getTruckDrivers, updateTruckDriverHubs,
    getVehicles, getTruckTrips
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
    { key: "truck-routes", label: "Truck Routes", icon: Truck, singular: "Truck Route" },
    { key: "fleet", label: "Fleet & Trips", icon: Zap, singular: "Vehicle" },
    { key: "factories", label: "Factories", icon: Building, singular: "Factory" },
    { key: "districts", label: "Districts", icon: MapIcon, singular: "District" },
    { key: "cities", label: "Cities", icon: Globe, singular: "City" },
    { key: "hubs", label: "Hubs", icon: Warehouse, singular: "Hub" },
    { key: "areas", label: "Service Areas", icon: MapPin, singular: "Service Area" },
    { key: "deliveryPoints", label: "Delivery Points", icon: Package, singular: "Delivery Point" },
    { key: "deliveryRoutes", label: "Routes", icon: Route, singular: "Delivery Route" },
];

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
    const [expandedTrucks, setExpandedTrucks] = useState({});
    const [expandedHubs, setExpandedHubs] = useState({});

    const { data: forecast, isLoading, isError, refetch } = useQuery({
        queryKey: ["logistics-forecast", selectedDate],
        queryFn: () => getLogisticsForecast({ date: selectedDate }),
    });

    const handlePrint = () => window.print();
    const toggleTruck = (id) => setExpandedTrucks(p => ({ ...p, [id]: !p[id] }));
    const toggleHub = (id) => setExpandedHubs(p => ({ ...p, [id]: !p[id] }));

    if (isLoading) return <div className="p-10 flex justify-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

    if (isError) return (
        <div className="p-10 text-center text-error">
            <p>Failed to load forecast data.</p>
            <button className="btn btn-outline btn-error mt-4" onClick={() => refetch()}>Retry</button>
        </div>
    );

    const hierarchy = forecast?.hierarchy || {};
    const factoryProducts = hierarchy.factoryProducts || {};
    const trucks = hierarchy.trucks || {};
    const truckIds = trucks ? Object.keys(trucks) : [];
    const factoryProductIds = factoryProducts ? Object.keys(factoryProducts) : [];
    const activeTrucks = truckIds.length;
    const totalHubs = truckIds.reduce((sum, tid) => sum + Object.keys(trucks[tid]?.hubs || {}).length, 0);

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
                    <button className="btn btn-primary gap-2" onClick={handlePrint}>
                        <ClipboardList size={18} /> Print Factory Manifest
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => refetch()}>Refresh</button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="px-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="stats shadow bg-primary text-primary-content">
                    <div className="stat">
                        <div className="stat-title text-primary-content opacity-70">Factory Total</div>
                        <div className="stat-value">{forecast?.totalLiters || 0} L</div>
                        <div className="stat-desc text-primary-content opacity-70">For {selectedDate}</div>
                    </div>
                </div>
                <div className="stats shadow">
                    <div className="stat">
                        <div className="stat-title">Truck Routes</div>
                        <div className="stat-value">{activeTrucks}</div>
                        <div className="stat-desc">Active drivers</div>
                    </div>
                </div>
                <div className="stats shadow">
                    <div className="stat">
                        <div className="stat-title">Total Hubs</div>
                        <div className="stat-value">{totalHubs}</div>
                        <div className="stat-desc">Receiving drops</div>
                    </div>
                </div>
                <div className="stats shadow">
                    <div className="stat">
                        <div className="stat-title">Products</div>
                        <div className="stat-value">{factoryProductIds.length}</div>
                        <div className="stat-desc">Unique variants</div>
                    </div>
                </div>
            </div>

            {/* Factory-Level Summary Table */}
            <div className="px-4">
                <div className="bg-primary/5 border border-primary/20 rounded-xl overflow-hidden mb-6">
                    <div className="bg-primary text-primary-content px-6 py-3 font-bold uppercase text-sm tracking-wider">
                        🏭 Factory Production Plan — Grand Total
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table table-sm w-full">
                            <thead><tr>
                                <th>Product</th><th className="text-center">Units</th>
                                <th className="text-center">Volume (L)</th><th className="text-center">Crates</th>
                            </tr></thead>
                            <tbody>
                                {factoryProductIds.map(pid => {
                                    const p = factoryProducts[pid];
                                    const crates = Math.ceil(p.units / (p.unitsPerCrate || 12));
                                    return (
                                        <tr key={pid}>
                                            <td className="font-bold">{p.name}</td>
                                            <td className="text-center font-black text-primary text-lg">{p.units}</td>
                                            <td className="text-center">{p.liters.toFixed(1)} L</td>
                                            <td className="text-center"><span className="badge badge-primary badge-outline">{crates} crates</span></td>
                                        </tr>
                                    );
                                })}
                                {factoryProductIds.length === 0 && (
                                    <tr><td colSpan={4} className="text-center text-gray-400 py-8">No demand data for this date.</td></tr>
                                )}
                            </tbody>
                            <tfoot className="font-bold border-t-2">
                                <tr>
                                    <td>GRAND TOTAL</td>
                                    <td className="text-center text-primary">{factoryProductIds.reduce((s, pid) => s + factoryProducts[pid].units, 0)}</td>
                                    <td className="text-center text-primary">{forecast?.totalLiters} L</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* 4-Tier Drilldown: Truck → Hub → Rider */}
                <h3 className="text-sm font-black uppercase text-gray-500 tracking-widest mb-3 no-print">📦 Dispatch Breakdown by Truck Route</h3>
                <div className="space-y-4">
                    {truckIds.length === 0 && (
                        <div className="text-center text-gray-400 py-10 border border-dashed rounded-xl">
                            No truck drivers assigned to hubs yet. Assign hubs to Truck Driver employees to see the route breakdown here.
                        </div>
                    )}
                    {truckIds.map(tid => {
                        const truck = trucks[tid];
                        const hubIds = Object.keys(truck.hubs || {});
                        const truckProductIds = Object.keys(truck.products || {});
                        const isExpanded = expandedTrucks[tid] !== false;
                        return (
                            <div key={tid} className="border border-base-300 rounded-xl overflow-hidden shadow-sm">
                                <button className="w-full flex items-center justify-between px-5 py-3 bg-indigo-50 hover:bg-indigo-100 transition-colors" onClick={() => toggleTruck(tid)}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">🚚</span>
                                        <div className="text-left">
                                            <p className="font-black text-indigo-900 uppercase tracking-tight">{truck.name}</p>
                                            <p className="text-xs text-indigo-500">{hubIds.length} Hub{hubIds.length !== 1 ? 's' : ''} · {truckProductIds.reduce((s, pid) => s + (truck.products[pid]?.units || 0), 0)} units</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {truckProductIds.map(pid => (
                                            <div key={pid} className="text-right hidden md:block">
                                                <p className="text-xs text-indigo-400">{truck.products[pid].name}</p>
                                                <p className="font-black text-indigo-700">{truck.products[pid].units} units</p>
                                            </div>
                                        ))}
                                        <span className="text-indigo-400">{isExpanded ? '▲' : '▼'}</span>
                                    </div>
                                </button>
                                {isExpanded && (
                                    <div className="divide-y divide-base-200">
                                        {hubIds.map(hid => {
                                            const hub = truck.hubs[hid];
                                            const riderIds = Object.keys(hub.riders || {});
                                            const hubProductIds = Object.keys(hub.products || {});
                                            const isHubExpanded = expandedHubs[hid] !== false;
                                            return (
                                                <div key={hid} className="bg-white">
                                                    <button className="w-full flex items-center justify-between px-8 py-2.5 bg-teal-50/60 hover:bg-teal-100/60 transition-colors" onClick={() => toggleHub(hid)}>
                                                        <div className="flex items-center gap-2">
                                                            <span>🏪</span>
                                                            <div className="text-left">
                                                                <p className="font-bold text-teal-800">{hub.name}</p>
                                                                <p className="text-xs text-teal-500">{riderIds.length} Rider{riderIds.length !== 1 ? 's' : ''}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {hubProductIds.map(pid => (
                                                                <span key={pid} className="badge badge-outline badge-success text-xs">
                                                                    {hub.products[pid].name}: {hub.products[pid].units}
                                                                </span>
                                                            ))}
                                                            <span className="text-teal-400 text-xs">{isHubExpanded ? '▲' : '▼'}</span>
                                                        </div>
                                                    </button>
                                                    {isHubExpanded && (
                                                        <div className="bg-gray-50/30">
                                                            {riderIds.map(rid => {
                                                                const rider = hub.riders[rid];
                                                                const riderProductIds = Object.keys(rider.products || {});
                                                                return (
                                                                    <div key={rid} className="flex items-center justify-between px-12 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-100/50">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm">🏍️</span>
                                                                            <span className="font-semibold text-gray-700 text-sm">{rider.name}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 flex-wrap justify-end">
                                                                            {riderProductIds.map(pid => {
                                                                                const p = rider.products[pid];
                                                                                const crates = p.unitsPerCrate > 1 ? Math.ceil(p.units / p.unitsPerCrate) : null;
                                                                                return (
                                                                                    <div key={pid} className="text-right">
                                                                                        <span className="text-xs text-gray-400">{p.name}: </span>
                                                                                        <span className="font-black text-gray-800">{p.units}</span>
                                                                                        {crates && <span className="text-xs text-primary ml-1">({crates}cr)</span>}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; font-size: 12pt; }
                    .table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #ccc !important; }
                    th, td { border: 1px solid #ccc !important; padding: 8px !important; color: black !important; }
                    .sticky { position: static !important; }
                    .text-primary { color: black !important; }
                    .bg-primary, .bg-indigo-50, .bg-teal-50 { background: #f5f5f5 !important; -webkit-print-color-adjust: exact; }
                }
            `}} />

            {/* Print-Only Manifest */}
            <div className="hidden print:block">
                <DispatchManifest forecast={forecast} selectedDate={selectedDate} />
            </div>
        </div>
    );
};

// ========================
// DISPATCH MANIFEST (PRINT ONLY)
// ========================
const DispatchManifest = ({ forecast, selectedDate }) => {
    const hierarchy = forecast?.hierarchy || {};
    const trucks = hierarchy.trucks || {};
    const truckIds = Object.keys(trucks);

    if (truckIds.length === 0) return null;

    return (
        <div className="p-8 bg-white text-black min-h-screen">
            <div className="flex justify-between items-start border-b-4 border-black pb-6 mb-8">
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter">Factory Dispatch Manifest</h1>
                    <p className="text-xl font-bold mt-1">Date: {new Date(selectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="text-right">
                    <div className="bg-black text-white px-4 py-2 font-black text-2xl uppercase">STOI MILK PLANT</div>
                    <p className="text-sm font-bold mt-2">Logistics Control Tower • Tier 1</p>
                </div>
            </div>

            {truckIds.sort().map(tid => {
                const truck = trucks[tid];
                const hubs = Object.values(truck.hubs || {});
                const products = Object.values(truck.products || {});
                
                return (
                    <div key={tid} className="mb-12 break-inside-avoid">
                        <div className="bg-gray-100 p-4 border-2 border-black flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-2xl font-black uppercase">🚚 TRUCK: {truck.name}</h2>
                                <p className="font-bold text-gray-600">Assigned Hubs: {hubs.map(h => h.name).join(', ')}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-black uppercase">Total Load</p>
                                <p className="text-3xl font-black">{products.reduce((s, p) => s + p.units, 0)} Units</p>
                            </div>
                        </div>

                        <table className="w-full border-collapse border-2 border-black">
                            <thead>
                                <tr className="bg-gray-50 uppercase text-xs font-black">
                                    <th className="border-2 border-black p-2 text-left">Product</th>
                                    <th className="border-2 border-black p-2 text-center">Total Units</th>
                                    <th className="border-2 border-black p-2 text-center">Crates</th>
                                    <th className="border-2 border-black p-2 text-center">Loose Units</th>
                                    <th className="border-2 border-black p-2 w-32">Loaded [✓]</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(p => {
                                    const upc = p.unitsPerCrate || 12;
                                    const crates = Math.floor(p.units / upc);
                                    const loose = p.units % upc;
                                    return (
                                        <tr key={p.name} className="border-b border-black">
                                            <td className="border-2 border-black p-3 font-bold text-lg">{p.name}</td>
                                            <td className="border-2 border-black p-3 text-center text-2xl font-black">{p.units}</td>
                                            <td className="border-2 border-black p-3 text-center text-xl font-bold bg-gray-50">{crates}</td>
                                            <td className="border-2 border-black p-3 text-center text-xl font-bold">{loose}</td>
                                            <td className="border-2 border-black p-3"></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        
                        <div className="mt-4 flex justify-between text-xs font-bold uppercase text-gray-500">
                            <p>Driver Signature: _______________________</p>
                            <p>Loader ID: _______________________</p>
                            <p>Dispatch Time: _______________________</p>
                        </div>
                    </div>
                );
            })}

            <div className="mt-20 pt-10 border-t border-dashed border-gray-300 text-center text-xs text-gray-400 uppercase font-bold">
                End of Dispatch Manifest for {selectedDate} • System Generated by Stoi Milk App
            </div>
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

    const riderGroups = useMemo(() => {
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
    useEffect(() => {
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

    const reconData = useMemo(() => {
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

    const assetSummary = useMemo(() => {
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

// ========================
// TRUCK ROUTE MANAGEMENT
// ========================
const TruckRouteManagement = () => {
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [isManageHubsOpen, setIsManageHubsOpen] = useState(false);

    // Queries
    const { data: driversData, isLoading: driversLoading, refetch: refetchDrivers } = useQuery({ 
        queryKey: ["truck-drivers"], queryFn: getTruckDrivers 
    });
    const { data: hubsData, isLoading: hubsLoading } = useQuery({ 
        queryKey: ["hubs"], queryFn: getHubs 
    });

    const updateHubsMutation = useMutation({
        mutationFn: ({ id, hubs }) => updateTruckDriverHubs(id, hubs),
        onSuccess: () => {
            toast.success("Hub assignments updated");
            refetchDrivers();
            setIsManageHubsOpen(false);
        },
        onError: (err) => toast.error(err.message)
    });

    if (driversLoading) return <div className="p-10 flex justify-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

    const drivers = driversData?.result || [];
    const allHubs = hubsData?.result || [];

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center bg-base-200 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600">
                        <Truck size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Truck Route Mapping</h2>
                        <p className="text-xs font-bold text-gray-500 uppercase">Map Hubs to Truck Drivers</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {drivers.map(driver => (
                    <div key={driver._id} className="card bg-white border border-base-300 shadow-sm hover:shadow-md transition-shadow">
                        <div className="card-body p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="avatar placeholder">
                                        <div className="bg-neutral text-neutral-content rounded-full w-10">
                                            <span className="text-xs">{driver.name.charAt(0)}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{driver.name}</h3>
                                        <p className="text-xs text-gray-500">{driver.mobile}</p>
                                    </div>
                                </div>
                                <div className="badge badge-indigo badge-outline text-[10px] font-black tracking-widest uppercase">Driver</div>
                            </div>

                            <div className="space-y-2 mb-6">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    <Warehouse size={10} /> Assigned Hubs ({driver.hubs?.length || 0})
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {driver.hubs?.map(hub => (
                                        <span key={hub._id} className="badge badge-ghost badge-sm font-bold text-gray-600 border-gray-200">
                                            {hub.name}
                                        </span>
                                    ))}
                                    {(!driver.hubs || driver.hubs.length === 0) && (
                                        <span className="text-xs text-gray-400 italic">No hubs assigned</span>
                                    )}
                                </div>
                            </div>

                            <div className="card-actions justify-end pt-4 border-t border-gray-50">
                                <button 
                                    className="btn btn-sm btn-outline btn-primary gap-2"
                                    onClick={() => {
                                        setSelectedDriver(driver);
                                        setIsManageHubsOpen(true);
                                    }}
                                >
                                    <Edit size={14} /> Manage Hubs
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {drivers.length === 0 && (
                    <div className="col-span-full p-20 text-center border-2 border-dashed rounded-2xl border-gray-200">
                        <Users size={48} className="mx-auto mb-4 text-gray-300 opacity-50" />
                        <p className="text-gray-500 font-medium">No active Truck Drivers found in the system.</p>
                        <p className="text-xs text-gray-400 mt-1">Assign the 'TRUCK_DRIVER' role to employees to list them here.</p>
                    </div>
                )}
            </div>

            {/* Manage Hubs Modal */}
            {isManageHubsOpen && (
                <div className="modal modal-open">
                    <div className="modal-box w-11/12 max-w-2xl bg-white border border-indigo-100 shadow-2xl p-0 overflow-hidden">
                        <div className="bg-indigo-600 p-6 text-white">
                            <h3 className="font-black text-xl uppercase tracking-tight flex items-center gap-2">
                                <Truck size={24} /> Assign Hubs to {selectedDriver?.name}
                            </h3>
                            <p className="text-xs text-indigo-100 mt-1 font-bold">Select the hubs this driver will collect milk for from the factory.</p>
                        </div>
                        
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {allHubs.map(hub => {
                                    const isAssigned = selectedDriver?.hubs?.some(h => (h._id === hub._id || h === hub._id));
                                    return (
                                        <label key={hub._id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-indigo-50/50 cursor-pointer transition-all active:scale-95 shadow-sm">
                                            <input 
                                                type="checkbox" 
                                                className="checkbox checkbox-primary checkbox-sm"
                                                defaultChecked={isAssigned}
                                                onChange={(e) => {
                                                    const currentHubs = selectedDriver?.hubs?.map(h => (h._id || h)) || [];
                                                    const updatedHubs = e.target.checked 
                                                        ? [...currentHubs, hub._id]
                                                        : currentHubs.filter(id => id !== hub._id);
                                                    setSelectedDriver({ ...selectedDriver, hubs: updatedHubs });
                                                }}
                                            />
                                            <div className="flex flex-col">
                                                <span className="font-black text-gray-800 text-sm uppercase">{hub.name}</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{hub.city?.name}</span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="modal-action p-6 pt-2 bg-gray-50 flex gap-3">
                            <button className="btn btn-ghost" onClick={() => setIsManageHubsOpen(false)}>Cancel</button>
                            <button 
                                className="btn btn-primary px-8" 
                                onClick={() => updateHubsMutation.mutate({ 
                                    id: selectedDriver._id, 
                                    hubs: selectedDriver.hubs 
                                })}
                                disabled={updateHubsMutation.isPending}
                            >
                                {updateHubsMutation.isPending ? "Saving..." : "Apply Mapping"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==============================
// MAIN LOGISTICS DASHBOARD ENTRY
// ==============================
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
                    <p className="text-sm text-gray-500 mt-1">Factory → District → City → Hub → Area → Delivery Point</p>
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
                {activeTab === "truck-routes" && <TruckRouteManagement />}
                {activeTab === "factories" && <div className="p-4"><FactoriesList onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }} /></div>}
                {activeTab === "districts" && <div className="p-4"><DistrictsList onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }} /></div>}
                {activeTab === "cities" && <div className="p-4"><CitiesList onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }} /></div>}
                {activeTab === "hubs" && <div className="p-4"><HubsList onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }} /></div>}
                {activeTab === "areas" && <div className="p-4"><ServiceAreaManagement /></div>}
                {activeTab === "deliveryPoints" && <div className="p-4"><DeliveryPointsList onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }} /></div>}
                {activeTab === "deliveryRoutes" && <div className="p-4"><DeliveryRoutesList onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }} /></div>}
                {activeTab === "fleet" && <FleetManagement />}
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
// FLEET & TRIP MANAGEMENT
// ========================
const FleetManagement = () => {
    const [view, setView] = useState("vehicles"); // "vehicles" or "trips"
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex gap-2">
                    <button 
                        className={`btn btn-sm ${view === "vehicles" ? "btn-primary shadow-lg" : "btn-ghost"}`}
                        onClick={() => setView("vehicles")}
                    >
                        <Truck size={16} className="mr-2" /> Vehicles
                    </button>
                    <button 
                        className={`btn btn-sm ${view === "trips" ? "btn-primary shadow-lg" : "btn-ghost"}`}
                        onClick={() => setView("trips")}
                    >
                        <Route size={16} className="mr-2" /> Active Trips
                    </button>
                </div>
                {view === "vehicles" && (
                    <button className="btn btn-sm btn-primary" onClick={() => { setEditingVehicle(null); setIsVehicleModalOpen(true); }}>
                        <Plus size={16} /> Add Vehicle
                    </button>
                )}
            </div>

            {view === "vehicles" ? <VehiclesList onEdit={(v) => { setEditingVehicle(v); setIsVehicleModalOpen(true); }} /> : <TripsList />}

            {/* Vehicle Modal Simple Placeholder */}
            {isVehicleModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-sm rounded-[2rem]">
                        <h3 className="font-black text-xl text-gray-800 uppercase tracking-tight mb-2">
                            {editingVehicle ? "Update Fleet" : "Add New Vehicle"}
                        </h3>
                        <p className="py-4 text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                            Registration details for operational tracking.
                        </p>
                        <div className="space-y-4">
                             <input type="text" placeholder="Plate Number (e.g. MH 12 AB 1234)" className="input input-bordered w-full font-black uppercase" />
                             <input type="text" placeholder="Model (e.g. Tata 407)" className="input input-bordered w-full" />
                        </div>
                        <div className="modal-action">
                            <button className="btn btn-ghost" onClick={() => setIsVehicleModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary px-8" onClick={() => setIsVehicleModalOpen(false)}>Save Asset</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const VehiclesList = ({ onEdit }) => {
    const { data: vehiclesData, isLoading } = useQuery({ queryKey: ["vehicles"], queryFn: getVehicles });
    
    if (isLoading) return <div className="p-10 flex justify-center"><span className="loading loading-spinner text-primary"></span></div>;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(vehiclesData?.result || []).map(v => (
                <div key={v._id} className="card bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden">
                    <div className="card-body p-6">
                        <div className="flex justify-between items-start">
                            <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 transition-transform group-hover:scale-110">
                                <Truck size={28} />
                            </div>
                            <div className="badge badge-indigo badge-outline text-[10px] font-black tracking-widest uppercase py-3 px-4">{v.type || "Truck"}</div>
                        </div>
                        
                        <div className="mt-6">
                            <h3 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">{v.plateNumber}</h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{v.model}</p>
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-px bg-gray-100 rounded-2xl overflow-hidden border border-gray-100">
                            <div className="bg-gray-50/50 p-4">
                                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Status</p>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-xs font-black text-gray-700 uppercase">Active</span>
                                </div>
                            </div>
                            <div className="bg-gray-50/50 p-4">
                                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Fleet ID</p>
                                <span className="text-xs font-black text-gray-700 uppercase">VH-{v._id.slice(-4)}</span>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-between items-center bg-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-indigo-100">
                             <div>
                                 <p className="text-[9px] font-bold opacity-70 uppercase mb-1">Odometer</p>
                                 <p className="text-lg font-black">{v.currentKm?.toLocaleString() || 0} <span className="text-[10px] opacity-70">KM</span></p>
                             </div>
                             <div className="text-right">
                                 <p className="text-[9px] font-bold opacity-70 uppercase mb-1">Capacity</p>
                                 <p className="text-lg font-black">{v.capacityLiters || 0} <span className="text-[10px] opacity-70">L</span></p>
                             </div>
                        </div>
                    </div>
                </div>
            ))}
            {vehiclesData?.result?.length === 0 && (
                <div className="col-span-full p-20 text-center border-2 border-dashed border-gray-100 rounded-[3rem] bg-gray-50/30">
                    <Truck size={48} className="mx-auto mb-4 text-gray-200" />
                    <p className="text-lg font-black text-gray-300 uppercase tracking-tight">No Vehicles Registered</p>
                </div>
            )}
        </div>
    );
};

const TripsList = () => {
    const { data: tripsData, isLoading } = useQuery({ queryKey: ["trips"], queryFn: () => getTruckTrips({}) });
    
    if (isLoading) return <div className="p-10 flex justify-center"><span className="loading loading-spinner text-primary"></span></div>;

    return (
        <div className="grid grid-cols-1 gap-6">
            {(tripsData?.result || []).map(t => (
                <div key={t._id} className="bg-white rounded-[2rem] border border-gray-100 p-6 flex flex-wrap lg:flex-nowrap gap-8 items-center hover:shadow-2xl transition-all group">
                    <div className="flex-shrink-0 w-24 h-24 bg-primary/10 rounded-[1.5rem] flex flex-col items-center justify-center text-primary border border-primary/10 shadow-inner">
                        <span className="text-[10px] font-black uppercase opacity-60">Status</span>
                        <div className={`mt-1 font-black uppercase text-[10px] px-2 py-0.5 rounded-full ${
                             t.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                             t.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                             {t.status}
                        </div>
                    </div>

                    <div className="flex-grow space-y-2">
                        <div className="flex items-center gap-3">
                             <h4 className="text-xl font-black text-gray-800 tracking-tight">{t.tripId}</h4>
                             <span className="text-[10px] font-bold text-gray-300">â€¢ {new Date(t.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <Users size={14} className="text-gray-400" />
                                <span className="text-sm font-bold text-gray-600">{t.driver?.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Truck size={14} className="text-gray-400" />
                                <span className="text-sm font-black text-gray-800 uppercase">{t.vehicle?.plateNumber}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-12 pr-10 border-r border-gray-100">
                        <div>
                             <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Start Km</p>
                             <p className="text-lg font-black text-gray-700">{t.startKm.toLocaleString()}</p>
                        </div>
                        <div>
                             <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Distance</p>
                             <p className="text-lg font-black text-primary">{t.distanceTravelled || 0} km</p>
                        </div>
                        <div>
                             <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Items Confirmed</p>
                             <span className={`text-lg font-black ${t.isConfirmed ? 'text-green-500' : 'text-gray-300'}`}>
                                 {t.isConfirmed ? 'YES' : 'PENDING'}
                             </span>
                        </div>
                    </div>

                    <button className="btn btn-circle btn-lg btn-ghost group-hover:bg-primary group-hover:text-white transition-all">
                         <Zap size={24} />
                    </button>
                </div>
            ))}
            {tripsData?.result?.length === 0 && (
                <div className="p-20 text-center border-2 border-dashed border-gray-100 rounded-[3rem] bg-gray-50/30">
                    <Route size={48} className="mx-auto mb-4 text-gray-200" />
                    <p className="text-lg font-black text-gray-300 uppercase tracking-tight">No Trip Logs Found</p>
                </div>
            )}
        </div>
    );
};
