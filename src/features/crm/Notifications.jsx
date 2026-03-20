import React, { useState, useEffect } from "react";
import { axiosInstance as axios } from "../../shared/api/axios";
import { useAuth } from "../../shared/hooks/useAuth"; // Or context
import { Bell, Check, Trash2, Send, Loader2, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { queryClient } from "../../shared/utils/queryClient";

export const Notifications = () => {
    const { data: authData } = useAuth(); // Assuming this hook gives us user/role
    // Alternatively check local storage or props if passed
    // For now assume safe to check role from common place or derive

    const [activeTab, setActiveTab] = useState("list"); // list, broadcast
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all"); // all, unread

    // Broadcast Form
    const [broadcastData, setBroadcastData] = useState({
        target: "all", // all, role, user
        role: "CUSTOMER",
        recipientId: "",
        title: "",
        message: "",
        link: ""
    });
    const [sending, setSending] = useState(false);

    // Determines if user is Admin to show Broadcast tab
    const userRole = authData?.data?.result?.role || localStorage.getItem("role") || "CUSTOMER"; // Fallback logic
    const isAdmin = ["SUPERADMIN", "ADMIN", "HUB_INCHARGE"].includes(userRole);

    useEffect(() => {
        fetchNotifications();
    }, [filter]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const query = filter === "unread" ? "?read=false" : "";
            const { data } = await axios.get(`/api/notifications${query}`);
            setNotifications(data.result || []);
        } catch (error) {
            console.error("Error fetching notifications:", error);
            toast.error("Failed to load notifications");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id = null) => {
        try {
            await axios.put("/api/notifications/read", { id });
            toast.success(id ? "Marked as read" : "All marked as read");
            fetchNotifications();
            // Invalidate the unread notifications query to update the badge count
            queryClient.invalidateQueries({ queryKey: ["unreadNotifications"] });
        } catch (error) {
            toast.error("Action failed");
        }
    };

    const handleBroadcastSubmit = async (e) => {
        e.preventDefault();
        if (!broadcastData.title || !broadcastData.message) {
            return toast.error("Title and Message are required");
        }
        try {
            setSending(true);
            const { data } = await axios.post("/api/notifications/broadcast", broadcastData);
            toast.success(data.message || "Broadcast sent successfully");
            setBroadcastData({
                target: "all",
                role: "CUSTOMER",
                recipientId: "",
                title: "",
                message: "",
                link: ""
            });
            setActiveTab("list");
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to send");
        } finally {
            setSending(false);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case "success": return <CheckCircle className="text-green-500" size={20} />;
            case "error": return <XCircle className="text-red-500" size={20} />;
            case "warning": return <AlertTriangle className="text-yellow-500" size={20} />;
            default: return <Info className="text-blue-500" size={20} />;
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Bell className="text-primary" />
                    Notifications
                </h1>

                {isAdmin && (
                    <div className="tabs tabs-boxed bg-white border border-gray-100">
                        <button
                            className={`tab ${activeTab === "list" ? "tab-active" : ""}`}
                            onClick={() => setActiveTab("list")}
                        >
                            My Notifications
                        </button>
                        <button
                            className={`tab ${activeTab === "broadcast" ? "tab-active" : ""}`}
                            onClick={() => setActiveTab("broadcast")}
                        >
                            Broadcast
                        </button>
                    </div>
                )}
            </div>

            {activeTab === "list" ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilter("all")}
                                className={`btn btn-xs ${filter === "all" ? "btn-neutral" : "btn-ghost"}`}
                            >All</button>
                            <button
                                onClick={() => setFilter("unread")}
                                className={`btn btn-xs ${filter === "unread" ? "btn-neutral" : "btn-ghost"}`}
                            >Unread</button>
                        </div>
                        <button
                            onClick={() => handleMarkAsRead()}
                            className="btn btn-ghost btn-xs text-primary"
                        >
                            Mark all as read
                        </button>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {loading ? (
                            <div className="p-8 text-center flex justify-center">
                                <Loader2 className="animate-spin text-gray-400" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <Bell className="mx-auto mb-2 opacity-20" size={48} />
                                <p>No notifications found</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif._id}
                                    className={`p-4 flex gap-4 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-blue-50/30' : ''}`}
                                >
                                    <div className="mt-1 shrink-0">
                                        {getIcon(notif.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className={`font-semibold text-gray-900 ${!notif.read ? 'text-blue-700' : ''}`}>
                                                {notif.title}
                                            </h3>
                                            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                                {new Date(notif.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                                        {notif.link && (
                                            <a href={notif.link} className="text-xs text-primary mt-2 inline-block hover:underline">
                                                View Details &rarr;
                                            </a>
                                        )}
                                    </div>
                                    {!notif.read && (
                                        <button
                                            onClick={() => handleMarkAsRead(notif._id)}
                                            className="btn btn-ghost btn-circle btn-xs text-gray-400 hover:text-green-600"
                                            title="Mark as read"
                                        >
                                            <Check size={16} />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Send size={20} />
                        Send Broadcast
                    </h2>

                    <form onSubmit={handleBroadcastSubmit} className="space-y-4 max-w-2xl">
                        <div className="form-control">
                            <label className="label font-medium">Target Audience</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio" name="target" value="all" className="radio radio-primary"
                                        checked={broadcastData.target === "all"}
                                        onChange={(e) => setBroadcastData({ ...broadcastData, target: e.target.value })}
                                    />
                                    All Users
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio" name="target" value="role" className="radio radio-primary"
                                        checked={broadcastData.target === "role"}
                                        onChange={(e) => setBroadcastData({ ...broadcastData, target: e.target.value })}
                                    />
                                    Specific Role
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio" name="target" value="user" className="radio radio-primary"
                                        checked={broadcastData.target === "user"}
                                        onChange={(e) => setBroadcastData({ ...broadcastData, target: e.target.value })}
                                    />
                                    Specific User ID
                                </label>
                            </div>
                        </div>

                        {broadcastData.target === "role" && (
                            <div className="form-control">
                                <label className="label">Role</label>
                                <select
                                    className="select select-bordered"
                                    value={broadcastData.role}
                                    onChange={(e) => setBroadcastData({ ...broadcastData, role: e.target.value })}
                                >
                                    <option value="CUSTOMER">Customer</option>
                                    <option value="RIDER">Rider</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="DISTRIBUTOR">Distributor</option>
                                </select>
                            </div>
                        )}

                        {broadcastData.target === "user" && (
                            <div className="form-control">
                                <label className="label">User ID (MongoDB ID)</label>
                                <input
                                    type="text"
                                    className="input input-bordered"
                                    value={broadcastData.recipientId}
                                    onChange={(e) => setBroadcastData({ ...broadcastData, recipientId: e.target.value })}
                                    placeholder="64f..."
                                    required
                                />
                            </div>
                        )}

                        <div className="form-control">
                            <label className="label font-medium">Title</label>
                            <input
                                type="text"
                                className="input input-bordered"
                                value={broadcastData.title}
                                onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
                                placeholder="Important Announcement"
                                required
                            />
                        </div>

                        <div className="form-control">
                            <label className="label font-medium">Message</label>
                            <textarea
                                className="textarea textarea-bordered h-24"
                                value={broadcastData.message}
                                onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                                placeholder="Details..."
                                required
                            ></textarea>
                        </div>

                        <div className="form-control">
                            <label className="label font-medium">Link (Optional)</label>
                            <input
                                type="text"
                                className="input input-bordered"
                                value={broadcastData.link}
                                onChange={(e) => setBroadcastData({ ...broadcastData, link: e.target.value })}
                                placeholder="/dashboard/offers"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={sending}
                        >
                            {sending ? <Loader2 className="animate-spin" /> : "Send Notification"}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};
