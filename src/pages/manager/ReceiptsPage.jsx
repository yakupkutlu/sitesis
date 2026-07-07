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

import ReceiptToolbar from "../../components/receipts/ReceiptToolbar";
import ReceiptTable from "../../components/receipts/ReceiptTable";
import ReceiptDetailsModal from "../../components/receipts/ReceiptDetailsModal";
import {
  approvePaymentReceipt,
  getPaymentReceiptDownloadUrl,
  getPaymentReceipts,
  rejectPaymentReceipt,
} from "../../api/paymentReceiptsApi";
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

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.receipts)) return data.receipts;
  if (Array.isArray(data?.paymentReceipts)) return data.paymentReceipts;

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
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tümü");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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

    async function loadInitialData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const result = await getPaymentReceipts({
          page: 1,
          limit: 100,
        });

        if (isMounted) {
          setReceipts(getDataArray(result).map(mapReceiptToViewModel));
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

    loadInitialData();

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


