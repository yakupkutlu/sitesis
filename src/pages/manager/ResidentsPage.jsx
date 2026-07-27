import { managerNavItems } from "../../config/managerNavigation";
import { useAuth } from "../../hooks/useAuth";
import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Plus } from "lucide-react";

import ResidentToolbar from "../../components/residents/ResidentToolbar";
import ResidentForm from "../../components/residents/ResidentForm";
import ResidentTable from "../../components/residents/ResidentTable";
import ResidentDetailsModal from "../../components/residents/ResidentDetailsModal";
import ResidentExcelActions from "../../components/residents/ResidentExcelActions";
import ResidentExcelImportModal from "../../components/residents/ResidentExcelImportModal";

import {
  createResidentAndAssignApartment,
  deleteApartmentResident,
  getApartmentResidents,
  updateApartmentResident,
  updateResidentPassword,
} from "../../api/apartmentResidentsApi";
import { getApartments } from "../../api/apartmentsApi";
import { updateLinkedResidentStatus } from "../../api/usersApi";

import { buildPaymentSummary } from "../../utils/paymentSummary";
import { groupResidentRows } from "../../utils/groupResidentRows";

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
  ownerFullName: "",
  ownerPhone: "",
  ownerEmail: "",
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

function mapApartmentResidentToViewModel(item) {
  const user = item.user ?? {};
  const apartment = item.apartment ?? {};
  const block = apartment.block ?? {};
  const site = block.site ?? {};
  const paymentSummary = buildPaymentSummary(item);
  const owner = getOwnerDetails(apartment);
  const apartmentResidents = Array.isArray(apartment?.residents)
    ? apartment.residents
    : [];
  const apartmentHasOwner = apartmentResidents.some(
    (residentLink) => residentLink.type === "OWNER"
  );

  return {
    id: item.id,
    userId: user.id,
    accountRole: user.role,
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
    owner,
    ownerInfoMissing: item.type === "TENANT" && !apartmentHasOwner,
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
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [formData, setFormData] = useState(emptyFormData);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("Tümü");
  const [statusFilter, setStatusFilter] = useState("Tümü");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadResidents = useCallback(async () => {
    const residentList = await getAllPaginatedData(getApartmentResidents, { includeAllLinks: true });
    setResidents(residentList.map(mapApartmentResidentToViewModel));
  }, []);

  const loadApartments = useCallback(async () => {
    const apartmentList = await getAllPaginatedData(getApartments);
    setApartments(apartmentList);
  }, []);

  const loadPageData = useCallback(async () => {
    await Promise.all([loadResidents(), loadApartments()]);
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

  const groupedResidents = useMemo(() => {
    return groupResidentRows(residents);
  }, [residents]);

  const filteredResidents = useMemo(() => {
    return groupedResidents.filter((resident) => {
      const searchValue = searchTerm.trim().toLowerCase();
      const apartmentRows = Array.isArray(resident.apartmentRows)
        ? resident.apartmentRows
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
        resident.name,
        resident.role,
        resident.site,
        resident.block,
        resident.apartment,
        resident.phone,
        resident.email,
        resident.paymentStatus,
        apartmentSearchText,
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
  }, [groupedResidents, searchTerm, roleFilter, statusFilter]);

  function openCreateForm() {
    setEditingResident(null);
    setFormData({ ...emptyFormData });
    setShowForm(true);
    setMessage("");
    setErrorMessage("");
  }

  function openEditForm(resident) {
    setEditingResident(resident);

    const currentApartment = resident.raw?.apartment;

    setFormData({
      ...emptyFormData,
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
    setFormData({ ...emptyFormData });
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
          ownerFullName: "",
          ownerPhone: "",
          ownerEmail: "",
          ownerPassword: "",
        };
      }

      if (name === "blockId") {
        return {
          ...currentData,
          blockId: value,
          apartmentId: "",
          ownerFullName: "",
          ownerPhone: "",
          ownerEmail: "",
          ownerPassword: "",
        };
      }

      if (name === "apartmentId") {
        return {
          ...currentData,
          apartmentId: value,
          ownerFullName: "",
          ownerPhone: "",
          ownerEmail: "",
          ownerPassword: "",
        };
      }

      if (name === "type") {
        return {
          ...currentData,
          type: value,
          apartmentId: "",
          ownerFullName: "",
          ownerPhone: "",
          ownerEmail: "",
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
      residentType: formData.type,
      residentEmail: formData.email,
      apartmentHasOwner,
    });

    if (ownerError) {
      setErrorMessage(ownerError);
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      if (editingResident) {
        if (formData.password && formData.password.length < 8) {
          setErrorMessage("Yeni şifre en az 8 karakter olmalıdır.");
          return;
        }

        const updateResult = await updateApartmentResident(
          editingResident.id,
          {
            apartmentId: formData.apartmentId,
            type: formData.type,
            ...(owner ? { owner } : {}),
          }
        );

        if (formData.password) {
          await updateResidentPassword(editingResident.id, {
            password: formData.password,
          });
        }

        setMessage(
          updateResult?.message ??
            (owner
              ? "Sakin güncellendi ve ev sahibi aynı daireye bağlandı."
              : formData.password
                ? "Sakin bilgileri ve şifresi başarıyla güncellendi."
                : "Sakin daire bağlantısı başarıyla güncellendi.")
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

        if (formData.password && formData.password.length < 8) {
          setErrorMessage("Geçici şifre en az 8 karakter olmalıdır.");
          return;
        }

        const result = await createResidentAndAssignApartment({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          password: formData.password || undefined,
          apartmentId: formData.apartmentId,
          type: formData.type,
          ...(owner ? { owner } : {}),
        });

        setMessage(
          result?.message ??
            (formData.type === "TENANT"
              ? owner
                ? "Kiracı ve ev sahibi başarıyla kaydedildi."
                : "Kiracı başarıyla kaydedildi. Ev sahibi bilgisi eksik olduğu için sarı uyarı gösterilecektir."
              : "Ev sahibi başarıyla kaydedildi.")
        );
      }

      await loadPageData();
      closeForm();
    } catch (error) {
      setErrorMessage(error?.message ?? "Sakin kaydı kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleStatus(resident) {
    if (resident.accountRole !== "RESIDENT") {
      setMessage("");
      setErrorMessage(
        "Yönetici veya süper admin hesabının durumu bu ekrandan değiştirilemez."
      );
      return;
    }

    const nextStatus = resident.status === "Aktif" ? "PASSIVE" : "ACTIVE";

    const isConfirmed = window.confirm(
      nextStatus === "PASSIVE"
        ? `${resident.name} adlı sakin pasif yapılacak. Bu işlemden sonra daire bağlantısını kaldırabilirsiniz.`
        : `${resident.name} adlı sakin yeniden aktifleştirilecek. Devam etmek istiyor musunuz?`
    );

    if (!isConfirmed) {
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      const result = await updateLinkedResidentStatus(
        resident.statusReferenceId ?? resident.id,
        nextStatus
      );

      await loadPageData();

      setMessage(
        result?.message ??
          (nextStatus === "PASSIVE"
            ? "Sakin hesabı pasif yapıldı."
            : "Sakin hesabı yeniden aktifleştirildi.")
      );
    } catch (error) {
      setErrorMessage(
        error?.message ?? "Sakin hesap durumu güncellenemedi."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleExcelImportCompleted(result) {
    await loadPageData();
    setErrorMessage("");
    setMessage(
      result?.message ?? "Excel sakin yükleme işlemi başarıyla tamamlandı."
    );
  }

  async function handleDelete(resident) {
    if (
      resident.accountRole === "RESIDENT" &&
      resident.status !== "Pasif"
    ) {
      setMessage("");
      setErrorMessage(
        "Daire bağlantısını kaldırmadan önce sakin hesabını pasif yapmalısınız."
      );
      return;
    }

    const isConfirmed = window.confirm(
      `${resident.name} adlı sakinin daire bağlantısı kaldırılacak. ` +
        "Kullanıcı hesabı ve geçmiş kayıtları korunacaktır. " +
        "Devam etmek istiyor musunuz?"
    );

    if (!isConfirmed) {
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      const result = await deleteApartmentResident(resident.id);
      await loadPageData();

      setMessage(
        result?.message ?? "Sakin daire bağlantısı başarıyla kaldırıldı."
      );
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
      navItems={managerNavItems}
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
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
          isSaving={isSaving}
        />
      )}

      <ResidentDetailsModal
        resident={selectedResident}
        onClose={() => setSelectedResident(null)}
      />

      <ResidentExcelImportModal
        open={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        onImported={handleExcelImportCompleted}
      />
    </DashboardLayout>
  );
}

export default ResidentsPage;