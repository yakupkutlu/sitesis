import { useAuth } from "../../hooks/useAuth";
import { useCallback, useEffect, useMemo, useState } from "react";
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

import {
  createResidentAndAssignApartment,
  deleteApartmentResident,
  getApartmentResidents,
  updateApartmentResident,
  updateResidentPassword,
} from "../../api/apartmentResidentsApi";
import { getApartments } from "../../api/apartmentsApi";

import { buildPaymentSummary } from "../../utils/paymentSummary";

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

const typeToLabel = {
  OWNER: "Ev Sahibi",
  TENANT: "Kiracı",
};

const labelToType = {
  "Ev Sahibi": "OWNER",
  Kiracı: "TENANT",
};

const emptyFormData = {
  fullName: "",
  type: "TENANT",
  siteId: "",
  blockId: "",
  apartmentId: "",
  phone: "",
  email: "",
  password: "",
  note: "",
};

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.residents)) return data.residents;
  if (Array.isArray(data?.apartments)) return data.apartments;

  return [];
}

async function getAllPaginatedData(requestFunction, params = {}) {
  const firstResult = await requestFunction({
    ...params,
    page: 1,
    limit: 100,
  });

  const firstPageData = getDataArray(firstResult);
  const totalPages = Number(firstResult?.pagination?.totalPages ?? 1);

  if (totalPages <= 1) {
    return firstPageData;
  }

  const remainingResults = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      requestFunction({
        ...params,
        page: index + 2,
        limit: 100,
      })
    )
  );

  const allItems = [
    ...firstPageData,
    ...remainingResults.flatMap((result) => getDataArray(result)),
  ];

  return Array.from(
    new Map(allItems.map((item) => [item.id, item])).values()
  );
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("tr-TR");
  } catch {
    return "-";
  }
}
function mapApartmentResidentToViewModel(item) {
  const user = item.user ?? {};
  const apartment = item.apartment ?? {};
  const block = apartment.block ?? {};
  const site = block.site ?? {};
  const paymentSummary = buildPaymentSummary(item);
  
  return {
    id: item.id,
    name: user.fullName ?? "-",
    role: typeToLabel[item.type] ?? item.type ?? "-",
    site: site.name ?? "-",
    block: block.name ?? "-",
    apartment: apartment.number ? `Daire ${apartment.number}` : "-",
    phone: user.phone ?? "-",
    email: user.email ?? "-",
    status: user.status === "ACTIVE" ? "Aktif" : "Pasif",
    paymentStatus: paymentSummary.paymentStatus,
    totalDebt: paymentSummary.totalDebt,
    paidAmount: paymentSummary.paidAmount,
    remainingDebt: paymentSummary.remainingDebt,
    lastPaymentDate: "-",
    note: `${site.name ?? "Site"} / ${block.name ?? "Blok"} / ${
      apartment.number ? `Daire ${apartment.number}` : "Daire"
    }`,
    createdAt: formatDate(item.createdAt),
    raw: item,
  };
}

function ResidentsPage() {
  const { user } = useAuth();

  const [residents, setResidents] = useState([]);
  const [apartments, setApartments] = useState([]);

  const [selectedResident, setSelectedResident] = useState(null);
  const [editingResident, setEditingResident] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyFormData);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("Tümü");
  const [statusFilter, setStatusFilter] = useState("Tümü");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

const loadResidents = useCallback(async () => {
  const residentList = await getAllPaginatedData(getApartmentResidents);

  setResidents(
    residentList.map(mapApartmentResidentToViewModel)
  );
}, []);

const loadApartments = useCallback(async () => {
  const apartmentList = await getAllPaginatedData(getApartments);

  setApartments(apartmentList);
}, []);

