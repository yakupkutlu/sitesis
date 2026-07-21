import { useAuth } from "../../hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Bell,
  CreditCard,
  Home,
  MessageSquareText,
  Settings,
  UploadCloud,
} from "lucide-react";

import ResidentRequestSummaryCards from "../../components/resident-requests/ResidentRequestSummaryCards";
import ResidentRequestForm from "../../components/resident-requests/ResidentRequestForm";
import ResidentRequestCards from "../../components/resident-requests/ResidentRequestCards";
import ResidentRequestDetailsModal from "../../components/resident-requests/ResidentRequestDetailsModal";
import ResidentRequestToolbar from "../../components/resident-requests/ResidentRequestToolbar";
import { createRequest, getRequests } from "../../api/requestsApi";


const navItems = [
  { label: "Panel", path: "/resident/dashboard", icon: Home },
  { label: "Aidat ve Ödemeler", path: "/resident/payments", icon: CreditCard },
  { label: "Dekont Yükle", path: "/resident/receipts", icon: UploadCloud },
  { label: "Duyurular", path: "/resident/announcements", icon: Bell },
  { label: "Talepler", path: "/resident/requests", icon: MessageSquareText },
  { label: "Ayarlar", path: "/resident/settings", icon: Settings },
];

const allowedRequestFileTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const maxRequestFileSize = 5 * 1024 * 1024;

const emptyFormData = {
  title: "",
  category: "",
  priority: "Normal",
  contactPreference: "Uygulama üzerinden",
  description: "",
};

const statusMap = {
  OPEN: "Yeni",
  IN_PROGRESS: "İnceleniyor",
  DONE: "Çözüldü",
  REJECTED: "Reddedildi",
};

const typeMap = {
  MAINTENANCE: "Bakım",
  COMPLAINT: "Şikayet",
  SUGGESTION: "Öneri",
  GENERAL: "Genel",
};

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.requests)) return data.requests;

  return [];
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  try {
    return new Date(value).toLocaleDateString("tr-TR");
  } catch {
    return "-";
  }
}

