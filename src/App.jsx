import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import "./App.css";
import { Login } from "./features/auth/Login";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./shared/utils/queryClient";
import { Dashboard } from "./features/customer-portal/Dashboard";
import { useAuth } from "./shared/hooks/useAuth";
import { MilkLoader } from "./components/MilkLoader";
import { AdministratorLogin } from "./features/auth/AdministratorLogin";
import { AdministratorDashboard } from "./layouts/AdministratorDashboard";
import { RiderDetails } from "./features/riders/RiderDetails";
import { useCurrentAdmin } from "./shared/hooks/useCurrentAdmin";
import { CustomerBlock } from "./features/customers/CustomerBlock";
// import { RechargeModalTest } from "./features/customer-portal/RechargeModalTest";
import { CustomerDetail } from "./features/customers/CustomerDetail";
import { ProductBlock } from "./features/products/ProductsBlock";
import { ProductCU } from "./features/products/ProductCU";
import { Settings } from "./features/settings/Settings";
import { Subscriptions } from "./features/orders/Subscriptions";
import { DashboardHome } from "./features/dashboard/DashboardHome";
import { ServiceAreaManagement } from "./features/delivery/ServiceAreaManagement";
import { LogisticsManagement } from "./features/delivery/LogisticsManagement";
import StaffManagement from './features/staff/StaffManagement';
import RoleManagement from './features/staff/RoleManagement';
import CategoryManagement from './features/products/CategoryManagement';
import { AdministratorEditProfile } from "./features/settings/AdministratorEditProfile";
import DistributorManagement from './features/staff/DistributorManagement';
import { Leads } from './features/crm/Leads';
import { Complaints } from './features/crm/Complaints';
import { Notifications } from './features/crm/Notifications';
import { Invoices } from "./features/payments/Invoices";
import { AddPayment } from "./features/payments/AddPayment";
import { PaymentTransactions } from "./features/payments/PaymentTransactions";
import { Orders } from "./features/orders/Orders";
import { Riders } from "./features/riders/Riders";
import { DeliveryDashboard } from "./features/delivery/DeliveryDashboard";
import { LiveTracking } from "./features/delivery/LiveTracking";
import Reports from "./features/reports/Reports";
import { BottleManagement } from "./features/delivery/BottleManagement";
import { Toaster } from "react-hot-toast";
import { UniversalRecharge } from "./features/customer-portal/UniversalRecharge";

import { RiderLogin } from "./features/auth/RiderLogin";
import { RiderDashboard } from "./features/riders/RiderDashboard";
import { FieldSalesLogin } from "./features/auth/FieldSalesLogin";
import { FieldSalesDashboard } from "./features/field-sales/FieldSalesDashboard";
import { VendorManagement } from "./features/inventory/VendorManagement";
import { MilkReception } from "./features/inventory/MilkReception";
import { StockAnalytics } from "./features/inventory/StockAnalytics";
import { MilkCollectionSummary } from "./features/inventory/MilkCollectionSummary";

import ErrorBoundary from "./components/ErrorBoundary";
import { CompleteProfile } from "./features/auth/CompleteProfile";
import BackupRestore from "./features/settings/BackupRestore";
import AttendanceManagement from "./features/staff/AttendanceManagement";

// Helper to check profile completeness
const isProfileComplete = (user) => {
  // Check for name and valid location coordinates
  // Relaxing houseNo check as it might be in fullAddress or user considers it complete
  return !!(user?.name && user?.address?.location?.coordinates?.length === 2);
};

import { useEffect } from "react";
import { initializeFirebase, requestForToken } from "./shared/utils/firebase";
import { updateFcmToken } from "./shared/api/auth";
import { getPublicSettings } from "./shared/api/settings";
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
