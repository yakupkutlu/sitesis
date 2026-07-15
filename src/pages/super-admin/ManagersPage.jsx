import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  Eye,
  Grid2X2,
  List,
  MessageSquareText,
  Mail,
  Pencil,
  Plus,
  Power,
  Settings,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";

import ManagerToolbar from "../../components/managers/ManagerToolbar";
import ManagerCard from "../../components/managers/ManagerCard";
import ManagerDetailsModal from "../../components/managers/ManagerDetailsModal";
import ManagerForm from "../../components/managers/ManagerForm";

import { getSites } from "../../api/sitesApi";
import { getBlocks } from "../../api/blocksApi";
import { createUser, getUsers, updateUser } from "../../api/usersApi";
import {
  createManagerAssignment,
  deleteManagerAssignment,
  getManagerAssignments,
} from "../../api/managerAssignmentsApi";
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

const emptyFormData = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  scopeType: "SITE",
  siteId: "",
  blockId: "",
};

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.sites)) return data.sites;
  if (Array.isArray(data?.blocks)) return data.blocks;

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

function getAssignmentTypeLabel(assignment) {
  return assignment?.scopeType === "SITE" ? "Site" : "Blok";
}

function getAssignmentLabel(assignment) {
  if (!assignment) {
    return "Henüz atanmadı";
  }

  if (assignment.scopeType === "SITE") {
    return assignment.site?.name ?? "Site ataması";
  }

  if (assignment.scopeType === "BLOCK") {
    const siteName = assignment.block?.site?.name;
    const blockName = assignment.block?.name;

    if (siteName && blockName) {
      return `${siteName} / ${blockName}`;
    }

    return blockName ?? "Blok / Apartman ataması";
  }

  return "Henüz atanmadı";
}

function buildAssignmentMap(assignments) {
  const assignmentMap = new Map();

  for (const assignment of assignments) {
    if (!assignment?.managerId) {
      continue;
    }

    const currentAssignments = assignmentMap.get(assignment.managerId) ?? [];
    assignmentMap.set(assignment.managerId, [...currentAssignments, assignment]);
  }

  return assignmentMap;
}

function getAssignmentLabels(assignments) {
  if (!assignments || assignments.length === 0) {
    return "Henüz atanmadı";
  }

  return assignments.map(getAssignmentLabel).join(", ");
}

function getManagerTitleFromAssignments(assignments) {
  if (!assignments || assignments.length === 0) {
    return "Yönetici";
  }

  const hasSiteScope = assignments.some((item) => item.scopeType === "SITE");
  const blockCount = assignments.filter((item) => item.scopeType === "BLOCK").length;

  if (hasSiteScope) {
    return "Site Yöneticisi";
  }

  if (blockCount > 1) {
    return "Çoklu Blok Yöneticisi";
  }

  return "Blok / Apartman Yöneticisi";
}

function mapUserToManager(user, assignmentMap) {
  const assignments = assignmentMap.get(user.id) ?? [];
  const primaryAssignment = assignments[0];

  return {
    id: user.id,
    name: user.fullName,
    title: getManagerTitleFromAssignments(assignments),
    email: user.email,
    phone: user.phone ?? "-",
    assignedBuilding: getAssignmentLabels(assignments),
    note: "Yetki bilgisi backend manager assignment üzerinden yönetilir.",
    status: user.status === "ACTIVE" ? "Aktif" : "Pasif",
    createdAt: formatDate(user.createdAt),
    rawUser: user,
    assignment: primaryAssignment,
    assignments,
  };
}

