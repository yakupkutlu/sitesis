import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Archive,
  BarChart3,
  Bell,
  CreditCard,
  Edit,
  Eye,
  Home,
  MessageSquareText,
  Plus,
  Settings,
  UploadCloud,
  UserRound,
} from "lucide-react";

import {
  archiveAnnouncement,
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} from "../../api/announcementsApi";
import { getApartments } from "../../api/apartmentsApi";
import { useAuth } from "../../context/AuthContext";

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

const emptyFormData = {
  title: "",
  content: "",
  targetType: "BLOCK",
  blockId: "",
  apartmentId: "",
  sendSms: false,
  sendEmail: true,
  status: "ACTIVE",
};

const statusLabels = {
  ACTIVE: "Yayında",
  ARCHIVED: "Arşivlendi",
};

const targetLabels = {
  ALL: "Tüm Sistem",
  SITE: "Site",
  BLOCK: "Blok",
  APARTMENT: "Daire",
};

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.announcements)) return data.announcements;
  if (Array.isArray(data?.apartments)) return data.apartments;

  return [];
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("tr-TR");
  } catch {
    return "-";
  }
}

function getTargetText(announcement) {
  if (announcement.targetType === "ALL") {
    return "Tüm sistem";
  }

  if (announcement.targetType === "SITE") {
    return announcement.site?.name ?? "Site";
  }

  if (announcement.targetType === "BLOCK") {
    return announcement.block?.name ?? "Blok";
  }

  if (announcement.targetType === "APARTMENT") {
    return announcement.apartment?.number
      ? `Daire ${announcement.apartment.number}`
      : "Daire";
  }

  return "-";
}

function getUniqueBlocks(apartments) {
  const blockMap = new Map();

  for (const apartment of apartments) {
    const block = apartment.block;

    if (!block?.id) {
      continue;
    }

    blockMap.set(block.id, {
      id: block.id,
      name: block.name,
      siteName: block.site?.name ?? "Site",
    });
  }

  return Array.from(blockMap.values());
}

function mapAnnouncementToViewModel(item) {
  return {
    id: item.id,
    title: item.title,
    content: item.content,
    targetType: item.targetType,
    targetTypeText: targetLabels[item.targetType] ?? item.targetType,
    targetText: getTargetText(item),
    status: item.status,
    statusText: statusLabels[item.status] ?? item.status,
    createdBy: item.createdByUser?.fullName ?? "-",
    createdAt: formatDate(item.createdAt),
    raw: item,
  };
}

function canManageAnnouncement(announcement) {
  return announcement?.targetType !== "ALL";
}

