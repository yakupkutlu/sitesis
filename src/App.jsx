import { ManagerScopeProvider } from "./context/ManagerScopeContext";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ManagerScopeGate from "./components/auth/ManagerScopeGate";

import Home from "./pages/Home";
import Features from "./pages/Features";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import SelectAccountModePage from "./pages/SelectAccountModePage";
import SelectApartmentPage from "./pages/SelectApartmentPage";
import ChangePasswordRequiredPage from "./pages/ChangePasswordRequiredPage";
import InstallPage from "./pages/InstallPage";
import NotFound from "./pages/NotFound";

import SuperAdminDashboard from "./pages/dashboards/SuperAdminDashboard";
import ManagerDashboard from "./pages/dashboards/ManagerDashboard";
import ResidentDashboard from "./pages/dashboards/ResidentDashboard";

import BuildingsPage from "./pages/super-admin/BuildingsPage";
import ManagersPage from "./pages/super-admin/ManagersPage";
import AnnouncementsPage from "./pages/super-admin/AnnouncementsPage";
import SmsManagementPage from "./pages/super-admin/SmsManagementPage";
import EmailManagementPage from "./pages/super-admin/EmailManagementPage";
import NotificationOverviewPage from "./pages/super-admin/NotificationOverviewPage";
import ContactMessagesPage from "./pages/super-admin/ContactMessagesPage";
import AiSettingsPage from "./pages/super-admin/AiSettingsPage";
import SettingsPage from "./pages/super-admin/SettingsPage";
import UsersPage from "./pages/super-admin/UsersPage";

import ApartmentsPage from "./pages/manager/ApartmentsPage";
import ResidentsPage from "./pages/manager/ResidentsPage";
import PaymentsPage from "./pages/manager/PaymentsPage";
import ReceiptsPage from "./pages/manager/ReceiptsPage";
import ManagerAnnouncementsPage from "./pages/manager/ManagerAnnouncementsPage";
import ManagerRequestsPage from "./pages/manager/ManagerRequestsPage";
import ManagerSettingsPage from "./pages/manager/ManagerSettingsPage";
import ManagerScopeSelectPage from "./pages/manager/ManagerScopeSelectPage";
import AccountingOverviewPage from "./pages/manager/AccountingOverviewPage";
import AccountingIncomePage from "./pages/manager/AccountingIncomePage";
import AccountingExpensesPage from "./pages/manager/AccountingExpensesPage";

import ResidentPaymentsPage from "./pages/resident/ResidentPaymentsPage";
import ResidentReceiptsPage from "./pages/resident/ResidentReceiptsPage";
import ResidentAnnouncementsPage from "./pages/resident/ResidentAnnouncementsPage";
import ResidentRequestsPage from "./pages/resident/ResidentRequestsPage";
import ResidentSettingsPage from "./pages/resident/ResidentSettingsPage";

function protect(allowedRoles, element) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      {element}
    </ProtectedRoute>
  );
}

function protectManager(element) {
  return protect(
    ["MANAGER"],
    <ManagerScopeGate>{element}</ManagerScopeGate>
  );
}

