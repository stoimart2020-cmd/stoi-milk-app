import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import "./App.css";
import { Login } from "./pages/Login";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Dashboard } from "./pages/Dashboard";
import { useAuth } from "./hook/useAuth";
import { MilkLoader } from "./components/MilkLoader";
import { AdministratorLogin } from "./pages/administrator/AdministratorLogin";
import { AdministratorDashboard } from "./pages/administrator/AdministratorDashboard";
import { RiderDetails } from "./pages/administrator/RiderDetails";
import { useCurrentAdmin } from "./hook/useCurrentAdmin";
import { CustomerBlock } from "./components/CustomerBlock";
// import { RechargeModalTest } from "./components/customer/RechargeModalTest";
import { CustomerDetail } from "./components/CustomerDetail";
import { ProductBlock } from "./components/ProductsBlock";
import { ProductCU } from "./components/ProductCU";
import { Settings } from "./components/Settings";
import { Subscriptions } from "./components/Subscriptions";
import { DashboardHome } from "./components/DashboardHome";
import { ServiceAreaManagement } from "./components/ServiceAreaManagement";
import { LogisticsManagement } from "./components/LogisticsManagement";
import StaffManagement from './components/StaffManagement';
import RoleManagement from './components/RoleManagement';
import CategoryManagement from './components/CategoryManagement';
import { AdministratorEditProfile } from "./components/AdministratorEditProfile";
import DistributorManagement from './components/DistributorManagement';
import { Leads } from './components/Leads';
import { Complaints } from './components/Complaints';
import { Notifications } from './components/Notifications';
import { Invoices } from "./components/Invoices";
import { AddPayment } from "./components/AddPayment";
import { PaymentTransactions } from "./components/PaymentTransactions";
import { Orders } from "./components/Orders";
import { Riders } from "./components/Riders";
import { DeliveryDashboard } from "./components/DeliveryDashboard";
import { LiveTracking } from "./components/LiveTracking";
import Reports from "./components/Reports";
import { BottleManagement } from "./components/BottleManagement";
import { Toaster } from "react-hot-toast";
import { UniversalRecharge } from "./pages/UniversalRecharge";

import { RiderLogin } from "./pages/rider/RiderLogin";
import { RiderDashboard } from "./pages/rider/RiderDashboard";
import { FieldSalesLogin } from "./pages/fieldsales/FieldSalesLogin";
import { FieldSalesDashboard } from "./pages/fieldsales/FieldSalesDashboard";
import { VendorManagement } from "./components/admin/inventory/VendorManagement";
import { MilkReception } from "./components/admin/inventory/MilkReception";
import { StockAnalytics } from "./components/admin/inventory/StockAnalytics";
import { MilkCollectionSummary } from "./components/admin/inventory/MilkCollectionSummary";

import ErrorBoundary from "./components/ErrorBoundary";
import { CompleteProfile } from "./pages/CompleteProfile";
import BackupRestore from "./components/admin/BackupRestore";
import AttendanceManagement from "./components/AttendanceManagement";

// Helper to check profile completeness
const isProfileComplete = (user) => {
  // Check for name and valid location coordinates
  // Relaxing houseNo check as it might be in fullAddress or user considers it complete
  return !!(user?.name && user?.address?.location?.coordinates?.length === 2);
};

import { useEffect } from "react";
import { initializeFirebase, requestForToken } from "./lib/firebase";
import { updateFcmToken } from "./lib/api/auth";
import { getPublicSettings } from "./lib/api/settings";
import L from "leaflet";

