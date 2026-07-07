import { useEffect, useMemo, useState } from "react";
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

import ReceiptToolbar from "../../components/receipts/ReceiptToolbar";
import ReceiptTable from "../../components/receipts/ReceiptTable";
import ReceiptDetailsModal from "../../components/receipts/ReceiptDetailsModal";
import ReceiptUploadForm from "../../components/receipts/ReceiptUploadForm";
import {
  analyzeManagerPaymentReceipt,
  approvePaymentReceipt,
  getPaymentReceiptDownloadUrl,
  managerConfirmPaymentReceipt,
  getPaymentReceipts,
  rejectPaymentReceipt,
} from "../../api/paymentReceiptsApi";
import { getApartments } from "../../api/apartmentsApi";
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

const statusLabels = {
  PENDING: "Onay Bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
};

const emptyUploadFormData = {
  payerName: "",
  bankAccount: "",
  amount: "",
  paymentOwnerType: "Kiracı Ödemesi",
  manualApartmentId: "",
  description: "",
  fileName: "",
  fileType: "",
  fileSizeText: "",
};

const allowedReceiptTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const maxReceiptSize = 10 * 1024 * 1024;

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.receipts)) return data.receipts;
  if (Array.isArray(data?.paymentReceipts)) return data.paymentReceipts;
  if (Array.isArray(data?.apartments)) return data.apartments;

  return [];
}

function formatCurrencyFromKurus(value) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format((Number(value) || 0) / 100);
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("tr-TR");
  } catch {
    return "-";
  }
}

function formatFileSize(size) {
  if (!size) return "0 KB";

  const sizeInKb = Number(size) / 1024;

  if (sizeInKb < 1024) {
    return `${sizeInKb.toFixed(1)} KB`;
  }

  return `${(sizeInKb / 1024).toFixed(2)} MB`;
}

function normalizeText(value) {
  return String(value ?? "").toLocaleLowerCase("tr-TR").trim();
}

function fixTurkishFileName(value) {
  return String(value ?? "")
    .replaceAll("Ã¶", "ö")
    .replaceAll("Ã¼", "ü")
    .replaceAll("Ã§", "ç")
    .replaceAll("Ä±", "ı")
    .replaceAll("ÅŸ", "ş")
    .replaceAll("ÄŸ", "ğ")
    .replaceAll("Ã–", "Ö")
    .replaceAll("Ãœ", "Ü")
    .replaceAll("Ã‡", "Ç")
    .replaceAll("Ä°", "İ")
    .replaceAll("Åž", "Ş")
    .replaceAll("Äž", "Ğ");
}

function getApartmentLabel(apartment) {
  return `${apartment.block?.site?.name ?? "Site"} / ${
    apartment.block?.name ?? "Blok"
  } / Daire ${apartment.number}`;
}

function mapReceiptToViewModel(receipt) {
  const allocation = receipt.paymentAllocation ?? {};
  const apartment = allocation.apartment ?? {};
  const block = apartment.block ?? {};
  const site = block.site ?? {};
  const batch = allocation.paymentBatch ?? {};

  return {
    id: receipt.id,
    payerName: receipt.uploadedByUser?.fullName ?? "-",
    payerEmail: receipt.uploadedByUser?.email ?? "-",
    apartmentLabel: apartment.number
      ? `${site.name ?? "Site"} / ${block.name ?? "Blok"} / Daire ${apartment.number}`
      : "-",
    paymentTitle: batch.title ?? "-",
    dueDate: formatDate(batch.dueDate),
    amount: allocation.amountKurus ?? 0,
    amountText: formatCurrencyFromKurus(allocation.amountKurus),
    description: receipt.note ?? "",
    fileName: fixTurkishFileName(receipt.originalFileName ?? "-"),
    fileType: receipt.mimeType ?? "-",
    fileSizeText: formatFileSize(receipt.sizeBytes),
    status: statusLabels[receipt.status] ?? receipt.status,
    rawStatus: receipt.status,
    createdAt: formatDate(receipt.createdAt),
    reviewedBy: receipt.reviewedByUser?.fullName ?? "-",
    reviewNote: receipt.reviewNote ?? "",
    raw: receipt,
  };
}

