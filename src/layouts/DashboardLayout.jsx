import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  Building2,
  ChevronLeft,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const notificationsByRole = {
  "Süper Admin": [
    {
      title: "Yeni Yönetim Kaydı",
      text: "Sisteme yeni site veya apartman kaydı eklendi.",
    },
    {
      title: "SMS / E-posta Bilgisi",
      text: "Bildirim servis kullanım bilgileri güncellendi.",
    },
    {
      title: "Sistem Kontrolü",
      text: "Genel sistem ayarları kontrol edilebilir.",
    },
  ],

  Yönetici: [
    {
      title: "Yeni Talep",
      text: "A Blok / Daire 5 yeni talep oluşturdu.",
    },
    {
      title: "Dekont Bekliyor",
      text: "2 dekont yönetici onayı bekliyor.",
    },
    {
      title: "Aidat Hatırlatma",
      text: "Bu ay için ödeme takipleri güncellendi.",
    },
  ],

  Sakin: [
    {
      title: "Yeni Duyuru",
      text: "Size yeni bir duyuru gönderildi.",
    },
    {
      title: "Dekont Durumu",
      text: "Yüklediğiniz dekont yönetici kontrolünde.",
    },
    {
      title: "Talep Cevabı",
      text: "Talebiniz için yönetici cevabı eklendi.",
    },
  ],
};

const settingsPathByRole = {
  "Süper Admin": "/super-admin/settings",
  Yönetici: "/manager/settings",
  Sakin: "/resident/settings",
};

const themeStorageKeyByRole = {
  "Süper Admin": "superAdminThemeMode",
  Yönetici: "managerThemeMode",
  Sakin: "residentThemeMode",
};

function getStoredDarkMode(roleBadge) {
  const themeStorageKey =
    themeStorageKeyByRole[roleBadge] || "superAdminThemeMode";

  const savedThemeMode = localStorage.getItem(themeStorageKey) || "";

  return savedThemeMode.toLowerCase().includes("koyu");
}

function DashboardLayout({
  roleTitle,
  roleBadge,
  userName,
  userAvatar,
  navItems,
  theme,
  isDarkMode,
  children,
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const dashboardIsDarkMode =
    typeof isDarkMode === "boolean" ? isDarkMode : getStoredDarkMode(roleBadge);

  const notifications = notificationsByRole[roleBadge] || [];
  const settingsPath = settingsPathByRole[roleBadge] || "/super-admin/settings";
  const safeUserName = userName || "Kullanıcı";
  const safeTheme = theme || "manager";

  useEffect(() => {
    document.body.classList.remove("dark-mode");

    return () => {
      document.body.classList.remove("dark-mode");
    };
  }, []);

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  function closeTopbarMenus() {
    setIsProfileMenuOpen(false);
    setIsNotificationMenuOpen(false);
  }

  function toggleProfileMenu() {
    setIsProfileMenuOpen((currentValue) => !currentValue);
    setIsNotificationMenuOpen(false);
  }

  function toggleNotificationMenu() {
    setIsNotificationMenuOpen((currentValue) => !currentValue);
    setIsProfileMenuOpen(false);
  }

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      document.body.classList.remove("dark-mode");

      setIsSidebarOpen(false);
      setIsProfileMenuOpen(false);
      setIsNotificationMenuOpen(false);

      await logout();

      navigate("/login", {
        replace: true,
      });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div
      className={`dashboard-layout dashboard-theme-${safeTheme} ${
        dashboardIsDarkMode ? "dark-mode" : ""
      }`}
    >
      <aside className={`dashboard-sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <Link to="/" className="dashboard-logo" onClick={closeSidebar}>
            <span className="dashboard-logo-icon">
              <Building2 size={24} />
            </span>

            <span>Konut Yönetim</span>
          </Link>

          <button
            type="button"
            className="sidebar-close-button"
            onClick={closeSidebar}
            aria-label="Menüyü kapat"
          >
            <X size={22} />
          </button>
        </div>

        <div className="sidebar-role-card">
          <div className="role-icon">
            <ShieldCheck size={22} />
          </div>

          <div>
            <span>{roleBadge}</span>
            <strong>{roleTitle}</strong>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink to={item.path} key={item.path} onClick={closeSidebar}>
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <Link to="/" className="back-site-link" onClick={closeSidebar}>
            <ChevronLeft size={18} />
            Siteye Dön
          </Link>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut size={18} />
            {isLoggingOut ? "Çıkış yapılıyor..." : "Çıkış Yap"}
          </button>
        </div>
      </aside>

      {isSidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={closeSidebar}
          aria-label="Menüyü kapat"
        />
      )}

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            type="button"
            className="sidebar-open-button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Menüyü aç"
            aria-expanded={isSidebarOpen}
          >
            <Menu size={24} />
          </button>

          <div className="topbar-title">
            <span>{roleBadge}</span>
            <h1>{roleTitle}</h1>
          </div>

          <div className="topbar-actions">
            <div className="topbar-menu-wrapper">
              <button
                type="button"
                className="topbar-icon-button"
                onClick={toggleNotificationMenu}
                aria-label="Bildirimleri aç"
                aria-expanded={isNotificationMenuOpen}
              >
                <Bell size={21} />
              </button>

              {isNotificationMenuOpen && (
                <div className="topbar-dropdown notification-dropdown">
                  <div className="topbar-dropdown-header">
                    <strong>Bildirimler</strong>
                    <span>Son işlemler</span>
                  </div>

                  <div className="notification-list">
                    {notifications.map((notification) => (
                      <div key={notification.title}>
                        <strong>{notification.title}</strong>
                        <span>{notification.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="topbar-menu-wrapper">
              <button
                type="button"
                className="topbar-user"
                onClick={toggleProfileMenu}
                aria-label="Profil bilgilerini aç"
                aria-expanded={isProfileMenuOpen}
              >
                <div className="topbar-user-icon">
                  {userAvatar ? (
                    <img src={userAvatar} alt="Profil" />
                  ) : (
                    <UserRound size={20} />
                  )}
                </div>

                <div>
                  <span>Hoş geldiniz</span>
                  <strong>{safeUserName}</strong>
                </div>
              </button>

              {isProfileMenuOpen && (
                <div className="topbar-dropdown profile-dropdown">
                  <div className="topbar-dropdown-header">
                    <strong>{safeUserName}</strong>
                    <span>
                      {roleBadge} / {roleTitle}
                    </span>
                  </div>

                  <div className="profile-dropdown-info">
                    <div>
                      <span>Rol</span>
                      <strong>{roleBadge}</strong>
                    </div>

                    <div>
                      <span>Sayfa</span>
                      <strong>{roleTitle}</strong>
                    </div>
                  </div>

                  <Link
                    to={settingsPath}
                    className="profile-dropdown-link"
                    onClick={closeTopbarMenus}
                  >
                    Profil ve Ayarlar
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;
