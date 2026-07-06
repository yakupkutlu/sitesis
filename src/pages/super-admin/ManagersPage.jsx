import { useEffect, useMemo, useState } from "react";
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

import ManagerToolbar from "../../components/managers/ManagerToolbar";
import ManagerCard from "../../components/managers/ManagerCard";
import ManagerDetailsModal from "../../components/managers/ManagerDetailsModal";
import ManagerForm from "../../components/managers/ManagerForm";

import { getSites } from "../../api/sitesApi";
import { getBlocks } from "../../api/blocksApi";
import { createUser, getUsers, updateUser } from "../../api/usersApi";
import {
  createManagerAssignment,
  getManagerAssignments,
} from "../../api/managerAssignmentsApi";
import { useAuth } from "../../context/AuthContext";

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

function getManagerTitle(assignment) {
  if (!assignment) {
    return "Yönetici";
  }

  return assignment.scopeType === "SITE"
    ? "Site Yöneticisi"
    : "Blok / Apartman Yöneticisi";
}

function buildAssignmentMap(assignments) {
  const assignmentMap = new Map();

  for (const assignment of assignments) {
    if (!assignment?.managerId) {
      continue;
    }

    if (!assignmentMap.has(assignment.managerId)) {
      assignmentMap.set(assignment.managerId, assignment);
    }
  }

  return assignmentMap;
}

function mapUserToManager(user, assignmentMap) {
  const assignment = assignmentMap.get(user.id);

  return {
    id: user.id,
    name: user.fullName,
    title: getManagerTitle(assignment),
    email: user.email,
    phone: user.phone ?? "-",
    assignedBuilding: getAssignmentLabel(assignment),
    note: "Yetki bilgisi backend manager assignment üzerinden yönetilir.",
    status: user.status === "ACTIVE" ? "Aktif" : "Pasif",
    createdAt: formatDate(user.createdAt),
    rawUser: user,
    assignment,
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

      {isLoading ? (
        <div className="dashboard-panel">
          <p>Yönetici kayıtları yükleniyor...</p>
        </div>
      ) : filteredManagers.length > 0 ? (
        <section className="managers-grid">
          {filteredManagers.map((manager) => (
            <ManagerCard
              key={manager.id}
              manager={manager}
              onView={setSelectedManager}
              onEdit={handleEdit}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </section>
      ) : (
        <div className="dashboard-panel">
          <p>Yönetici kaydı bulunamadı.</p>
        </div>
      )}

      <ManagerDetailsModal
        manager={selectedManager}
        onClose={() => setSelectedManager(null)}
      />
    </DashboardLayout>
  );
}

export default ManagersPage;