function ReceiptsPage() {
  const { user } = useAuth();

  const [receipts, setReceipts] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFormData, setUploadFormData] = useState(emptyUploadFormData);
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [uploadFileError, setUploadFileError] = useState("");
  const [matchResult, setMatchResult] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tümü");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const apartmentOptions = useMemo(() => {
    return apartments.map((apartment) => ({
      id: apartment.id,
      label: getApartmentLabel(apartment),
      residentName:
        apartment.residents?.[0]?.user?.fullName ??
        apartment.apartmentResidents?.[0]?.user?.fullName ??
        "-",
    }));
  }, [apartments]);

  async function loadReceipts() {
    const result = await getPaymentReceipts({
      page: 1,
      limit: 100,
      search: searchTerm.trim(),
    });

    setReceipts(getDataArray(result).map(mapReceiptToViewModel));
  }

  useEffect(() => {
    let isMounted = true;

    async function run() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [receiptResult, apartmentResult] = await Promise.all([
          getPaymentReceipts({ page: 1, limit: 100 }),
          getApartments({ page: 1, limit: 100 }),
        ]);

        if (isMounted) {
          setReceipts(getDataArray(receiptResult).map(mapReceiptToViewModel));
          setApartments(getDataArray(apartmentResult));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error?.message ?? "Dekontlar alınamadı.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      isMounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    return {
      total: receipts.length,
      pending: receipts.filter((item) => item.rawStatus === "PENDING").length,
      approved: receipts.filter((item) => item.rawStatus === "APPROVED").length,
      rejected: receipts.filter((item) => item.rawStatus === "REJECTED").length,
    };
  }, [receipts]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      const searchValue = normalizeText(searchTerm);

      const searchableText = [
        receipt.payerName,
        receipt.payerEmail,
        receipt.apartmentLabel,
        receipt.paymentTitle,
        receipt.amountText,
        receipt.description,
        receipt.status,
        receipt.fileName,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      const matchesSearch = searchableText.includes(searchValue);
      const matchesStatus =
        statusFilter === "Tümü" ? true : receipt.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [receipts, searchTerm, statusFilter]);

  function openUploadForm() {
    setShowUploadForm(true);
    setUploadFormData(emptyUploadFormData);
    setSelectedUploadFile(null);
    setUploadFileError("");
    setMatchResult(null);
    setMessage("");
    setErrorMessage("");
  }

  function closeUploadForm() {
    setShowUploadForm(false);
    setUploadFormData(emptyUploadFormData);
    setSelectedUploadFile(null);
    setUploadFileError("");
    setMatchResult(null);
  }

  function handleUploadInputChange(event) {
    const { name, value } = event.target;

    setUploadFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    setMatchResult(null);
  }

  function handleUploadFileChange(event) {
    const file = event.target.files?.[0];

    setUploadFileError("");
    setSelectedUploadFile(null);
    setMatchResult(null);

    if (!file) {
      setUploadFormData((currentData) => ({
        ...currentData,
        fileName: "",
        fileType: "",
        fileSizeText: "",
      }));
      return;
    }

    if (!allowedReceiptTypes.includes(file.type)) {
      setUploadFileError("Bu dosya türü desteklenmiyor.");
      return;
    }

    if (file.size > maxReceiptSize) {
      setUploadFileError("Dekont dosyası en fazla 10 MB olabilir.");
      return;
    }

    setSelectedUploadFile(file);

    setUploadFormData((currentData) => ({
      ...currentData,
      fileName: fixTurkishFileName(file.name),
      fileType: file.type,
      fileSizeText: formatFileSize(file.size),
    }));
  }

  async function handleConfirmMatch() {
    const paymentAllocationId = matchResult?.apartment?.paymentAllocationId;

    if (!paymentAllocationId) {
      setErrorMessage("Onaylanacak eşleşme bulunamadı.");
      return;
    }

    if (!selectedUploadFile) {
      setUploadFileError("Lütfen geçerli bir dekont dosyası seçiniz.");
      return;
    }

    const isConfirmed = window.confirm(
      "Bu dekontu eşleştirip ödemeyi ödendi olarak işaretlemek istiyor musunuz?"
    );

    if (!isConfirmed) {
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      await managerConfirmPaymentReceipt({
        paymentAllocationId,
        payerName: uploadFormData.payerName.trim() || undefined,
        bankAccount: uploadFormData.bankAccount.trim() || undefined,
        amount: uploadFormData.amount,
        paymentOwnerType: uploadFormData.paymentOwnerType,
        note: uploadFormData.description.trim() || undefined,
        receipt: selectedUploadFile,
        aiResult: matchResult?.ai,
      });

      await loadReceipts();
      closeUploadForm();

      setMessage("Dekont eşleştirildi, onaylandı ve ödeme ödendi olarak işaretlendi.");
    } catch (error) {
      setErrorMessage(error?.message ?? "Dekont eşleştirilip onaylanamadı.");
    } finally {
      setIsSaving(false);
    }
  }
  async function handleAnalyzeUpload(event) {
    event.preventDefault();

    if (!selectedUploadFile) {
      setUploadFileError("Lütfen geçerli bir dekont dosyası seçiniz.");
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      const result = await analyzeManagerPaymentReceipt({
        payerName: uploadFormData.payerName.trim() || undefined,
        bankAccount: uploadFormData.bankAccount.trim() || undefined,
        amount: uploadFormData.amount,
        paymentOwnerType: uploadFormData.paymentOwnerType,
        manualApartmentId: uploadFormData.manualApartmentId || undefined,
        description: uploadFormData.description.trim() || undefined,
        receipt: selectedUploadFile,
      });

      setMatchResult(result?.data ?? result);
    } catch (error) {
      setErrorMessage(error?.message ?? "Dekont ön analizi yapılamadı.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleApprove(receiptId) {
    const reviewNote = window.prompt(
      "Onay notu yazabilirsiniz. Boş bırakabilirsiniz."
    );

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      await approvePaymentReceipt(receiptId, {
        reviewNote: reviewNote || undefined,
      });

      await loadReceipts();

      setMessage("Dekont onaylandı ve ödeme ödenmiş olarak işaretlendi.");
    } catch (error) {
      setErrorMessage(error?.message ?? "Dekont onaylanamadı.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReject(receiptId) {
    const reviewNote = window.prompt(
      "Red sebebini yazın. Boş bırakabilirsiniz."
    );

    const isConfirmed = window.confirm("Bu dekontu reddetmek istiyor musunuz?");

    if (!isConfirmed) {
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      await rejectPaymentReceipt(receiptId, {
        reviewNote: reviewNote || undefined,
      });

      await loadReceipts();

      setMessage("Dekont reddedildi.");
    } catch (error) {
      setErrorMessage(error?.message ?? "Dekont reddedilemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleDownload(receiptId) {
    window.open(getPaymentReceiptDownloadUrl(receiptId), "_blank", "noopener,noreferrer");
  }

  return (
    <DashboardLayout
      roleTitle="Dekontlar"
      roleBadge="Yönetici"
      userName={user?.fullName ?? "Yönetici"}
      navItems={navItems}
      theme="manager"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Dekont Yönetimi</span>

          <h2>Dekontlar</h2>

          <p>
            Yetki alanınızdaki ödeme dekontlarını görüntüleyebilir, uygun
            dekontları onaylayabilir veya reddedebilirsiniz.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-action-button"
          onClick={openUploadForm}
          disabled={isSaving}
        >
          <Plus size={18} />
          Dekont Ekle
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

      {showUploadForm && (
        <ReceiptUploadForm
          formData={uploadFormData}
          apartmentOptions={apartmentOptions}
          fileError={uploadFileError}
          matchResult={matchResult}
          onInputChange={handleUploadInputChange}
          onFileChange={handleUploadFileChange}
          onSubmit={handleAnalyzeUpload}
          onCancel={closeUploadForm}
          onConfirmMatch={handleConfirmMatch}
          isSaving={isSaving}
        />
      )}

      <section className="dashboard-summary-grid">
        <div className="summary-card">
          <span>Toplam Dekont</span>
          <strong>{summary.total}</strong>
        </div>

        <div className="summary-card">
          <span>Onay Bekleyen</span>
          <strong>{summary.pending}</strong>
        </div>

        <div className="summary-card">
          <span>Onaylanan</span>
          <strong>{summary.approved}</strong>
        </div>

        <div className="summary-card">
          <span>Reddedilen</span>
          <strong>{summary.rejected}</strong>
        </div>
      </section>

      <ReceiptToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {isLoading ? (
        <div className="dashboard-panel">
          <p>Dekontlar yükleniyor...</p>
        </div>
      ) : (
        <ReceiptTable
          receipts={filteredReceipts}
          onView={setSelectedReceipt}
          onApprove={handleApprove}
          onReject={handleReject}
          onDownload={handleDownload}
          isSaving={isSaving}
        />
      )}

      <ReceiptDetailsModal
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />
    </DashboardLayout>
  );
}

export default ReceiptsPage;






