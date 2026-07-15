import { useAuth } from "../../hooks/useAuth";
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
import { getAnnouncements } from "../../api/announcementsApi";
import { getRequests } from "../../api/requestsApi";


const navItems = [
  { label: "Panel", path: "/resident/dashboard", icon: Home },
  { label: "Aidat ve Ödemeler", path: "/resident/payments", icon: CreditCard },
  { label: "Dekont Yükle", path: "/resident/receipts", icon: UploadCloud },
  { label: "Duyurular", path: "/resident/announcements", icon: Bell },
  { label: "Talepler", path: "/resident/requests", icon: MessageSquareText },
  { label: "Ayarlar", path: "/resident/settings", icon: Settings },
];

const requestStatusMap = {
  OPEN: "Yeni",
  IN_PROGRESS: "İnceleniyor",
  DONE: "Çözüldü",
  REJECTED: "Reddedildi",
};

const requestTypeMap = {
  MAINTENANCE: "Bakım",
  COMPLAINT: "Şikayet",
  SUGGESTION: "Öneri",
  GENERAL: "Genel",
};

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.announcements)) return data.announcements;
  if (Array.isArray(data?.requests)) return data.requests;

  return [];
}

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

function formatDate(value) {
  if (!value) {
    return "-";
  }

  try {
    return new Date(value).toLocaleDateString("tr-TR");
  } catch {
    return "-";
  }
}

function calculateProgress(paidKurus, totalKurus) {
  const paid = Number(paidKurus ?? 0);
  const total = Number(totalKurus ?? 0);

  if (total <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((paid / total) * 100));
}

function getAnnouncementDescription(announcement) {
  return (
    announcement.content ||
    announcement.body ||
    announcement.description ||
    announcement.message ||
    "Duyuru açıklaması bulunmuyor."
  );
}

function mapAnnouncementToDashboard(announcement) {
  return {
    id: announcement.id,
    title: announcement.title ?? "Duyuru",
    date: formatDate(announcement.createdAt ?? announcement.date),
    description: getAnnouncementDescription(announcement),
  };
}

function mapRequestToDashboard(request) {
  return {
    id: request.id,
    title: request.title ?? "Talep",
    category: requestTypeMap[request.type] ?? "Genel",
    status: requestStatusMap[request.status] ?? request.status ?? "Yeni",
    date: formatDate(request.createdAt),
  };
}

function ResidentDashboard() {
  const { user } = useAuth();

  const [summary, setSummary] = useState(null);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getResidentDashboardSummary(),
      getAnnouncements({
        page: 1,
        limit: 3,
      }),
      getRequests({
        page: 1,
        limit: 3,
      }),
    ])
      .then(([summaryResult, announcementsResult, requestsResult]) => {
        if (!isMounted) return;

        setSummary(summaryResult?.data ?? summaryResult ?? {});
        setRecentAnnouncements(
          getDataArray(announcementsResult).map(mapAnnouncementToDashboard)
        );
        setRecentRequests(getDataArray(requestsResult).map(mapRequestToDashboard));
        setErrorMessage("");
      })
      .catch((error) => {
        if (!isMounted) return;

        setErrorMessage(error?.message ?? "Sakin dashboard bilgileri alınamadı.");
      })
      .finally(() => {
        if (!isMounted) return;

        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const residentInfo = useMemo(
    () => ({
      fullName: user?.fullName ?? "Sakin",
      role: "Sakin",
      apartment:
        Number(summary?.apartmentsCount ?? 0) > 0
          ? `${formatNumber(summary?.apartmentsCount)} daire bağlantısı`
          : "Daire bilgisi yok",
    }),
    [summary, user]
  );

  const stats = useMemo(
    () => ({
      totalDebt: formatMoneyFromKurus(summary?.remainingDebtKurus),
      currentDue: formatMoneyFromKurus(summary?.remainingDebtKurus),
      pendingReceipts: formatNumber(summary?.pendingAllocationsCount),
      openRequests: formatNumber(summary?.openRequestsCount),
    }),
    [summary]
  );

  const payment = useMemo(
    () => ({
      currentDue: formatMoneyFromKurus(summary?.remainingDebtKurus),
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

  const announcements = useMemo(() => {
    if (recentAnnouncements.length > 0) {
      return recentAnnouncements;
    }

    return [
      {
        id: "empty-announcement",
        title: "Duyuru bulunmuyor",
        date: "-",
        description: "Size gönderilmiş güncel duyuru bulunmuyor.",
      },
    ];
  }, [recentAnnouncements]);

  const openRequests = useMemo(() => {
    if (recentRequests.length > 0) {
      return recentRequests;
    }

    return [
      {
        id: "empty-request",
        title: "Talep bulunmuyor",
        category: "Talep",
        status: "Açık talep yok",
        date: "-",
      },
    ];
  }, [recentRequests]);

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