function formatFileSize(size) {
  if (!size) {
    return "-";
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeText(value) {
  return String(value ?? "").toLocaleLowerCase("tr-TR").trim();
}

function mapCategoryToRequestType(category) {
  const value = normalizeText(category);

  if (value.includes("şikayet")) return "COMPLAINT";
  if (value.includes("öneri")) return "SUGGESTION";

  if (
    value.includes("arıza") ||
    value.includes("bakım") ||
    value.includes("asansör") ||
    value.includes("elektrik") ||
    value.includes("su") ||
    value.includes("temizlik") ||
    value.includes("güvenlik") ||
    value.includes("otopark")
  ) {
    return "MAINTENANCE";
  }

  return "GENERAL";
}

function buildDescriptionWithFormInfo(formData) {
  const description = formData.description.trim();

  return [
    description,
    "",
    `Öncelik: ${formData.priority}`,
    `İletişim tercihi: ${formData.contactPreference}`,
  ].join("\n");
}

function getApartmentText(request) {
  const apartment = request.apartment;

  if (!apartment) {
    return "-";
  }

  const siteName = apartment.block?.site?.name;
  const blockName = apartment.block?.name;
  const apartmentNo = apartment.number ? `Daire ${apartment.number}` : null;

  return [siteName, blockName, apartmentNo].filter(Boolean).join(" / ") || "-";
}

function getManagerResponse(request) {
  if (request.status === "DONE") {
    return "Talebiniz çözüldü olarak işaretlendi.";
  }

  if (request.status === "IN_PROGRESS") {
    return "Talebiniz yönetim tarafından inceleniyor.";
  }

  if (request.status === "REJECTED") {
    return "Talebiniz yönetim tarafından reddedildi.";
  }

  return "Talebiniz yönetime iletildi. İnceleme bekleniyor.";
}

function mapRequestToViewModel(request) {
  return {
    id: request.id,
    requestNo: `TLP-${String(request.id).slice(0, 6).toUpperCase()}`,
    title: request.title ?? "-",
    category: typeMap[request.type] ?? "Genel",
    priority: "Normal",
    status: statusMap[request.status] ?? request.status ?? "-",
    apartment: getApartmentText(request),
    createdAt: formatDate(request.createdAt),
    fileName: request.attachmentOriginalFileName || "",
    fileSizeText: formatFileSize(request.attachmentSizeBytes),
    fileType: request.attachmentMimeType || "",
    contactPreference: "Uygulama üzerinden",
    description: request.description ?? "",
    managerResponse: getManagerResponse(request),
    raw: request,
  };
}

async function fetchResidentRequests() {
  const result = await getRequests({
    page: 1,
    limit: 100,
  });

  return getDataArray(result).map(mapRequestToViewModel);
}

function ResidentRequestsPage() {
  const { user, selectedApartmentId } = useAuth();

  const [requests, setRequests] = useState([]);
  const [formData, setFormData] = useState(emptyFormData);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tümü");
  const [categoryFilter, setCategoryFilter] = useState("Tümü");

  const [loadedApartmentId, setLoadedApartmentId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isLoading =
    !selectedApartmentId || loadedApartmentId !== selectedApartmentId;

  useEffect(() => {
    let isCancelled = false;

    async function loadSelectedApartmentRequests() {
      try {
        const nextRequests = await fetchResidentRequests();

        if (isCancelled) {
          return;
        }

        setRequests(nextRequests);
        setSelectedRequest(null);
        setErrorMessage("");
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setRequests([]);
        setSelectedRequest(null);
        setErrorMessage(error?.message ?? "Talepler alınamadı.");
      } finally {
        if (!isCancelled) {
          setLoadedApartmentId(selectedApartmentId);
        }
      }
    }

    void loadSelectedApartmentRequests();

    return () => {
      isCancelled = true;
    };
  }, [selectedApartmentId]);

  const summary = useMemo(() => {
    return {
      total: requests.length,
      newCount: requests.filter((request) => request.status === "Yeni").length,
      reviewing: requests.filter((request) => request.status === "İnceleniyor")
        .length,
      resolved: requests.filter((request) => request.status === "Çözüldü")
        .length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const searchValue = normalizeText(searchTerm);

    return requests.filter((request) => {
      const searchableText = [
        request.title,
        request.description,
        request.category,
        request.status,
        request.priority,
        request.requestNo,
        request.apartment,
        request.contactPreference,
        request.managerResponse,
        request.fileName,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      const matchesSearch = searchableText.includes(searchValue);

      const matchesStatus =
        statusFilter === "Tümü" ? true : request.status === statusFilter;

      const matchesCategory =
        categoryFilter === "Tümü" ? true : request.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [requests, searchTerm, statusFilter, categoryFilter]);

  function resetForm() {
    setFormData(emptyFormData);
    setSelectedFile(null);
    setFileError("");
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    setFileError("");
    setSelectedFile(null);

    if (!file) {
      return;
    }

    if (!allowedRequestFileTypes.includes(file.type)) {
      setFileError("Bu dosya türü desteklenmiyor.");
      event.target.value = "";
      return;
    }

    if (file.size > maxRequestFileSize) {
      setFileError("Talep dosyası en fazla 5 MB olabilir.");
      event.target.value = "";
      return;
    }

    setSelectedFile({
      file,
      name: file.name,
      sizeText: formatFileSize(file.size),
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!formData.title.trim() || !formData.description.trim() || !formData.category) {
      setErrorMessage("Başlık, kategori ve açıklama alanları zorunludur.");
      return;
    }

    try {
      setIsSubmitting(true);

      await createRequest({
        title: formData.title.trim(),
        description: buildDescriptionWithFormInfo(formData),
        type: mapCategoryToRequestType(formData.category),
        apartmentId: selectedApartmentId,
        attachment: selectedFile?.file,
        sendEmail: true,
        sendSms: false,
      });

      const nextRequests = await fetchResidentRequests();

      setRequests(nextRequests);
      setSelectedRequest(null);
      setLoadedApartmentId(selectedApartmentId);
      setSuccessMessage("Talebiniz başarıyla yönetime gönderildi.");
      resetForm();
    } catch (error) {
      setErrorMessage(error?.message ?? "Talep oluşturulamadı.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DashboardLayout
      roleTitle="Talepler"
      roleBadge="Sakin"
      userName={user?.fullName ?? "Sakin"}
      navItems={navItems}
      theme="resident"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Talep Takibi</span>
          <h2>Talepler</h2>
          <p>
            Arıza, bakım, temizlik ve benzeri taleplerinizi buradan yönetime
            gönderebilir ve geçmiş taleplerinizi takip edebilirsiniz.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="login-error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="form-success-message">
          <p>{successMessage}</p>
        </div>
      )}

      <ResidentRequestSummaryCards summary={summary} />

      <ResidentRequestForm
        formData={formData}
        selectedFile={selectedFile}
        fileError={fileError}
        onInputChange={handleInputChange}
        onFileChange={handleFileChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      <ResidentRequestToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
      />

      <div className="resident-section-heading">
        <span className="section-kicker">Geçmiş</span>
        <h3>Taleplerim</h3>
      </div>

      {isLoading ? (
        <div className="dashboard-panel">
          <p>Talepler yükleniyor...</p>
        </div>
      ) : (
        <ResidentRequestCards
          requests={filteredRequests}
          onView={setSelectedRequest}
        />
      )}

      <ResidentRequestDetailsModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </DashboardLayout>
  );
}

export default ResidentRequestsPage;
