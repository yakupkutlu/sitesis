import { useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  Mail,
  Plus,
  Settings,
  UserRound,
  Users,
} from "lucide-react";

import AnnouncementToolbar from "../../components/announcements/AnnouncementToolbar";
import AnnouncementCard from "../../components/announcements/AnnouncementCard";
import AnnouncementForm from "../../components/announcements/AnnouncementForm";
import AnnouncementDetailsModal from "../../components/announcements/AnnouncementDetailsModal";

const navItems = [
  { label: "Panel", path: "/super-admin/dashboard", icon: BarChart3 },
  { label: "Site / Apartmanlar", path: "/super-admin/buildings", icon: Building2 },
  { label: "Yöneticiler", path: "/super-admin/managers", icon: Users },
  { label: "Kullanıcılar / Sakinler", path: "/super-admin/users", icon: UserRound },
  { label: "Duyurular", path: "/super-admin/announcements", icon: Bell },
  { label: "AI API Ayarları", path: "/super-admin/ai-settings", icon: BrainCircuit },
  { label: "SMS / E-posta", path: "/super-admin/notifications", icon: Mail },
  { label: "Genel Ayarlar", path: "/super-admin/settings", icon: Settings },
];

const siteOptions = ["Mavi Site", "Güneş Apartmanı", "Deniz Rezidans"];

const blockOptions = ["A Blok", "B Blok", "C Blok", "Kule A", "Kule B"];

const apartmentOptions = [
  "Daire 1",
  "Daire 2",
  "Daire 3",
  "Daire 4",
  "Daire 5",
];

const userOptions = [
  { id: 1, name: "Ali Can", apartment: "Mavi Site / A Blok / Daire 1" },
  { id: 2, name: "Ayşe Demir", apartment: "Mavi Site / A Blok / Daire 2" },
  { id: 3, name: "Mehmet Kaya", apartment: "Güneş Apartmanı / Daire 5" },
  {
    id: 4,
    name: "Zeynep Aydın",
    apartment: "Deniz Rezidans / Kule A / Daire 3",
  },
];

const initialAnnouncements = [
  {
    id: 1,
    title: "Asansör Bakım Duyurusu",
    targetType: "Sakinler",
    targetSite: "",
    targetBlock: "",
    targetApartment: "",
    selectedUserIds: [],
    target: "Sakinler",
    priority: "Önemli",
    status: "Yayında",
    content:
      "Yarın saat 10:00 ile 13:00 arasında asansör bakım çalışması yapılacaktır. Bu saatler arasında asansör kullanılamayacaktır.",
    sendSms: true,
    sendEmail: true,
    createdAt: "30.06.2026",
  },
  {
    id: 2,
    title: "Aidat Ödeme Hatırlatması",
    targetType: "Tüm Sistem",
    targetSite: "",
    targetBlock: "",
    targetApartment: "",
    selectedUserIds: [],
    target: "Tüm Sistem",
    priority: "Normal",
    status: "Yayında",
    content:
      "Bu ayın aidat ödemeleri için son ödeme tarihini kontrol etmeyi unutmayınız.",
    sendSms: false,
    sendEmail: true,
    createdAt: "30.06.2026",
  },
  {
    id: 3,
    title: "Yönetici Toplantısı",
    targetType: "Yöneticiler",
    targetSite: "",
    targetBlock: "",
    targetApartment: "",
    selectedUserIds: [],
    target: "Yöneticiler",
    priority: "Acil",
    status: "Taslak",
    content:
      "Yeni dönem yönetim planı için tüm yöneticilerle çevrim içi toplantı yapılacaktır.",
    sendSms: false,
    sendEmail: false,
    createdAt: "30.06.2026",
  },
];

const emptyFormData = {
  title: "",
  targetType: "Tüm Sistem",
  targetSite: "",
  targetBlock: "",
  targetApartment: "",
  selectedUserIds: [],
  priority: "Normal",
  status: "Yayında",
  content: "",
  sendSms: false,
  sendEmail: false,
};

function buildTargetText(formData) {
  if (formData.targetType === "Belirli Site / Apartman") {
    return formData.targetSite || "Site / Apartman seçilmedi";
  }

  if (formData.targetType === "Belirli Blok") {
    return `${formData.targetSite || "-"} / ${formData.targetBlock || "-"}`;
  }

  if (formData.targetType === "Belirli Daire") {
    return `${formData.targetSite || "-"} / ${formData.targetBlock || "-"} / ${
      formData.targetApartment || "-"
    }`;
  }

  if (formData.targetType === "Seçili Kişiler") {
    const selectedUserCount = Array.isArray(formData.selectedUserIds)
      ? formData.selectedUserIds.length
      : 0;

    return `${selectedUserCount} kişi seçildi`;
  }

  return formData.targetType || "Tüm Sistem";
}

