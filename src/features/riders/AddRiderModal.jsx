import { useState, useEffect } from "react";
import { X, Save, Loader } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRider, updateRider } from "../../shared/api/riders";
import { getHubs, getAreas, getDeliveryPoints } from "../../shared/api/logistics";
import toast from "react-hot-toast";

export const AddRiderModal = ({ isOpen, onClose, rider }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: "",
        mobile: "",
        password: "",
        email: "",
        employeeType: "Full Time",
        hub: "",
        areas: [],
        deliveryPoints: [],
        walletBalance: ""
    });

    // Fetch logistics data for assignment dropdowns
    const { data: hubsData } = useQuery({ queryKey: ["hubs"], queryFn: getHubs, enabled: isOpen });
    const { data: areasData } = useQuery({ queryKey: ["areas"], queryFn: getAreas, enabled: isOpen });
    const { data: dpData } = useQuery({ queryKey: ["deliveryPoints"], queryFn: getDeliveryPoints, enabled: isOpen });

    const allHubs = hubsData?.result || [];
    const allAreas = areasData?.result || [];
    const allDeliveryPoints = dpData?.result || [];

    // Filter areas based on selected hub (hub.areas contains the area IDs)
    const selectedHub = allHubs.find(h => h._id === formData.hub);
    const hubAreaIds = selectedHub?.areas?.map(a => a._id || a) || [];
    const filteredAreas = formData.hub
        ? allAreas.filter(a => hubAreaIds.includes(a._id))
        : allAreas;

    // Filter delivery points based on selected hub
    const filteredDPs = formData.hub
        ? allDeliveryPoints.filter(dp => (dp.hub?._id || dp.hub) === formData.hub)
        : allDeliveryPoints;

    // Reset or Populate form
    useEffect(() => {
        if (isOpen) {
            if (rider) {
                setFormData({
                    name: rider.name || "",
                    mobile: rider.mobile || "",
                    password: "",
                    email: rider.email || "",
                    employeeType: rider.employeeType || "Full Time",
                    hub: rider.hub?._id || rider.hub || "",
                    areas: rider.areas?.map(a => a._id || a) || [],
                    deliveryPoints: rider.deliveryPoints?.map(dp => dp._id || dp) || [],
                    walletBalance: rider.outstandingAmount !== undefined ? rider.outstandingAmount : (rider.walletBalance || 0)
                });
            } else {
                setFormData({ name: "", mobile: "", password: "", email: "", employeeType: "Full Time", hub: "", areas: [], deliveryPoints: [], walletBalance: 0 });
            }
        }
    }, [isOpen, rider]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleHubChange = (e) => {
        const hubId = e.target.value;
        // When hub changes, reset area and DP selections
        setFormData(prev => ({ ...prev, hub: hubId, areas: [], deliveryPoints: [] }));
    };

    const handleMultiSelectChange = (e, field) => {
        const selected = [];
        for (const opt of e.target.options) {
            if (opt.selected) selected.push(opt.value);
        }
        setFormData(prev => ({ ...prev, [field]: selected }));
    };

    const { mutate, isPending } = useMutation({
        mutationFn: async (data) => {
            if (rider) {
                return await updateRider(rider._id, data);
            } else {
                return await createRider(data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["riders"] });
            if (rider) {
                queryClient.invalidateQueries({ queryKey: ["rider", rider._id] });
            }
            toast.success(rider ? "Rider updated successfully" : "Rider added successfully");
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "Operation failed");
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.mobile) {
            toast.error("Name and Mobile are required");
            return;
        }
        mutate(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-800">{rider ? "Edit Rider" : "Add New Rider"}</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                                placeholder="Enter rider name"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                            <input
                                type="tel"
                                name="mobile"
                                value={formData.mobile}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                                placeholder="10-digit mobile number"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                                placeholder="rider@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                            <select
                                name="employeeType"
                                value={formData.employeeType}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                            >
                                <option value="Full Time">Full Time</option>
                                <option value="Part Time">Part Time</option>
                                <option value="Contract">Contract</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                type="text"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                                placeholder={rider ? "Leave empty to keep unchanged" : "Set initial password"}
                            />
                        </div>

                        {/* ===== Assignment Section ===== */}
                        <div className="border-t border-gray-100 pt-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">📍 Assignment</h3>

                            {/* Hub Selection */}
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hub</label>
                                <select
                                    name="hub"
                                    value={formData.hub}
                                    onChange={handleHubChange}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                                >
                                    <option value="">Select Hub</option>
                                    {allHubs.map(h => (
                                        <option key={h._id} value={h._id}>
                                            {h.name} {h.areas?.length > 0 ? `(${h.areas.map(a => a.name).join(", ")})` : ""}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-400 mt-1">Assign the rider to a hub for primary coverage</p>
                            </div>

                            {/* Area Selection (filtered by hub) */}
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Areas {formData.hub ? "(within selected hub)" : "(all)"}
                                </label>
                                <select
                                    multiple
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all h-24"
                                    value={formData.areas}
                                    onChange={(e) => handleMultiSelectChange(e, 'areas')}
                                >
                                    {filteredAreas.map(a => (
                                        <option key={a._id} value={a._id}>
                                            {a.name} ({a.city?.name || ""})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-400 mt-1">
                                    {formData.areas.length} area(s) selected · Hold Ctrl/Cmd to select multiple
                                </p>
                            </div>

                            {/* Delivery Point Selection (filtered by hub) */}
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Delivery Points {formData.hub ? "(within selected hub)" : "(all)"}
                                </label>
                                <select
                                    multiple
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all h-24"
                                    value={formData.deliveryPoints}
                                    onChange={(e) => handleMultiSelectChange(e, 'deliveryPoints')}
                                >
                                    {filteredDPs.map(dp => (
                                        <option key={dp._id} value={dp._id}>
                                            {dp.name} {dp.code ? `(${dp.code})` : ""} — {dp.hub?.name || ""}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-400 mt-1">
                                    {formData.deliveryPoints.length} delivery point(s) selected · Hold Ctrl/Cmd to select multiple
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Outstanding Balance (₹)</label>
                            <input
                                type="number"
                                name="walletBalance"
                                value={formData.walletBalance}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                                placeholder="0"
                            />
                            <p className="text-xs text-gray-500 mt-1">Amount the rider holds (Positive = Owed to Admin).</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm shadow-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPending ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
                            {rider ? "Update Rider" : "Save Rider"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
