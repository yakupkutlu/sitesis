import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  ChevronLeft,
  CircleHelp,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { useManagerScope } from "../hooks/useManagerScope";

const notificationsByRole = {
  "Süper Admin": [
    {
      title: "İletişim Mesajları",
      text: "Ana sayfadaki iletişim formundan gelen mesajları kontrol edin.",
      path: "/super-admin/contact-messages",
    },
    {
      title: "SMS / E-posta Logları",
      text: "Bildirim gönderim kayıtlarını ve hataları görüntüleyin.",
      path: "/super-admin/notifications/sms",
    },
    {
      title: "Sistem Ayarları",
      text: "Genel sistem ve marka ayarlarını kontrol edin.",
      path: "/super-admin/settings",
    },
  ],

  Yönetici: [
    {
      title: "Sakin Talepleri",
      text: "Sakinlerden gelen açık talepleri kontrol edin.",
      path: "/manager/requests",
    },
    {
      title: "Dekontlar",
      text: "Onay bekleyen dekontları inceleyin.",
      path: "/manager/receipts",
    },
    {
      title: "Aidat ve Ödemeler",
      text: "Aidat, ödeme ve gecikme durumlarını kontrol edin.",
      path: "/manager/payments",
    },
  ],

  Sakin: [
    {
      title: "Duyurular",
      text: "Size gönderilen yeni duyuruları görüntüleyin.",
      path: "/resident/announcements",
    },
    {
      title: "Dekont Yükle",
      text: "Ödeme dekontlarınızı buradan yükleyebilirsiniz.",
      path: "/resident/receipts",
    },
    {
      title: "Talepler",
      text: "Taleplerinizin durumunu takip edin.",
      path: "/resident/requests",
    },
  ],
};

