import { useEffect, useMemo, useState } from "react";
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

import UserToolbar from "../../components/users/UserToolbar";
import UserTable from "../../components/users/UserTable";
import UserDetailsModal from "../../components/users/UserDetailsModal";
import UserForm from "../../components/users/UserForm";

import { getApartments } from "../../api/apartmentsApi";
import {
  createResidentAndAssignApartment,
  deleteApartmentResident,
  getApartmentResidents,
  updateApartmentResident,
} from "../../api/apartmentResidentsApi";
import { updateUser } from "../../api/usersApi";
import { useAuth } from "../../hooks/useAuth";
import { buildPaymentSummary } from "../../utils/paymentSummary";

const navItems = [
  { label: "Panel", path: "/super-admin/dashboard", icon: BarChart3 },
  {
    label: "Site / Apartmanlar",
    path: "/super-admin/buildings",
    icon: Building2,
  },
  { label: "Yöneticiler", path: "/super-admin/managers", icon: Users },
  {
    label: "Kullanıcılar / Sakinler",
    path: "/super-admin/users",
    icon: UserRound,
  },
  {
    label: "Duyurular",
    path: "/super-admin/announcements",
    icon: Bell,
  },
  {
    label: "İletişim Mesajları",
    path: "/super-admin/contact-messages",
    icon: MessageSquareText,
  },
  {
    label: "AI API Ayarları",
    path: "/super-admin/ai-settings",
    icon: BrainCircuit,
  },
  {
    label: "SMS / E-posta",
    path: "/super-admin/notifications",
    icon: Mail,
  },
  {
    label: "Genel Ayarlar",
    path: "/super-admin/settings",
    icon: Settings,
  },
];

const emptyFormData = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  residentType: "TENANT",
  siteId: "",
  blockId: "",
  apartmentId: "",
  ownerFullName: "",
  ownerEmail: "",
  ownerPhone: "",
  ownerPassword: "",
};

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.apartments)) return data.apartments;
  if (Array.isArray(data?.apartmentResidents)) {
    return data.apartmentResidents;
  }

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

function getResidentTypeLabel(type) {
  return type === "OWNER" ? "Ev Sahibi" : "Kiracı";
}

function mapApartmentResidentToUser(record) {
  const residentUser = record.user ?? {};
  const apartment = record.apartment ?? {};
  const block = apartment.block ?? {};
  const site = block.site ?? {};
  const paymentSummary = buildPaymentSummary(record);

  return {
    id: record.id,
    userId: residentUser.id,
    name: residentUser.fullName,
    role: getResidentTypeLabel(record.type),
    email: residentUser.email,
    phone: residentUser.phone ?? "-",
    site: site.name ?? "-",
    block: block.name ?? "-",
    apartment: apartment.number ? `Daire ${apartment.number}` : "-",
    createdByManager: "Süper Admin / Yönetici",
    status: residentUser.status === "ACTIVE" ? "Aktif" : "Pasif",
    createdAt: formatDate(record.createdAt),
    totalDebt: paymentSummary.totalDebt,
    paidAmount: paymentSummary.paidAmount,
    remainingDebt: paymentSummary.remainingDebt,
    lastPaymentDate: "-",
    paymentStatus: paymentSummary.paymentStatus,
    rawRecord: record,
  };
}

function attachResidentLinksToApartments(apartmentList, residentRecords) {
  const linksByApartmentId = new Map();

  for (const record of residentRecords) {
    const apartmentId = record?.apartmentId ?? record?.apartment?.id;

    if (!apartmentId) {
      continue;
    }

    const currentLinks = linksByApartmentId.get(apartmentId) ?? [];

    currentLinks.push({
      id: record.id,
      apartmentId,
      userId: record.userId ?? record.user?.id,
      type: record.type,
      user: record.user,
    });

    linksByApartmentId.set(apartmentId, currentLinks);
  }

  return apartmentList.map((apartment) => {
    const residentLinks = linksByApartmentId.get(apartment.id) ?? [];

    return {
      ...apartment,
      residents: residentLinks,
      _count: {
        ...(apartment._count ?? {}),
        residents: residentLinks.length,
      },
    };
  });
}

