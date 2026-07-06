import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Bell,
  CreditCard,
  Home,
  MessageSquareText,
  Settings,
  UploadCloud,
} from "lucide-react";

import ResidentStatCards from "../../components/resident-dashboard/ResidentStatCards";
import ResidentQuickActions from "../../components/resident-dashboard/ResidentQuickActions";
import ResidentPaymentOverview from "../../components/resident-dashboard/ResidentPaymentOverview";
import ResidentRecentAnnouncements from "../../components/resident-dashboard/ResidentRecentAnnouncements";
import ResidentOpenRequests from "../../components/resident-dashboard/ResidentOpenRequests";

import { getResidentDashboardSummary } from "../../api/dashboardSummaryApi";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { label: "Panel", path: "/resident/dashboard", icon: Home },
  { label: "Aidat ve Ödemeler", path: "/resident/payments", icon: CreditCard },
  { label: "Dekont Yükle", path: "/resident/receipts", icon: UploadCloud },
  { label: "Duyurular", path: "/resident/announcements", icon: Bell },
  { label: "Talepler", path: "/resident/requests", icon: MessageSquareText },
  { label: "Ayarlar", path: "/resident/settings", icon: Settings },
];

function formatNumber(value) {
  return new Intl.NumberFormat("tr-TR").format(Number(value ?? 0));
}

function formatMoneyFromKurus(value) {
  const amount = Number(value ?? 0) / 100;

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(amount);
}

function calculateProgress(paidKurus, totalKurus) {
  const paid = Number(paidKurus ?? 0);
  const total = Number(totalKurus ?? 0);

  if (total <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((paid / total) * 100));
}

function ResidentDashboard() {
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

        const result = await getResidentDashboardSummary();
        const summaryData = result?.data ?? result;

        if (isMounted) {
          setSummary(summaryData);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error?.message ?? "Sakin dashboard bilgileri alınamadı."
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

  const residentInfo = useMemo(
    () => ({
      fullName: user?.fullName ?? "Sakin",
      role: "Sakin",
      siteName: "Bağlı yaşam alanı",
      apartment:
        Number(summary?.apartmentsCount ?? 0) > 0
          ? `${formatNumber(summary?.apartmentsCount)} daire bağlantısı`
          : "Daire bilgisi yok",
    }),
    [summary, user]
  );

  const stats = useMemo(
    () => ({
      totalDebt: formatMoneyFromKurus(summary?.totalDebtKurus),
      currentDue: formatMoneyFromKurus(summary?.remainingDebtKurus),
      pendingReceipts: formatNumber(summary?.pendingAllocationsCount),
      openRequests: formatNumber(summary?.openRequestsCount),
    }),
    [summary]
  );

  const payment = useMemo(
    () => ({
      currentDue: formatMoneyFromKurus(summary?.totalDebtKurus),
      paidAmount: formatMoneyFromKurus(summary?.paidTotalKurus),
      remainingAmount: formatMoneyFromKurus(summary?.remainingDebtKurus),
      dueDate: "-",
      status:
        Number(summary?.remainingDebtKurus ?? 0) > 0
          ? "Ödeme Bekliyor"
          : "Borç Yok",
      statusClass:
        Number(summary?.remainingDebtKurus ?? 0) > 0 ? "waiting" : "paid",
      progress: calculateProgress(
        summary?.paidTotalKurus,
        summary?.totalDebtKurus
      ),
    }),
    [summary]
  );

  const announcements = useMemo(
    () => [
      {
        id: 1,
        title: "Duyurular",
        date: "-",
        description:
          "Size gönderilen duyuruları Duyurular sayfasından takip edebilirsiniz.",
      },
      {
        id: 2,
        title: "Bildirim Özeti",
        date: "-",
        description: `Gönderilen bildirim: ${formatNumber(
          summary?.sentNotificationsCount
        )} | Bekleyen: ${formatNumber(summary?.pendingNotificationsCount)}`,
      },
    ],
    [summary]
  );

  const openRequests = useMemo(
    () => [
      {
        id: 1,
        title: "Açık Talepler",
        category: "Talep",
        status: `${formatNumber(summary?.openRequestsCount)} açık talep`,
        date: "-",
      },
      {
        id: 2,
        title: "Toplam Talepler",
        category: "Özet",
        status: `${formatNumber(summary?.residentRequestsCount)} toplam talep`,
        date: "-",
      },
    ],
    [summary]
  );

  return (
    <DashboardLayout
      roleTitle="Panel"
      roleBadge="Sakin"
      userName={residentInfo.fullName}
      navItems={navItems}
      theme="resident"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Sakin Paneli</span>
          <h2>Hoş geldiniz, {residentInfo.fullName}</h2>
          <p>
            Aidat, ödeme, duyuru, dekont ve talep bilgilerinizi buradan takip
            edebilirsiniz.
          </p>
        </div>

        <div className="resident-info-badge">
          <span>{residentInfo.role}</span>
          <strong>{residentInfo.apartment}</strong>
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
          <ResidentStatCards stats={stats} />

          <div className="resident-dashboard-grid">
            <ResidentPaymentOverview payment={payment} />
            <ResidentQuickActions />
          </div>

          <div className="resident-dashboard-grid">
            <ResidentRecentAnnouncements announcements={announcements} />
            <ResidentOpenRequests requests={openRequests} />
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

export default ResidentDashboard;
