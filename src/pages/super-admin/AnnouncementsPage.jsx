import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  MessageSquareText,
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

import { getSites } from "../../api/sitesApi";
import { getBlocks } from "../../api/blocksApi";
import { getApartments } from "../../api/apartmentsApi";
import {
  archiveAnnouncement,
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} from "../../api/announcementsApi";
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

const PAGE_SIZE = 10;

const emptyFormData = {
  title: "",
  content: "",
  targetType: "ALL",
  siteId: "",
  blockId: "",
  apartmentId: "",
  sendSms: false,
  sendEmail: false,
};

const emptyPagination = {
  page: 1,
  limit: PAGE_SIZE,
  totalCount: 0,
  totalPages: 1,
};

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.announcements)) return data.announcements;
  if (Array.isArray(data?.sites)) return data.sites;
  if (Array.isArray(data?.blocks)) return data.blocks;
  if (Array.isArray(data?.apartments)) return data.apartments;

  return [];
}

function getPagination(result) {
  return result?.pagination ?? result?.data?.pagination ?? emptyPagination;
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("tr-TR");
  } catch {
    return "-";
  }
}

function getTargetTypeLabel(targetType) {
  if (targetType === "ALL") return "Tüm Sistem";
  if (targetType === "SITE") return "Belirli Site";
  if (targetType === "BLOCK") return "Belirli Blok";
  if (targetType === "APARTMENT") return "Belirli Daire";

  return "Bilinmeyen Hedef";
}

function getTargetLabel(announcement) {
  if (announcement.targetType === "ALL") {
    return "Tüm Sistem";
  }

  if (announcement.targetType === "SITE") {
    return announcement.site?.name ?? "Site seçili";
  }

  if (announcement.targetType === "BLOCK") {
    const siteName = announcement.site?.name;
    const blockName = announcement.block?.name;

    return [siteName, blockName].filter(Boolean).join(" / ") || "Blok seçili";
  }

  if (announcement.targetType === "APARTMENT") {
    const siteName = announcement.site?.name;
    const blockName = announcement.block?.name;
    const apartmentNumber = announcement.apartment?.number;

    return (
      [siteName, blockName, apartmentNumber ? `Daire ${apartmentNumber}` : null]
        .filter(Boolean)
        .join(" / ") || "Daire seçili"
    );
  }

  return "Hedef belirtilmedi";
}

function mapAnnouncementToViewModel(announcement) {
  return {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    targetType: announcement.targetType,
    targetTypeLabel: getTargetTypeLabel(announcement.targetType),
    target: getTargetLabel(announcement),
    status: announcement.status === "ACTIVE" ? "Yayında" : "Arşiv",
    createdAt: formatDate(announcement.createdAt),
    createdBy: announcement.createdByUser?.fullName ?? "-",
    rawAnnouncement: announcement,
  };
}

function buildAnnouncementPayload(formData) {
  const payload = {
    title: formData.title.trim(),
    content: formData.content.trim(),
    targetType: formData.targetType,
    sendSms: Boolean(formData.sendSms),
    sendEmail: Boolean(formData.sendEmail),
  };

  if (formData.targetType === "SITE") {
    payload.siteId = formData.siteId;
  }

  if (formData.targetType === "BLOCK") {
    payload.blockId = formData.blockId;
  }

  if (formData.targetType === "APARTMENT") {
    payload.apartmentId = formData.apartmentId;
  }

  return payload;
}

function PaginationControls({
  pagination,
  isLoading,
  onPreviousPage,
  onNextPage,
}) {
  const totalPages = Math.max(1, pagination.totalPages || 1);
  const currentPage = Math.min(pagination.page || 1, totalPages);

  return (
    <div className="dashboard-panel">
      <div className="form-actions">
        <button
          type="button"
          className="secondary-form-button"
          onClick={onPreviousPage}
          disabled={isLoading || currentPage <= 1}
        >
          Önceki
        </button>

        <span>
          Sayfa {currentPage} / {totalPages} — Toplam{" "}
          {pagination.totalCount || 0} duyuru
        </span>

        <button
          type="button"
          className="secondary-form-button"
          onClick={onNextPage}
          disabled={isLoading || currentPage >= totalPages}
        >
          Sonraki
        </button>
      </div>
    </div>
  );
}