function App() {
  const location = useLocation();

  const isDashboardRoute =
    location.pathname.startsWith("/super-admin") ||
    location.pathname.startsWith("/manager") ||
    location.pathname.startsWith("/resident") ||
    location.pathname === "/select-account-mode" ||
    location.pathname === "/select-apartment";

  return (
    <div className="app">
      <ManagerScopeProvider>
        {!isDashboardRoute && <Navbar />}

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/install" element={<InstallPage />} />

          <Route
            path="/select-account-mode"
            element={protect(undefined, <SelectAccountModePage />)}
          />

          <Route
            path="/select-apartment"
            element={protect(["RESIDENT"], <SelectApartmentPage />)}
          />

          <Route
            path="/change-password-required"
            element={protect(undefined, <ChangePasswordRequiredPage />)}
          />

          <Route
            path="/super-admin/dashboard"
            element={protect(["SUPER_ADMIN"], <SuperAdminDashboard />)}
          />

          <Route
            path="/super-admin/buildings"
            element={protect(["SUPER_ADMIN"], <BuildingsPage />)}
          />

          <Route
            path="/super-admin/managers"
            element={protect(["SUPER_ADMIN"], <ManagersPage />)}
          />

          <Route
            path="/super-admin/announcements"
            element={protect(["SUPER_ADMIN"], <AnnouncementsPage />)}
          />

          <Route
            path="/super-admin/notifications"
            element={protect(
              ["SUPER_ADMIN"],
              <Navigate to="/super-admin/notifications/overview" replace />
            )}
          />

          <Route
            path="/super-admin/notifications/sms"
            element={protect(["SUPER_ADMIN"], <SmsManagementPage />)}
          />

          <Route
            path="/super-admin/notifications/email"
            element={protect(["SUPER_ADMIN"], <EmailManagementPage />)}
          />

          <Route
            path="/super-admin/notifications/overview"
            element={protect(["SUPER_ADMIN"], <NotificationOverviewPage />)}
          />

          <Route
            path="/super-admin/ai-settings"
            element={protect(["SUPER_ADMIN"], <AiSettingsPage />)}
          />

          <Route
            path="/super-admin/settings"
            element={protect(["SUPER_ADMIN"], <SettingsPage />)}
          />

          <Route
            path="/super-admin/users"
            element={protect(["SUPER_ADMIN"], <UsersPage />)}
          />

          <Route
            path="/super-admin/contact-messages"
            element={protect(["SUPER_ADMIN"], <ContactMessagesPage />)}
          />

          <Route
            path="/manager/select-scope"
            element={protect(["MANAGER"], <ManagerScopeSelectPage />)}
          />

          <Route
            path="/manager/dashboard"
            element={protectManager(<ManagerDashboard />)}
          />

          <Route
            path="/manager/apartments"
            element={protectManager(<ApartmentsPage />)}
          />

          <Route
            path="/manager/residents"
            element={protectManager(<ResidentsPage />)}
          />

          <Route
            path="/manager/accounting"
            element={protectManager(<AccountingOverviewPage />)}
          />

          <Route
            path="/manager/accounting/income"
            element={protectManager(<AccountingIncomePage />)}
          />

          <Route
            path="/manager/accounting/expenses"
            element={protectManager(<AccountingExpensesPage />)}
          />

          <Route
            path="/manager/payments"
            element={protectManager(<PaymentsPage />)}
          />

          <Route
            path="/manager/receipts"
            element={protectManager(<ReceiptsPage />)}
          />

          <Route
            path="/manager/announcements"
            element={protectManager(<ManagerAnnouncementsPage />)}
          />

          <Route
            path="/manager/requests"
            element={protectManager(<ManagerRequestsPage />)}
          />

          <Route
            path="/manager/settings"
            element={protectManager(<ManagerSettingsPage />)}
          />

          <Route
            path="/resident/dashboard"
            element={protect(["RESIDENT"], <ResidentDashboard />)}
          />

          <Route
            path="/resident/payments"
            element={protect(["RESIDENT"], <ResidentPaymentsPage />)}
          />

          <Route
            path="/resident/receipts"
            element={protect(["RESIDENT"], <ResidentReceiptsPage />)}
          />

          <Route
            path="/resident/announcements"
            element={protect(["RESIDENT"], <ResidentAnnouncementsPage />)}
          />

          <Route
            path="/resident/requests"
            element={protect(["RESIDENT"], <ResidentRequestsPage />)}
          />

          <Route
            path="/resident/settings"
            element={protect(["RESIDENT"], <ResidentSettingsPage />)}
          />

          <Route path="*" element={<NotFound />} />
        </Routes>

        {!isDashboardRoute && <Footer />}
      </ManagerScopeProvider>
    </div>
  );
}

export default App;
