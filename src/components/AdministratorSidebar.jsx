import { NavLink, useLocation } from "react-router-dom";
import { APP_VERSION_FULL } from "../version";
import { useState, useEffect, useMemo, useRef } from "react";
import {
    LayoutDashboard,
    Users,
    Package,
    ShoppingCart,
    Settings,
    Map,
    MapPin,
    Truck,
    UserCog,
    Shield,
    Megaphone,
    AlertCircle,
    Bell,
    FileText,
    CreditCard,
    Bike,
    BarChart3,
    Activity,
    Milk,
    ChevronDown,
    ChevronRight,
    User,
    ListTree,
    Store,
    Plus,
    Calendar,
    CalendarCheck,
    Database,
    Search,
    X
} from "lucide-react";

export const AdministratorSidebar = ({ className = "", user, collapsed = false }) => {
    const location = useLocation();
    const [expandedMenus, setExpandedMenus] = useState({});
    const [searchQuery, setSearchQuery] = useState("");
    const searchInputRef = useRef(null);
    const role = user?.role;
    const customPermissions = user?.customRole?.permissions;

    // =========================================
    // CATEGORIZED MENU STRUCTURE
    // =========================================
    const menuSections = [
        {
            // No category label for the main dashboard link
            items: [
                { label: "Dashboard", href: "/administrator/dashboard", icon: LayoutDashboard, end: true, permissionKey: "dashboard" },
            ]
        },
        {
            category: "Orders & Sales",
            items: [
                {
                    label: "Orders",
                    href: "/administrator/dashboard/orders",
                    icon: ShoppingCart,
                    permissionKey: "orders",
                    children: [
                        { label: "One Time", href: "/administrator/dashboard/orders/onetime", icon: ShoppingCart, permissionKey: "orders" },
                        { label: "Subscription", href: "/administrator/dashboard/orders/subscription", icon: Calendar, permissionKey: "orders" },
                        { label: "Trial", href: "/administrator/dashboard/orders/trial", icon: ShoppingCart, permissionKey: "orders" }
                    ]
                },
            ]
        },
        {
            category: "People",
            items: [
                {
                    label: "Users",
                    icon: Users,
                    permissionKey: "users",
                    allowedRoles: ["SUPERADMIN", "ADMIN"],
                    children: [
                        { label: "Customers", href: "/administrator/dashboard/customers", icon: User, permissionKey: "customers" },
                        { label: "Riders", href: "/administrator/dashboard/riders", icon: Bike, allowedRoles: ["SUPERADMIN", "ADMIN", "DELIVERY_MANAGER"], permissionKey: "riders" },
                        { label: "Staffs", href: "/administrator/dashboard/staff", icon: UserCog, allowedRoles: ["SUPERADMIN", "ADMIN"], permissionKey: "staff" },
                    ]
                },
                { label: "Distributors", href: "/administrator/dashboard/distributors", icon: Store, allowedRoles: ["SUPERADMIN", "ADMIN"], permissionKey: "staff" },
                { label: "Attendance", href: "/administrator/dashboard/attendance", icon: CalendarCheck, allowedRoles: ["SUPERADMIN", "ADMIN", "DELIVERY_MANAGER"], permissionKey: "attendance" },
            ]
        },
        {
            category: "Catalog",
            items: [
                { label: "Products", href: "/administrator/dashboard/products", icon: Package, permissionKey: "products" },
                { label: "Categories", href: "/administrator/dashboard/categories", icon: ListTree, permissionKey: "products" },
            ]
        },
        {
            category: "Inventory",
            items: [
                { label: "Vendors", href: "/administrator/dashboard/inventory/vendors", icon: Users, allowedRoles: ["SUPERADMIN", "ADMIN", "FACTORY_INCHARGE"], permissionKey: "inventory" },
                { label: "Milk Reception", href: "/administrator/dashboard/inventory/reception", icon: Milk, allowedRoles: ["SUPERADMIN", "ADMIN", "FACTORY_INCHARGE", "MILK_COLLECTION_PERSON"], permissionKey: "inventory" },
                { label: "Collection Summary", href: "/administrator/dashboard/inventory/collection-summary", icon: BarChart3, allowedRoles: ["SUPERADMIN", "ADMIN", "FACTORY_INCHARGE", "MILK_COLLECTION_PERSON"], permissionKey: "inventory" },
                { label: "Stock Analytics", href: "/administrator/dashboard/inventory/analytics", icon: BarChart3, allowedRoles: ["SUPERADMIN", "ADMIN", "FACTORY_INCHARGE"], permissionKey: "inventory" },
            ]
        },
        {
            category: "Operations",
            items: [
                { label: "Logistics", href: "/administrator/dashboard/logistics", icon: Truck, allowedRoles: ["SUPERADMIN", "ADMIN", "HUB_INCHARGE"], permissionKey: "logistics" },
                { label: "Deliveries", href: "/administrator/dashboard/deliveries", icon: Bike, allowedRoles: ["SUPERADMIN", "ADMIN", "HUB_INCHARGE", "DELIVERY_MANAGER"], permissionKey: "deliveries" },
                { label: "Live Tracking", href: "/administrator/dashboard/live-tracking", icon: MapPin, allowedRoles: ["SUPERADMIN", "ADMIN", "HUB_INCHARGE", "DELIVERY_MANAGER"], permissionKey: "live_tracking" },
                { label: "Bottles", href: "/administrator/dashboard/bottles", icon: Milk, allowedRoles: ["SUPERADMIN", "ADMIN", "HUB_INCHARGE"], permissionKey: "bottle_management" },
            ]
        },
        {
            category: "CRM & Support",
            items: [
                { label: "Leads", href: "/administrator/dashboard/leads", icon: Megaphone, permissionKey: "customers" },
                { label: "Complaints", href: "/administrator/dashboard/complaints", icon: AlertCircle, permissionKey: "customers" },
                { label: "Notifications", href: "/administrator/dashboard/notifications", icon: Bell, permissionKey: "dashboard" },
            ]
        },
        {
            category: "Finance",
            items: [
                {
                    label: "Payments",
                    icon: CreditCard,
                    children: [
                        { label: "Transactions", href: "/administrator/dashboard/payments/transactions", icon: CreditCard, permissionKey: "payments" },
                        { label: "Invoices", href: "/administrator/dashboard/invoices", icon: FileText, permissionKey: "payments" },
                        { label: "Add Payment", href: "/administrator/dashboard/payments/add", icon: Plus, permissionKey: "payments" }
                    ],
                    allowedRoles: ["SUPERADMIN", "ADMIN", "FINANCE_TEAM"],
                    permissionKey: "payments"
                },
            ]
        },
        {
            category: "Administration",
            items: [
                { label: "Roles", href: "/administrator/dashboard/roles", icon: Shield, allowedRoles: ["SUPERADMIN", "ADMIN"], permissionKey: "roles" },
                { label: "Reports", href: "/administrator/dashboard/reports", icon: BarChart3, allowedRoles: ["SUPERADMIN", "ADMIN"], permissionKey: "dashboard" },
                { label: "Activity Logs", href: "/administrator/dashboard/activity-logs", icon: Activity, allowedRoles: ["SUPERADMIN"], permissionKey: "settings" },
                { label: "Backup & Restore", href: "/administrator/dashboard/backup", icon: Database, allowedRoles: ["SUPERADMIN"], permissionKey: "settings" },
                { label: "Settings", href: "/administrator/dashboard/settings", icon: Settings, allowedRoles: ["SUPERADMIN"], permissionKey: "settings" },
            ]
        },
    ];

    // =========================================
    // PERMISSIONS
    // =========================================
    const hasPermission = (item) => {
        // 1. Super Admin Bypass
        if (role === 'SUPERADMIN') return true;

        // 2. Custom Role Check (If assigned)
        if (customPermissions) {
            if (item.permissionKey === "dashboard") return !!customPermissions.dashboard;

            if (customPermissions[item.permissionKey]) {
                if (typeof customPermissions[item.permissionKey] === 'boolean') {
                    return customPermissions[item.permissionKey];
                }
                return !!customPermissions[item.permissionKey]?.view;
            }
            return false;
        }

        // 3. Fallback to System Role (Legacy)
        if (item.allowedRoles && !item.allowedRoles.includes(role)) return false;
        return true;
    };

    // =========================================
    // FILTER SECTIONS BY PERMISSION
    // =========================================
    const filteredSections = menuSections.map(section => {
        const filteredItems = section.items.filter(item => {
            if (!hasPermission(item)) return false;
            return true;
        }).map(item => {
            if (item.children) {
                return {
                    ...item,
                    children: item.children.filter(child => hasPermission(child))
                };
            }
            return item;
        }).filter(item => {
            if (item.children && item.children.length === 0) return false;
            return true;
        });

        return { ...section, items: filteredItems };
    }).filter(section => section.items.length > 0);

    // Flatten all items for auto-expand logic
    const allFilteredItems = filteredSections.flatMap(s => s.items);

    // =========================================
    // SEARCH: Flatten all navigable items
    // =========================================
    const allSearchableItems = useMemo(() => {
        const items = [];
        filteredSections.forEach(section => {
            section.items.forEach(item => {
                if (item.children) {
                    item.children.forEach(child => {
                        items.push({
                            ...child,
                            parentLabel: item.label,
                            category: section.category || ""
                        });
                    });
                } else if (item.href) {
                    items.push({
                        ...item,
                        parentLabel: null,
                        category: section.category || ""
                    });
                }
            });
        });
        return items;
    }, [filteredSections]);

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return allSearchableItems.filter(item =>
            item.label.toLowerCase().includes(q) ||
            item.category?.toLowerCase().includes(q) ||
            item.parentLabel?.toLowerCase().includes(q)
        );
    }, [searchQuery, allSearchableItems]);

    // Auto-expand menu if a child is active
    useEffect(() => {
        const newExpanded = { ...expandedMenus };
        allFilteredItems.forEach(item => {
            if (item.children) {
                const isChildActive = item.children.some(child =>
                    location.pathname === child.href || location.pathname.startsWith(child.href + '/')
                );
                if (isChildActive) {
                    newExpanded[item.label] = true;
                }
            }
        });
        setExpandedMenus(newExpanded);
    }, [location.pathname, role]);

    const toggleMenu = (label) => {
        setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
    };

    // Keyboard shortcut: Ctrl+K to focus search
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            if (e.key === 'Escape' && searchQuery) {
                setSearchQuery("");
                searchInputRef.current?.blur();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [searchQuery]);

    // =========================================
    // RENDER
    // =========================================
    const renderMenuItem = (item) => {
        if (item.children) {
            const isExpanded = expandedMenus[item.label];
            const isActiveParent = item.children.some(child => location.pathname === child.href);

            return (
                <div key={item.label} className="space-y-1">
                    <button
                        onClick={() => !collapsed && toggleMenu(item.label)}
                        className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActiveParent || (isExpanded && !collapsed)
                            ? "bg-gray-800 text-white"
                            : "text-gray-400 hover:bg-gray-800 hover:text-white"
                            }`}
                        title={collapsed ? item.label : ""}
                    >
                        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
                            <item.icon size={18} />
                            {!collapsed && item.label}
                        </div>
                        {!collapsed && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                    </button>

                    {!collapsed && isExpanded && (
                        <div className="pl-4 space-y-0.5">
                            {item.children.map(child => (
                                <NavLink
                                    key={child.href}
                                    to={child.href}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                            ? "bg-teal-600 text-white shadow-md"
                                            : "text-gray-400 hover:bg-gray-800 hover:text-white"
                                        }`
                                    }
                                >
                                    <child.icon size={16} />
                                    {child.label}
                                </NavLink>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <NavLink
                key={item.href}
                to={item.href}
                end={item.end}
                className={({ isActive }) =>
                    `flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                        ? "bg-teal-600 text-white shadow-md"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    }`
                }
                title={collapsed ? item.label : ""}
            >
                <item.icon size={18} />
                {!collapsed && item.label}
            </NavLink>
        );
    };

    const renderSection = (section, idx) => (
        <div key={section.category || idx} className={idx > 0 ? "pt-4" : ""}>
            {/* Category Header */}
            {section.category && !collapsed && (
                <div className="px-3 mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                        {section.category}
                    </p>
                </div>
            )}
            {/* Thin separator for collapsed state */}
            {section.category && collapsed && idx > 0 && (
                <div className="px-3 mb-2">
                    <div className="border-t border-gray-700/50"></div>
                </div>
            )}
            <div className="space-y-0.5">
                {section.items.map(renderMenuItem)}
            </div>
        </div>
    );

    // =========================================
    // SEARCH RESULTS RENDER
    // =========================================
    const renderSearchResults = () => (
        <div className="px-2 py-2 space-y-1">
            {searchResults.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                    <Search size={24} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No results for "{searchQuery}"</p>
                </div>
            ) : (
                searchResults.map(item => (
                    <NavLink
                        key={item.href}
                        to={item.href}
                        onClick={() => setSearchQuery("")}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                                ? "bg-teal-600 text-white shadow-md"
                                : "text-gray-300 hover:bg-gray-800 hover:text-white"
                            }`
                        }
                    >
                        <item.icon size={16} className="flex-shrink-0" />
                        <div className="min-w-0">
                            <div className="truncate">{item.label}</div>
                            {item.category && (
                                <div className="text-[10px] text-gray-500 truncate">
                                    {item.category}{item.parentLabel ? ` → ${item.parentLabel}` : ""}
                                </div>
                            )}
                        </div>
                    </NavLink>
                ))
            )}
        </div>
    );

    return (
        <div className={`bg-gray-900 h-screen overflow-y-auto flex-shrink-0 pt-2 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'} ${className}`}>
            {/* ═══ Search Box ═══ */}
            {!collapsed && (
                <div className="px-4 pt-2 pb-3">
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal-400 transition-colors" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search menu..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all"
                        />
                        {searchQuery ? (
                            <button
                                onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-500 hover:text-gray-300 transition"
                            >
                                <X size={14} />
                            </button>
                        ) : (
                            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-600 bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded font-mono">
                                ⌘K
                            </kbd>
                        )}
                    </div>
                </div>
            )}

            <nav className="p-4 pt-0 space-y-0">
                {searchQuery.trim()
                    ? renderSearchResults()
                    : filteredSections.map(renderSection)
                }
            </nav>

            {!collapsed && !searchQuery && (
                <div className="p-4 border-t border-gray-800 mt-auto">
                    <p className="text-xs text-gray-500 text-center">{APP_VERSION_FULL}</p>
                </div>
            )}
        </div>
    );
};