const notificationHomePathByRole = {
  "Süper Admin": "/super-admin/notifications/overview",
  Yönetici: "/manager/requests",
  Sakin: "/resident/announcements",
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

function isRouteActive(currentPath, targetPath) {
  if (!targetPath) {
    return false;
  }

  return (
    currentPath === targetPath ||
    currentPath.startsWith(`${targetPath}/`)
  );
}


function normalizeNavigationItem(item) {
  const isNotificationItem =
    item?.key === "notifications" ||
    item?.label === "SMS / E-posta" ||
    item?.path === "/super-admin/notifications" ||
    item?.path === "/super-admin/notifications/sms" ||
    item?.path === "/super-admin/notifications/email" ||
    item?.path === "/super-admin/notifications/overview";

  if (!isNotificationItem) {
    return item;
  }

  return {
    ...item,
    key: "notifications",
    path: undefined,
    children: [
      {
        label: "SMS Yönetimi",
        path: "/super-admin/notifications/sms",
        icon: MessageSquare,
      },
      {
        label: "E-posta Yönetimi",
        path: "/super-admin/notifications/email",
        icon: Mail,
      },
      {
        label: "Genel Durum",
        path: "/super-admin/notifications/overview",
        icon: BarChart3,
      },
    ],
  };
}

function DashboardLayout({
  roleTitle,
  roleBadge,
  userName,
  userAvatar,
  navItems,
  theme,
  isDarkMode,
  helpTitle = "Yardım",
  helpContent,
  children,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const {
    activeAssignment,
    activeAssignmentLabel,
  } = useManagerScope();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [openNavGroups, setOpenNavGroups] = useState({});

  const dashboardIsDarkMode =
    typeof isDarkMode === "boolean" ? isDarkMode : getStoredDarkMode(roleBadge);

  const notifications = notificationsByRole[roleBadge] || [];
  const notificationHomePath =
    notificationHomePathByRole[roleBadge] || "/super-admin/notifications";
  const settingsPath = settingsPathByRole[roleBadge] || "/super-admin/settings";
  const safeUserName = userName || "Kullanıcı";
  const safeTheme = theme || "manager";

  useEffect(() => {
    document.body.classList.remove("dark-mode");

    return () => {
      document.body.classList.remove("dark-mode");
    };
  }, []);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsHelpOpen(false);
      }
    }

    if (isHelpOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isHelpOpen]);

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  function closeTopbarMenus() {
    setIsProfileMenuOpen(false);
    setIsNotificationMenuOpen(false);
    setIsHelpOpen(false);
  }

  function toggleProfileMenu() {
    setIsProfileMenuOpen((currentValue) => !currentValue);
    setIsNotificationMenuOpen(false);
    setIsHelpOpen(false);
  }

  function toggleNotificationMenu() {
    setIsNotificationMenuOpen((currentValue) => !currentValue);
    setIsProfileMenuOpen(false);
    setIsHelpOpen(false);
  }

  function toggleNavGroup(groupKey) {
    setOpenNavGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }));
  }

  function openManagerScopeSelector() {
    closeTopbarMenus();

    navigate("/manager/select-scope", {
      state: {
        from: location.pathname,
      },
    });
  }

  function toggleHelp() {
    setIsHelpOpen((currentValue) => !currentValue);
    setIsProfileMenuOpen(false);
    setIsNotificationMenuOpen(false);
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
      setIsHelpOpen(false);

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
          {navItems.map((rawItem) => {
            const item = normalizeNavigationItem(rawItem);
            const Icon = item.icon;
            const hasChildren =
              Array.isArray(item.children) && item.children.length > 0;

            if (!hasChildren) {
              return (
                <NavLink
                  to={item.path}
                  key={item.path}
                  onClick={closeSidebar}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              );
            }

            const groupKey = item.key || item.label;
            const isGroupActive = item.children.some((child) =>
              isRouteActive(location.pathname, child.path)
            );
            const isGroupOpen =
              Boolean(openNavGroups[groupKey]) || isGroupActive;

            return (
              <div
                className={`sidebar-nav-group ${
                  isGroupActive ? "active" : ""
                }`}
                key={groupKey}
              >
                <button
                  type="button"
                  className={`sidebar-nav-group-button ${
                    isGroupActive ? "active" : ""
                  }`}
                  onClick={() => toggleNavGroup(groupKey)}
                  aria-expanded={isGroupOpen}
                  aria-controls={`sidebar-subnav-${groupKey}`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                  <ChevronDown
                    size={17}
                    className={`sidebar-nav-group-chevron ${
                      isGroupOpen ? "open" : ""
                    }`}
                  />
                </button>

                {isGroupOpen && (
                  <div
                    id={`sidebar-subnav-${groupKey}`}
                    className="sidebar-subnav"
                  >
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;

                      return (
                        <NavLink
                          to={child.path}
                          key={child.path}
                          onClick={closeSidebar}
                          className={({ isActive }) =>
                            isActive ? "active" : ""
                          }
                        >
                          {ChildIcon && <ChildIcon size={16} />}
                          <span>{child.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
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
            {roleBadge === "Yönetici" && activeAssignment && (
              <button
                type="button"
                className="topbar-manager-scope-button"
                onClick={openManagerScopeSelector}
                title="Çalışma alanını değiştir"
              >
                <MapPin size={18} />

                <span>
                  <small>Çalışma Alanı</small>
                  <strong>{activeAssignmentLabel}</strong>
                </span>
              </button>
            )}

            {helpContent && (
              <button
                type="button"
                className="topbar-help-icon-button"
                onClick={toggleHelp}
                aria-label="Yardım penceresini aç"
                aria-expanded={isHelpOpen}
                title="Yardım"
              >
                <CircleHelp size={21} />
              </button>
            )}

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
                    <span>Hızlı bağlantılar</span>
                  </div>

                  <div className="notification-list">
                    {notifications.map((notification) => (
                      <Link
                        to={notification.path}
                        key={notification.title}
                        className="notification-list-link"
                        onClick={closeTopbarMenus}
                      >
                        <strong>{notification.title}</strong>
                        <span>{notification.text}</span>
                      </Link>
                    ))}
                  </div>

                  <Link
                    to={notificationHomePath}
                    className="notification-view-all-link"
                    onClick={closeTopbarMenus}
                  >
                    Tüm bildirimleri görüntüle
                  </Link>
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

      {isHelpOpen && (
        <div
          className="dashboard-help-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsHelpOpen(false);
            }
          }}
        >
          <section
            className="dashboard-help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-help-title"
          >
            <div className="dashboard-help-header">
              <div>
                <span className="section-kicker">Yardım Merkezi</span>
                <h2 id="dashboard-help-title">{helpTitle}</h2>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={() => setIsHelpOpen(false)}
                aria-label="Yardım penceresini kapat"
              >
                <X size={20} />
              </button>
            </div>

            <div className="dashboard-help-content">{helpContent}</div>
          </section>
        </div>
      )}
    </div>
  );
}

export default DashboardLayout;