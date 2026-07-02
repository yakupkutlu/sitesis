import { useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BarChart3,
  Bell,
  CreditCard,
  Home,
  MessageSquareText,
  Plus,
  Settings,
  UploadCloud,
  UserRound,
} from "lucide-react";

import ManagerAnnouncementSummaryCards from "../../components/manager-announcements/ManagerAnnouncementSummaryCards";
import ManagerAnnouncementToolbar from "../../components/manager-announcements/ManagerAnnouncementToolbar";
import ManagerAnnouncementForm from "../../components/manager-announcements/ManagerAnnouncementForm";
import ManagerAnnouncementCards from "../../components/manager-announcements/ManagerAnnouncementCards";
import ManagerAnnouncementDetailsModal from "../../components/manager-announcements/ManagerAnnouncementDetailsModal";

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

const managerManagedArea = {
  type: "site",
  name: "Mavi Site",
};

const apartmentOptions = [
  { id: 1, label: "A Blok / Daire 1", block: "A Blok" },
  { id: 2, label: "A Blok / Daire 2", block: "A Blok" },
  { id: 3, label: "A Blok / Daire 5", block: "A Blok" },
  { id: 4, label: "B Blok / Daire 8", block: "B Blok" },
  { id: 5, label: "B Blok / Daire 9", block: "B Blok" },
  { id: 6, label: "C Blok / Daire 12", block: "C Blok" },
];

const defaultTargetType =
  managerManagedArea.type === "site" ? "Tüm Site" : "Tüm Apartman";

const emptyFormData = {
  title: "",
  type: "Genel",
  targetType: defaultTargetType,
  block: "A Blok",
  selectedApartmentIds: [],
  sendSms: "Gönder",
  sendEmail: "Gönder",
  status: "Yayında",
  content: "",
};

const initialAnnouncements = [
  {
    id: 1,
    title: "Su Kesintisi Bilgilendirmesi",
    type: "Bakım",
    targetType: "Tüm Site",
    targetText: "Tüm Site",
    block: "A Blok",
    selectedApartmentIds: [],
    targetCount: 6,
    targetApartments: apartmentOptions,
    sendSms: "Gönder",
    sendEmail: "Gönder",
    status: "Yayında",
    content:
      "Yarın 10:00 - 13:00 saatleri arasında bakım çalışması nedeniyle su kesintisi yaşanacaktır.",
    createdAt: "30.06.2026",
  },
  {
    id: 2,
    title: "Aidat Son Ödeme Hatırlatması",
    type: "Ödeme",
    targetType: "Belirli Blok",
    targetText: "A Blok",
    block: "A Blok",
    selectedApartmentIds: [],
    targetCount: 3,
    targetApartments: apartmentOptions.filter(
      (apartment) => apartment.block === "A Blok"
    ),
    sendSms: "Gönder",
    sendEmail: "Gönderme",
    status: "Taslak",
    content:
      "A Blok sakinlerimizin aidat son ödeme tarihini kontrol etmeleri rica olunur.",
    createdAt: "29.06.2026",
  },
  {
    id: 3,
    title: "Otopark Düzenlemesi",
    type: "Bilgilendirme",
    targetType: "Tüm Site",
    targetText: "Tüm Site",
    block: "A Blok",
    selectedApartmentIds: [],
    targetCount: 6,
    targetApartments: apartmentOptions,
    sendSms: "Gönderme",
    sendEmail: "Gönder",
    status: "Arşivlendi",
    content:
      "Otopark kullanım düzeni ile ilgili bilgilendirme tüm sakinlere iletilmiştir.",
    createdAt: "28.06.2026",
  },
];

function buildTargetText(formData, targetApartments) {
  if (formData.targetType === "Belirli Blok") {
    return formData.block || "Blok seçilmedi";
  }

  if (formData.targetType === "Belirli Daireler") {
    return `${targetApartments.length} seçili daire`;
  }

  return formData.targetType || defaultTargetType;
}

function ManagerAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [formData, setFormData] = useState(emptyFormData);
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tümü");
  const [statusFilter, setStatusFilter] = useState("Tümü");

  const summary = useMemo(() => {
    return {
      total: announcements.length,
      published: announcements.filter(
        (announcement) => announcement.status === "Yayında"
      ).length,
      draft: announcements.filter(
        (announcement) => announcement.status === "Taslak"
      ).length,
      archived: announcements.filter(
        (announcement) => announcement.status === "Arşivlendi"
      ).length,
    };
  }, [announcements]);

  const targetApartments = useMemo(() => {
    const selectedApartmentIds = Array.isArray(formData.selectedApartmentIds)
      ? formData.selectedApartmentIds
      : [];

    if (formData.targetType === "Belirli Blok") {
      return apartmentOptions.filter(
        (apartment) => apartment.block === formData.block
      );
    }

    if (formData.targetType === "Belirli Daireler") {
      return apartmentOptions.filter((apartment) =>
        selectedApartmentIds.includes(apartment.id)
      );
    }

    return apartmentOptions;
  }, [formData.targetType, formData.block, formData.selectedApartmentIds]);

  const filteredAnnouncements = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    return announcements.filter((announcement) => {
      const searchableText = [
        announcement.title,
        announcement.type,
        announcement.targetType,
        announcement.targetText,
        announcement.status,
        announcement.content,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(searchValue);

      const matchesType =
        typeFilter === "Tümü" ? true : announcement.type === typeFilter;

      const matchesStatus =
        statusFilter === "Tümü" ? true : announcement.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [announcements, searchTerm, typeFilter, statusFilter]);

  function resetForm() {
    setFormData(emptyFormData);
    setEditingAnnouncement(null);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => {
      const updatedData = {
        ...currentData,
        [name]: value,
      };

      if (name === "targetType" || name === "block") {
        updatedData.selectedApartmentIds = [];
      }

      return updatedData;
    });
  }

  function handleApartmentSelectionChange(apartmentId) {
    setFormData((currentData) => {
      const selectedApartmentIds = Array.isArray(
        currentData.selectedApartmentIds
      )
        ? currentData.selectedApartmentIds
        : [];

      const isSelected = selectedApartmentIds.includes(apartmentId);

      return {
        ...currentData,
        selectedApartmentIds: isSelected
          ? selectedApartmentIds.filter((id) => id !== apartmentId)
          : [...selectedApartmentIds, apartmentId],
      };
    });
  }

  function handleOpenForm() {
    resetForm();
    setShowForm(true);
  }

  function handleCancelForm() {
    resetForm();
    setShowForm(false);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (targetApartments.length === 0) {
      alert("Duyuru gönderilecek hedef daire bulunamadı.");
      return;
    }

    const announcementData = {
      id: editingAnnouncement ? editingAnnouncement.id : Date.now(),
      title: formData.title.trim(),
      type: formData.type,
      targetType: formData.targetType,
      targetText: buildTargetText(formData, targetApartments),
      block: formData.block,
      selectedApartmentIds: Array.isArray(formData.selectedApartmentIds)
        ? formData.selectedApartmentIds
        : [],
      targetCount: targetApartments.length,
      targetApartments,
      sendSms: formData.sendSms,
      sendEmail: formData.sendEmail,
      status: formData.status,
      content: formData.content.trim(),
      createdAt: editingAnnouncement
        ? editingAnnouncement.createdAt
        : new Date().toLocaleDateString("tr-TR"),
    };

    if (editingAnnouncement) {
      setAnnouncements((currentAnnouncements) =>
        currentAnnouncements.map((announcement) =>
          announcement.id === editingAnnouncement.id
            ? announcementData
            : announcement
        )
      );
    } else {
      setAnnouncements((currentAnnouncements) => [
        announcementData,
        ...currentAnnouncements,
      ]);
    }

    handleCancelForm();
  }

  function handleEdit(announcement) {
    setEditingAnnouncement(announcement);

    setFormData({
      title: announcement.title || "",
      type: announcement.type || "Genel",
      targetType: announcement.targetType || defaultTargetType,
      block: announcement.block || "A Blok",
      selectedApartmentIds: Array.isArray(announcement.selectedApartmentIds)
        ? announcement.selectedApartmentIds
        : [],
      sendSms: announcement.sendSms || "Gönder",
      sendEmail: announcement.sendEmail || "Gönder",
      status: announcement.status || "Yayında",
      content: announcement.content || "",
    });

    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDelete(announcementId) {
    const confirmed = window.confirm("Bu duyuruyu silmek istiyor musunuz?");

    if (!confirmed) {
      return;
    }

    setAnnouncements((currentAnnouncements) =>
      currentAnnouncements.filter(
        (announcement) => announcement.id !== announcementId
      )
    );
  }

  return (
    <DashboardLayout
      roleTitle="Duyurular"
      roleBadge="Yönetici"
      userName="Alaa"
      navItems={navItems}
      theme="manager"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Duyuru Yönetimi</span>

          <h2>Duyurular</h2>

          <p>
            {managerManagedArea.name} kapsamındaki sakinler için duyuru
            oluşturabilir, hedef kitle ve bildirim tercihlerini
            belirleyebilirsiniz.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-action-button"
          onClick={handleOpenForm}
        >
          <Plus size={18} />
          Yeni Duyuru
        </button>
      </div>

      <ManagerAnnouncementSummaryCards summary={summary} />

      {showForm && (
        <ManagerAnnouncementForm
          formData={formData}
          editingAnnouncement={editingAnnouncement}
          managerManagedArea={managerManagedArea}
          apartmentOptions={apartmentOptions}
          onInputChange={handleInputChange}
          onApartmentSelectionChange={handleApartmentSelectionChange}
          onSubmit={handleSubmit}
          onCancel={handleCancelForm}
        />
      )}

      <ManagerAnnouncementToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      <ManagerAnnouncementCards
        announcements={filteredAnnouncements}
        onView={setSelectedAnnouncement}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ManagerAnnouncementDetailsModal
        announcement={selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
      />
    </DashboardLayout>
  );
}

export default ManagerAnnouncementsPage;