import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { LogOut, User, Search, X } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { useFilters } from "../shared/context/FilterContext";
import { axiosInstance as axios } from "../shared/api/axios";

export const AdminHeader = ({ user, isSidebarOpen, setIsSidebarOpen, handleLogout }) => {
    const navigate = useNavigate();
    const { filters, updateFilter, clearFilters, options } = useFilters();

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const searchRef = useRef(null);

    // Close search dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSearchDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounced Search Effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                try {
                    const response = await axios.get(`/api/users?role=CUSTOMER&search=${searchQuery}&limit=5`);
                    if (response.data.success) {
                        setSearchResults(response.data.result);
                        setShowSearchDropdown(true);
                    }
                } catch (error) {
                    console.error("Search failed", error);
                }
            } else {
                setSearchResults([]);
                setShowSearchDropdown(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleCustomerSelect = (customer) => {
        navigate(`/administrator/dashboard/customers/${customer.customerId || customer._id}`);
        setShowSearchDropdown(false);
        setSearchQuery("");
    };

    return (
        <header className="h-16 bg-[#4FD1C5] text-white flex items-center justify-between px-4 shadow-md z-20 flex-shrink-0">

            {/* Left Side: Logo & Menu Trigger */}
            <div className="flex items-center gap-4 md:gap-6">
                {/* Mobile Menu Button */}
                <button className="lg:hidden text-white/80 hover:text-white" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                {/* Brand Logo */}
                <div className="flex items-center select-none cursor-pointer gap-2" onClick={() => navigate('/administrator/dashboard')}>
                    <div className="bg-white p-1 rounded-md">
                        <img src="/images/logo.png" alt="Stoi Milk" className="h-8 w-auto object-contain" />
                    </div>
                </div>

                {/* Hamburger Menu (Desktop) */}
                <button
                    className="hidden lg:block text-white/80 hover:text-white"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                {/* Search Bar */}
                <div className="hidden md:flex items-center relative" ref={searchRef}>
                    <div className="absolute left-3 text-gray-400">
                        <Search size={16} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search Customer"
                        className="pl-8 pr-8 py-1.5 rounded-md bg-white text-gray-700 w-48 focus:outline-none focus:ring-2 focus:ring-teal-600 shadow-sm transition-all focus:w-64 text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchQuery.length >= 2 && setShowSearchDropdown(true)}
                    />
                    {searchQuery && (
                        <button
                            className="absolute right-2 text-gray-400 hover:text-red-500"
                            onClick={() => {
                                setSearchQuery("");
                                setSearchResults([]);
                            }}
                        >
                            <X size={14} />
                        </button>
                    )}

                    {/* Search Results Dropdown */}
                    {showSearchDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50">
                            {searchResults.length > 0 ? (
                                <ul>
                                    {searchResults.map(customer => (
                                            <li
                                                key={customer._id}
                                                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-none flex items-center gap-3"
                                                onClick={() => handleCustomerSelect(customer)}
                                            >
                                                <div className="w-8 h-8 flex-shrink-0 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                                                    {customer.name?.charAt(0)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-gray-800 truncate">
                                                        {customer.customerId && <span className="text-gray-500 mr-1">#{customer.customerId}</span>}
                                                        {customer.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {customer.mobile}
                                                        {customer.address?.area && ` • ${customer.address.area}`}
                                                    </p>
                                                </div>
                                            </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="p-4 text-center text-gray-500 text-sm">
                                    No customers found
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Middle: Filters (Cascading Dropdowns) */}
            <div className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar mx-2">
                {/* Factory */}
                <select
                    className="select select-bordered select-xs text-xs text-gray-700 rounded-sm w-28"
                    value={filters.factory || ""}
                    onChange={(e) => updateFilter('factory', e.target.value)}
                >
                    <option value="">All Factories</option>
                    {options.factories.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                </select>

                {/* District */}
                <select
                    className="select select-bordered select-xs text-xs text-gray-700 rounded-sm w-28"
                    value={filters.district || ""}
                    onChange={(e) => updateFilter('district', e.target.value)}
                >
                    <option value="">All Districts</option>
                    {options.districts.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>

                {/* City */}
                <select
                    className="select select-bordered select-xs text-xs text-gray-700 rounded-sm w-28"
                    value={filters.city || ""}
                    onChange={(e) => updateFilter('city', e.target.value)}
                >
                    <option value="">All Cities</option>
                    {options.cities.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>

                {/* Hub */}
                <select
                    className="select select-bordered select-xs text-xs text-gray-700 rounded-sm w-28"
                    value={filters.hub || ""}
                    onChange={(e) => updateFilter('hub', e.target.value)}
                >
                    <option value="">All Hubs</option>
                    {options.hubs.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                </select>

                {/* Delivery Points (StockPoints) */}
                <select
                    className="select select-bordered select-xs text-xs text-gray-700 rounded-sm w-36"
                    value={filters.stockPoint || ""}
                    onChange={(e) => updateFilter('stockPoint', e.target.value)}
                >
                    <option value="">All Delivery Points</option>
                    {options.stockPoints.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>

                {/* Delivery Boy */}
                <select
                    className="select select-bordered select-xs text-xs text-gray-700 rounded-sm w-32"
                    value={filters.deliveryBoy || ""}
                    onChange={(e) => updateFilter('deliveryBoy', e.target.value)}
                >
                    <option value="">All Delivery Boy</option>
                    {options.deliveryBoys.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>

                {(filters.factory || filters.district || filters.city || filters.hub || filters.stockPoint || filters.deliveryBoy) && (
                    <button onClick={clearFilters} className="btn btn-ghost btn-xs text-white btn-circle" title="Clear Filters">
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Right Side: Actions & Profile */}
            <div className="flex items-center gap-4">
                {/* Notification Bell */}
                <div className="relative">
                    <NotificationBell
                        userRole={user?.role}
                        iconColor="text-white"
                        onNavigate={() => navigate('/administrator/dashboard/notifications')}
                    />
                </div>

                {/* User Profile */}
                <div
                    className="flex items-center gap-2 border-l border-white/30 pl-4 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => navigate('/administrator/dashboard/users/edit-profile')}
                    title="Edit Profile"
                >
                    <div className="w-8 h-8 rounded-full border-2 border-white/50 flex items-center justify-center bg-white/10">
                        {user?.name?.charAt(0) || <User size={16} />}
                    </div>
                    <span className="hidden md:block font-medium text-sm">
                        Hi, {user?.name || "Administrator"}
                    </span>
                </div>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="hidden md:flex items-center gap-2 text-white/80 hover:text-white ml-2"
                    title="Logout"
                >
                    <LogOut size={18} />
                </button>
            </div>
        </header>
    );
};
