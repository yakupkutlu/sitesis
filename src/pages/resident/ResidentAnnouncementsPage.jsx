import { useAuth } from "../../hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { residentNavItems } from "../../config/residentNavigation";
import {
  Bell,
  TriangleAlert,
} from "lucide-react";
import ResidentAnnouncementSummaryCards from "../../components/resident-announcements/ResidentAnnouncementSummaryCards";
import ResidentAnnouncementToolbar from "../../components/resident-announcements/ResidentAnnouncementToolbar";
import ResidentAnnouncementCards from "../../components/resident-announcements/ResidentAnnouncementCards";
import ResidentAnnouncementDetailsModal from "../../components/resident-announcements/ResidentAnnouncementDetailsModal";
import ResidentWarningCards from "../../components/resident-announcements/ResidentWarningCards";
import { getAnnouncements, markAnnouncementAsRead } from "../../api/announcementsApi";
import { getResidentAlerts } from "../../api/paymentBatchesApi";




function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.announcements)) return data.announcements;
  if (Array.isArray(data?.alerts)) return data.alerts;

  return [];
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

function normalizeText(value) {
  return String(value ?? "").toLocaleLowerCase("tr-TR").trim();
}

function getAnnouncementType(announcement) {
  const rawType =
    announcement.type ||
    announcement.category ||
    announcement.announcementType ||
    "Bilgilendirme";

  return String(rawType);
}

function getAnnouncementContent(announcement) {
  return (
    announcement.content ||
    announcement.body ||
    announcement.description ||
    announcement.message ||
    ""
  );
}

function getTargetText(announcement) {
  if (announcement.target) return announcement.target;

  const targetType = announcement.targetType;

  if (targetType === "ALL") return "Tüm Site";
  if (targetType === "SITE") return announcement.site?.name ?? "Site";
  if (targetType === "BLOCK") {
    const siteName = announcement.block?.site?.name;
    const blockName = announcement.block?.name;

    return [siteName, blockName].filter(Boolean).join(" / ") || "Blok";
  }

  if (targetType === "APARTMENT") {
    const apartment = announcement.apartment;
    const siteName = apartment?.block?.site?.name;
    const blockName = apartment?.block?.name;
    const apartmentNo = apartment?.number ? `Daire ${apartment.number}` : null;

    return [siteName, blockName, apartmentNo].filter(Boolean).join(" / ") || "Daire";
  }

  return "Size gönderildi";
}

function mapAnnouncementToViewModel(announcement) {
  const content = getAnnouncementContent(announcement);
  const type = getAnnouncementType(announcement);

  return {
    id: announcement.id,
    title: announcement.title ?? "-",
    type,
    date: formatDate(announcement.createdAt ?? announcement.date),
    target: getTargetText(announcement),
    sender:
      announcement.createdByUser?.fullName ||
      announcement.sender ||
      "Site Yönetimi",
    siteName:
      announcement.site?.name ||
      announcement.block?.site?.name ||
      announcement.apartment?.block?.site?.name ||
      "-",
    isRead: Boolean(announcement.isRead),
    content,
    raw: announcement,
  };
}