function AnnouncementsPage() {
  const { user } = useAuth();

  const [announcementList, setAnnouncementList] = useState([]);
  const [sites, setSites] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [apartments, setApartments] = useState([]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("ALL_TARGETS");
  const [statusFilter, setStatusFilter] = useState("ALL_STATUSES");

  const [formData, setFormData] = useState(emptyFormData);

  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);

  const [isLoading, setIsLoading] = useState(true);
  const [isOptionsLoading, setIsOptionsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadAnnouncementsPageData = useCallback(
    async (page, search) => {
      const params = {
        page,
        limit: PAGE_SIZE,
      };

      if (search) {
        params.search = search;
      }

      if (targetTypeFilter !== "ALL_TARGETS") {
        params.targetType = targetTypeFilter;
      }

      if (statusFilter !== "ALL_STATUSES") {
        params.status = statusFilter;
      }

      const result = await getAnnouncements(params);

      setAnnouncementList(getDataArray(result).map(mapAnnouncementToViewModel));
      setPagination({
        ...emptyPagination,
        ...getPagination(result),
      });
    },
    [targetTypeFilter, statusFilter]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadSelectOptions() {
      try {
        setIsOptionsLoading(true);

        const [sitesResult, blocksResult, apartmentsResult] = await Promise.all([
          getSites({ limit: 100 }),
          getBlocks({ limit: 100 }),
          getApartments({ limit: 100 }),
        ]);

        if (isMounted) {
          setSites(getDataArray(sitesResult));
          setBlocks(getDataArray(blocksResult));
          setApartments(getDataArray(apartmentsResult));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error?.message ?? "Duyuru seçim listeleri alınamadı.");
        }
      } finally {
        if (isMounted) {
          setIsOptionsLoading(false);
        }
      }
    }

    loadSelectOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearchTerm(searchTerm.trim());
    }, 400);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [targetTypeFilter, statusFilter]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        await loadAnnouncementsPageData(currentPage, debouncedSearchTerm);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error?.message ?? "Duyurular alınamadı.");
          setAnnouncementList([]);
          setPagination(emptyPagination);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [currentPage, debouncedSearchTerm, loadAnnouncementsPageData]);

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

    setFormData((currentData) => {
      if (name === "targetType") {
        return {
          ...currentData,
          targetType: value,
          siteId: "",
          blockId: "",
          apartmentId: "",
        };
      }

      if (name === "siteId") {
        return {
          ...currentData,
          siteId: value,
          blockId: "",
          apartmentId: "",
        };
      }

      if (name === "blockId") {
        return {
          ...currentData,
          blockId: value,
          apartmentId: "",
        };
      }

      return {
        ...currentData,
        [name]: type === "checkbox" ? checked : value,
      };
    });
  }

  function validateAnnouncementForm() {
    if (formData.title.trim().length < 2) {
      return "Duyuru başlığı en az 2 karakter olmalıdır.";
    }

    if (formData.content.trim().length < 2) {
      return "Duyuru içeriği en az 2 karakter olmalıdır.";
    }

    if (formData.targetType !== "ALL" && !formData.siteId) {
      return "Lütfen site seçin.";
    }

    if (
      (formData.targetType === "BLOCK" || formData.targetType === "APARTMENT") &&
      !formData.blockId
    ) {
      return "Lütfen blok/apartman seçin.";
    }

    if (formData.targetType === "APARTMENT" && !formData.apartmentId) {
      return "Lütfen daire seçin.";
    }

    return "";
  }

  function confirmNotificationSendIfNeeded() {
    if (editingAnnouncement) {
      return true;
    }

    if (!formData.sendSms && !formData.sendEmail) {
      return true;
    }

    const channels = [];

    if (formData.sendSms) channels.push("SMS");
    if (formData.sendEmail) channels.push("E-posta");

    return window.confirm(
      `${channels.join(" ve ")} gönderimi seçildi. Duyuru oluşturulduktan sonra bildirim kayıtları kuyruğa alınacak. Devam etmek istiyor musunuz?`
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = validateAnnouncementForm();

    if (validationError) {
      setErrorMessage(validationError);
      setMessage("");
      return;
    }

    if (!confirmNotificationSendIfNeeded()) {
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, {
          title: formData.title.trim(),
          content: formData.content.trim(),
        });
      } else {
        await createAnnouncement(buildAnnouncementPayload(formData));
      }

      await loadAnnouncementsPageData(currentPage, debouncedSearchTerm);

      setMessage(
        editingAnnouncement
          ? "Duyuru başarıyla güncellendi."
          : "Duyuru başarıyla oluşturuldu."
      );

      closeForm();
    } catch (error) {
      setErrorMessage(error?.message ?? "Duyuru kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(announcement) {
    const rawAnnouncement = announcement.rawAnnouncement;

    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title ?? "",
      content: announcement.content ?? "",
      targetType: rawAnnouncement?.targetType ?? "ALL",
      siteId: rawAnnouncement?.siteId ?? "",
      blockId: rawAnnouncement?.blockId ?? "",
      apartmentId: rawAnnouncement?.apartmentId ?? "",
      sendSms: false,
      sendEmail: false,
    });

    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleToggleStatus(announcement) {
    const isActive = announcement.status === "Yayında";

    const confirmMessage = isActive
      ? `${announcement.title} duyurusunu arşivlemek istiyor musunuz?`
      : `${announcement.title} duyurusunu tekrar yayına almak istiyor musunuz?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setMessage("");
      setErrorMessage("");

      if (isActive) {
        await archiveAnnouncement(announcement.id);
      } else {
        await updateAnnouncement(announcement.id, {
          status: "ACTIVE",
        });
      }

      await loadAnnouncementsPageData(currentPage, debouncedSearchTerm);

      setMessage(
        isActive ? "Duyuru arşivlendi." : "Duyuru tekrar yayına alındı."
      );
    } catch (error) {
      setErrorMessage(error?.message ?? "Duyuru durumu güncellenemedi.");
    }
  }

  function goToPreviousPage() {
    setCurrentPage((page) => Math.max(1, page - 1));
  }

  function goToNextPage() {
    setCurrentPage((page) =>
      Math.min(Math.max(1, pagination.totalPages || 1), page + 1)
    );
  }

  return (
    <DashboardLayout
      roleTitle="Duyurular"
      roleBadge="Süper Admin"
      userName={user?.fullName ?? "Süper Admin"}
      navItems={navItems}
      theme="super-admin"
    >
      <div className="dashboard-page-header">
        <div>
          <h2>Duyuru Yönetimi</h2>

          <p>
            Tüm sistem, belirli site, blok veya daire için duyuru oluşturabilir
            ve yayın durumlarını güvenli şekilde takip edebilirsiniz.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-action-button"
          onClick={openCreateForm}
          disabled={isSaving || isOptionsLoading}
        >
          <Plus size={18} />
          Yeni Duyuru
        </button>
      </div>

      {errorMessage && (
        <div className="login-error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      {message && (
        <div className="login-success-message">
          <p>{message}</p>
        </div>
      )}

      {isFormOpen && (
        <AnnouncementForm
          formData={formData}
          sites={sites}
          blocks={blocks}
          apartments={apartments}
          editingAnnouncement={editingAnnouncement}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isSaving={isSaving}
        />
      )}

      <AnnouncementToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        targetTypeFilter={targetTypeFilter}
        setTargetTypeFilter={setTargetTypeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {isLoading ? (
        <div className="dashboard-panel">
          <p>Duyurular yükleniyor...</p>
        </div>
      ) : announcementList.length > 0 ? (
        <>
          <section className="announcements-grid">
            {announcementList.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onView={setSelectedAnnouncement}
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </section>

          <PaginationControls
            pagination={pagination}
            isLoading={isLoading}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
          />
        </>
      ) : (
        <div className="dashboard-panel">
          <p>Duyuru bulunamadı.</p>
        </div>
      )}

      <AnnouncementDetailsModal
        announcement={selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
      />
    </DashboardLayout>
  );
}

export default AnnouncementsPage;


