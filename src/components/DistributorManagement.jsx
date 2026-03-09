import React, { useState, useEffect } from "react";
import { axiosInstance as axios } from "../lib/axios";
import { Plus, Search, Edit2, Trash2, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const DistributorManagement = () => {
    const [distributors, setDistributors] = useState([]);
    const [hubs, setHubs] = useState([]);
    const [deliveryPoints, setDeliveryPoints] = useState([]);

    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const initialFormData = {
        name: "",
        contactPerson: "",
        mobile: "",
        email: "",
        commissionRate: "",
        password: "password123",
        address: {
            city: "",
            fullAddress: ""
        },
        hubs: [],
        deliveryPoints: [],
    };

    const [formData, setFormData] = useState(initialFormData);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [distRes, hubsRes, dpRes] = await Promise.all([
                axios.get("/api/distributors"),
                axios.get("/api/logistics/hubs"),
                axios.get("/api/logistics/delivery-points"),
            ]);

            setDistributors(distRes.data.data || []);
            setHubs(hubsRes.data.result || []);
            setDeliveryPoints(dpRes.data.result || []);

        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name.includes(".")) {
            const [parent, child] = name.split(".");
            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleMultiSelectChange = (e, field) => {
        const options = e.target.options;
        const selectedValues = [];
        for (let i = 0; i < options.length; i++) {
            if (options[i].selected) {
                selectedValues.push(options[i].value);
            }
        }
        setFormData(prev => ({ ...prev, [field]: selectedValues }));
    };

    const openEditModal = (dist) => {
        setEditingId(dist._id);
        setFormData({
            name: dist.name || "",
            contactPerson: dist.contactPerson || "",
            mobile: dist.mobile || "",
            email: dist.email || "",
            commissionRate: dist.commissionRate || "",
            password: "",
            address: {
                city: dist.address?.city || "",
                fullAddress: dist.address?.fullAddress || ""
            },
            hubs: dist.hubs?.map(h => h._id || h) || [],
            deliveryPoints: dist.deliveryPoints?.map(dp => dp._id || dp) || [],
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);

            if (editingId) {
                await axios.put(`/api/distributors/${editingId}`, formData);
                toast.success("Distributor updated successfully");
            } else {
                await axios.post("/api/distributors", formData);
                toast.success("Distributor added successfully");
            }

            setShowModal(false);
            setEditingId(null);
            setFormData(initialFormData);

            // Refresh list
            const { data } = await axios.get("/api/distributors");
            setDistributors(data.data || []);
        } catch (error) {
            console.error("Error saving distributor:", error);
            toast.error(error.response?.data?.message || "Failed to save distributor");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to deactivate this distributor?")) return;
        try {
            await axios.delete(`/api/distributors/${id}`);
            toast.success("Distributor deactivated");
            const { data } = await axios.get("/api/distributors");
            setDistributors(data.data || []);
        } catch (error) {
            toast.error("Failed to deactivate distributor");
        }
    };

    // Helper to render coverage info in table
    const renderCoverage = (dist) => {
        const parts = [];
        if (dist.hubs && dist.hubs.length > 0) {
            parts.push(`Hubs: ${dist.hubs.map(h => h.name || h).join(", ")}`);
        }
        if (dist.deliveryPoints && dist.deliveryPoints.length > 0) {
            parts.push(`DPs: ${dist.deliveryPoints.map(dp => dp.name || dp).join(", ")}`);
        }
        return parts.length > 0 ? parts.join(" | ") : "None";
    };

    // Filter delivery points by selected hubs
    const filteredDeliveryPoints = deliveryPoints.filter(dp => {
        if (formData.hubs.length === 0) return true;
        const hubId = dp.hub?._id || dp.hub;
        return formData.hubs.includes(hubId);
    });

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Distributors</h1>
                    <p className="text-sm text-gray-500 mt-1">Assign distributors to hubs and delivery points</p>
                </div>
                <button
                    onClick={() => { setEditingId(null); setFormData(initialFormData); setShowModal(true); }}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus size={18} />
                    Add Distributor
                </button>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th>Name</th>
                                <th>Contact</th>
                                <th>Coverage</th>
                                <th>Commission</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-8">
                                        <Loader2 className="animate-spin mx-auto text-primary" />
                                    </td>
                                </tr>
                            ) : distributors.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-gray-500">
                                        No distributors found. Add one to get started.
                                    </td>
                                </tr>
                            ) : (
                                distributors.map((dist) => (
                                    <tr key={dist._id}>
                                        <td>
                                            <div className="font-medium text-gray-900">{dist.name}</div>
                                            <div className="text-xs text-gray-500">{dist.email}</div>
                                        </td>
                                        <td>
                                            <div className="font-medium">{dist.contactPerson}</div>
                                            <div className="text-xs text-gray-500">{dist.mobile}</div>
                                        </td>
                                        <td className="max-w-xs truncate" title={renderCoverage(dist)}>
                                            {renderCoverage(dist)}
                                        </td>
                                        <td>{dist.commissionRate}%</td>
                                        <td>
                                            <span className={`badge ${dist.isActive ? 'badge-success' : 'badge-ghost'}`}>
                                                {dist.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button className="btn btn-ghost btn-xs text-blue-600" onClick={() => openEditModal(dist)}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button className="btn btn-ghost btn-xs text-red-600" onClick={() => handleDelete(dist._id)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editingId ? "Edit Distributor" : "Add New Distributor"}
                            </h2>
                            <button onClick={() => { setShowModal(false); setEditingId(null); }} className="btn btn-circle btn-ghost btn-sm">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">Business Name</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        className="input input-bordered w-full"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="e.g. STOI Distribution Area 1"
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">Contact Person</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="contactPerson"
                                        className="input input-bordered w-full"
                                        value={formData.contactPerson}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">Mobile Number</span>
                                    </label>
                                    <input
                                        type="tel"
                                        name="mobile"
                                        className="input input-bordered w-full"
                                        value={formData.mobile}
                                        onChange={handleInputChange}
                                        required
                                        pattern="[0-9]{10}"
                                        placeholder="10 digit number"
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">Email</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        className="input input-bordered w-full"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">Commission Rate (%)</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="commissionRate"
                                        className="input input-bordered w-full"
                                        value={formData.commissionRate}
                                        onChange={handleInputChange}
                                        step="0.1"
                                        min="0"
                                        max="100"
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">City</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="address.city"
                                        className="input input-bordered w-full"
                                        value={formData.address?.city}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                {/* Coverage — Hubs */}
                                <div className="form-control md:col-span-2 border-t pt-4">
                                    <h3 className="font-semibold text-gray-700 mb-2">Coverage Area</h3>

                                    <label className="label">
                                        <span className="label-text font-medium">Assign Hubs (Hold Ctrl/Cmd to select multiple)</span>
                                    </label>
                                    <select
                                        multiple
                                        className="select select-bordered w-full h-32"
                                        value={formData.hubs}
                                        onChange={(e) => handleMultiSelectChange(e, 'hubs')}
                                    >
                                        {hubs.map(hub => (
                                            <option key={hub._id} value={hub._id}>
                                                {hub.name} {hub.area?.name ? `(${hub.area.name})` : ""} {hub.area?.city?.name ? `— ${hub.area.city.name}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">Selected: {formData.hubs.length} hub(s)</p>
                                </div>

                                {/* Coverage — Delivery Points (filtered by selected hubs) */}
                                <div className="form-control md:col-span-2">
                                    <label className="label">
                                        <span className="label-text font-medium">Assign Delivery Points (optional, filtered by selected hubs)</span>
                                    </label>
                                    <select
                                        multiple
                                        className="select select-bordered w-full h-32"
                                        value={formData.deliveryPoints}
                                        onChange={(e) => handleMultiSelectChange(e, 'deliveryPoints')}
                                    >
                                        {filteredDeliveryPoints.map(dp => (
                                            <option key={dp._id} value={dp._id}>
                                                {dp.name} {dp.code ? `(${dp.code})` : ""} — {dp.hub?.name || ""}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">Selected: {formData.deliveryPoints.length} delivery point(s)</p>
                                </div>

                                <div className="form-control md:col-span-2 border-t pt-2">
                                    <label className="label">
                                        <span className="label-text font-medium">Full Address</span>
                                    </label>
                                    <textarea
                                        name="address.fullAddress"
                                        className="textarea textarea-bordered h-24"
                                        value={formData.address?.fullAddress}
                                        onChange={handleInputChange}
                                        placeholder="Complete address..."
                                    ></textarea>
                                </div>
                            </div>

                            <div className="modal-action mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); setEditingId(null); }}
                                    className="btn btn-ghost"
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary min-w-[120px]"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        editingId ? 'Update Distributor' : 'Create Distributor'
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

export default DistributorManagement;
