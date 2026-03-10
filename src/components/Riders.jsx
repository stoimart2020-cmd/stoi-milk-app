import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllRiders } from "../lib/api/riders";
import { AddRiderModal } from "./modals/AddRiderModal";
import {
    Plus,
    Search,
    MoreVertical,
    Bike,
    Phone,
    MapPin,
    Calendar,
    Filter,
    Warehouse
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export const Riders = () => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    const { data, isLoading, isError } = useQuery({
        queryKey: ["riders"],
        queryFn: getAllRiders
    });

    const riders = data?.result || [];

    // Filter riders locally for now (or pass search to API if supported better)
    const filteredRiders = riders.filter(rider =>
        rider.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rider.mobile?.includes(searchTerm)
    );

    const [selectedRider, setSelectedRider] = useState(null);

    const handleEdit = (rider) => {
        setSelectedRider(rider);
        setIsAddModalOpen(true);
    };

    const handleAdd = () => {
        setSelectedRider(null);
        setIsAddModalOpen(true);
    };

    const handleViewDetails = (rider) => {
        navigate(`/administrator/dashboard/riders/${rider._id}`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Riders</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage delivery partners</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm shadow-green-200"
                >
                    <Plus size={20} />
                    <span>Add Rider</span>
                </button>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search riders by name or mobile..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    />
                </div>
                {/* <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                        <Filter size={16} />
                        Filter
                    </button>
                </div> */}
            </div>

            {/* Riders Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rider Details</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignment</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Financials</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                        Loading riders...
                                    </td>
                                </tr>
                            ) : filteredRiders.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                        No riders found.
                                    </td>
                                </tr>
                            ) : (
                                filteredRiders.map((rider) => (
                                    <tr key={rider._id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                                                    {rider.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleViewDetails(rider)}
                                                            className="font-medium text-gray-900 hover:text-green-600 hover:underline text-left"
                                                        >
                                                            {rider.name}
                                                        </button>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${rider.employeeType === "Full Time"
                                                                ? "bg-emerald-100 text-emerald-700"
                                                                : rider.employeeType === "Part Time"
                                                                    ? "bg-amber-100 text-amber-700"
                                                                    : "bg-purple-100 text-purple-700"
                                                            }`}>
                                                            {rider.employeeType || "Full Time"}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500">ID: {rider.customerId || rider._id?.slice(-6)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Phone size={14} />
                                                    {rider.mobile}
                                                </div>
                                                {/* <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <MapPin size={14} />
                                                    {rider.serviceArea?.name || "No Area"}
                                                </div> */}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {rider.hub ? (
                                                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                                                        <Warehouse size={14} className="text-indigo-500" />
                                                        <span className="font-medium">{rider.hub?.name || rider.hub}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">No hub</span>
                                                )}
                                                {rider.areas?.length > 0 && (
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                        <MapPin size={12} />
                                                        {rider.areas.length} area(s)
                                                    </div>
                                                )}
                                                {rider.deliveryPoints?.length > 0 && (
                                                    <div className="text-xs text-gray-400">
                                                        {rider.deliveryPoints.length} delivery pt(s)
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-sm">
                                                    <span className="text-gray-500 text-xs">Collected: </span>
                                                    <span className="font-medium text-green-600">₹{rider.cashCollected || 0}</span>
                                                </div>
                                                <div className="text-sm">
                                                    <span className="text-gray-500 text-xs">Outstanding: </span>
                                                    <span className="font-medium text-red-600">₹{rider.outstandingAmount || 0}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rider.isActive
                                                ? "bg-green-50 text-green-700 border border-green-100"
                                                : "bg-red-50 text-red-700 border border-red-100"
                                                }`}>
                                                {rider.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <Calendar size={14} />
                                                {rider.createdAt ? format(new Date(rider.createdAt), "MMM d, yyyy") : "-"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(rider)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                                                >
                                                    Edit
                                                </button>
                                                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                                    <MoreVertical size={18} />
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

            <AddRiderModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                rider={selectedRider}
            />
        </div>
    );
};