function AnnouncementsPage() {
  const [announcementList, setAnnouncementList] = useState(initialAnnouncements);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [targetFilter, setTargetFilter] = useState("Tümü");
  const [statusFilter, setStatusFilter] = useState("Tümü");

  const [formData, setFormData] = useState(emptyFormData);

  const filteredAnnouncements = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    return announcementList.filter((announcement) => {
      const searchableText = [
        announcement.title,
        announcement.content,
        announcement.target,
        announcement.targetType,
        announcement.priority,
        announcement.status,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(searchValue);

      const matchesTarget =
        targetFilter === "Tümü"
          ? true
          : announcement.targetType === targetFilter ||
            announcement.target === targetFilter;

      const matchesStatus =
        statusFilter === "Tümü" ? true : announcement.status === statusFilter;

      return matchesSearch && matchesTarget && matchesStatus;
    });
  }, [announcementList, searchTerm, targetFilter, statusFilter]);

  function resetForm() {
    setEditingAnnouncement(null);
    setFormData(emptyFormData);
  }

  function openCreateForm() {
    resetForm();
    setIsFormOpen(true);
  }

  function closeForm() {
    resetForm();
    setIsFormOpen(false);
  }

  function handleInputChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((current) => {
      const nextData = {
        ...current,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "targetType") {
        nextData.targetSite = "";
        nextData.targetBlock = "";
        nextData.targetApartment = "";
        nextData.selectedUserIds = [];
      }

      if (name === "targetSite") {
        nextData.targetBlock = "";
        nextData.targetApartment = "";
      }

      if (name === "targetBlock") {
        nextData.targetApartment = "";
      }

      return nextData;
    });
  }

  function handleUserSelectionChange(userId) {
    setFormData((current) => {
      const selectedUserIds = Array.isArray(current.selectedUserIds)
        ? current.selectedUserIds
        : [];

      const isSelected = selectedUserIds.includes(userId);

      return {
        ...current,
        selectedUserIds: isSelected
          ? selectedUserIds.filter((id) => id !== userId)
          : [...selectedUserIds, userId],
      };
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    const announcementData = {
      id: editingAnnouncement ? editingAnnouncement.id : Date.now(),
      title: formData.title.trim(),
      targetType: formData.targetType,
      targetSite: formData.targetSite,
      targetBlock: formData.targetBlock,
      targetApartment: formData.targetApartment,
      selectedUserIds: Array.isArray(formData.selectedUserIds)
        ? formData.selectedUserIds
        : [],
      target: buildTargetText(formData),
      priority: formData.priority,
      status: formData.status,
      content: formData.content.trim(),
      sendSms: Boolean(formData.sendSms),
      sendEmail: Boolean(formData.sendEmail),
      createdAt: editingAnnouncement
        ? editingAnnouncement.createdAt
        : new Date().toLocaleDateString("tr-TR"),
    };

    if (editingAnnouncement) {
      setAnnouncementList((current) =>
        current.map((announcement) =>
          announcement.id === editingAnnouncement.id
            ? announcementData
            : announcement
        )
      );
    } else {
      setAnnouncementList((current) => [announcementData, ...current]);
    }

    closeForm();
  }

  function handleEdit(announcement) {
    setEditingAnnouncement(announcement);

    setFormData({
      title: announcement.title || "",
      targetType: announcement.targetType || announcement.target || "Tüm Sistem",
      targetSite: announcement.targetSite || "",
      targetBlock: announcement.targetBlock || "",
      targetApartment: announcement.targetApartment || "",
      selectedUserIds: Array.isArray(announcement.selectedUserIds)
        ? announcement.selectedUserIds
        : [],
      priority: announcement.priority || "Normal",
      status: announcement.status || "Yayında",
      content: announcement.content || "",
      sendSms: Boolean(announcement.sendSms),
      sendEmail: Boolean(announcement.sendEmail),
    });

    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleToggleStatus(announcement) {
    const isPublished = announcement.status === "Yayında";
    const nextStatus = isPublished ? "Pasif" : "Yayında";

    const confirmMessage = isPublished
      ? `"${announcement.title}" duyurusunu pasifleştirmek istiyor musunuz?`
      : `"${announcement.title}" duyurusunu yayına almak istiyor musunuz?`;

    const isConfirmed = window.confirm(confirmMessage);

    if (!isConfirmed) {
      return;
    }

    setAnnouncementList((current) =>
      current.map((item) =>
        item.id === announcement.id ? { ...item, status: nextStatus } : item
      )
    );
  }

  return (
    <DashboardLayout
      roleTitle="Duyurular"
      roleBadge="Süper Admin"
      userName="Alaa"
      navItems={navItems}
      theme="super-admin"
    >
      <div className="dashboard-page-header">
        <div>
          <h2>Duyuru Yönetimi</h2>

          <p>
            Sistem genelinde, yöneticilere veya sakinlere gönderilecek duyuruları
            buradan oluşturabilir ve takip edebilirsiniz.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-action-button"
          onClick={openCreateForm}
        >
          <Plus size={18} />
          Yeni Duyuru
        </button>
      </div>

      {isFormOpen && (
        <AnnouncementForm
          formData={formData}
          editingAnnouncement={editingAnnouncement}
          siteOptions={siteOptions}
          blockOptions={blockOptions}
          apartmentOptions={apartmentOptions}
          userOptions={userOptions}
          onInputChange={handleInputChange}
          onUserSelectionChange={handleUserSelectionChange}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      )}

      <AnnouncementToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        targetFilter={targetFilter}
        setTargetFilter={setTargetFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {filteredAnnouncements.length > 0 ? (
        <section className="announcements-grid">
          {filteredAnnouncements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onView={setSelectedAnnouncement}
              onEdit={handleEdit}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </section>
      ) : (
        <section className="announcements-grid">
          <p className="empty-table-message">
            Arama kriterlerine uygun duyuru bulunamadı.
          </p>
        </section>
      )}

      <AnnouncementDetailsModal
        announcement={selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
      />
    </DashboardLayout>
  );
}

export default AnnouncementsPage;