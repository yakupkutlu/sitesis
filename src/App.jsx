import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/auth/ProtectedRoute";

import Home from "./pages/Home";
import Features from "./pages/Features";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

import SuperAdminDashboard from "./pages/dashboards/SuperAdminDashboard";
import ManagerDashboard from "./pages/dashboards/ManagerDashboard";
import ResidentDashboard from "./pages/dashboards/ResidentDashboard";

import BuildingsPage from "./pages/super-admin/BuildingsPage";
import ManagersPage from "./pages/super-admin/ManagersPage";
import AnnouncementsPage from "./pages/super-admin/AnnouncementsPage";
import NotificationsPage from "./pages/super-admin/NotificationsPage";
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

function App() {
  const location = useLocation();

  const isDashboardRoute =
    location.pathname.startsWith("/super-admin") ||
    location.pathname.startsWith("/manager") ||
    location.pathname.startsWith("/resident");

  return (
    <div className="app">
      {!isDashboardRoute && <Navbar />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<Features />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        <Route path="/super-admin/dashboard" element={protect(["SUPER_ADMIN"], <SuperAdminDashboard />)} />
        <Route path="/super-admin/buildings" element={protect(["SUPER_ADMIN"], <BuildingsPage />)} />
        <Route path="/super-admin/managers" element={protect(["SUPER_ADMIN"], <ManagersPage />)} />
        <Route path="/super-admin/announcements" element={protect(["SUPER_ADMIN"], <AnnouncementsPage />)} />
        <Route path="/super-admin/notifications" element={protect(["SUPER_ADMIN"], <NotificationsPage />)} />
        <Route path="/super-admin/ai-settings" element={protect(["SUPER_ADMIN"], <AiSettingsPage />)} />
        <Route path="/super-admin/settings" element={protect(["SUPER_ADMIN"], <SettingsPage />)} />
        <Route path="/super-admin/users" element={protect(["SUPER_ADMIN"], <UsersPage />)} />

        <Route path="/manager/dashboard" element={protect(["MANAGER"], <ManagerDashboard />)} />
        <Route path="/manager/apartments" element={protect(["MANAGER"], <ApartmentsPage />)} />
        <Route path="/manager/residents" element={protect(["MANAGER"], <ResidentsPage />)} />
        <Route path="/manager/payments" element={protect(["MANAGER"], <PaymentsPage />)} />
        <Route path="/manager/receipts" element={protect(["MANAGER"], <ReceiptsPage />)} />
        <Route path="/manager/announcements" element={protect(["MANAGER"], <ManagerAnnouncementsPage />)} />
        <Route path="/manager/requests" element={protect(["MANAGER"], <ManagerRequestsPage />)} />
        <Route path="/manager/settings" element={protect(["MANAGER"], <ManagerSettingsPage />)} />

        <Route path="/resident/dashboard" element={protect(["RESIDENT"], <ResidentDashboard />)} />
        <Route path="/resident/payments" element={protect(["RESIDENT"], <ResidentPaymentsPage />)} />
        <Route path="/resident/receipts" element={protect(["RESIDENT"], <ResidentReceiptsPage />)} />
        <Route path="/resident/announcements" element={protect(["RESIDENT"], <ResidentAnnouncementsPage />)} />
        <Route path="/resident/requests" element={protect(["RESIDENT"], <ResidentRequestsPage />)} />
        <Route path="/resident/settings" element={protect(["RESIDENT"], <ResidentSettingsPage />)} />

        <Route path="*" element={<NotFound />} />
      </Routes>

      {!isDashboardRoute && <Footer />}
    </div>
  );
}

export default App;
