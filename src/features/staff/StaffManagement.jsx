import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../../shared/api/axios";
import { getRoles } from "../../shared/api/roles";
import { Plus, Edit2, Search, UserPlus, Shield, Share2 } from "lucide-react";
import { toast } from "react-hot-toast";

const STAFF_ROLES = [
    "SUPERADMIN", "ADMIN", "LAB_INCHARGE", "FACTORY_INCHARGE",
    "HUB_INCHARGE", "STOCK_AREA_INCHARGE", "DELIVERY_MANAGER",
    "FINANCE_TEAM", "CUSTOMER_RELATIONS", "FIELD_MARKETING",
    "ONLINE_MARKETING", "MILK_COLLECTION_PERSON", "TRUCK_DRIVER"
];

// Reusing createUser/updateUser API calls but locally defined for simplicity or imported if available
const createStaff = async (data) => {
    const res = await axiosInstance.post("/api/users", { ...data });
    return res.data;
};

const updateStaff = async ({ id, data }) => {
    const res = await axiosInstance.put(`/api/users/${id}`, data);
    return res.data;
};

const getStaff = async () => {
    const res = await axiosInstance.get("/api/users?type=employee");
    return res.data;
};

export default function StaffManagement() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [search, setSearch] = useState("");

    // Form State
    const [formData, setFormData] = useState({
        name: "", mobile: "", email: "", password: "",
        role: "ADMIN", customRole: ""
    });

    const { data: staffData, isLoading } = useQuery({
        queryKey: ["staff"],
        queryFn: getStaff
    });

    const { data: rolesData } = useQuery({
        queryKey: ["roles"],
        queryFn: getRoles
    });

    const staff = staffData?.result?.filter(u => u.role !== 'RIDER') || [];
    const customRoles = rolesData?.result || [];

    useEffect(() => {
        if (isModalOpen) {
            if (editingStaff) {
                setFormData({
                    name: editingStaff.name,
                    mobile: editingStaff.mobile,
                    email: editingStaff.email || "",
                    password: "", // Leave blank to keep current
                    role: editingStaff.role,
                    customRole: editingStaff.customRole?._id || editingStaff.customRole || ""
                });
            } else {
                setFormData({
                    name: "", mobile: "", email: "", password: "",
                    role: "ADMIN", customRole: ""
                });
            }
        }
    }, [isModalOpen, editingStaff]);

    const mutationOptions = {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["staff"] });
            setIsModalOpen(false);
            setEditingStaff(null);
            toast.success(editingStaff ? "Staff updated successfully" : "Staff created successfully");
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Operation failed");
        }
    };

    const createMutation = useMutation({ mutationFn: createStaff, ...mutationOptions });
    const updateMutation = useMutation({ mutationFn: updateStaff, ...mutationOptions });

    const handleSave = () => {
        if (!formData.name || !formData.mobile || !formData.role) {
            return toast.error("Name, Mobile and System Role are required");
        }

        const payload = { ...formData };
        if (!payload.password) delete payload.password; // Don't send empty password
        if (!payload.customRole) payload.customRole = null; // Clear if empty

        if (editingStaff) {
            updateMutation.mutate({ id: editingStaff._id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const filteredStaff = staff.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.mobile.includes(search) ||
        s.email?.toLowerCase().includes(search.toLowerCase())
    );

    const handleCopyAppLink = (member) => {
        let path = "/administrator/login";
        if (member.role === 'FIELD_OFFICER' || member.role === 'FIELD_MARKETING') {
            path = "/fieldsales/login";
        }
        const link = `${window.location.origin}${path}`;
        navigator.clipboard.writeText(link);
        toast.success(`Login link copied for ${member.name}`);
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading staff...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Staff Management</h1>
                    <p className="text-sm text-gray-500">Manage internal team members and their access roles</p>
                </div>
                <button
                    onClick={() => { setEditingStaff(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                    <Plus size={18} />
                    Add New Staff
                </button>
            </div>

            {/* Search */}
            <div className="mb-6 relative max-w-md">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search by name, mobile or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
            </div>

            {/* Staff Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-600">Employee</th>
                            <th className="px-6 py-4 font-semibold text-gray-600">Contact</th>
                            <th className="px-6 py-4 font-semibold text-gray-600">System Role</th>
                            <th className="px-6 py-4 font-semibold text-gray-600">Access Role</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredStaff.length === 0 ? (
                            <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No staff members found</td></tr>
                        ) : (
                            filteredStaff.map(s => (
                                <tr key={s._id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{s.name}</div>
                                        <div className="text-gray-500 text-xs">Joined: {s.createdAt?.split('T')[0]}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-gray-900">{s.mobile}</div>
                                        <div className="text-gray-500 text-xs">{s.email || "-"}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold">
                                            {s.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {s.customRole ? (
                                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 w-fit">
                                                <Shield size={12} /> {s.customRole.name}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-xs italic">No explicit role</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleCopyAppLink(s)}
                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                                            title="Copy Staff Login Link"
                                        >
                                            <Share2 size={16} />
                                            <span>Link</span>
                                        </button>
                                        <button
                                            onClick={() => { setEditingStaff(s); setIsModalOpen(true); }}
                                            className="text-gray-400 hover:text-green-600 transition"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">{editingStaff ? "Edit Staff" : "Add New Staff"}</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Full Name</label>
                                <input
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Employee Name"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mobile</label>
                                    <input
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                        value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                                        placeholder="10-digit Mobile"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
                                    <input
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                        value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password</label>
                                <input
                                    type="password"
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder={editingStaff ? "Leave blank to keep unchanged" : "Set login password"}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">System Role</label>
                                    <select
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                                        value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        {STAFF_ROLES.map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Access Role</label>
                                    <select
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                                        value={formData.customRole} onChange={e => setFormData({ ...formData, customRole: e.target.value })}
                                    >
                                        <option value="">-- No Specific Role --</option>
                                        {customRoles.map(r => (
                                            <option key={r._id} value={r._id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg">Cancel</button>
                            <button
                                onClick={handleSave}
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-70"
                            >
                                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Staff"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