function ManagerAnnouncementsPage() {
  const { user } = useAuth();

  const [announcements, setAnnouncements] = useState([]);
  const [apartments, setApartments] = useState([]);

  const [formData, setFormData] = useState(emptyFormData);
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tümü");
  const [targetFilter, setTargetFilter] = useState("Tümü");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const blockOptions = useMemo(() => getUniqueBlocks(apartments), [apartments]);

  async function loadAnnouncements() {
    const result = await getAnnouncements({
      page: 1,
      limit: 100,
      search: searchTerm.trim(),
    });

    setAnnouncements(getDataArray(result).map(mapAnnouncementToViewModel));
  }

  async function loadApartments() {
    const result = await getApartments({
      page: 1,
      limit: 100,
    });

    setApartments(getDataArray(result));
  }

  async function loadPageData() {
    await Promise.all([loadAnnouncements(), loadApartments()]);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        await loadPageData();
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

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    return {
      total: announcements.length,
      active: announcements.filter((item) => item.status === "ACTIVE").length,
      archived: announcements.filter((item) => item.status === "ARCHIVED").length,
    };
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    return announcements.filter((item) => {
      const searchableText = [
        item.title,
        item.content,
        item.targetText,
        item.targetTypeText,
        item.statusText,
        item.createdBy,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(searchValue);
      const matchesStatus =
        statusFilter === "Tümü" ? true : item.statusText === statusFilter;
      const matchesTarget =
        targetFilter === "Tümü" ? true : item.targetTypeText === targetFilter;

      return matchesSearch && matchesStatus && matchesTarget;
    });
  }, [announcements, searchTerm, statusFilter, targetFilter]);

  function resetForm() {
    setEditingAnnouncement(null);
    setFormData(emptyFormData);
  }

  function openCreateForm() {
    resetForm();
    setShowForm(true);
    setMessage("");
    setErrorMessage("");
  }

  function closeForm() {
    resetForm();
    setShowForm(false);
  }

  function handleInputChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((currentData) => {
      const nextValue = type === "checkbox" ? checked : value;

      if (name === "targetType") {
        return {
          ...currentData,
          targetType: nextValue,
          blockId: "",
          apartmentId: "",
        };
      }

      return {
        ...currentData,
        [name]: nextValue,
      };
    });
  }

  function handleEdit(announcement) {
    if (!canManageAnnouncement(announcement)) {
      setErrorMessage("Bu duyuru tüm sisteme aittir. Yönetici tarafından düzenlenemez.");
      return;
    }
    setEditingAnnouncement(announcement);

    setFormData({
      title: announcement.title ?? "",
      content: announcement.content ?? "",
      targetType: announcement.targetType ?? "BLOCK",
      blockId: announcement.raw?.blockId ?? "",
      apartmentId: announcement.raw?.apartmentId ?? "",
      sendSms: false,
      sendEmail: false,
      status: announcement.status ?? "ACTIVE",
    });

    setShowForm(true);
    setMessage("");
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.title.trim()) {
      setErrorMessage("Başlık zorunludur.");
      return;
    }

    if (!formData.content.trim()) {
      setErrorMessage("Duyuru içeriği zorunludur.");
      return;
    }

    if (!editingAnnouncement) {
      if (formData.targetType === "BLOCK" && !formData.blockId) {
        setErrorMessage("Blok seçimi zorunludur.");
        return;
      }

      if (formData.targetType === "APARTMENT" && !formData.apartmentId) {
        setErrorMessage("Daire seçimi zorunludur.");
        return;
      }
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, {
          title: formData.title.trim(),
          content: formData.content.trim(),
          status: formData.status,
        });

        setMessage("Duyuru başarıyla güncellendi.");
      } else {
        await createAnnouncement({
          title: formData.title.trim(),
          content: formData.content.trim(),
          targetType: formData.targetType,
          ...(formData.targetType === "BLOCK" ? { blockId: formData.blockId } : {}),
          ...(formData.targetType === "APARTMENT"
            ? { apartmentId: formData.apartmentId }
            : {}),
          sendSms: Boolean(formData.sendSms),
          sendEmail: Boolean(formData.sendEmail),
        });

        setMessage("Duyuru başarıyla oluşturuldu.");
      }

      await loadPageData();
      closeForm();
    } catch (error) {
      setErrorMessage("Duyuru kaydedilemedi veya bu işlem için yetkiniz yok.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive(announcement) {
    if (!canManageAnnouncement(announcement)) {
      setErrorMessage("Bu duyuru tüm sisteme aittir. Yönetici tarafından arşivlenemez.");
      return;
    }
    const isConfirmed = window.confirm(
      `${announcement.title} duyurusunu arşivlemek istiyor musunuz?`
    );

    if (!isConfirmed) {
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      await archiveAnnouncement(announcement.id);
      await loadPageData();

      setMessage("Duyuru başarıyla arşivlendi.");
    } catch (error) {
      setErrorMessage("Duyuru arşivlenemedi veya bu işlem için yetkiniz yok.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DashboardLayout
      roleTitle="Duyurular"
      roleBadge="Yönetici"
      userName={user?.fullName ?? "Yönetici"}
      navItems={navItems}
      theme="manager"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Duyuru Yönetimi</span>

          <h2>Duyurular</h2>

          <p>
            Yetkili olduğunuz blok veya daire kapsamındaki sakinlere duyuru
            oluşturabilir ve mevcut duyuruları takip edebilirsiniz.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-action-button"
          onClick={openCreateForm}
          disabled={isSaving}
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

      <section className="dashboard-summary-grid">
        <div className="summary-card">
          <span>Toplam Duyuru</span>
          <strong>{summary.total}</strong>
        </div>

        <div className="summary-card">
          <span>Yayında</span>
          <strong>{summary.active}</strong>
        </div>

        <div className="summary-card">
          <span>Arşiv</span>
          <strong>{summary.archived}</strong>
        </div>
      </section>

      {showForm && (
        <section className="dashboard-panel">
          <div className="manager-form-header">
            <div>
              <span className="section-kicker">
                {editingAnnouncement ? "Duyuru Düzenle" : "Yeni Duyuru"}
              </span>

              <h3>
                {editingAnnouncement
                  ? "Duyuru Bilgilerini Güncelle"
                  : "Duyuru Oluştur"}
              </h3>

              <p>
                Duyuru hedefi yalnızca yetki alanınızdaki blok veya dairelerden
                seçilebilir.
              </p>
            </div>
          </div>

          <form className="manager-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Başlık
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Örn: Asansör bakımı"
                  disabled={isSaving}
                  required
                />
              </label>

              <label>
                Durum
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  disabled={isSaving}
                >
                  <option value="ACTIVE">Yayında</option>
                  <option value="ARCHIVED">Arşivlendi</option>
                </select>
              </label>

              {!editingAnnouncement && (
                <>
                  <label>
                    Hedef Türü
                    <select
                      name="targetType"
                      value={formData.targetType}
                      onChange={handleInputChange}
                      disabled={isSaving}
                    >
                      <option value="BLOCK">Blok</option>
                      <option value="APARTMENT">Daire</option>
                    </select>
                  </label>

                  {formData.targetType === "BLOCK" && (
                    <label>
                      Blok Seç
                      <select
                        name="blockId"
                        value={formData.blockId}
                        onChange={handleInputChange}
                        disabled={isSaving}
                        required
                      >
                        <option value="">Blok seçiniz</option>

                        {blockOptions.map((block) => (
                          <option key={block.id} value={block.id}>
                            {block.siteName} / {block.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {formData.targetType === "APARTMENT" && (
                    <label>
                      Daire Seç
                      <select
                        name="apartmentId"
                        value={formData.apartmentId}
                        onChange={handleInputChange}
                        disabled={isSaving}
                        required
                      >
                        <option value="">Daire seçiniz</option>

                        {apartments.map((apartment) => (
                          <option key={apartment.id} value={apartment.id}>
                            {apartment.block?.site?.name ?? "Site"} /{" "}
                            {apartment.block?.name ?? "Blok"} / Daire{" "}
                            {apartment.number}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="remember-me">
                    <input
                      type="checkbox"
                      name="sendEmail"
                      checked={formData.sendEmail}
                      onChange={handleInputChange}
                      disabled={isSaving}
                    />
                    E-posta bildirimi gönder
                  </label>

                  <label className="remember-me">
                    <input
                      type="checkbox"
                      name="sendSms"
                      checked={formData.sendSms}
                      onChange={handleInputChange}
                      disabled={isSaving}
                    />
                    SMS bildirimi gönder
                  </label>
                </>
              )}

              <label className="full-width">
                İçerik
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  placeholder="Duyuru içeriğini yazın..."
                  rows="5"
                  disabled={isSaving}
                  required
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-form-button"
                onClick={closeForm}
                disabled={isSaving}
              >
                Vazgeç
              </button>

              <button
                type="submit"
                className="dashboard-action-button"
                disabled={isSaving}
              >
                {isSaving
                  ? "Kaydediliyor..."
                  : editingAnnouncement
                    ? "Değişiklikleri Kaydet"
                    : "Duyuru Oluştur"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="resident-toolbar">
        <div className="resident-search">
          <input
            type="text"
            placeholder="Başlık, içerik veya hedef ara..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="resident-filter">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option>Tümü</option>
            <option>Yayında</option>
            <option>Arşivlendi</option>
          </select>
        </div>

        <div className="resident-filter">
          <select
            value={targetFilter}
            onChange={(event) => setTargetFilter(event.target.value)}
          >
            <option>Tümü</option>
            <option>Blok</option>
            <option>Daire</option>
            <option>Site</option>
            <option>Tüm Sistem</option>
          </select>
        </div>
      </section>

      {isLoading ? (
        <div className="dashboard-panel">
          <p>Duyurular yükleniyor...</p>
        </div>
      ) : (
        <section className="users-table-card">
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Başlık</th>
                  <th>Hedef</th>
                  <th>Durum</th>
                  <th>Oluşturan</th>
                  <th>Tarih</th>
                  <th>İşlem</th>
                </tr>
              </thead>

              <tbody>
                {filteredAnnouncements.length > 0 ? (
                  filteredAnnouncements.map((announcement) => (
                    <tr key={announcement.id}>
                      <td>
                        <div className="table-user-main">
                          <strong>{announcement.title}</strong>
                          <span>{announcement.content}</span>
                        </div>
                      </td>

                      <td>
                        <strong>{announcement.targetTypeText}</strong>
                        <br />
                        <span>{announcement.targetText}</span>
                      </td>

                      <td>{announcement.statusText}</td>
                      <td>{announcement.createdBy}</td>
                      <td>{announcement.createdAt}</td>

                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            onClick={() => setSelectedAnnouncement(announcement)}
                            disabled={isSaving}
                          >
                            <Eye size={16} />
                          </button>

                          {canManageAnnouncement(announcement) && (
                            <button
                              type="button"
                              onClick={() => handleEdit(announcement)}
                              disabled={isSaving}
                            >
                              <Edit size={16} />
                            </button>
                          )}

                          {canManageAnnouncement(announcement) && announcement.status !== "ARCHIVED" && (
                            <button
                              type="button"
                              className="danger-table-button"
                              onClick={() => handleArchive(announcement)}
                              disabled={isSaving}
                            >
                              <Archive size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty-table-message">
                      Duyuru bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selectedAnnouncement && (
        <div className="modal-overlay">
          <section className="details-modal">
            <div className="modal-header">
              <div>
                <span className="section-kicker">Duyuru Detayı</span>
                <h3>{selectedAnnouncement.title}</h3>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={() => setSelectedAnnouncement(null)}
              >
                Kapat
              </button>
            </div>

            <div className="details-list">
              <div>
                <span>Hedef Türü</span>
                <strong>{selectedAnnouncement.targetTypeText}</strong>
              </div>

              <div>
                <span>Hedef</span>
                <strong>{selectedAnnouncement.targetText}</strong>
              </div>

              <div>
                <span>Durum</span>
                <strong>{selectedAnnouncement.statusText}</strong>
              </div>

              <div>
                <span>Oluşturan</span>
                <strong>{selectedAnnouncement.createdBy}</strong>
              </div>
            </div>

            <div className="details-description">
              <span>İçerik</span>
              <p>{selectedAnnouncement.content}</p>
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}

export default ManagerAnnouncementsPage;

