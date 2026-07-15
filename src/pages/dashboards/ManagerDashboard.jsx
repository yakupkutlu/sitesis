import { useAuth } from "../../hooks/useAuth";
import { useManagerScope } from "../../hooks/useManagerScope";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  FileText,
  Home,
  MessageSquareText,
  Plus,
  ReceiptText,
  Settings,
  UploadCloud,
  UserRound,
  Users,
} from "lucide-react";

import { getManagerDashboardSummary } from "../../api/dashboardSummaryApi";



const navItems = [
  { label: "Panel", path: "/manager/dashboard", icon: BarChart3 },
  { label: "Daireler", path: "/manager/apartments", icon: Home },
  { label: "Sakinler", path: "/manager/residents", icon: UserRound },
  { label: "Aidat ve Ödemeler", path: "/manager/payments", icon: CreditCard },
  { label: "Dekontlar", path: "/manager/receipts", icon: UploadCloud },
  { label: "Duyurular", path: "/manager/announcements", icon: Bell },
  { label: "Talepler", path: "/manager/requests", icon: MessageSquareText },
  { label: "Ayarlar", path: "/manager/settings", icon: Settings },
];

const quickActions = [
  {
    label: "Yeni Daire Ekle",
    path: "/manager/apartments",
    icon: Home,
  },
  {
    label: "Yeni Sakin Ekle",
    path: "/manager/residents",
    icon: UserRound,
  },
  {
    label: "Aidat / Gider Ekle",
    path: "/manager/payments",
    icon: ReceiptText,
  },
  {
    label: "Dekontları Kontrol Et",
    path: "/manager/receipts",
    icon: UploadCloud,
  },
  {
    label: "Duyuru Yayınla",
    path: "/manager/announcements",
    icon: Bell,
  },
  {
    label: "Sakin Taleplerini İncele",
    path: "/manager/requests",
    icon: MessageSquareText,
  },
];

function formatNumber(value) {
  return new Intl.NumberFormat("tr-TR").format(Number(value ?? 0));
}