// Global fix for Leaflet default icon issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function AppRoute() {
  const { data: currentUser, isLoading } = useAuth();
  const { data: currentAdmin, isAdminLoading } = useCurrentAdmin();

  useEffect(() => {
    const initApp = async () => {
      // 1. Fetch public settings for dynamic configuration
      try {
        const publicSettings = await getPublicSettings();
        const settings = publicSettings?.result;

        if (settings?.firebase?.enabled) {
          initializeFirebase(settings.firebase);
        }

        // Dynamic Site Title & Favicon
        if (settings?.site?.siteName) {
          document.title = settings.site.siteName;
        }
        
        if (settings?.site?.favicon) {
          const faviconUrl = settings.site.favicon;
          let link = document.querySelector("link[rel~='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = faviconUrl;
        }

      } catch (error) {
        console.error("Failed to load public settings:", error);
      }

      // 2. Sync FCM Token if user is logged in
      const user = currentUser?.data?.result || currentAdmin?.user;
      if (user) {
        try {
          const token = await requestForToken();
          if (token && user.fcmToken !== token) {
            await updateFcmToken(token);
            console.log("FCM Token synced with backend");
          }
        } catch (error) {
          console.error("FCM Token sync failed:", error);
        }
      }
    };

    initApp();
  }, [currentUser, currentAdmin]);



  if (isLoading || isAdminLoading) return <MilkLoader />;



  const router = createBrowserRouter([
    {
      path: "/",
      element: currentUser?.data?.result ? (
        <Navigate to="/dashboard" />
      ) : (
        <Login />
      ),
    },
    {
      path: "/recharge",
      element: <UniversalRecharge />,
    },
    {
      path: "/complete-profile",
      element: currentUser?.data?.result ? (
        isProfileComplete(currentUser.data.result) ? <Navigate to="/dashboard" /> : <CompleteProfile />
      ) : (
        <Navigate to="/" />
      ),
    },
    {
      path: "/dashboard",
      element: currentUser?.data?.result ? (
        isProfileComplete(currentUser.data.result) ? <Dashboard /> : <Navigate to="/complete-profile" />
      ) : (
        <Navigate to="/" />
      ),
    },
    {
      path: "/administrator/login",
      element: currentAdmin?.user?.role && currentAdmin.user.role !== 'RIDER' ? (
        <Navigate to="/administrator/dashboard" />
      ) : (
        <AdministratorLogin />
      ),
    },
    {
      path: "/administrator/dashboard",
      element: currentAdmin?.user?.role && currentAdmin.user.role !== 'RIDER' ? (
        <ErrorBoundary>
          <AdministratorDashboard />
        </ErrorBoundary>
      ) : (
        <Navigate to="/administrator/login" />
      ),
      children: [
        {
          index: true,
          element: <DashboardHome />,
        },
        {
          path: "customers",
          element: <CustomerBlock />,
        },
        {
          path: "customers/:id",
          element: <CustomerDetail />,
        },
        {
          path: "orders",
          children: [
            { index: true, element: <Navigate to="onetime" replace /> },
            { path: "onetime", element: <Orders /> },
            { path: "subscription", element: <Subscriptions type="subscription" /> },
            { path: "trial", element: <Subscriptions type="trial" /> }
          ]
        },
        {
          path: "products",
          element: <ProductBlock />,
        },
        {
          path: "product/add",
          element: <ProductCU />,
        },
        {
          path: "product/edit/:id",
          element: <ProductCU />,
        },
        {
          path: "categories",
          element: <CategoryManagement />,
        },
        {
          path: "settings",
          element: <Settings />,
        },
        {
          path: "service-areas",
          element: <ServiceAreaManagement />,
        },
        {
          path: "logistics",
          element: <LogisticsManagement />,
        },
        {
          path: "staff",
          element: <StaffManagement />,
        },
        {
          path: "users/edit-profile",
          element: <AdministratorEditProfile />,
        },
        {
          path: "roles",
          element: <RoleManagement />,
        },
        {
          path: "distributors",
          element: <DistributorManagement />,
        },
        {
          path: "distributors",
          element: <DistributorManagement />,
        },
        {
          path: "notifications",
          element: <Notifications />,
        },
        {
          path: "invoices",
          element: <Invoices />,
        },
        {
          path: "payments/add",
          element: <AddPayment />,
        },
        {
          path: "payments/transactions",
          element: <PaymentTransactions />,
        },
        {
          path: "inventory/vendors",
          element: <VendorManagement />,
        },
        {
          path: "inventory/reception",
          element: <MilkReception />,
        },
        {
          path: "inventory/analytics",
          element: <StockAnalytics />,
        },
        {
          path: "inventory/collection-summary",
          element: <MilkCollectionSummary />,
        },
        {
          path: "riders",
          element: <Riders />,
        },
        {
          path: "attendance",
          element: <AttendanceManagement />,
        },
        {
          path: "deliveries",
          element: <DeliveryDashboard />,
        },
        {
          path: "live-tracking",
          element: <LiveTracking />,
        },
        {
          path: "riders/:id",
          element: <RiderDetails />,
        },
        {
          path: "reports",
          element: <Reports />,
        },
        {
          path: "bottles",
          element: <BottleManagement />,
        },
        {
          path: "leads",
          element: <Leads />,
        },
        {
          path: "complaints",
          element: <Complaints />,
        },
        {
          path: "backup",
          element: <BackupRestore />,
        },
        {
          path: "*",
          element: (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
              <p>This module is currently under development.</p>
            </div>
          ),
        },
      ],
    },
    {
      path: "/rider/login",
      element: <RiderLogin />,
    },
    {
      path: "/rider/dashboard",
      element: <RiderDashboard />,
    },
    {
      path: "/fieldsales/login",
      element: <FieldSalesLogin />,
    },
    {
      path: "/fieldsales/dashboard",
      element: <FieldSalesDashboard />,
    },
    {
      path: "*",
      element: <Navigate to="/" />,
    },
  ]);

  return <RouterProvider router={router} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoute />
      <Toaster
        toastOptions={{
          duration: 5000,
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            duration: 3000,
            theme: {
              primary: '#4aed88',
              secondary: 'black',
            },
          },
          error: {
            duration: 5000,
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