function UsersPage() {
  const { user } = useAuth();

  const [userList, setUserList] = useState([]);
  const [apartments, setApartments] = useState([]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("Tümü");
  const [statusFilter, setStatusFilter] = useState("Tümü");

  const [formData, setFormData] = useState({ ...emptyFormData });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadUsersPageData() {
    const [residentRecords, apartmentList] = await Promise.all([
      getAllPaginatedData(getApartmentResidents),
      getAllPaginatedData(getApartments),
    ]);

    setUserList(residentRecords.map(mapApartmentResidentToUser));
    setApartments(
      attachResidentLinksToApartments(apartmentList, residentRecords)
    );
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        await loadUsersPageData();
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error?.message ?? "Kullanıcı kayıtları alınamadı.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    return userList.filter((item) => {
      const searchableText = [
        item.name,
        item.email,
        item.phone,
        item.site,
        item.block,
        item.apartment,
        item.createdByManager,
        item.role,
        item.status,
        item.paymentStatus,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(searchValue);
      const matchesRole =
        roleFilter === "Tümü" ? true : item.role === roleFilter;
      const matchesStatus =
        statusFilter === "Tümü" ? true : item.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [userList, searchTerm, roleFilter, statusFilter]);

  function resetForm() {
    setEditingUser(null);
    setFormData({ ...emptyFormData });
  }

  function openCreateForm() {
    resetForm();
    setIsFormOpen(true);
    setMessage("");
    setErrorMessage("");
  }

  function closeForm() {
    resetForm();
    setIsFormOpen(false);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => {
      if (name === "residentType") {
        return {
          ...currentData,
          residentType: value,
          apartmentId: "",
          ownerFullName: "",
          ownerEmail: "",
          ownerPhone: "",
          ownerPassword: "",
        };
      }

      if (name === "siteId") {
        return {
          ...currentData,
          siteId: value,
          blockId: "",
          apartmentId: "",
          ownerFullName: "",
          ownerEmail: "",
          ownerPhone: "",
          ownerPassword: "",
        };
      }

      if (name === "blockId") {
        return {
          ...currentData,
          blockId: value,
          apartmentId: "",
          ownerFullName: "",
          ownerEmail: "",
          ownerPhone: "",
          ownerPassword: "",
        };
      }

      if (name === "apartmentId") {
        return {
          ...currentData,
          apartmentId: value,
          ownerFullName: "",
          ownerEmail: "",
          ownerPhone: "",
          ownerPassword: "",
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

    if (!formData.apartmentId) {
      setErrorMessage("Daire seçimi zorunludur.");
      setMessage("");
      return;
    }

    if (!editingUser && formData.password.length < 8) {
      setErrorMessage("Yeni sakin için şifre en az 8 karakter olmalıdır.");
      setMessage("");
      return;
    }

    const selectedApartment = apartments.find(
      (apartment) => apartment.id === formData.apartmentId
    );

    const apartmentResidents = Array.isArray(selectedApartment?.residents)
      ? selectedApartment.residents
      : [];

    const apartmentHasOwner = apartmentResidents.some(
      (resident) => resident.type === "OWNER"
    );

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      if (editingUser) {
        const userPayload = {
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          role: "RESIDENT",
        };

        if (formData.password.trim()) {
          userPayload.password = formData.password.trim();
        }

        await updateUser(editingUser.userId, userPayload);

        await updateApartmentResident(editingUser.id, {
          apartmentId: formData.apartmentId,
          type: formData.residentType,
        });

        setMessage("Sakin bilgileri başarıyla güncellendi.");
      } else {
        let owner;

        if (formData.residentType === "TENANT" && !apartmentHasOwner) {
          if (!formData.ownerFullName.trim()) {
            setErrorMessage("Ev sahibi ad soyad bilgisi zorunludur.");
            return;
          }

          if (!formData.ownerEmail.trim()) {
            setErrorMessage("Ev sahibi e-posta bilgisi zorunludur.");
            return;
          }

          if (
            formData.ownerPassword &&
            formData.ownerPassword.length < 8
          ) {
            setErrorMessage(
              "Ev sahibi geçici şifresi en az 8 karakter olmalıdır."
            );
            return;
          }

          if (
            formData.email.trim().toLowerCase() ===
            formData.ownerEmail.trim().toLowerCase()
          ) {
            setErrorMessage(
              "Kiracı ve ev sahibi aynı e-posta adresini kullanamaz."
            );
            return;
          }

          owner = {
            fullName: formData.ownerFullName.trim(),
            email: formData.ownerEmail.trim(),
            phone: formData.ownerPhone.trim() || undefined,
            password: formData.ownerPassword || undefined,
          };
        }

        const result = await createResidentAndAssignApartment({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          password: formData.password.trim(),
          apartmentId: formData.apartmentId,
          type: formData.residentType,
          ...(owner ? { owner } : {}),
        });

        setMessage(
          result?.message ??
            (formData.residentType === "TENANT"
              ? "Kiracı ve ev sahibi bilgileri başarıyla kaydedildi."
              : "Ev sahibi başarıyla kaydedildi.")
        );
      }

      await loadUsersPageData();
      closeForm();
    } catch (error) {
      setErrorMessage(error?.message ?? "Sakin kaydı kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(userRow) {
    const rawRecord = userRow.rawRecord;
    const currentApartment = rawRecord?.apartment;

    setEditingUser(userRow);

    setFormData({
      ...emptyFormData,
      fullName: userRow.name || "",
      email: userRow.email || "",
      phone: userRow.phone === "-" ? "" : userRow.phone || "",
      password: "",
      residentType: rawRecord?.type ?? "TENANT",
      siteId: currentApartment?.block?.site?.id ?? "",
      blockId: currentApartment?.block?.id ?? "",
      apartmentId: rawRecord?.apartmentId ?? currentApartment?.id ?? "",
    });

    setIsFormOpen(true);
    setMessage("");
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleToggleStatus(userRow) {
    const nextStatus = userRow.status === "Aktif" ? "PASSIVE" : "ACTIVE";

    const confirmMessage =
      userRow.status === "Aktif"
        ? `${userRow.name} adlı sakini pasifleştirmek istiyor musunuz?`
        : `${userRow.name} adlı sakini tekrar aktifleştirmek istiyor musunuz?`;

    const isConfirmed = window.confirm(confirmMessage);

    if (!isConfirmed) {
      return;
    }

    try {
      setMessage("");
      setErrorMessage("");
      setIsSaving(true);

      await updateUser(userRow.userId, {
        status: nextStatus,
      });

      await loadUsersPageData();

      setMessage(
        nextStatus === "ACTIVE"
          ? "Sakin tekrar aktifleştirildi."
          : "Sakin pasifleştirildi."
      );
    } catch (error) {
      setErrorMessage(error?.message ?? "Sakin durumu güncellenemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteApartmentResident(userRow) {
    const isConfirmed = window.confirm(
      `${userRow.name} adlı sakinin daire bağlantısını kaldırmak istiyor musunuz?`
    );

    if (!isConfirmed) {
      return;
    }

    try {
      setMessage("");
      setErrorMessage("");
      setIsSaving(true);

      const result = await deleteApartmentResident(userRow.id);
      await loadUsersPageData();

      setMessage(
        result?.message ?? "Sakin daire bağlantısı başarıyla kaldırıldı."
      );
    } catch (error) {
      setErrorMessage(
        error?.message ?? "Sakin daire bağlantısı kaldırılamadı."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DashboardLayout
      roleTitle="Kullanıcılar / Sakinler"
      roleBadge="Süper Admin"
      userName={user?.fullName ?? "Süper Admin"}
      navItems={navItems}
      theme="super-admin"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Kullanıcı Yönetimi</span>

          <h2>Kullanıcılar ve Sakinler</h2>

          <p>
            Kiracı ve ev sahibi kayıtlarını, daire bağlantılarını ve ödeme
            özetlerini buradan takip edebilirsiniz.
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

      {isFormOpen && (
        <UserForm
          formData={formData}
          apartments={apartments}
          editingUser={editingUser}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isSaving={isSaving}
        />
      )}

      <UserToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {isLoading ? (
        <div className="dashboard-panel">
          <p>Kullanıcı kayıtları yükleniyor...</p>
        </div>
      ) : (
        <UserTable
          users={filteredUsers}
          onView={setSelectedUser}
          onEdit={handleEdit}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDeleteApartmentResident}
          isSaving={isSaving}
        />
      )}

      <UserDetailsModal
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </DashboardLayout>
  );
}

export default UsersPage;