function ResidentAnnouncementsPage() {
  const { user, selectedApartmentId } = useAuth();

  const [announcements, setAnnouncements] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [activeTab, setActiveTab] = useState("DUYURULAR");

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tümü");
  const [readFilter, setReadFilter] = useState("Tümü");

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadAnnouncements() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setAnnouncements([]);
        setSelectedAnnouncement(null);

        const [announcementResult, warningResult] = await Promise.all([
          getAnnouncements({
            page: 1,
            limit: 100,
          }),
          getResidentAlerts({
            limit: 100,
          }),
        ]);

        if (isMounted) {
          setAnnouncements(
            getDataArray(announcementResult).map(mapAnnouncementToViewModel),
          );
          setWarnings(getDataArray(warningResult));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error?.message ?? "Duyurular alınamadı.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAnnouncements();

    return () => {
      isMounted = false;
    };
  }, [selectedApartmentId]);

  const summary = useMemo(() => {
    return {
      total: announcements.length,
      unread: announcements.filter((announcement) => !announcement.isRead).length,
      urgent: announcements.filter((announcement) => announcement.type === "Acil")
        .length,
      read: announcements.filter((announcement) => announcement.isRead).length,
    };
  }, [announcements]);

  const warningSummary = useMemo(() => {
    return {
      total: warnings.length,
      yellow: warnings.filter((warning) => warning.tone === "yellow").length,
      red: warnings.filter((warning) => warning.tone === "red").length,
      blue: warnings.filter((warning) => warning.tone === "blue").length,
    };
  }, [warnings]);

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((announcement) => {
      const searchValue = normalizeText(searchTerm);

      const searchableText = [
        announcement.title,
        announcement.type,
        announcement.content,
        announcement.target,
        announcement.sender,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      const matchesSearch = searchableText.includes(searchValue);

      const matchesType =
        typeFilter === "Tümü" ? true : announcement.type === typeFilter;

      const matchesRead =
        readFilter === "Tümü"
          ? true
          : readFilter === "Okundu"
          ? announcement.isRead
          : !announcement.isRead;

      return matchesSearch && matchesType && matchesRead;
    });
  }, [announcements, searchTerm, typeFilter, readFilter]);

  async function handleViewAnnouncement(announcement) {
    const updatedAnnouncement = {
      ...announcement,
      isRead: true,
    };

    setSelectedAnnouncement(updatedAnnouncement);

    setAnnouncements((currentAnnouncements) =>
      currentAnnouncements.map((item) =>
        item.id === announcement.id ? updatedAnnouncement : item
      )
    );
    try {
      await markAnnouncementAsRead(announcement.id);
    } catch (error) {
      console.error("Duyuru okundu bilgisi kaydedilemedi:", error);
    }
  }

  function handleCloseModal() {
    setSelectedAnnouncement(null);
  }

  return (
    <DashboardLayout
      roleTitle="Duyurular / Uyarılar"
      roleBadge="Sakin"
      userName={user?.fullName ?? "Sakin"}
      navItems={residentNavItems}
      theme="resident"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Bilgilendirme Merkezi</span>
          <h2>Duyurular / Uyarılar</h2>
          <p>
            Site duyurularınızı ve ödeme işlemlerinizle ilgili önemli
            uyarıları tek sayfadan takip edebilirsiniz.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="login-error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      <div className="resident-notice-tabs" role="tablist">
        <button
          type="button"
          className={activeTab === "DUYURULAR" ? "active" : ""}
          onClick={() => setActiveTab("DUYURULAR")}
          role="tab"
          aria-selected={activeTab === "DUYURULAR"}
        >
          <Bell size={27} strokeWidth={2.2} />
          <span>Duyurular</span>
          <strong>{announcements.length}</strong>
        </button>

        <button
          type="button"
          className={activeTab === "UYARILAR" ? "active" : ""}
          onClick={() => setActiveTab("UYARILAR")}
          role="tab"
          aria-selected={activeTab === "UYARILAR"}
        >
          <TriangleAlert size={30} strokeWidth={2.4} />
          <span>Uyarılar</span>
          <strong>{warnings.length}</strong>
        </button>
      </div>

      {activeTab === "DUYURULAR" ? (
        <>
          <ResidentAnnouncementSummaryCards summary={summary} />

          <ResidentAnnouncementToolbar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            readFilter={readFilter}
            setReadFilter={setReadFilter}
          />

          {isLoading ? (
            <div className="dashboard-panel">
              <p>Duyurular yükleniyor...</p>
            </div>
          ) : (
            <ResidentAnnouncementCards
              announcements={filteredAnnouncements}
              onView={handleViewAnnouncement}
            />
          )}
        </>
      ) : (
        <>
          <section className="dashboard-summary-grid resident-warning-summary-grid">
            <div className="summary-card">
              <span>Toplam Uyarı</span>
              <strong>{warningSummary.total}</strong>
            </div>

            <div className="summary-card warning-yellow">
              <span>Eksik Ödeme</span>
              <strong>{warningSummary.yellow}</strong>
            </div>

            <div className="summary-card warning-red">
              <span>Kritik Uyarı</span>
              <strong>{warningSummary.red}</strong>
            </div>

            <div className="summary-card warning-blue">
              <span>Fazla Ödeme</span>
              <strong>{warningSummary.blue}</strong>
            </div>
          </section>

          {isLoading ? (
            <div className="dashboard-panel">
              <p>Uyarılar yükleniyor...</p>
            </div>
          ) : (
            <ResidentWarningCards warnings={warnings} />
          )}
        </>
      )}

      <ResidentAnnouncementDetailsModal
        announcement={selectedAnnouncement}
        onClose={handleCloseModal}
      />
    </DashboardLayout>
  );
}

export default ResidentAnnouncementsPage;