function ManagerDashboard() {
  const { user } = useAuth();
  const {
    activeAssignmentId,
    activeAssignmentLabel,
  } = useManagerScope();

  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

useEffect(() => {
  let isMounted = true;

  const timeoutId = window.setTimeout(() => {
    setIsLoading(true);

    getManagerDashboardSummary()
      .then((result) => {
        if (!isMounted) return;

        setSummary(result?.data ?? result ?? {});
        setErrorMessage("");
      })
      .catch((error) => {
        if (!isMounted) return;

        setErrorMessage(
          error?.message ?? "Yönetici dashboard bilgileri alınamadı."
        );
      })
      .finally(() => {
        if (!isMounted) return;

        setIsLoading(false);
      });
  }, 0);

  return () => {
    isMounted = false;
    window.clearTimeout(timeoutId);
  };
}, [activeAssignmentId]);

  const stats = useMemo(
    () => [
      {
        label: "Toplam Daire",
        value: formatNumber(summary?.apartmentsCount),
        description: `Site: ${formatNumber(
          summary?.assignedSitesCount
        )} | Blok: ${formatNumber(summary?.assignedBlocksCount)}`,
        icon: Home,
      },
      {
        label: "Aktif Sakin",
        value: formatNumber(summary?.residentsCount),
        description: "Yetki alanındaki sakin kayıtları",
        icon: Users,
      },
      {
        label: "Ödeme Kalemleri",
        value: formatNumber(summary?.paymentAllocationsCount),
        description: `Ödenen: ${formatNumber(
          summary?.paidAllocationsCount
        )} | Bekleyen: ${formatNumber(summary?.pendingAllocationsCount)}`,
        icon: CreditCard,
      },
      {
        label: "Açık Talep",
        value: formatNumber(summary?.openRequestsCount),
        description: `Toplam talep: ${formatNumber(
          summary?.residentRequestsCount
        )}`,
        icon: MessageSquareText,
      },
    ],
    [summary]
  );

  const recentActivities = useMemo(
    () => [
      {
        title: "Aidat ve ödeme durumu",
        description: `Toplam ödeme grubu: ${formatNumber(
          summary?.paymentBatchesCount
        )} | Toplam ödeme kalemi: ${formatNumber(
          summary?.paymentAllocationsCount
        )}`,
        icon: CreditCard,
      },
      {
        title: "Gecikmiş ödemeler",
        description: `Gecikmiş ödeme kalemi: ${formatNumber(
          summary?.overdueAllocationsCount
        )}`,
        icon: Bell,
      },
      {
        title: "Sakin talepleri",
        description: `Toplam talep: ${formatNumber(
          summary?.residentRequestsCount
        )} | Açık talep: ${formatNumber(summary?.openRequestsCount)}`,
        icon: MessageSquareText,
      },
      {
        title: "Bildirim kayıtları",
        description: `Gönderilen: ${formatNumber(
          summary?.sentNotificationsCount
        )} | Bekleyen: ${formatNumber(
          summary?.pendingNotificationsCount
        )} | Hatalı: ${formatNumber(summary?.failedNotificationsCount)}`,
        icon: UploadCloud,
      },
    ],
    [summary]
  );

  return (
    <DashboardLayout
      roleTitle="Yönetici Paneli"
      roleBadge="Yönetici"
      userName={user?.fullName ?? "Yönetici"}
      navItems={navItems}
      theme="manager"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Genel Bakış</span>
          <h2>Yönetici Paneli</h2>
          <p>
            Daireler, sakinler, aidat ödemeleri, dekontlar, duyurular ve
            talepler bu panel üzerinden yönetilir.
          </p>
        </div>

        <div className="manager-dashboard-header-actions">
          <div className="manager-current-scope-badge">
            <span>Aktif Çalışma Alanı</span>
            <strong>{activeAssignmentLabel}</strong>
          </div>

          <Link to="/manager/payments" className="dashboard-action-button">
            <Plus size={18} />
            Yeni Aidat / Gider
          </Link>
        </div>
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
                  <span className="section-kicker">Canlı Veriler</span>
                  <h3>Yetki Alanı Özeti</h3>
                </div>
              </div>

              <div className="activity-list">
                {recentActivities.map((activity) => {
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

          <section className="manager-dashboard-summary">
            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <span className="section-kicker">Aidat Durumu</span>
                  <h3>Ödeme Özeti</h3>
                </div>
              </div>

              <div className="manager-summary-grid">
                <div>
                  <span>Toplam Kalem</span>
                  <strong>
                    {formatNumber(summary?.paymentAllocationsCount)}
                  </strong>
                </div>

                <div>
                  <span>Ödenen</span>
                  <strong>{formatNumber(summary?.paidAllocationsCount)}</strong>
                </div>

                <div>
                  <span>Bekleyen</span>
                  <strong>
                    {formatNumber(summary?.pendingAllocationsCount)}
                  </strong>
                </div>

                <div>
                  <span>Gecikmiş</span>
                  <strong>
                    {formatNumber(summary?.overdueAllocationsCount)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <span className="section-kicker">Belgeler</span>
                  <h3>Dekont / Bildirim Özeti</h3>
                </div>
              </div>

              <div className="manager-document-list">
                <div>
                  <FileText size={18} />
                  <span>Toplam bildirim logu</span>
                  <strong>{formatNumber(summary?.notificationLogsCount)}</strong>
                </div>

                <div>
                  <Building2 size={18} />
                  <span>Gönderilen bildirim</span>
                  <strong>{formatNumber(summary?.sentNotificationsCount)}</strong>
                </div>

                <div>
                  <ReceiptText size={18} />
                  <span>Hatalı bildirim</span>
                  <strong>{formatNumber(summary?.failedNotificationsCount)}</strong>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </DashboardLayout>
  );
}

export default ManagerDashboard;
