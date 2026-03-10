import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { AdministratorSidebar } from "../../components/AdministratorSidebar";
import { useAuth } from "../../hook/useAuth";
import { useCurrentAdmin } from "../../hook/useCurrentAdmin";
import toast from "react-hot-toast";
import { AdminFooter } from "../../components/AdminFooter";
import { AdminHeader } from "../../components/AdminHeader";
import { FilterProvider } from "../../context/FilterContext";

export const AdministratorDashboard = () => {
  return (
    <FilterProvider>
      <DashboardContent />
    </FilterProvider>
  );
};

const DashboardContent = () => {
  const { logout } = useAuth();
  const { data: adminData } = useCurrentAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const user = adminData?.user;

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'SUPERADMIN') return;

    // Only redirect if using Custom Role
    if (user.customRole && user.customRole.permissions) {
      const perms = user.customRole.permissions;

      // If Dashboard is explicitly denied check for redirection
      if (perms.dashboard === false) {

        // If current page is the specific dashboard home, redirect away
        if (location.pathname === "/administrator/dashboard" || location.pathname === "/administrator/dashboard/") {

          // Find first allowed permission
          const allowedMap = [
            { key: 'orders', path: '/administrator/dashboard/orders' },
            { key: 'users', path: '/administrator/dashboard/customers' },
            { key: 'products', path: '/administrator/dashboard/products' },
            { key: 'hub', path: '/administrator/dashboard/service-areas' },
            { key: 'logistics', path: '/administrator/dashboard/logistics' },
            { key: 'customers', path: '/administrator/dashboard/leads' }, // CRM fallback
            { key: 'invoices', path: '/administrator/dashboard/invoices' },
            { key: 'payments', path: '/administrator/dashboard/payments/transactions' },
            { key: 'roles', path: '/administrator/dashboard/roles' },
            { key: 'settings', path: '/administrator/dashboard/settings' },
          ];

          const firstAllowed = allowedMap.find(m => {
            const key = m.key;
            const p = perms[key];
            if (typeof p === 'boolean') return p;
            return p?.view;
          });

          if (firstAllowed) {
            navigate(firstAllowed.path, { replace: true });
          } else {
            // No permissions at all?
            toast.error("Access Denied: No permitted modules found.");
          }
        }
      }
    }
  }, [user, location.pathname, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/administrator/login");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans overflow-hidden">
      {/* Top Bar / Header */}
      <AdminHeader
        user={user}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        handleLogout={handleLogout}
      />

      {/* Main Layout Area: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Desktop Sidebar (always rendered, collapsible) */}
        <div
          className={`
                bg-gray-900 z-10 shadow-xl relative h-full transition-all duration-300 ease-in-out
                ${isSidebarOpen ? 'w-64' : 'w-20'}
                hidden lg:block
            `}
        >
          <AdministratorSidebar user={user} className="h-full" collapsed={!isSidebarOpen} />
        </div>

        {/* Mobile Sidebar Overlay (< lg screens) */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
            {/* Slide-in Sidebar */}
            <div className="absolute inset-y-0 left-0 w-72 bg-gray-900 shadow-2xl overflow-y-auto animate-slide-in-left">
              <AdministratorSidebar user={user} className="h-full" collapsed={false} />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 flex flex-col relative">
          <div className="flex-1 p-6">
            <Outlet />
          </div>
          <AdminFooter />
        </main>
      </div>
    </div>
  );
};
