import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Truck, Calendar, Plus, Wallet } from "lucide-react";
import { OnboardingModal } from "../components/OnboardingModal";
import { useAuth } from "../hook/useAuth";
import { useSiteSettings } from "../hook/useSiteSettings";
import { axiosInstance } from "../lib/axios";
import { CustomerBottomNav, CustomerSidebar } from "../components/customer/CustomerBottomNav";
import { CustomerHome } from "../components/customer/CustomerHome";
import { CustomerSubscriptions } from "../components/customer/CustomerSubscriptions";
import { CustomerOrderHistory } from "../components/customer/CustomerOrderHistory";
import { CustomerProfile } from "../components/customer/CustomerProfile";
import { CustomerReferrals } from "../components/customer/CustomerReferrals";
// import { RechargeModalTest as RechargeModal } from "../components/customer/RechargeModalTest";
import { CustomerBottleHistory } from "../components/customer/CustomerBottleHistory";
import { CustomerSupport } from "../components/customer/CustomerSupport";
import { CustomerCalendar } from "../components/customer/CustomerCalendar";
import { CustomerProducts } from "../components/customer/CustomerProducts";
import { SecondaryTopBar } from "../components/customer/SecondaryTopBar";
import { RechargeModal } from "../components/customer/RechargeModal";
import { CustomerWalletHistory } from "../components/customer/CustomerWalletHistory";
import { CustomerInvoices } from "../components/customer/CustomerInvoices";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Phone } from "lucide-react";
// import { API_TEST } from "../lib/api";
import { Notifications } from "../components/Notifications";
// import { getNotifications } from "../lib/api/notifications";

// Helper function to get greeting based on time of day
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Good Morning", emoji: "🌅" };
  if (hour >= 12 && hour < 17) return { text: "Good Afternoon", emoji: "☀️" };
  if (hour >= 17 && hour < 21) return { text: "Good Evening", emoji: "🌆" };
  return { text: "Good Night", emoji: "🌙" };
};

// Helper function to format date nicely with time
const formatDate = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

  if (d.toDateString() === today.toDateString()) {
    return `Today at ${timeStr}`;
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${timeStr}`;
  }
  const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${dateStr} at ${timeStr}`;
};

// Helper to format future date
const formatFutureDate = (date) => {
  const d = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("home");
  const { logout, data: userData } = useAuth();
  const user = userData?.data?.result;
  const navigate = useNavigate();
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return <CustomerHome
          onNavigate={setActiveTab}
          onRecharge={() => {
            setShowRechargeModal(true);
          }}
        />;
      case "products":
        return <CustomerProducts />;
      case "subscriptions":
        return <CustomerSubscriptions />;
      case "calendar":
        return <CustomerCalendar />;
      case "referrals":
        return <CustomerReferrals />;
      case "history":
        return <CustomerOrderHistory />;
      case "profile":
        return <CustomerProfile onNavigate={setActiveTab} />;
      case "wallet-history": // Extra case for navigation from Home
        return <CustomerWalletHistory onBack={() => setActiveTab("home")} />;
      case "bottle-history": // Extra case for navigation from Home
        return <CustomerBottleHistory onBack={() => setActiveTab("home")} />;
      case "support":
        return <CustomerSupport />;
      case "notifications":
        return <Notifications />;
      case "invoices":
        return <CustomerInvoices />;
      default:
        return <CustomerHome onNavigate={setActiveTab} />;
    }
  };

  // Fetch Settings
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await axiosInstance.get("/api/settings");
      return response.data;
    }
  });

  const [searchParams] = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const settings = settingsData?.result?.header || {};

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <CustomerSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />

      {/* Top Bar */}
      <div className="fixed top-0 left-0 lg:left-20 right-0 h-16 bg-gradient-to-r from-green-600 to-white z-30 px-4 flex items-center justify-between shadow-sm">
        <div className="flex flex-col justify-center min-w-[200px]">
          <h1 className="font-bold text-lg text-white flex items-center gap-2">
            {getGreeting().text}, {user?.name?.split(' ')[0] || 'Guest'} {getGreeting().emoji}
          </h1>
          <p className="text-xs text-green-100 opacity-90">Welcome back!</p>
        </div>

        {/* Center - Support & Apps */}
        <div className="flex items-center gap-4 lg:gap-6">
          {/* Phone Number - Visible on both Mobile (Icon only maybe?) and Desktop */}
          {settings.phone && (
            <a href={`tel:${settings.phone}`} className="flex items-center gap-2 text-white/90 hover:text-white transition">
              <div className="bg-white/20 p-1.5 rounded-full">
                <Phone size={16} fill="currentColor" />
              </div>
              <span className="text-sm font-medium hidden md:block">{settings.phone}</span>
            </a>
          )}

          {/* App Links */}
          {settings.showAppLinks && (
            <div className="flex gap-2">
              {settings.playStoreLink && (
                <a href={settings.playStoreLink} target="_blank" rel="noopener noreferrer" className="opacity-90 hover:opacity-100 transition hover:scale-105">
                  <img src="/images/header/playstore.png" alt="Play Store" className="h-6 object-contain" />
                </a>
              )}
              {settings.appStoreLink && (
                <a href={settings.appStoreLink} target="_blank" rel="noopener noreferrer" className="opacity-90 hover:opacity-100 transition hover:scale-105">
                  <img src="/images/header/appstore.png" alt="App Store" className="h-6 object-contain" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Right side actions - Wallet/Profile */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRechargeModal(true)}
            className="flex items-center gap-1.5 bg-white/80 p-1.5 px-3 rounded-full backdrop-blur-sm hover:bg-white transition"
          >
            <Wallet size={16} className={`text-green-700`} />
            <div className={`w-1.5 h-1.5 rounded-full ${user?.walletBalance < 100 ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <span className="text-xs font-bold text-green-800">₹{user?.walletBalance || 0}</span>
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className="w-8 h-8 bg-white rounded-full flex items-center justify-center border-2 border-white/50 text-green-700 font-bold overflow-hidden hover:scale-105 transition"
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-20 pb-20 lg:pb-0 overflow-y-auto h-screen">
        {/* Secondary Top Bar (Below Fixed Header) */}
        <div className="pt-16">
          <SecondaryTopBar user={user} onNavigate={setActiveTab} />
        </div>

        <div className="max-w-md mx-auto lg:max-w-4xl pt-4 px-4 lg:px-8">
          {renderContent()}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <CustomerBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />

      <RechargeModal isOpen={showRechargeModal} onClose={() => setShowRechargeModal(false)} />
    </div>
  );
};

export { Dashboard };
