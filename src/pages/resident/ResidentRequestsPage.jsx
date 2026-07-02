import { useMemo, useState } from "react";
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

const navItems = [
  { label: "Panel", path: "/resident/dashboard", icon: Home },
  { label: "Aidat ve Ödemeler", path: "/resident/payments", icon: CreditCard },
  { label: "Dekont Yükle", path: "/resident/receipts", icon: UploadCloud },
  { label: "Duyurular", path: "/resident/announcements", icon: Bell },
  { label: "Talepler", path: "/resident/requests", icon: MessageSquareText },
  { label: "Ayarlar", path: "/resident/settings", icon: Settings },
];

const residentInfo = {
  fullName: "Ali Can",
  siteName: "Mavi Site",
  apartment: "A Blok / Daire 5",
};

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

const initialRequests = [
  {
    id: 1,
    requestNo: "TLP-1001",
    title: "Asansör çalışmıyor",
    category: "Arıza",
    priority: "Acil",
    status: "İnceleniyor",
    apartment: "A Blok / Daire 5",
    createdAt: "30.06.2026",
    fileName: "asansor-ariza.jpg",
    contactPreference: "SMS ile bilgilendir",
    description:
      "A Blok asansörü sabah saatlerinden beri çalışmıyor. Katlarda bekleyen sakinler var.",
    managerResponse:
      "Teknik servis yönlendirildi. Gün içinde kontrol sağlanacaktır.",
  },
  {
    id: 2,
    requestNo: "TLP-1002",
    title: "Otopark ışığı yanmıyor",
    category: "Otopark",
    priority: "Normal",
    status: "Yeni",
    apartment: "A Blok / Daire 5",
    createdAt: "29.06.2026",
    fileName: "",
    contactPreference: "Uygulama üzerinden",
    description:
      "A Blok otopark girişindeki ışık çalışmıyor. Akşam saatlerinde alan karanlık kalıyor.",
    managerResponse: "Talebiniz yönetime iletildi. İnceleme bekleniyor.",
  },
  {
    id: 3,
    requestNo: "TLP-0988",
    title: "Merdiven temizliği",
    category: "Temizlik",
    priority: "Önemli",
    status: "Çözüldü",
    apartment: "A Blok / Daire 5",
    createdAt: "20.06.2026",
    fileName: "",
    contactPreference: "E-posta ile bilgilendir",
    description: "A Blok 3. kat merdiven alanında temizlik gerekiyor.",
    managerResponse: "Temizlik ekibi yönlendirildi ve işlem tamamlandı.",
  },
];

function formatFileSize(size) {
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function ResidentRequestsPage() {
  const [requests, setRequests] = useState(initialRequests);
  const [formData, setFormData] = useState(emptyFormData);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tümü");
  const [categoryFilter, setCategoryFilter] = useState("Tümü");

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
    const searchValue = searchTerm.trim().toLowerCase();

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
        .toLowerCase();

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

  function handleSubmit(event) {
    event.preventDefault();

    const newRequest = {
      id: Date.now(),
      requestNo: `TLP-${Date.now().toString().slice(-4)}`,
      title: formData.title.trim(),
      category: formData.category,
      priority: formData.priority,
      status: "Yeni",
      apartment: residentInfo.apartment,
      createdAt: new Date().toLocaleDateString("tr-TR"),
      fileName: selectedFile?.name || "",
      contactPreference: formData.contactPreference,
      description: formData.description.trim(),
      managerResponse: "Talebiniz yönetime iletildi. İnceleme bekleniyor.",
    };

    setRequests((currentRequests) => [newRequest, ...currentRequests]);
    resetForm();
  }

  return (
    <DashboardLayout
      roleTitle="Talepler"
      roleBadge="Sakin"
      userName={residentInfo.fullName}
      navItems={navItems}
      theme="resident"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Talep Takibi</span>

          <h2>Talepler</h2>

          <p>
            {residentInfo.siteName} / {residentInfo.apartment} için arıza,
            bakım, temizlik ve benzeri taleplerinizi buradan yönetime
            gönderebilirsiniz.
          </p>
        </div>
      </div>

      <ResidentRequestSummaryCards summary={summary} />

      <ResidentRequestForm
        formData={formData}
        selectedFile={selectedFile}
        fileError={fileError}
        onInputChange={handleInputChange}
        onFileChange={handleFileChange}
        onSubmit={handleSubmit}
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

      <ResidentRequestCards
        requests={filteredRequests}
        onView={setSelectedRequest}
      />

      <ResidentRequestDetailsModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </DashboardLayout>
  );
}

export default ResidentRequestsPage;