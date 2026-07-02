import { useMemo, useState } from "react";
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

const navItems = [
  { label: "Panel", path: "/resident/dashboard", icon: Home },
  { label: "Aidat ve Ödemeler", path: "/resident/payments", icon: CreditCard },
  { label: "Dekont Yükle", path: "/resident/receipts", icon: UploadCloud },
  { label: "Duyurular", path: "/resident/announcements", icon: Bell },
  { label: "Talepler", path: "/resident/requests", icon: MessageSquareText },
  { label: "Ayarlar", path: "/resident/settings", icon: Settings },
];

const residentInfo = {
  fullName: "Ali Can",
  siteName: "Mavi Site",
  apartment: "A Blok / Daire 5",
};

const initialAnnouncements = [
  {
    id: 1,
    title: "Su Kesintisi Bilgilendirmesi",
    type: "Bakım",
    date: "30.06.2026",
    target: "A Blok Sakinleri",
    sender: "Site Yönetimi",
    siteName: "Mavi Site",
    isRead: false,
    content:
      "Yarın 10:00 - 13:00 saatleri arasında bakım çalışması nedeniyle A Blok genelinde su kesintisi yaşanacaktır. Gerekli hazırlıkların yapılması rica olunur.",
  },
  {
    id: 2,
    title: "Aidat Son Ödeme Hatırlatması",
    type: "Ödeme",
    date: "29.06.2026",
    target: "Tüm Site",
    sender: "Site Yönetimi",
    siteName: "Mavi Site",
    isRead: false,
    content:
      "Temmuz ayı aidat son ödeme tarihi 10.07.2026 olarak belirlenmiştir. Ödemelerinizi zamanında yapmanız rica olunur.",
  },
  {
    id: 3,
    title: "Otopark Düzenlemesi",
    type: "Bilgilendirme",
    date: "28.06.2026",
    target: "Tüm Site",
    sender: "Site Yönetimi",
    siteName: "Mavi Site",
    isRead: true,
    content:
      "Otopark kullanım düzeni güncellenmiştir. Araçların sadece kendilerine ayrılan alanlara park edilmesi rica olunur.",
  },
  {
    id: 4,
    title: "Acil Elektrik Bakımı",
    type: "Acil",
    date: "27.06.2026",
    target: "A Blok",
    sender: "Site Yönetimi",
    siteName: "Mavi Site",
    isRead: true,
    content:
      "A Blok elektrik panosunda acil bakım çalışması yapılacaktır. Çalışma süresince kısa süreli elektrik kesintileri yaşanabilir.",
  },
];

function ResidentAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tümü");
  const [readFilter, setReadFilter] = useState("Tümü");

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
      const searchValue = searchTerm.toLowerCase();

      const matchesSearch =
        announcement.title.toLowerCase().includes(searchValue) ||
        announcement.type.toLowerCase().includes(searchValue) ||
        announcement.content.toLowerCase().includes(searchValue) ||
        announcement.target.toLowerCase().includes(searchValue) ||
        announcement.sender.toLowerCase().includes(searchValue);

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

  function handleViewAnnouncement(announcement) {
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
 }

  function handleCloseModal() {
    setSelectedAnnouncement(null);
  }

  return (
    <DashboardLayout
      roleTitle="Duyurular"
      roleBadge="Sakin"
      userName={residentInfo.fullName}
      navItems={navItems}
      theme="resident"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Duyuru Takibi</span>
          <h2>Duyurular</h2>
          <p>
            {residentInfo.siteName} / {residentInfo.apartment} için size
            gönderilen duyuruları buradan takip edebilirsiniz.
          </p>
        </div>
      </div>

      <ResidentAnnouncementSummaryCards summary={summary} />

      <ResidentAnnouncementToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        readFilter={readFilter}
        setReadFilter={setReadFilter}
      />

      <ResidentAnnouncementCards
        announcements={filteredAnnouncements}
        onView={handleViewAnnouncement}
      />

      <ResidentAnnouncementDetailsModal
        announcement={selectedAnnouncement}
        onClose={handleCloseModal}
      />
    </DashboardLayout>
  );
}

export default ResidentAnnouncementsPage;