const loadPageData = useCallback(async () => {
  await Promise.all([
    loadResidents(),
    loadApartments(),
  ]);
}, [loadResidents, loadApartments]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        await loadPageData();
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error?.message ?? "Sakin kayıtları alınamadı.");
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
  }, [loadPageData]);

  const filteredResidents = useMemo(() => {
    return residents.filter((resident) => {
      const searchValue = searchTerm.trim().toLowerCase();

      const searchableText = [
        resident.name,
        resident.role,
        resident.site,
        resident.block,
        resident.apartment,
        resident.phone,
        resident.email,
        resident.paymentStatus,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(searchValue);
      const matchesRole =
        roleFilter === "Tümü" ? true : resident.role === roleFilter;
      const matchesStatus =
        statusFilter === "Tümü" ? true : resident.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [residents, searchTerm, roleFilter, statusFilter]);

  function openCreateForm() {
    setEditingResident(null);
    setFormData(emptyFormData);
    setShowForm(true);
    setMessage("");
    setErrorMessage("");
  }

  function openEditForm(resident) {
    setEditingResident(resident);

    const currentApartment = resident.raw?.apartment;

    setFormData({
      fullName: resident.name,
      type: labelToType[resident.role] ?? "TENANT",
      siteId: currentApartment?.block?.site?.id ?? "",
      blockId: currentApartment?.block?.id ?? "",
      apartmentId: resident.raw?.apartmentId ?? currentApartment?.id ?? "",
      phone: resident.phone === "-" ? "" : resident.phone,
      email: resident.email,
      password: "",
      note: resident.note ?? "",
    });

    setShowForm(true);
    setMessage("");
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setEditingResident(null);
    setFormData(emptyFormData);
    setShowForm(false);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => {
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
        [name]: value,
      };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.siteId) {
      setErrorMessage("Site seçimi zorunludur.");
      return;
    }

    if (!formData.blockId) {
      setErrorMessage("Blok seçimi zorunludur.");
      return;
    }

    if (!formData.apartmentId) {
      setErrorMessage("Daire seçimi zorunludur.");
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      if (editingResident) {
        if (formData.password && formData.password.length < 8) {
          setErrorMessage("Yeni şifre en az 8 karakter olmalıdır.");
          setIsSaving(false);
          return;
        }

        await updateApartmentResident(editingResident.id, {
          apartmentId: formData.apartmentId,
          type: formData.type,
        });

        if (formData.password) {
          await updateResidentPassword(editingResident.id, {
            password: formData.password,
          });
        }

        setMessage(
          formData.password
            ? "Sakin bilgileri ve şifresi başarıyla güncellendi."
            : "Sakin daire bağlantısı başarıyla güncellendi."
        );
      } else {
        if (!formData.fullName.trim()) {
          setErrorMessage("Ad soyad zorunludur.");
          return;
        }

        if (!formData.email.trim()) {
          setErrorMessage("E-posta zorunludur.");
          return;
        }

        if (formData.password.length < 8) {
          setErrorMessage("Şifre en az 8 karakter olmalıdır.");
          return;
        }

        await createResidentAndAssignApartment({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          password: formData.password,
          apartmentId: formData.apartmentId,
          type: formData.type,
        });

        setMessage("Sakin başarıyla oluşturuldu ve daireye bağlandı.");
      }

      await loadPageData();
      closeForm();
    } catch (error) {
      setErrorMessage(error?.message ?? "Sakin kaydı kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(residentId) {
    const isConfirmed = window.confirm(
      "Bu sakinin daire bağlantısını kaldırmak istiyor musunuz?"
    );

    if (!isConfirmed) {
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      await deleteApartmentResident(residentId);
      await loadPageData();

      setMessage("Sakin daire bağlantısı başarıyla kaldırıldı.");
    } catch (error) {
      setErrorMessage(error?.message ?? "Sakin bağlantısı kaldırılamadı.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DashboardLayout
      roleTitle="Sakinler"
      roleBadge="Yönetici"
      userName={user?.fullName ?? "Yönetici"}
      navItems={navItems}
      theme="manager"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Sakin Yönetimi</span>

          <h2>Sakinler</h2>

          <p>
            Yetkili olduğunuz site veya blok kapsamındaki kiracı ve ev sahibi
            kayıtlarını buradan görüntüleyebilir, ekleyebilir ve düzeltebilirsiniz.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-action-button"
          onClick={openCreateForm}
          disabled={isSaving}
        >
          <Plus size={18} />
          Yeni Sakin
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

      {showForm && (
        <ResidentForm
          formData={formData}
          apartments={apartments}
          editingResident={editingResident}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isSaving={isSaving}
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

      {isLoading ? (
        <div className="dashboard-panel">
          <p>Sakin kayıtları yükleniyor...</p>
        </div>
      ) : (
        <ResidentTable
          residents={filteredResidents}
          onView={setSelectedResident}
          onEdit={openEditForm}
          onDelete={handleDelete}
        />
      )}

      <ResidentDetailsModal
        resident={selectedResident}
        onClose={() => setSelectedResident(null)}
      />
    </DashboardLayout>
  );
}

export default ResidentsPage;