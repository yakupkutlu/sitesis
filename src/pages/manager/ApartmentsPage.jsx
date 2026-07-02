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

import ApartmentToolbar from "../../components/apartments/ApartmentToolbar";
import ApartmentForm from "../../components/apartments/ApartmentForm";
import ApartmentTable from "../../components/apartments/ApartmentTable";
import ApartmentDetailsModal from "../../components/apartments/ApartmentDetailsModal";

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
  apartmentNo: "",
  block: "A Blok",
  floor: "",
  status: "Dolu",
  usageType: "Kiracı",
  residentName: "",
  phone: "",
  paymentStatus: "Bekliyor",
  note: "",
};

const initialApartments = [
  {
    id: 1,
    apartmentNo: "Daire 1",
    block: "A Blok",
    floor: "1. Kat",
    status: "Dolu",
    usageType: "Ev Sahibi",
    residentName: "Ayşe Demir",
    phone: "0555 777 88 99",
    paymentStatus: "Ödendi",
    note: "Daire sahibi aktif olarak oturuyor.",
    createdAt: "30.06.2026",
  },
  {
    id: 2,
    apartmentNo: "Daire 5",
    block: "A Blok",
    floor: "3. Kat",
    status: "Dolu",
    usageType: "Kiracı",
    residentName: "Ali Can",
    phone: "0555 444 55 66",
    paymentStatus: "Gecikmiş",
    note: "Bu ay aidat ödemesi gecikmiş.",
    createdAt: "30.06.2026",
  },
  {
    id: 3,
    apartmentNo: "Daire 8",
    block: "B Blok",
    floor: "4. Kat",
    status: "Boş",
    usageType: "Boş",
    residentName: "",
    phone: "",
    paymentStatus: "Yok",
    note: "Daire şu anda boş.",
    createdAt: "29.06.2026",
  },
  {
    id: 4,
    apartmentNo: "Daire 12",
    block: "C Blok",
    floor: "6. Kat",
    status: "Bakımda",
    usageType: "Ev Sahibi",
    residentName: "Mehmet Kaya",
    phone: "0555 222 11 00",
    paymentStatus: "Bekliyor",
    note: "Tadilat süreci devam ediyor.",
    createdAt: "28.06.2026",
  },
];

function ApartmentsPage() {
  const [apartments, setApartments] = useState(initialApartments);
  const [formData, setFormData] = useState(emptyFormData);
  const [showForm, setShowForm] = useState(false);
  const [editingApartment, setEditingApartment] = useState(null);
  const [selectedApartment, setSelectedApartment] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [blockFilter, setBlockFilter] = useState("Tümü");
  const [statusFilter, setStatusFilter] = useState("Tümü");

  const filteredApartments = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    return apartments.filter((apartment) => {
      const searchableText = [
        apartment.apartmentNo,
        apartment.block,
        apartment.floor,
        apartment.status,
        apartment.usageType,
        apartment.residentName,
        apartment.phone,
        apartment.paymentStatus,
        apartment.note,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(searchValue);

      const matchesBlock =
        blockFilter === "Tümü" ? true : apartment.block === blockFilter;

      const matchesStatus =
        statusFilter === "Tümü" ? true : apartment.status === statusFilter;

      return matchesSearch && matchesBlock && matchesStatus;
    });
  }, [apartments, searchTerm, blockFilter, statusFilter]);

  function resetForm() {
    setFormData(emptyFormData);
    setEditingApartment(null);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleOpenForm() {
    resetForm();
    setShowForm(true);
  }

  function handleCancelForm() {
    resetForm();
    setShowForm(false);
  }

  function handleEdit(apartment) {
    setEditingApartment(apartment);

    setFormData({
      apartmentNo: apartment.apartmentNo || "",
      block: apartment.block || "A Blok",
      floor: apartment.floor || "",
      status: apartment.status || "Dolu",
      usageType: apartment.usageType || "Kiracı",
      residentName: apartment.residentName || "",
      phone: apartment.phone || "",
      paymentStatus: apartment.paymentStatus || "Bekliyor",
      note: apartment.note || "",
    });

    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSubmit(event) {
    event.preventDefault();

    const apartmentData = {
      apartmentNo: formData.apartmentNo.trim(),
      block: formData.block,
      floor: formData.floor.trim(),
      status: formData.status,
      usageType: formData.usageType,
      residentName: formData.residentName.trim(),
      phone: formData.phone.trim(),
      paymentStatus: formData.paymentStatus,
      note: formData.note.trim(),
    };

    if (editingApartment) {
      setApartments((currentApartments) =>
        currentApartments.map((apartment) =>
          apartment.id === editingApartment.id
            ? {
                ...apartment,
                ...apartmentData,
              }
            : apartment
        )
      );
    } else {
      const newApartment = {
        id: Date.now(),
        ...apartmentData,
        createdAt: new Date().toLocaleDateString("tr-TR"),
      };

      setApartments((currentApartments) => [newApartment, ...currentApartments]);
    }

    handleCancelForm();
  }

  function handleDelete(apartmentId) {
    const confirmed = window.confirm("Bu daire kaydını silmek istiyor musunuz?");

    if (!confirmed) {
      return;
    }

    setApartments((currentApartments) =>
      currentApartments.filter((apartment) => apartment.id !== apartmentId)
    );
  }

  return (
    <DashboardLayout
      roleTitle="Daireler"
      roleBadge="Yönetici"
      userName="Alaa"
      navItems={navItems}
      theme="manager"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Daire Yönetimi</span>

          <h2>Daireler</h2>

          <p>
            Yönetiminizdeki blok ve daire kayıtlarını buradan takip edebilir,
            sakin bağlantılarını güncelleyebilirsiniz.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-action-button"
          onClick={handleOpenForm}
        >
          <Plus size={18} />
          Yeni Daire
        </button>
      </div>

      {showForm && (
        <ApartmentForm
          formData={formData}
          editingApartment={editingApartment}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          onCancel={handleCancelForm}
        />
      )}

      <ApartmentToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        blockFilter={blockFilter}
        setBlockFilter={setBlockFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      <ApartmentTable
        apartments={filteredApartments}
        onView={setSelectedApartment}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ApartmentDetailsModal
        apartment={selectedApartment}
        onClose={() => setSelectedApartment(null)}
      />
    </DashboardLayout>
  );
}

export default ApartmentsPage;