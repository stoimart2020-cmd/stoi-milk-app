import { Home, Calendar, History, User, Gift, LogOut, Package, ShoppingBag, Menu, X, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useState } from "react";

// Left side tabs
const leftTabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "products", label: "Products", icon: ShoppingBag },
];

// Right side tabs
const rightTabs = [
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "subscriptions", label: "Subscriptions", icon: Package },
];

// Secondary tabs in hamburger menu
const secondaryTabs = [
    { id: "invoices", label: "Invoices", icon: FileText },
    { id: "referrals", label: "Refer", icon: Gift },
    { id: "history", label: "History", icon: History },
    { id: "profile", label: "Profile", icon: User },
];

// All tabs for desktop
const allTabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "products", label: "Products", icon: ShoppingBag },
    { id: "subscriptions", label: "Subscriptions", icon: Package },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "invoices", label: "Invoices", icon: FileText },
    { id: "referrals", label: "Refer", icon: Gift },
    { id: "history", label: "History", icon: History },
    { id: "profile", label: "Profile", icon: User },
];

export const CustomerBottomNav = ({ activeTab, onTabChange, onLogout }) => {
    const [menuOpen, setMenuOpen] = useState(false);

    const handleTabChange = (tabId) => {
        onTabChange(tabId);
        setMenuOpen(false);
    };

    const handleLogout = () => {
        if (confirm("Are you sure you want to logout?")) {
            onLogout?.();
            toast.success("Logged out successfully");
            setMenuOpen(false);
        }
    };

    return (
        <>
            {/* Overlay */}
            {menuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 xl:hidden"
                    onClick={() => setMenuOpen(false)}
                />
            )}

            {/* Hamburger Menu Drawer */}
            <div
                className={`fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 z-50 xl:hidden transition-transform duration-300 ${menuOpen ? 'translate-y-0' : 'translate-y-full'
                    }`}
            >
                <div className="p-4">
                    <div className="flex items-center justify-end mb-4">
                        <button
                            onClick={() => setMenuOpen(false)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={20} className="text-gray-600" />
                        </button>
                    </div>

                    <div className="space-y-2">
                        {secondaryTabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? "bg-green-50 text-green-600"
                                        : "text-gray-700 hover:bg-gray-50"
                                        }`}
                                >
                                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                    <span className={`text-sm ${isActive ? "font-semibold" : ""}`}>
                                        {tab.label}
                                    </span>
                                </button>
                            );
                        })}

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <LogOut size={20} />
                            <span className="text-sm">Logout</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 xl:hidden">
                <div className="flex items-center h-16">
                    {/* Left Tabs */}
                    {leftTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive
                                    ? "text-green-600"
                                    : "text-gray-400 hover:text-gray-600"
                                    }`}
                            >
                                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={`text-xs mt-1 ${isActive ? "font-semibold" : ""}`}>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}

                    {/* Centered Hamburger Menu Button */}
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${menuOpen
                            ? "text-green-600"
                            : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        <Menu size={24} strokeWidth={menuOpen ? 2.5 : 2} />
                        <span className={`text-xs mt-1 ${menuOpen ? "font-semibold" : ""}`}>
                            More
                        </span>
                    </button>

                    {/* Right Tabs */}
                    {rightTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive
                                    ? "text-green-600"
                                    : "text-gray-400 hover:text-gray-600"
                                    }`}
                            >
                                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={`text-xs mt-1 ${isActive ? "font-semibold" : ""}`}>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
                {/* Safe area for iOS */}
                <div className="h-safe-area-inset-bottom bg-white"></div>
            </nav>
        </>
    );
};

// Desktop sidebar version
export const CustomerSidebar = ({ activeTab, onTabChange, onLogout }) => {
    const handleLogout = () => {
        if (confirm("Are you sure you want to logout?")) {
            onLogout?.();
            toast.success("Logged out successfully");
        }
    };

    return (
        <aside className="hidden xl:flex flex-col w-20 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 z-40">
            {/* Logo */}
            <div className="p-4 flex items-center justify-center border-b border-gray-100">
                <img src="/images/logo.png" alt="Logo" className="w-12" />
            </div>

            {/* Nav Items */}
            <div className="flex-1 py-4">
                {allTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`w-full flex flex-col items-center justify-center py-4 transition-colors ${isActive
                                ? "text-green-600 bg-green-50 border-r-4 border-green-600"
                                : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                                }`}
                        >
                            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            <span className={`text-[10px] mt-1 ${isActive ? "font-semibold" : ""}`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Footer with Logout & Version */}
            <div className="border-t border-gray-100 py-3">
                <button
                    onClick={handleLogout}
                    className="w-full flex flex-col items-center justify-center py-3 text-red-500 hover:bg-red-50 transition-colors"
                    title="Logout"
                >
                    <LogOut size={22} />
                    <span className="text-[10px] mt-1">Logout</span>
                </button>
                <div className="text-center text-[9px] text-gray-400 mt-2 px-1">
                    <p>v1.0.0</p>
                    <p className="mt-0.5">Made with ❤️</p>
                </div>
            </div>
        </aside>
    );
};
