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

import ResidentReceiptSummaryCards from "../../components/resident-receipts/ResidentReceiptSummaryCards";
import ResidentReceiptUploadForm from "../../components/resident-receipts/ResidentReceiptUploadForm";
import ResidentReceiptCards from "../../components/resident-receipts/ResidentReceiptCards";

import { getMyPaymentAllocations } from "../../api/paymentBatchesApi";
import { uploadPaymentReceipt } from "../../api/paymentReceiptsApi";


const navItems = [
  { label: "Panel", path: "/resident/dashboard", icon: Home },
  { label: "Aidat ve Ödemeler", path: "/resident/payments", icon: CreditCard },
  { label: "Dekont Yükle", path: "/resident/receipts", icon: UploadCloud },
  { label: "Duyurular", path: "/resident/announcements", icon: Bell },
  { label: "Talepler", path: "/resident/requests", icon: MessageSquareText },
  { label: "Ayarlar", path: "/resident/settings", icon: Settings },
];

const allowedReceiptTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const maxReceiptSize = 10 * 1024 * 1024;

const emptyFormData = {
  paymentAllocationId: "",
  note: "",
};

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.allocations)) return data.allocations;
  if (Array.isArray(data?.paymentAllocations)) return data.paymentAllocations;

  return [];
}

function formatCurrencyFromKurus(value) {
  return `${((Number(value) || 0) / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} TL`;
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
  if (!size) return "-";

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getReceiptStatusText(status) {
  if (status === "APPROVED") return "Onaylandı";
  if (status === "REJECTED") return "Reddedildi";
  return "Onay Bekliyor";
}

function getApartmentText(allocation) {
  const apartment = allocation.apartment ?? {};
  const block = apartment.block ?? {};
  const site = block.site ?? {};

  return `${site.name ?? "Site"} / ${block.name ?? "Blok"} / Daire ${
    apartment.number ?? "-"
  }`;
}

function getPaymentTitle(allocation) {
  return allocation.paymentBatch?.title ?? "Ödeme";
}

function mapAllocationToPaymentOption(allocation) {
  return {
    id: allocation.id,
    title: getPaymentTitle(allocation),
    remainingAmount: formatCurrencyFromKurus(allocation.amountKurus),
  };
}

function mapReceiptToViewModel(receipt, allocation) {
  return {
    id: receipt.id,
    paymentTitle: getPaymentTitle(allocation),
    amount: formatCurrencyFromKurus(allocation.amountKurus),
    description: receipt.note || "Sakin tarafından ödeme dekontu yüklendi.",
    fileName: receipt.originalFileName || "-",
    fileSize: formatFileSize(receipt.sizeBytes),
    status: getReceiptStatusText(receipt.status),
    apartment: getApartmentText(allocation),
    uploadedAt: formatDate(receipt.createdAt),
    reviewNote: receipt.reviewNote || "Kontrol bekliyor",
    raw: receipt,
  };
}

function ResidentReceiptsPage() {
  const { user } = useAuth();

  const [allocations, setAllocations] = useState([]);
  const [formData, setFormData] = useState(emptyFormData);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    const result = await getMyPaymentAllocations();
    setAllocations(getDataArray(result));
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const result = await getMyPaymentAllocations();

        if (isMounted) {
          setAllocations(getDataArray(result));
        }
      } catch {
        if (isMounted) {
          setErrorMessage("Dekont ve ödeme kayıtları alınamadı.");
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

  const paymentOptions = useMemo(() => {
    return allocations
      .filter((allocation) => allocation.status !== "PAID")
      .filter((allocation) => allocation.status !== "CANCELLED")
      .filter((allocation) => {
        const receipts = Array.isArray(allocation.receipts)
          ? allocation.receipts
          : [];

        return !receipts.some((receipt) => receipt.status === "PENDING");
      })
      .map(mapAllocationToPaymentOption);
  }, [allocations]);

  const receipts = useMemo(() => {
    return allocations.flatMap((allocation) => {
      const allocationReceipts = Array.isArray(allocation.receipts)
        ? allocation.receipts
        : [];

      return allocationReceipts.map((receipt) =>
        mapReceiptToViewModel(receipt, allocation)
      );
    });
  }, [allocations]);

  const summary = useMemo(() => {
    return {
      total: receipts.length,
      waiting: receipts.filter((receipt) => receipt.status === "Onay Bekliyor")
        .length,
      approved: receipts.filter((receipt) => receipt.status === "Onaylandı")
        .length,
      rejected: receipts.filter((receipt) => receipt.status === "Reddedildi")
        .length,
    };
  }, [receipts]);

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

    if (!allowedReceiptTypes.includes(file.type)) {
      setFileError("Bu dosya türü desteklenmiyor.");
      return;
    }

    if (file.size > maxReceiptSize) {
      setFileError("Dekont dosyası en fazla 10 MB olabilir.");
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

    if (!formData.paymentAllocationId) {
      setErrorMessage("Lütfen ilgili ödemeyi seçiniz.");
      return;
    }

    if (!selectedFile?.file) {
      setFileError("Lütfen geçerli bir dekont dosyası seçiniz.");
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      await uploadPaymentReceipt({
        paymentAllocationId: formData.paymentAllocationId,
        note: formData.note.trim() || undefined,
        receipt: selectedFile.file,
      });

      await loadData();

      setFormData(emptyFormData);
      setSelectedFile(null);
      setFileError("");
      setMessage("Dekont başarıyla gönderildi ve onay bekliyor.");
    } catch (error) {
      setErrorMessage(error?.message ?? "Dekont gönderilemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DashboardLayout
      roleTitle="Dekont Yükle"
      roleBadge="Sakin"
      userName={user?.fullName ?? "Sakin"}
      navItems={navItems}
      theme="resident"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Dekont Yönetimi</span>

          <h2>Dekont Yükle</h2>

          <p>
            Banka ödemelerine ait dekontlarınızı buradan yönetime
            gönderebilirsiniz.
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

      <ResidentReceiptSummaryCards summary={summary} />

      {isLoading ? (
        <div className="dashboard-panel">
          <p>Dekont kayıtları yükleniyor...</p>
        </div>
      ) : (
        <>
          <ResidentReceiptUploadForm
            formData={formData}
            paymentOptions={paymentOptions}
            selectedFile={selectedFile}
            fileError={fileError}
            onInputChange={handleInputChange}
            onFileChange={handleFileChange}
            onSubmit={handleSubmit}
            isSaving={isSaving}
          />

          <div className="resident-section-heading">
            <span className="section-kicker">Geçmiş</span>
            <h3>Yüklenen Dekontlar</h3>
          </div>

          <ResidentReceiptCards receipts={receipts} />
        </>
      )}

    </DashboardLayout>
  );
}

export default ResidentReceiptsPage;

