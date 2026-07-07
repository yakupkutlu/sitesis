import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BarChart3,
  Bell,
  CreditCard,
  Home,
  MessageSquareText,
  Settings,
  UploadCloud,
  UserRound,
} from "lucide-react";

import ManagerRequestSummaryCards from "../../components/manager-requests/ManagerRequestSummaryCards";
import ManagerRequestToolbar from "../../components/manager-requests/ManagerRequestToolbar";
import ManagerRequestCards from "../../components/manager-requests/ManagerRequestCards";
import ManagerRequestViewModal from "../../components/manager-requests/ManagerRequestViewModal";
import ManagerRequestEditModal from "../../components/manager-requests/ManagerRequestEditModal";
import ManagerRequestHistoryModal from "../../components/manager-requests/ManagerRequestHistoryModal";

import { getRequests, updateRequest } from "../../api/requestsApi";
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

const statusToLabel = {
  OPEN: "Yeni",
  IN_PROGRESS: "İnceleniyor",
  DONE: "Çözüldü",
  REJECTED: "Reddedildi",
};

const labelToStatus = {
  Yeni: "OPEN",
  İnceleniyor: "IN_PROGRESS",
  "İnceleniyor": "IN_PROGRESS",
  Çözüldü: "DONE",
  Reddedildi: "REJECTED",
};

const typeToLabel = {
  MAINTENANCE: "Bakım",
  COMPLAINT: "Şikayet",
  SUGGESTION: "Öneri",
  GENERAL: "Genel",
};

const emptyUpdateData = {
  status: "Yeni",
  managerResponse: "",
  sendSms: "Gönderme",
  sendEmail: "Gönder",
};

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.requests)) return data.requests;

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

function getApartmentLabel(request) {
  const siteName = request?.apartment?.block?.site?.name;
  const blockName = request?.apartment?.block?.name;
  const apartmentNumber = request?.apartment?.number;

  return [siteName, blockName, apartmentNumber ? `Daire ${apartmentNumber}` : ""]
    .filter(Boolean)
    .join(" / ");
}

function mapRequestToViewModel(request) {
  const createdAt = formatDate(request.createdAt);
  const updatedAt = formatDate(request.updatedAt);

  return {
    id: request.id,
    title: request.title,
    residentName: request.createdByUser?.fullName ?? "-",
    phone: request.createdByUser?.phone ?? "-",
    apartmentLabel: getApartmentLabel(request),
    category: typeToLabel[request.type] ?? request.type ?? "Genel",
    priority: "Normal",
    status: statusToLabel[request.status] ?? request.status ?? "Yeni",
    description: request.description ?? "",
    managerResponse: request.assignedToUser
      ? `Atanan yönetici: ${request.assignedToUser.fullName}`
      : "",
    fileName: "",
    history: [
      {
        id: `${request.id}-created`,
        date: createdAt,
        text: "Talep sakin tarafından oluşturuldu.",
      },
      ...(request.updatedAt && request.updatedAt !== request.createdAt
        ? [
            {
              id: `${request.id}-updated`,
              date: updatedAt,
              text: `Talep durumu: ${statusToLabel[request.status] ?? request.status}`,
            },
          ]
        : []),
    ],
    createdAt,
    updatedAt,
    raw: request,
  };
}

function ManagerRequestsPage() {
  const { user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [updateData, setUpdateData] = useState(emptyUpdateData);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tümü");
  const [priorityFilter, setPriorityFilter] = useState("Tümü");
  const [statusFilter, setStatusFilter] = useState("Tümü");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadRequests() {
    const result = await getRequests({
      page: 1,
      limit: 100,
      search: searchTerm.trim(),
    });

    const requestItems = getDataArray(result).map(mapRequestToViewModel);
    setRequests(requestItems);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        await loadRequests();
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error?.message ?? "Talepler alınamadı.");
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
      total: requests.length,
      newCount: requests.filter((request) => request.status === "Yeni").length,
      reviewingCount: requests.filter(
        (request) => request.status === "İnceleniyor"
      ).length,
      resolvedCount: requests.filter((request) => request.status === "Çözüldü")
        .length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      const searchableText = [
        request.title,
        request.residentName,
        request.phone,
        request.apartmentLabel,
        request.category,
        request.priority,
        request.status,
        request.description,
        request.managerResponse,
        request.fileName,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(searchValue);

      const matchesCategory =
        categoryFilter === "Tümü" ? true : request.category === categoryFilter;

      const matchesPriority =
        priorityFilter === "Tümü" ? true : request.priority === priorityFilter;

      const matchesStatus =
        statusFilter === "Tümü" ? true : request.status === statusFilter;

      return (
        matchesSearch && matchesCategory && matchesPriority && matchesStatus
      );
    });
  }, [requests, searchTerm, categoryFilter, priorityFilter, statusFilter]);

  function openViewModal(request) {
    setSelectedRequest(request);
    setActiveModal("view");
  }

  function openEditModal(request) {
    setSelectedRequest(request);

    setUpdateData({
      status: request.status || "Yeni",
      managerResponse: request.managerResponse || "",
      sendSms: "Gönderme",
      sendEmail: "Gönder",
    });

    setActiveModal("edit");
  }

  function openHistoryModal(request) {
    setSelectedRequest(request);
    setActiveModal("history");
  }

  function closeModal() {
    setSelectedRequest(null);
    setActiveModal(null);
    setUpdateData(emptyUpdateData);
  }

  function handleUpdateInputChange(event) {
    const { name, value } = event.target;

    setUpdateData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  async function handleUpdateRequest(event) {
    event.preventDefault();

    if (!selectedRequest) {
      return;
    }

    const backendStatus = labelToStatus[updateData.status];

    if (!backendStatus) {
      setErrorMessage("Geçerli bir talep durumu seçiniz.");
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      await updateRequest(selectedRequest.id, {
        status: backendStatus,
      });

      await loadRequests();

      setMessage("Talep durumu başarıyla güncellendi.");
      closeModal();
    } catch (error) {
      setErrorMessage(error?.message ?? "Talep güncellenemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DashboardLayout
      roleTitle="Talepler"
      roleBadge="Yönetici"
      userName={user?.fullName ?? "Yönetici"}
      navItems={navItems}
      theme="manager"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Talep Yönetimi</span>

          <h2>Talepler</h2>

          <p>
            Yetkili olduğunuz site veya blok kapsamındaki sakin taleplerini
            görüntüleyebilir ve durumlarını güncelleyebilirsiniz.
          </p>
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

      <ManagerRequestSummaryCards summary={summary} />

      <ManagerRequestToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {isLoading ? (
        <div className="dashboard-panel">
          <p>Talepler yükleniyor...</p>
        </div>
      ) : (
        <ManagerRequestCards
          requests={filteredRequests}
          onView={openViewModal}
          onEdit={openEditModal}
          onHistory={openHistoryModal}
        />
      )}

      {isSaving && (
        <div className="dashboard-panel">
          <p>Talep güncelleniyor...</p>
        </div>
      )}

      <ManagerRequestViewModal
        request={activeModal === "view" ? selectedRequest : null}
        onClose={closeModal}
      />

      <ManagerRequestEditModal
        request={activeModal === "edit" ? selectedRequest : null}
        updateData={updateData}
        onInputChange={handleUpdateInputChange}
        onSubmit={handleUpdateRequest}
        onClose={closeModal}
      />

      <ManagerRequestHistoryModal
        request={activeModal === "history" ? selectedRequest : null}
        onClose={closeModal}
      />
    </DashboardLayout>
  );
}

export default ManagerRequestsPage;
