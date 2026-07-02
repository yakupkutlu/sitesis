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

import ManagerToolbar from "../../components/managers/ManagerToolbar";
import ManagerCard from "../../components/managers/ManagerCard";
import ManagerForm from "../../components/managers/ManagerForm";
import ManagerDetailsModal from "../../components/managers/ManagerDetailsModal";

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

const buildingOptions = ["Mavi Site", "Güneş Apartmanı", "Deniz Rezidans"];

const initialManagers = [
  {
    id: 1,
    name: "Ahmet Yılmaz",
    title: "Site Yöneticisi",
    email: "ahmet@example.com",
    phone: "0555 111 22 33",
    assignedBuilding: "Mavi Site",
    status: "Aktif",
    createdAt: "29.06.2026",
    note: "Mavi Site genel yönetiminden sorumludur.",
  },
  {
    id: 2,
    name: "Elif Demir",
    title: "Apartman Yöneticisi",
    email: "elif@example.com",
    phone: "0555 222 33 44",
    assignedBuilding: "Güneş Apartmanı",
    status: "Aktif",
    createdAt: "29.06.2026",
    note: "Güneş Apartmanı ödeme ve duyuru süreçlerini takip eder.",
  },
  {
    id: 3,
    name: "Mehmet Kaya",
    title: "Rezidans Yöneticisi",
    email: "mehmet@example.com",
    phone: "0555 333 44 55",
    assignedBuilding: "Deniz Rezidans",
    status: "Pasif",
    createdAt: "29.06.2026",
    note: "Geçici olarak pasifleştirildi.",
  },
];

const emptyFormData = {
  name: "",
  title: "",
  email: "",
  phone: "",
  assignedBuilding: "",
  note: "",
};

function ManagersPage() {
  const [managerList, setManagerList] = useState(initialManagers);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingManager, setEditingManager] = useState(null);
  const [selectedManager, setSelectedManager] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tümü");

  const [formData, setFormData] = useState(emptyFormData);

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

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const newManager = {
      id: editingManager ? editingManager.id : Date.now(),
      name: formData.name.trim(),
      title: formData.title.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      assignedBuilding: formData.assignedBuilding,
      note: formData.note.trim(),
      status: editingManager ? editingManager.status : "Aktif",
      createdAt: editingManager
        ? editingManager.createdAt
        : new Date().toLocaleDateString("tr-TR"),
    };

    if (editingManager) {
      setManagerList((currentManagers) =>
        currentManagers.map((manager) =>
          manager.id === editingManager.id ? newManager : manager
        )
      );
    } else {
      setManagerList((currentManagers) => [newManager, ...currentManagers]);
    }

    closeForm();
  }

  function handleEdit(manager) {
    setEditingManager(manager);

    setFormData({
      name: manager.name || "",
      title: manager.title || "",
      email: manager.email || "",
      phone: manager.phone || "",
      assignedBuilding: manager.assignedBuilding || "",
      note: manager.note || "",
    });

    setIsFormOpen(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleToggleStatus(manager) {
    const nextStatus = manager.status === "Aktif" ? "Pasif" : "Aktif";

    const confirmMessage =
      manager.status === "Aktif"
        ? `${manager.name} adlı yöneticiyi pasifleştirmek istiyor musunuz?`
        : `${manager.name} adlı yöneticiyi tekrar aktifleştirmek istiyor musunuz?`;

    const isConfirmed = window.confirm(confirmMessage);

    if (!isConfirmed) {
      return;
    }

    setManagerList((currentManagers) =>
      currentManagers.map((item) =>
        item.id === manager.id ? { ...item, status: nextStatus } : item
      )
    );
  }

  return (
    <DashboardLayout
      roleTitle="Yöneticiler"
      roleBadge="Süper Admin"
      userName="Alaa"
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
        >
          <Plus size={18} />
          Yeni Yönetici
        </button>
      </div>

      {isFormOpen && (
        <ManagerForm
          formData={formData}
          buildingOptions={buildingOptions}
          editingManager={editingManager}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      )}

      <ManagerToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

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

      <ManagerDetailsModal
        manager={selectedManager}
        onClose={() => setSelectedManager(null)}
      />
    </DashboardLayout>
  );
}

export default ManagersPage;