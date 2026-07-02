import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Features from "./pages/Features";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
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

        <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/buildings" element={<BuildingsPage />} />
        <Route path="/super-admin/managers" element={<ManagersPage />} />
        <Route path="/super-admin/announcements" element={<AnnouncementsPage />}/>
        <Route path="/super-admin/notifications"element={<NotificationsPage />}/>
        <Route path="/super-admin/ai-settings" element={<AiSettingsPage />} />
        <Route path="/super-admin/settings" element={<SettingsPage />} />
        <Route path="/super-admin/users" element={<UsersPage />} />

        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
        <Route path="/manager/apartments" element={<ApartmentsPage />} />
        <Route path="/manager/residents" element={<ResidentsPage />} />
        <Route path="/manager/payments" element={<PaymentsPage />} />
        <Route path="/manager/receipts" element={<ReceiptsPage />} />
        <Route path="/manager/announcements" element={<ManagerAnnouncementsPage />} />
        <Route path="/manager/requests" element={<ManagerRequestsPage />} />
        <Route path="/manager/settings" element={<ManagerSettingsPage />} />

        <Route path="/resident/dashboard" element={<ResidentDashboard />} />
        <Route path="/resident/payments" element={<ResidentPaymentsPage />} />
        <Route path="/resident/receipts" element={<ResidentReceiptsPage />} />
        <Route path="/resident/announcements" element={<ResidentAnnouncementsPage />} />
        <Route path="/resident/requests" element={<ResidentRequestsPage />} />
        <Route path="/resident/settings" element={<ResidentSettingsPage />} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>

      {!isDashboardRoute && <Footer />}
    </div>
  );
}

export default App;