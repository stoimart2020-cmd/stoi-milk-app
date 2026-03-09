import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRoles, createRole, updateRole, deleteRole } from "../lib/api/roles";
import { Plus, Edit2, Trash2, Check, X, Shield, ShieldAlert, Loader } from "lucide-react";
import { toast } from "react-hot-toast";

const MODULES = [
    { key: "dashboard", label: "Dashboard", simple: true }, // Simple boolean
    { key: "hub", label: "Hub Management" },
    { key: "products", label: "Products" },
    { key: "categories", label: "Categories" },
    { key: "customers", label: "Customers" },
    { key: "orders", label: "Orders" },
    { key: "invoices", label: "Invoices" },
    { key: "payments", label: "Payments" },
    { key: "users", label: "Users & Employees" },
    { key: "roles", label: "Roles & Permissions" },
    { key: "logistics", label: "Logistics (Factory/Stock)" },
    { key: "inventory", label: "Inventory (Vendors/Milk)" },
    { key: "attendance", label: "Attendance & Salary" },
    { key: "settings", label: "Settings" }
];

const PERMISSIONS = [
    { key: "view", label: "View" },
    { key: "add", label: "Create" },
    { key: "edit", label: "Edit" },
    { key: "delete", label: "Delete" },
    { key: "export", label: "Export" }
];

export default function RoleManagement() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [formData, setFormData] = useState({ name: "", permissions: {} });

    const { data: rolesData, isLoading } = useQuery({
        queryKey: ["roles"],
        queryFn: getRoles
    });

    const roles = rolesData?.result || [];

    // Initialize/Reset Form
    useEffect(() => {
        if (isModalOpen) {
            if (editingRole) {
                // Deep copy permissions to avoid reference issues
                setFormData({
                    name: editingRole.name,
                    permissions: JSON.parse(JSON.stringify(editingRole.permissions || {}))
                });
            } else {
                setFormData({ name: "", permissions: {} });
            }
        }
    }, [isModalOpen, editingRole]);

    const mutationOptions = {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            setIsModalOpen(false);
            setEditingRole(null);
            toast.success(editingRole ? "Role updated successfully" : "Role created successfully");
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Operation failed");
        }
    };

    const createMutation = useMutation({ mutationFn: createRole, ...mutationOptions });
    const updateMutation = useMutation({ mutationFn: (data) => updateRole(editingRole._id, data), ...mutationOptions });
    const deleteMutation = useMutation({
        mutationFn: deleteRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            toast.success("Role deleted successfully");
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to delete role")
    });

    const handlePermissionChange = (moduleKey, permKey, value) => {
        setFormData(prev => {
            const newPerms = { ...prev.permissions };
            if (!newPerms[moduleKey]) newPerms[moduleKey] = {};

            // Handle simple boolean modules (like dashboard)
            if (permKey === null) {
                newPerms[moduleKey] = value;
            } else {
                newPerms[moduleKey][permKey] = value;
            }
            return { ...prev, permissions: newPerms };
        });
    };

    const handleSave = () => {
        if (!formData.name.trim()) return toast.error("Role name is required");

        if (editingRole) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this role? This might affect users assigned to this role.")) {
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading roles...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Role Management</h1>
                    <p className="text-sm text-gray-500">Define access levels and permissions for your team</p>
                </div>
                <button
                    onClick={() => { setEditingRole(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                    <Plus size={18} />
                    Create New Role
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map(role => (
                    <div key={role._id} className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        {role.isSystem && (
                            <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-bl-lg text-xs font-semibold flex items-center gap-1">
                                <Shield size={12} /> SYSTEM
                            </div>
                        )}
                        <h3 className="font-bold text-lg text-gray-900 mb-2">{role.name}</h3>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                            Full access control configuration.
                        </p>

                        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => { setEditingRole(role); setIsModalOpen(true); }}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                            >
                                <Edit2 size={14} /> Edit
                            </button>
                            {!role.isSystem && (
                                <button
                                    onClick={() => handleDelete(role._id)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                                >
                                    <Trash2 size={14} /> Delete
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Editor Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editingRole ? `Edit Role: ${editingRole.name}` : "Create New Role"}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="max-w-md">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    disabled={editingRole?.isSystem}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    placeholder="e.g. Sales Manager"
                                />
                                {editingRole?.isSystem && <p className="text-xs text-yellow-600 mt-1">System role names cannot be changed.</p>}
                            </div>

                            <div className="border rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Module</th>
                                            {PERMISSIONS.map(p => (
                                                <th key={p.key} className="px-6 py-4 font-semibold text-gray-600 text-center w-24">{p.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {MODULES.map(module => (
                                            <tr key={module.key} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 font-medium text-gray-900 border-r border-gray-100 bg-gray-50/30">
                                                    {module.label}
                                                </td>
                                                {module.simple ? (
                                                    <td colSpan={PERMISSIONS.length} className="px-6 py-4">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.permissions[module.key] || false}
                                                                onChange={(e) => handlePermissionChange(module.key, null, e.target.checked)}
                                                                className="rounded text-green-600 focus:ring-green-500 w-5 h-5 border-gray-300"
                                                            />
                                                            <span className="text-gray-600">Enable Access</span>
                                                        </label>
                                                    </td>
                                                ) : (
                                                    PERMISSIONS.map(perm => (
                                                        <td key={perm.key} className="px-6 py-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.permissions[module.key]?.[perm.key] || false}
                                                                onChange={(e) => handlePermissionChange(module.key, perm.key, e.target.checked)}
                                                                className="rounded text-green-600 focus:ring-green-500 w-5 h-5 border-gray-300 cursor-pointer"
                                                            />
                                                        </td>
                                                    ))
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition shadow-sm disabled:opacity-70"
                            >
                                {(createMutation.isPending || updateMutation.isPending) && <Loader size={16} className="animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
