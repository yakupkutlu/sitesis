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

import ResidentToolbar from "../../components/residents/ResidentToolbar";
import ResidentForm from "../../components/residents/ResidentForm";
import ResidentTable from "../../components/residents/ResidentTable";
import ResidentDetailsModal from "../../components/residents/ResidentDetailsModal";

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
  name: "",
  role: "Kiracı",
  block: "A Blok",
  apartment: "Daire 1",
  phone: "",
  email: "",
  status: "Aktif",
  paymentStatus: "Bekliyor",
  totalDebt: "0 TL",
  paidAmount: "0 TL",
  remainingDebt: "0 TL",
  lastPaymentDate: "-",
  note: "",
};

const initialResidents = [
  {
    id: 1,
    name: "Ali Can",
    role: "Kiracı",
    block: "A Blok",
    apartment: "Daire 5",
    phone: "0555 444 55 66",
    email: "ali.can@example.com",
    status: "Aktif",
    paymentStatus: "Gecikmiş",
    totalDebt: "2.500 TL",
    paidAmount: "1.250 TL",
    remainingDebt: "1.250 TL",
    lastPaymentDate: "10.06.2026",
    note: "Bu ay aidat ödemesi gecikmiş.",
    createdAt: "30.06.2026",
  },
  {
    id: 2,
    name: "Ayşe Demir",
    role: "Ev Sahibi",
    block: "A Blok",
    apartment: "Daire 1",
    phone: "0555 777 88 99",
    email: "ayse.demir@example.com",
    status: "Aktif",
    paymentStatus: "Ödendi",
    totalDebt: "1.250 TL",
    paidAmount: "1.250 TL",
    remainingDebt: "0 TL",
    lastPaymentDate: "05.06.2026",
    note: "Daire sahibi aktif olarak oturuyor.",
    createdAt: "29.06.2026",
  },
  {
    id: 3,
    name: "Mehmet Kaya",
    role: "Kiracı",
    block: "B Blok",
    apartment: "Daire 8",
    phone: "0555 222 11 00",
    email: "mehmet.kaya@example.com",
    status: "Onay Bekliyor",
    paymentStatus: "Bekliyor",
    totalDebt: "1.800 TL",
    paidAmount: "0 TL",
    remainingDebt: "1.800 TL",
    lastPaymentDate: "-",
    note: "Yeni kayıt onay bekliyor.",
    createdAt: "30.06.2026",
  },
  {
    id: 4,
    name: "Zeynep Aydın",
    role: "Ev Sahibi",
    block: "C Blok",
    apartment: "Daire 12",
    phone: "0555 333 44 55",
    email: "zeynep.aydin@example.com",
    status: "Pasif",
    paymentStatus: "Kısmi Ödeme",
    totalDebt: "3.000 TL",
    paidAmount: "2.000 TL",
    remainingDebt: "1.000 TL",
    lastPaymentDate: "02.06.2026",
    note: "Tadilat süreci nedeniyle pasif.",
    createdAt: "28.06.2026",
  },
];

function ResidentsPage() {
  const [residents, setResidents] = useState(initialResidents);
  const [formData, setFormData] = useState(emptyFormData);
  const [showForm, setShowForm] = useState(false);
  const [editingResident, setEditingResident] = useState(null);
  const [selectedResident, setSelectedResident] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("Tümü");
  const [statusFilter, setStatusFilter] = useState("Tümü");

  const filteredResidents = useMemo(() => {
    return residents.filter((resident) => {
      const searchValue = searchTerm.toLowerCase();

      const matchesSearch =
        resident.name.toLowerCase().includes(searchValue) ||
        resident.role.toLowerCase().includes(searchValue) ||
        resident.block.toLowerCase().includes(searchValue) ||
        resident.apartment.toLowerCase().includes(searchValue) ||
        resident.phone.toLowerCase().includes(searchValue) ||
        resident.email.toLowerCase().includes(searchValue) ||
        resident.paymentStatus.toLowerCase().includes(searchValue);

      const matchesRole =
        roleFilter === "Tümü" ? true : resident.role === roleFilter;

      const matchesStatus =
        statusFilter === "Tümü" ? true : resident.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [residents, searchTerm, roleFilter, statusFilter]);

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleOpenForm() {
    setFormData(emptyFormData);
    setEditingResident(null);
    setShowForm(true);
  }

  function handleCancelForm() {
    setFormData(emptyFormData);
    setEditingResident(null);
    setShowForm(false);
  }

  function handleEdit(resident) {
    setEditingResident(resident);

    setFormData({
      name: resident.name,
      role: resident.role,
      block: resident.block,
      apartment: resident.apartment,
      phone: resident.phone,
      email: resident.email,
      status: resident.status,
      paymentStatus: resident.paymentStatus,
      totalDebt: resident.totalDebt,
      paidAmount: resident.paidAmount,
      remainingDebt: resident.remainingDebt,
      lastPaymentDate: resident.lastPaymentDate,
      note: resident.note,
    });

    setShowForm(true);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (editingResident) {
      setResidents((currentResidents) =>
        currentResidents.map((resident) =>
          resident.id === editingResident.id
            ? {
                ...resident,
                ...formData,
              }
            : resident
        )
      );
    } else {
      const newResident = {
        id: Date.now(),
        ...formData,
        createdAt: new Date().toLocaleDateString("tr-TR"),
      };

      setResidents((currentResidents) => [newResident, ...currentResidents]);
    }

    handleCancelForm();
  }

  function handleDelete(residentId) {
    const confirmed = window.confirm("Bu sakin kaydını silmek istiyor musunuz?");

    if (!confirmed) {
      return;
    }

    setResidents((currentResidents) =>
      currentResidents.filter((resident) => resident.id !== residentId)
    );
  }

  return (
    <DashboardLayout
      roleTitle="Sakinler"
      roleBadge="Yönetici"
      userName="Alaa"
      navItems={navItems}
      theme="manager"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Sakin Yönetimi</span>
          <h2>Sakinler</h2>
          <p>
            Kiracı ve ev sahibi kayıtlarını, daire bağlantılarını ve ödeme
            özetlerini buradan takip edebilirsiniz.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-action-button"
          onClick={handleOpenForm}
        >
          <Plus size={18} />
          Yeni Sakin
        </button>
      </div>

      {showForm && (
        <ResidentForm
          formData={formData}
          editingResident={editingResident}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          onCancel={handleCancelForm}
        />
      )}

      <ResidentToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      <ResidentTable
        residents={filteredResidents}
        onView={setSelectedResident}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ResidentDetailsModal
        resident={selectedResident}
        onClose={() => setSelectedResident(null)}
      />
    </DashboardLayout>
  );
}

export default ResidentsPage;