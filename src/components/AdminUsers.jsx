import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { getAllUsers, updateUserRole, createUser } from "../lib/api/users";
import { getFactories, getHubs, getStockPoints } from "../lib/api/logistics";
import { queryClient } from "../lib/queryClient";
import { Search, Edit, Save, X, Plus, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

const ROLES = [
    "CUSTOMER",
    "SUPERADMIN",
    "ADMIN",
    "LAB_INCHARGE",
    "FACTORY_INCHARGE",
    "HUB_INCHARGE",
    "STOCK_AREA_INCHARGE",
    "DELIVERY_MANAGER",
    "RIDER",
    "FINANCE_TEAM",
    "CUSTOMER_RELATIONS",
    "FIELD_MARKETING",
    "ONLINE_MARKETING",
    "MILK_COLLECTION_PERSON",
    "TRUCK_DRIVER"
];

export const AdminUsers = () => {
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({ role: "", factory: "", hub: "", stockPoint: "" });
    const [createForm, setCreateForm] = useState({
        name: "", mobile: "", email: "", password: "", role: "ADMIN", factory: "", hub: "", stockPoint: ""
    });

    // Fetch Users
    const { data: usersData, isLoading } = useQuery({
        queryKey: ["users", search],
        queryFn: () => getAllUsers(),
    });

    // Fetch Logistics Entities for Dropdowns
    const { data: factories } = useQuery({ queryKey: ["factories"], queryFn: getFactories });
    const { data: hubs } = useQuery({ queryKey: ["hubs"], queryFn: getHubs });
    const { data: stockPoints } = useQuery({ queryKey: ["stockPoints"], queryFn: getStockPoints });

    const updateMutation = useMutation({
        mutationFn: updateUserRole,
        onSuccess: () => {
            toast.success("User role updated successfully");
            queryClient.invalidateQueries({ queryKey: ["users"] });
            setSelectedUser(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to update role");
        }
    });

    const createMutation = useMutation({
        mutationFn: createUser,
        onSuccess: () => {
            toast.success("User created successfully");
            queryClient.invalidateQueries({ queryKey: ["users"] });
            setIsCreateModalOpen(false);
            setCreateForm({ name: "", mobile: "", email: "", password: "", role: "ADMIN", factory: "", hub: "", stockPoint: "" });
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to create user");
        }
    });

    const handleEdit = (user) => {
        setSelectedUser(user);
        setEditForm({
            role: user.role,
            factory: user.factory?._id || user.factory || "",
            hub: user.hub?._id || user.hub || "",
            stockPoint: user.stockPoint?._id || user.stockPoint || "",
        });
    };

    const handleSave = () => {
        if (!selectedUser) return;
        updateMutation.mutate({
            id: selectedUser._id,
            data: editForm
        });
    };

    const handleCreate = () => {
        createMutation.mutate(createForm);
    };

    const filteredUsers = usersData?.result?.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.mobile?.includes(search) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    ) || [];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">User Management</h1>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="input input-bordered pl-10 w-64"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                        <UserPlus size={18} />
                        Add User
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto bg-base-100 rounded-lg shadow">
                <table className="table w-full">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Mobile</th>
                            <th>Role</th>
                            <th>Assigned To</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="5" className="text-center py-4">Loading...</td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan="5" className="text-center py-4">No users found</td></tr>
                        ) : (
                            filteredUsers.map(user => (
                                <tr key={user._id}>
                                    <td>
                                        <div className="font-bold">{user.name || "N/A"}</div>
                                        <div className="text-sm opacity-50">{user.email}</div>
                                    </td>
                                    <td>{user.mobile}</td>
                                    <td><span className="badge badge-ghost">{user.role}</span></td>
                                    <td>
                                        {user.factory && <div className="text-xs">Factory: {user.factory.name || "ID: " + user.factory}</div>}
                                        {user.hub && <div className="text-xs">Hub: {user.hub.name || "ID: " + user.hub}</div>}
                                        {user.stockPoint && <div className="text-xs">Stock Point: {user.stockPoint.name || "ID: " + user.stockPoint}</div>}
                                        {!user.factory && !user.hub && !user.stockPoint && <span className="text-gray-400">-</span>}
                                    </td>
                                    <td>
                                        <button className="btn btn-sm btn-ghost" onClick={() => handleEdit(user)}>
                                            <Edit size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {selectedUser && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">Edit Role for {selectedUser.name}</h3>

                        <div className="form-control w-full mb-4">
                            <label className="label">Role</label>
                            <select
                                className="select select-bordered"
                                value={editForm.role}
                                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                            >
                                {ROLES.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>

                        {/* Conditional Fields based on Role */}
                        {editForm.role === "FACTORY_INCHARGE" && (
                            <div className="form-control w-full mb-4">
                                <label className="label">Assign Factory</label>
                                <select
                                    className="select select-bordered"
                                    value={editForm.factory}
                                    onChange={(e) => setEditForm({ ...editForm, factory: e.target.value })}
                                >
                                    <option value="">Select Factory</option>
                                    {factories?.result?.map(f => (
                                        <option key={f._id} value={f._id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {(editForm.role === "HUB_INCHARGE" || editForm.role === "DELIVERY_MANAGER") && (
                            <div className="form-control w-full mb-4">
                                <label className="label">Assign Hub</label>
                                <select
                                    className="select select-bordered"
                                    value={editForm.hub}
                                    onChange={(e) => setEditForm({ ...editForm, hub: e.target.value })}
                                >
                                    <option value="">Select Hub</option>
                                    {hubs?.result?.map(h => (
                                        <option key={h._id} value={h._id}>{h.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {editForm.role === "STOCK_AREA_INCHARGE" && (
                            <div className="form-control w-full mb-4">
                                <label className="label">Assign Stock Point</label>
                                <select
                                    className="select select-bordered"
                                    value={editForm.stockPoint}
                                    onChange={(e) => setEditForm({ ...editForm, stockPoint: e.target.value })}
                                >
                                    <option value="">Select Stock Point</option>
                                    {stockPoints?.result?.map(sp => (
                                        <option key={sp._id} value={sp._id}>{sp.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="modal-action">
                            <button className="btn" onClick={() => setSelectedUser(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">Add New User</h3>

                        <div className="form-control w-full mb-2">
                            <label className="label">Name</label>
                            <input
                                type="text"
                                className="input input-bordered"
                                value={createForm.name}
                                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                            />
                        </div>

                        <div className="form-control w-full mb-2">
                            <label className="label">Mobile</label>
                            <input
                                type="text"
                                className="input input-bordered"
                                value={createForm.mobile}
                                onChange={(e) => setCreateForm({ ...createForm, mobile: e.target.value })}
                            />
                        </div>

                        <div className="form-control w-full mb-2">
                            <label className="label">Email</label>
                            <input
                                type="email"
                                className="input input-bordered"
                                value={createForm.email}
                                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                            />
                        </div>

                        <div className="form-control w-full mb-2">
                            <label className="label">Password</label>
                            <input
                                type="password"
                                className="input input-bordered"
                                value={createForm.password}
                                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                            />
                        </div>

                        <div className="form-control w-full mb-4">
                            <label className="label">Role</label>
                            <select
                                className="select select-bordered"
                                value={createForm.role}
                                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                            >
                                {ROLES.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>

                        {/* Conditional Fields based on Role */}
                        {createForm.role === "FACTORY_INCHARGE" && (
                            <div className="form-control w-full mb-4">
                                <label className="label">Assign Factory</label>
                                <select
                                    className="select select-bordered"
                                    value={createForm.factory}
                                    onChange={(e) => setCreateForm({ ...createForm, factory: e.target.value })}
                                >
                                    <option value="">Select Factory</option>
                                    {factories?.result?.map(f => (
                                        <option key={f._id} value={f._id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {(createForm.role === "HUB_INCHARGE" || createForm.role === "DELIVERY_MANAGER") && (
                            <div className="form-control w-full mb-4">
                                <label className="label">Assign Hub</label>
                                <select
                                    className="select select-bordered"
                                    value={createForm.hub}
                                    onChange={(e) => setCreateForm({ ...createForm, hub: e.target.value })}
                                >
                                    <option value="">Select Hub</option>
                                    {hubs?.result?.map(h => (
                                        <option key={h._id} value={h._id}>{h.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {createForm.role === "STOCK_AREA_INCHARGE" && (
                            <div className="form-control w-full mb-4">
                                <label className="label">Assign Stock Point</label>
                                <select
                                    className="select select-bordered"
                                    value={createForm.stockPoint}
                                    onChange={(e) => setCreateForm({ ...createForm, stockPoint: e.target.value })}
                                >
                                    <option value="">Select Stock Point</option>
                                    {stockPoints?.result?.map(sp => (
                                        <option key={sp._id} value={sp._id}>{sp.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="modal-action">
                            <button className="btn" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleCreate} disabled={createMutation.isPending}>
                                {createMutation.isPending ? "Creating..." : "Create User"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
