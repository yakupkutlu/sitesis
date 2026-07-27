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
import ResidentExcelActions from "../../components/residents/ResidentExcelActions";
import ResidentExcelImportModal from "../../components/residents/ResidentExcelImportModal";

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
import { groupResidentRows } from "../../utils/groupResidentRows";

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

function buildOptionalOwnerPayload({
  formData,
  residentType,
  residentEmail,
  apartmentHasOwner,
}) {
  if (residentType !== "TENANT" || apartmentHasOwner) {
    return { owner: undefined, error: null };
  }

  const ownerFullName = formData.ownerFullName.trim();
  const ownerEmail = formData.ownerEmail.trim();
  const ownerPhone = formData.ownerPhone.trim();
  const ownerPassword = formData.ownerPassword;

  const hasAnyOwnerInformation = [
    ownerFullName,
    ownerEmail,
    ownerPhone,
    ownerPassword,
  ].some((value) => Boolean(value));

  if (!hasAnyOwnerInformation) {
    return { owner: undefined, error: null };
  }

  if (!ownerFullName || !ownerEmail) {
    return {
      owner: undefined,
      error:
        "Ev sahibi bilgisi eklenecekse ad soyad ve e-posta alanlarını doldurun; bilgiler bilinmiyorsa tüm ev sahibi alanlarını boş bırakın.",
    };
  }

  if (ownerPassword && ownerPassword.length < 8) {
    return {
      owner: undefined,
      error: "Ev sahibi geçici şifresi en az 8 karakter olmalıdır.",
    };
  }

  if (residentEmail.trim().toLowerCase() === ownerEmail.toLowerCase()) {
    return {
      owner: undefined,
      error: "Kiracı ve ev sahibi aynı e-posta adresini kullanamaz.",
    };
  }

  return {
    owner: {
      fullName: ownerFullName,
      email: ownerEmail,
      phone: ownerPhone || undefined,
      password: ownerPassword || undefined,
    },
    error: null,
  };
}

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

function getOwnerDetails(apartment) {
  const apartmentResidents = Array.isArray(apartment?.residents)
    ? apartment.residents
    : [];

  const ownerLink = apartmentResidents.find(
    (residentLink) => residentLink.type === "OWNER"
  );

  const ownerUser = ownerLink?.user;

  if (!ownerUser) {
    return null;
  }

  return {
    name: ownerUser.fullName ?? "-",
    email: ownerUser.email ?? "-",
    phone: ownerUser.phone ?? "-",
    status: ownerUser.status === "ACTIVE" ? "Aktif" : "Pasif",
  };
}

function mapApartmentResidentToUser(record) {
  const residentUser = record.user ?? {};
  const apartment = record.apartment ?? {};
  const block = apartment.block ?? {};
  const site = block.site ?? {};
  const paymentSummary = buildPaymentSummary(record);
  const owner = getOwnerDetails(apartment);
  const apartmentResidentLinks = Array.isArray(apartment.residents)
    ? apartment.residents
    : [];
  const hasTenant = apartmentResidentLinks.some(
    (residentLink) => residentLink.type === "TENANT"
  );

  return {
    id: record.id,
    userId: residentUser.id,
    apartmentId: record.apartmentId ?? apartment.id,
    residentType: record.type,
    hasTenant,
    accountRole: residentUser.role,
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
    owner,
    ownerInfoMissing: record.type === "TENANT" && !owner,
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
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
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
      getAllPaginatedData(getApartmentResidents, { includeAllLinks: true }),
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

  const groupedUsers = useMemo(() => {
    return groupResidentRows(userList);
  }, [userList]);

  const filteredUsers = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    return groupedUsers.filter((item) => {
      const apartmentRows = Array.isArray(item.apartmentRows)
        ? item.apartmentRows
        : [];

      const apartmentSearchText = apartmentRows
        .flatMap((apartmentRow) => [
          apartmentRow.site,
          apartmentRow.block,
          apartmentRow.apartment,
          apartmentRow.paymentStatus,
        ])
        .join(" ");

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
        apartmentSearchText,
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
  }, [groupedUsers, searchTerm, roleFilter, statusFilter]);

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

    if (
      editingUser &&
      formData.password &&
      formData.password.length < 8
    ) {
      setErrorMessage("Yeni şifre en az 8 karakter olmalıdır.");
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

    const { owner, error: ownerError } = buildOptionalOwnerPayload({
      formData,
      residentType: formData.residentType,
      residentEmail: formData.email,
      apartmentHasOwner,
    });

    if (ownerError) {
      setErrorMessage(ownerError);
      setMessage("");
      return;
    }

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

        const updateResult = await updateApartmentResident(
          editingUser.id,
          {
            apartmentId: formData.apartmentId,
            type: formData.residentType,
            ...(owner ? { owner } : {}),
          }
        );

        setMessage(
          updateResult?.message ??
            (owner
              ? "Sakin güncellendi ve ev sahibi aynı daireye bağlandı."
              : "Sakin bilgileri başarıyla güncellendi.")
        );
      } else {
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
              ? owner
                ? "Kiracı ve ev sahibi bilgileri başarıyla kaydedildi."
                : "Kiracı kaydedildi. Ev sahibi bilgisi eksik olduğu için sarı uyarı gösterilecektir."
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

  async function handleExcelImportCompleted(result) {
    await loadUsersPageData();
    setErrorMessage("");
    setMessage(
      result?.message ?? "Excel sakin yükleme işlemi başarıyla tamamlandı."
    );
  }

  async function handleDeleteApartmentResident(userRow) {
    if (
      userRow.accountRole === "RESIDENT" &&
      userRow.status !== "Pasif"
    ) {
      setMessage("");
      setErrorMessage(
        "Daire bağlantısını kaldırmadan önce sakin hesabını pasif yapmalısınız."
      );
      return;
    }

    const isConfirmed = window.confirm(
      `${userRow.name} adlı sakinin daire bağlantısı kaldırılacak. ` +
        "Kullanıcı hesabı ve geçmiş kayıtları veritabanında korunacaktır. " +
        "Devam etmek istiyor musunuz?"
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

        <div className="resident-page-header-actions">
          <ResidentExcelActions
            onOpenImport={() => setIsExcelImportOpen(true)}
            disabled={isSaving}
          />

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

      <ResidentExcelImportModal
        open={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        onImported={handleExcelImportCompleted}
      />
    </DashboardLayout>
  );
}

export default UsersPage;
