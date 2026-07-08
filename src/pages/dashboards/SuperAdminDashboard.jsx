import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  Mail,
  MessageSquareText,
  Plus,
  Settings,
  UserRound,
  Users,
} from "lucide-react";

import { getSuperAdminDashboardSummary } from "../../api/dashboardSummaryApi";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { label: "Panel", path: "/super-admin/dashboard", icon: BarChart3 },
  { label: "Site / Apartmanlar", path: "/super-admin/buildings", icon: Building2 },
  { label: "Yöneticiler", path: "/super-admin/managers", icon: Users },
  { label: "Kullanıcılar / Sakinler", path: "/super-admin/users", icon: UserRound },
  { label: "Duyurular", path: "/super-admin/announcements", icon: Bell },  { label: "İletişim Mesajları", path: "/super-admin/contact-messages", icon: MessageSquareText },

  { label: "AI API Ayarları", path: "/super-admin/ai-settings", icon: BrainCircuit },
  { label: "SMS / E-posta", path: "/super-admin/notifications", icon: Mail },
  { label: "Genel Ayarlar", path: "/super-admin/settings", icon: Settings },
];

const quickActions = [
  {
    label: "Site / Apartman Oluştur",
    path: "/super-admin/buildings",
    icon: Building2,
  },
  {
    label: "Yönetici Ata",
    path: "/super-admin/managers",
    icon: Users,
  },
  {
    label: "Kullanıcıları Görüntüle",
    path: "/super-admin/users",
    icon: UserRound,
  },
  {
    label: "AI API Ayarları",
    path: "/super-admin/ai-settings",
    icon: BrainCircuit,
  },
  {
    label: "Genel Duyuru Yayınla",
    path: "/super-admin/announcements",
    icon: Bell,
  },
];

function formatNumber(value) {
  return new Intl.NumberFormat("tr-TR").format(Number(value ?? 0));
}

function SuperAdminDashboard() {
  const { user } = useAuth();

  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const result = await getSuperAdminDashboardSummary();
        const summaryData = result?.data ?? result;

        if (isMounted) {
          setSummary(summaryData);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error?.message ?? "Dashboard bilgileri alınamadı."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(
    () => [
      {
        label: "Toplam Site / Apartman",
        value: formatNumber(summary?.sitesCount),
        description: `Blok: ${formatNumber(summary?.blocksCount)} | Daire: ${formatNumber(summary?.apartmentsCount)}`,
        icon: Building2,
      },
      {
        label: "Toplam Yönetici",
        value: formatNumber(summary?.managersCount),
        description: "Sisteme kayıtlı yönetici hesapları",
        icon: Users,
      },
      {
        label: "Toplam Kullanıcı",
        value: formatNumber(summary?.usersCount),
        description: `Sakin: ${formatNumber(summary?.residentsCount)} | Süper Admin: ${formatNumber(summary?.superAdminsCount)}`,
        icon: UserRound,
      },
      {
        label: "Gönderilen Bildirim",
        value: formatNumber(summary?.sentNotificationsCount),
        description: `Bekleyen: ${formatNumber(summary?.pendingNotificationsCount)} | Hatalı: ${formatNumber(summary?.failedNotificationsCount)}`,
        icon: MessageSquareText,
      },
    ],
    [summary]
  );

  const systemActivities = useMemo(
    () => [
      {
        title: "Ödeme kayıtları",
        description: `Toplam ödeme kalemi: ${formatNumber(summary?.paymentAllocationsCount)} | Ödenen: ${formatNumber(summary?.paidAllocationsCount)} | Bekleyen: ${formatNumber(summary?.pendingAllocationsCount)}`,
        icon: BarChart3,
      },
      {
        title: "Gecikmiş ödemeler",
        description: `Gecikmiş ödeme kalemi: ${formatNumber(summary?.overdueAllocationsCount)}`,
        icon: Bell,
      },
      {
        title: "Sakin talepleri",
        description: `Toplam talep: ${formatNumber(summary?.residentRequestsCount)} | Açık talep: ${formatNumber(summary?.openRequestsCount)}`,
        icon: UserRound,
      },
      {
        title: "Bildirim kayıtları",
        description: `Toplam bildirim logu: ${formatNumber(summary?.notificationLogsCount)}`,
        icon: Mail,
      },
    ],
    [summary]
  );

  return (
    <DashboardLayout
      roleTitle="Süper Admin Paneli"
      roleBadge="Süper Admin"
      userName={user?.fullName ?? "Süper Admin"}
      navItems={navItems}
      theme="super-admin"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Genel Bakış</span>
          <h2>Süper Admin Paneli</h2>
          <p>
            Site, apartman, yönetici, kullanıcı, bildirim ve sistem ayarlarını
            buradan takip edebilirsiniz.
          </p>
        </div>

        <Link to="/super-admin/buildings" className="dashboard-action-button">
          <Plus size={18} />
          Yeni Site / Apartman
        </Link>
      </div>

      {errorMessage && (
        <div className="login-error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      {isLoading ? (
        <div className="dashboard-panel">
          <p>Dashboard bilgileri yükleniyor...</p>
        </div>
      ) : (
        <>
          <section className="dashboard-stats-grid">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <article className="dashboard-stat-card" key={stat.label}>
                  <div className="dashboard-stat-icon">
                    <Icon size={24} />
                  </div>

                  <div>
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                    <p>{stat.description}</p>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="dashboard-panels-grid">
            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <span className="section-kicker">Sistem Özeti</span>
                  <h3>Canlı Veriler</h3>
                </div>
              </div>

              <div className="activity-list">
                {systemActivities.map((activity) => {
                  const Icon = activity.icon;

                  return (
                    <div className="activity-item" key={activity.title}>
                      <div className="activity-icon">
                        <Icon size={18} />
                      </div>

                      <div>
                        <strong>{activity.title}</strong>
                        <p>{activity.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <span className="section-kicker">Kısayollar</span>
                  <h3>Hızlı İşlemler</h3>
                </div>
              </div>

              <div className="quick-actions">
                {quickActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <Link
                      to={action.path}
                      className="quick-action-link"
                      key={action.label}
                    >
                      <Icon size={19} />
                      <span>{action.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      )}
    </DashboardLayout>
  );
}

export default SuperAdminDashboard;