function ManagersPage() {
  const { user } = useAuth();

  const [managerList, setManagerList] = useState([]);
  const [sites, setSites] = useState([]);
  const [blocks, setBlocks] = useState([]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingManager, setEditingManager] = useState(null);
  const [selectedManager, setSelectedManager] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tümü");

  const [viewMode, setViewMode] = useState("LIST");

  const [formData, setFormData] = useState(emptyFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadManagersData() {
    const [usersResult, assignmentsResult, sitesResult, blocksResult] =
      await Promise.all([
        getUsers({ limit: 100 }),
        getManagerAssignments(),
        getSites({ limit: 100 }),
        getBlocks({ limit: 100 }),
      ]);

    const users = getDataArray(usersResult);
    const assignments = getDataArray(assignmentsResult);
    const nextSites = getDataArray(sitesResult);
    const nextBlocks = getDataArray(blocksResult);

    const assignmentMap = buildAssignmentMap(assignments);
    const managers = users
      .filter((item) => item.role === "MANAGER")
      .map((item) => mapUserToManager(item, assignmentMap));

    setManagerList(managers);
    setSites(nextSites);
    setBlocks(nextBlocks);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        await loadManagersData();
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error?.message ?? "Yönetici kayıtları alınamadı.");
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

  const filteredManagers = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    return managerList.filter((manager) => {
      const searchableText = [
        manager.name,
        manager.email,
        manager.phone,
        manager.assignedBuilding,
        manager.title,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(searchValue);
      const matchesStatus =
        statusFilter === "Tümü" ? true : manager.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [managerList, searchTerm, statusFilter]);

  function resetForm() {
    setEditingManager(null);
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
    const { name, value } = event.target;

    setFormData((currentData) => {
      if (name === "scopeType") {
        return {
          ...currentData,
          scopeType: value,
          siteId: "",
          blockId: "",
        };
      }

      return {
        ...currentData,
        [name]: value,
      };
    });
  }

  async function createAssignmentForManager(managerId) {
    if (formData.scopeType === "SITE" && formData.siteId) {
      await createManagerAssignment({
        managerId,
        scopeType: "SITE",
        siteId: formData.siteId,
      });
    }

    if (formData.scopeType === "BLOCK" && formData.blockId) {
      await createManagerAssignment({
        managerId,
        scopeType: "BLOCK",
        blockId: formData.blockId,
      });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.fullName.trim()) {
      setErrorMessage("Ad soyad zorunludur.");
      setMessage("");
      return;
    }

    if (!formData.email.trim()) {
      setErrorMessage("E-posta zorunludur.");
      setMessage("");
      return;
    }

    if (!editingManager && formData.password.length < 8) {
      setErrorMessage("Yeni yönetici için şifre en az 8 karakter olmalıdır.");
      setMessage("");
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      let managerId = editingManager?.id;

      if (editingManager) {
        const payload = {
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          role: "MANAGER",
        };

        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }

        await updateUser(editingManager.id, payload);
      } else {
        const result = await createUser({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          password: formData.password.trim(),
          role: "MANAGER",
        });

        const createdUser = result?.data ?? result;
        managerId = createdUser.id;
      }

      if (managerId) {
        try {
          await createAssignmentForManager(managerId);
        } catch (assignmentError) {
          const assignmentMessage =
            assignmentError?.message ??
            "Yönetici oluşturuldu fakat yetki ataması yapılamadı.";

          if (!assignmentMessage.includes("zaten")) {
            throw assignmentError;
          }
        }
      }

      await loadManagersData();

      setMessage(
        editingManager
          ? "Yönetici bilgileri başarıyla güncellendi."
          : "Yönetici başarıyla oluşturuldu."
      );

      closeForm();
    } catch (error) {
      setErrorMessage(error?.message ?? "Yönetici kaydı kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(manager) {
    const assignment = manager.assignment;

    setEditingManager(manager);

    setFormData({
      fullName: manager.name || "",
      email: manager.email || "",
      phone: manager.phone === "-" ? "" : manager.phone || "",
      password: "",
      scopeType: assignment?.scopeType ?? "SITE",
      siteId: assignment?.siteId ?? "",
      blockId: assignment?.blockId ?? "",
    });

    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleToggleStatus(manager) {
    const nextStatus = manager.status === "Aktif" ? "PASSIVE" : "ACTIVE";

    const confirmMessage =
      manager.status === "Aktif"
        ? `${manager.name} adlı yöneticiyi pasifleştirmek istiyor musunuz?`
        : `${manager.name} adlı yöneticiyi tekrar aktifleştirmek istiyor musunuz?`;

    const isConfirmed = window.confirm(confirmMessage);

    if (!isConfirmed) {
      return;
    }

    try {
      setMessage("");
      setErrorMessage("");

      await updateUser(manager.id, {
        status: nextStatus,
      });

      await loadManagersData();

      setMessage(
        nextStatus === "ACTIVE"
          ? "Yönetici tekrar aktifleştirildi."
          : "Yönetici pasifleştirildi."
      );
    } catch (error) {
      setErrorMessage(error?.message ?? "Yönetici durumu güncellenemedi.");
    }
  }

  async function handleDeleteAssignment(assignment) {
    const label = getAssignmentLabel(assignment);

    const isConfirmed = window.confirm(
      `${label} yetkisini kaldırmak istiyor musunuz?`
    );

    if (!isConfirmed) {
      return;
    }

    try {
      setMessage("");
      setErrorMessage("");
      setIsSaving(true);

      await deleteManagerAssignment(assignment.id);
      await loadManagersData();

      setMessage("Yönetici yetkisi başarıyla kaldırıldı.");
    } catch (error) {
      setErrorMessage(error?.message ?? "Yönetici yetkisi kaldırılamadı.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DashboardLayout
      roleTitle="Yöneticiler"
      roleBadge="Süper Admin"
      userName={user?.fullName ?? "Süper Admin"}
      navItems={navItems}
      theme="super-admin"
    >
      <div className="dashboard-page-header">
        <div>
          <h2>Yönetici Yönetimi</h2>

          <p>
            Site ve apartmanlara atanacak yöneticileri buradan ekleyebilir,
            düzenleyebilir ve durumlarını takip edebilirsiniz.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-action-button"
          onClick={openCreateForm}
          disabled={isSaving}
        >
          <Plus size={18} />
          Yeni Yönetici
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
        <ManagerForm
          formData={formData}
          sites={sites}
          blocks={blocks}
          editingManager={editingManager}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isSaving={isSaving}
        />
      )}

      <ManagerToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      <section className="manager-view-mode-bar">
        <div>
          <span className="section-kicker">Gösterim Şekli</span>
          <strong>
            Her yönetici yalnızca bir kez gösterilir; tüm yetkileri aynı kayıt
            içinde listelenir.
          </strong>
        </div>

        <div className="manager-view-mode-buttons">
          <button
            type="button"
            className={viewMode === "LIST" ? "active" : ""}
            onClick={() => setViewMode("LIST")}
            aria-pressed={viewMode === "LIST"}
          >
            <List size={18} />
            Liste
          </button>

          <button
            type="button"
            className={viewMode === "CARD" ? "active" : ""}
            onClick={() => setViewMode("CARD")}
            aria-pressed={viewMode === "CARD"}
          >
            <Grid2X2 size={18} />
            Kart
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="dashboard-panel">
          <p>Yönetici kayıtları yükleniyor...</p>
        </div>
      ) : filteredManagers.length === 0 ? (
        <div className="dashboard-panel">
          <p>Yönetici kaydı bulunamadı.</p>
        </div>
      ) : viewMode === "LIST" ? (
        <section className="dashboard-panel manager-list-panel">
          <div className="manager-list-table-wrapper">
            <table className="manager-list-table">
              <thead>
                <tr>
                  <th>Yönetici</th>
                  <th>Durum</th>
                  <th>Yetkiler</th>
                  <th>İşlemler</th>
                </tr>
              </thead>

              <tbody>
                {filteredManagers.map((manager) => (
                  <tr key={manager.id}>
                    <td>
                      <div className="manager-list-person">
                        <div className="manager-list-avatar">
                          <UserRound size={20} />
                        </div>

                        <div>
                          <strong>{manager.name}</strong>
                          <span>{manager.email}</span>
                          <span>{manager.phone}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`manager-status ${
                          manager.status === "Aktif" ? "active" : "passive"
                        }`}
                      >
                        {manager.status}
                      </span>
                    </td>

                    <td>
                      <div className="manager-assignment-list">
                        {manager.assignments.length > 0 ? (
                          manager.assignments.map((assignment) => (
                            <div
                              className="manager-assignment-item"
                              key={assignment.id}
                            >
                              <div>
                                <span>
                                  {getAssignmentTypeLabel(assignment)}
                                </span>
                                <strong>
                                  {getAssignmentLabel(assignment)}
                                </strong>
                              </div>

                              <button
                                type="button"
                                className="manager-assignment-remove"
                                onClick={() =>
                                  handleDeleteAssignment(assignment)
                                }
                                disabled={isSaving}
                                title="Bu yetkiyi kaldır"
                              >
                                <Trash2 size={15} />
                                Yetkiyi Kaldır
                              </button>
                            </div>
                          ))
                        ) : (
                          <span className="manager-no-assignment">
                            Henüz atanmadı
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="manager-list-actions">
                        <button
                          type="button"
                          onClick={() => setSelectedManager(manager)}
                        >
                          <Eye size={16} />
                          Görüntüle
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEdit(manager)}
                        >
                          <Pencil size={16} />
                          Düzenle
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleToggleStatus(manager)}
                          disabled={isSaving}
                        >
                          <Power size={16} />
                          {manager.status === "Aktif"
                            ? "Pasifleştir"
                            : "Aktifleştir"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="managers-grid">
          {filteredManagers.map((manager) => (
            <ManagerCard
              key={manager.id}
              manager={manager}
              onView={setSelectedManager}
              onEdit={handleEdit}
              onToggleStatus={handleToggleStatus}
              onDeleteAssignment={handleDeleteAssignment}
              isSaving={isSaving}
            />
          ))}
        </section>
      )}

      <ManagerDetailsModal
        manager={selectedManager}
        onClose={() => setSelectedManager(null)}
      />
    </DashboardLayout>
  );
}

export default ManagersPage;


