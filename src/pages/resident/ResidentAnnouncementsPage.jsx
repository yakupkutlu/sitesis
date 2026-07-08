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

import ResidentAnnouncementSummaryCards from "../../components/resident-announcements/ResidentAnnouncementSummaryCards";
import ResidentAnnouncementToolbar from "../../components/resident-announcements/ResidentAnnouncementToolbar";
import ResidentAnnouncementCards from "../../components/resident-announcements/ResidentAnnouncementCards";
import ResidentAnnouncementDetailsModal from "../../components/resident-announcements/ResidentAnnouncementDetailsModal";
import {getAnnouncements,markAnnouncementAsRead,} from "../../api/announcementsApi";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { label: "Panel", path: "/resident/dashboard", icon: Home },
  { label: "Aidat ve Ödemeler", path: "/resident/payments", icon: CreditCard },
  { label: "Dekont Yükle", path: "/resident/receipts", icon: UploadCloud },
  { label: "Duyurular", path: "/resident/announcements", icon: Bell },
  { label: "Talepler", path: "/resident/requests", icon: MessageSquareText },
  { label: "Ayarlar", path: "/resident/settings", icon: Settings },
];

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.announcements)) return data.announcements;

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
  const { user } = useAuth();

  const [announcements, setAnnouncements] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

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

        const result = await getAnnouncements({
          page: 1,
          limit: 100,
        });

        if (isMounted) {
          setAnnouncements(getDataArray(result).map(mapAnnouncementToViewModel));
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
  }, []);

  const summary = useMemo(() => {
    return {
      total: announcements.length,
      unread: announcements.filter((announcement) => !announcement.isRead).length,
      urgent: announcements.filter((announcement) => announcement.type === "Acil")
        .length,
      read: announcements.filter((announcement) => announcement.isRead).length,
    };
  }, [announcements]);

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
      roleTitle="Duyurular"
      roleBadge="Sakin"
      userName={user?.fullName ?? "Sakin"}
      navItems={navItems}
      theme="resident"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Duyuru Takibi</span>
          <h2>Duyurular</h2>
          <p>
            Size gönderilen site, blok veya daire duyurularını buradan takip
            edebilirsiniz.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="login-error-message">
          <p>{errorMessage}</p>
        </div>
      )}

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

      <ResidentAnnouncementDetailsModal
        announcement={selectedAnnouncement}
        onClose={handleCloseModal}
      />
    </DashboardLayout>
  );
}

export default ResidentAnnouncementsPage;
