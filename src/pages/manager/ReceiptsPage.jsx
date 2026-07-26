import { managerNavItems } from "../../config/managerNavigation";
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Plus,
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
  retryPaymentReceiptAi,
} from "../../api/paymentReceiptsApi";
import { getApartments } from "../../api/apartmentsApi";
import { useAuth } from "../../hooks/useAuth";

const statusLabels = {
  PENDING: "Onay Bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
};

const aiStatusLabels = {
  NOT_CHECKED: "Kontrol edilmedi",
  PROCESSING: "AI kontrol ediyor",
  MATCHED: "AI kontrolü uyumlu",
  REVIEW_REQUIRED: "Manuel kontrol gerekli",
  FAILED: "AI kontrolü tamamlanamadı",
  OVERPAYMENT: "Fazla Ödeme Tespit Edildi",
  PARTIAL_PAYMENT: "Kısmi Ödeme Tespit Edildi",
  AUTO_REJECTED: "Otomatik Reddedildi",
};

const emptyUploadFormData = {
  payerName: "",
  bankAccount: "",
  amount: "",
  paymentOwnerType: "Kiracı Ödemesi",
  manualApartmentId: "",
  manualResidentUserId: "",
  manualVerified: false,
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
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .trim();
}

function parsePaymentAmount(value) {
  const normalizedValue = String(value ?? "")
    .trim()
    .replace(/\s|TL/gi, "");

  if (!normalizedValue) {
    return null;
  }

  const decimalValue = normalizedValue.includes(",")
    ? normalizedValue.replaceAll(".", "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(normalizedValue)
      ? normalizedValue.replaceAll(".", "")
      : normalizedValue;
  const amount = Number(decimalValue);

  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function decodeMojibakeUtf8(value) {
  const text = String(value ?? "");

  if (!/[ÃÄÅÂ]/.test(text)) {
    return text;
  }

  try {
    const bytes = Uint8Array.from(
      text,
      (character) => character.charCodeAt(0) & 0xff,
    );

    return new TextDecoder("utf-8", {
      fatal: true,
    }).decode(bytes);
  } catch {
    return text;
  }
}

function fixTurkishFileName(value) {
  let fixedValue = String(value ?? "");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const decodedValue = decodeMojibakeUtf8(fixedValue);

    if (decodedValue === fixedValue) {
      break;
    }

    fixedValue = decodedValue;
  }

  return fixedValue
    .replaceAll("Ý", "İ")
    .replaceAll("ý", "ı")
    .replaceAll("Þ", "Ş")
    .replaceAll("þ", "ş")
    .replaceAll("Ð", "Ğ")
    .replaceAll("ð", "ğ")
    .normalize("NFC");
}

function getApartmentLabel(apartment) {
  return `${apartment.block?.site?.name ?? "Site"} / ${
    apartment.block?.name ?? "Blok"
  } / Daire ${apartment.number}`;
}

function getAutomaticPaymentsArray(result) {
  const directItems = result?.automaticPayments;
  const nestedItems = result?.data?.automaticPayments;

  if (Array.isArray(directItems)) return directItems;
  if (Array.isArray(nestedItems)) return nestedItems;

  return [];
}

function mapAutomaticPaymentToViewModel(payment) {
  const allocation = payment.paymentAllocation ?? {};
  const apartment = allocation.apartment ?? {};
  const block = apartment.block ?? {};
  const site = block.site ?? {};
  const batch = allocation.paymentBatch ?? {};
  const paymentStatus = payment.paymentStatusAfter;

  return {
    id: `automatic-${payment.id}`,
    automaticPaymentId: payment.id,
    isAutomaticPayment: true,
    payerName: "Sistem",
    payerEmail: "Fazla bakiye otomatik işlemi",
    apartmentLabel: apartment.number
      ? `${site.name ?? "Site"} / ${block.name ?? "Blok"} / Daire ${apartment.number}`
      : "-",
    paymentTitle: batch.title ?? "-",
    dueDate: formatDate(batch.dueDate),
    amount: payment.amountKurus ?? 0,
    amountText: formatCurrencyFromKurus(payment.amountKurus ?? 0),
    debtAmount: allocation.amountKurus ?? 0,
    paidAmount: allocation.paidAmountKurus ?? 0,
    remainingDebtAfterKurus: payment.remainingDebtAfterKurus ?? 0,
    remainingDebtAfterText: formatCurrencyFromKurus(
      payment.remainingDebtAfterKurus ?? 0,
    ),
    balanceAfterKurus: payment.balanceAfterKurus ?? 0,
    balanceAfterText: formatCurrencyFromKurus(
      payment.balanceAfterKurus ?? 0,
    ),
    description:
      payment.description ||
      "Fazla bakiye bu borca sistem tarafından otomatik olarak kullanıldı.",
    fileName: "Dosya Yok",
    fileType: "Otomatik İşlem",
    fileSizeText: "-",
    status: paymentStatus === "PAID" ? "Tam Ödendi" : "Kısmi Ödendi",
    rawStatus: "AUTOMATIC_PAYMENT",
    createdAt: formatDate(payment.createdAt),
    reviewedBy: "Sistem",
    reviewNote:
      paymentStatus === "PAID"
        ? "Borç fazla bakiyeden tamamen ödendi."
        : `Borç fazla bakiyeden kısmi ödendi. Kalan borç: ${formatCurrencyFromKurus(
            payment.remainingDebtAfterKurus ?? 0,
          )}.`,
    aiStatus: "AUTOMATIC_PAYMENT",
    aiStatusLabel: "Otomatik Ödeme",
    raw: payment,
  };
}

function mergeReceiptRows(result) {
  const receiptRows = getDataArray(result).map(mapReceiptToViewModel);
  const automaticRows = getAutomaticPaymentsArray(result).map(
    mapAutomaticPaymentToViewModel,
  );

  return [...receiptRows, ...automaticRows].sort((left, right) => {
    const leftDate = new Date(left.raw?.createdAt ?? 0).getTime();
    const rightDate = new Date(right.raw?.createdAt ?? 0).getTime();

    return rightDate - leftDate;
  });
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
    amount:
      receipt.paymentAmountKurus ??
      receipt.aiAmountKurus ??
      Math.max(
        Number(allocation.amountKurus ?? 0) -
          Number(allocation.paidAmountKurus ?? 0),
        0,
      ),
    amountText: formatCurrencyFromKurus(
      receipt.paymentAmountKurus ??
        receipt.aiAmountKurus ??
        Math.max(
          Number(allocation.amountKurus ?? 0) -
            Number(allocation.paidAmountKurus ?? 0),
          0,
        ),
    ),
    debtAmount: allocation.amountKurus ?? 0,
    paidAmount: allocation.paidAmountKurus ?? 0,
    description: receipt.note ?? "",
    fileName: fixTurkishFileName(receipt.originalFileName ?? "-"),
    fileType: receipt.mimeType ?? "-",
    fileSizeText: formatFileSize(receipt.sizeBytes),
    status: statusLabels[receipt.status] ?? receipt.status,
    rawStatus: receipt.status,
    createdAt: formatDate(receipt.createdAt),
    reviewedBy: receipt.reviewedByUser?.fullName ?? "-",
    reviewNote: receipt.reviewNote ?? "",
    aiStatus: receipt.aiStatus ?? "NOT_CHECKED",
    aiStatusLabel:
      aiStatusLabels[receipt.aiStatus] ??
      receipt.aiStatus ??
      aiStatusLabels.NOT_CHECKED,
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
    return apartments.map((apartment) => {
      const residents = Array.isArray(apartment.residents)
        ? apartment.residents.map((resident) => ({
            relationId: resident.id,
            userId: resident.user?.id ?? resident.userId,
            fullName: resident.user?.fullName ?? "-",
            email: resident.user?.email ?? "-",
            type: resident.type,
          }))
        : [];

      return {
        id: apartment.id,
        label: getApartmentLabel(apartment),
        residents,
      };
    });
  }, [apartments]);

  async function loadReceipts() {
    const result = await getPaymentReceipts({
      page: 1,
      limit: 100,
      search: searchTerm.trim(),
    });

    const mappedReceipts = mergeReceiptRows(result);

    setReceipts(mappedReceipts);
    setSelectedReceipt((currentReceipt) => {
      if (!currentReceipt) {
        return currentReceipt;
      }

      return (
        mappedReceipts.find(
          (receipt) => receipt.id === currentReceipt.id,
        ) ?? currentReceipt
      );
    });

    return mappedReceipts;
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
          setReceipts(mergeReceiptRows(receiptResult));
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

  const hasProcessingAi = useMemo(
    () => receipts.some((receipt) => receipt.aiStatus === "PROCESSING"),
    [receipts],
  );

  useEffect(() => {
    if (!hasProcessingAi) {
      return undefined;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const result = await getPaymentReceipts({
          page: 1,
          limit: 100,
        });

        const mappedReceipts = mergeReceiptRows(result);

        setReceipts(mappedReceipts);
        setSelectedReceipt((currentReceipt) => {
          if (!currentReceipt) {
            return currentReceipt;
          }

          return (
            mappedReceipts.find(
              (receipt) => receipt.id === currentReceipt.id,
            ) ?? currentReceipt
          );
        });
      } catch (error) {
        console.error("AI dekont durumları yenilenemedi:", error);
      }
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasProcessingAi]);

  const summary = useMemo(() => {
    const realReceipts = receipts.filter(
      (item) => !item.isAutomaticPayment,
    );

    return {
      total: realReceipts.length,
      pending: realReceipts.filter((item) => item.rawStatus === "PENDING").length,
      approved: realReceipts.filter((item) => item.rawStatus === "APPROVED").length,
      rejected: realReceipts.filter((item) => item.rawStatus === "REJECTED").length,
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
        receipt.aiStatusLabel,
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
    const { name, value, type, checked } = event.target;

    const normalizedValue =
      name === "bankAccount"
        ? value.replace(/\D/g, "").slice(0, 24)
        : type === "checkbox"
          ? checked
          : value;

    setUploadFormData((currentData) => {
      const nextData = {
        ...currentData,
        [name]: normalizedValue,
      };

      if (name === "manualApartmentId") {
        nextData.manualResidentUserId = "";
        nextData.manualVerified = false;
      }

      if (name === "manualResidentUserId") {
        const apartment = apartmentOptions.find(
          (item) => item.id === currentData.manualApartmentId,
        );
        const resident = apartment?.residents?.find(
          (item) => item.userId === value,
        );

        if (resident?.type === "OWNER") {
          nextData.paymentOwnerType = "Ev Sahibi Ödemesi";
        } else if (resident?.type === "TENANT") {
          nextData.paymentOwnerType = "Kiracı Ödemesi";
        }

        nextData.manualVerified = false;
      }

      return nextData;
    });

    setMatchResult(null);
  }

  function validateManagerReceiptForm() {
    if (
      uploadFormData.bankAccount &&
      !/^\d{24}$/.test(uploadFormData.bankAccount)
    ) {
      setErrorMessage(
        "IBAN için TR kodundan sonra tam olarak 24 rakam giriniz.",
      );
      return false;
    }

    if (uploadFormData.manualApartmentId) {
      if (!uploadFormData.manualResidentUserId) {
        setErrorMessage("Manuel eşleştirme için kayıtlı sakin seçiniz.");
        return false;
      }

      if (!uploadFormData.amount || Number(uploadFormData.amount) <= 0) {
        setErrorMessage("Manuel eşleştirme için geçerli tutar giriniz.");
        return false;
      }

      if (!uploadFormData.manualVerified) {
        setErrorMessage(
          "Dosyayı ve manuel bilgileri kontrol ettiğinizi onaylayınız.",
        );
        return false;
      }
    }

    return true;
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

    if (!validateManagerReceiptForm()) {
      return;
    }

    const isConfirmed = window.confirm(
      "Bu dekontu eşleştirip ödemeyi ödendi olarak işaretlemek istiyor musunuz?",
    );

    if (!isConfirmed) {
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      const confirmResult = await managerConfirmPaymentReceipt({
        paymentAllocationId,
        payerName: uploadFormData.payerName.trim() || undefined,
        bankAccount: uploadFormData.bankAccount
          ? `TR${uploadFormData.bankAccount}`
          : undefined,
        amount: uploadFormData.amount || matchResult?.ai?.amount || undefined,
        paymentOwnerType: uploadFormData.paymentOwnerType,
        manualApartmentId: uploadFormData.manualApartmentId || undefined,
        manualResidentUserId: uploadFormData.manualResidentUserId || undefined,
        manualVerified: Boolean(uploadFormData.manualVerified),
        note: uploadFormData.description.trim() || undefined,
        receipt: selectedUploadFile,
        aiResult: matchResult?.ai,
      });

      await loadReceipts();
      closeUploadForm();

      setMessage(
        confirmResult?.message ??
          "Dekont eşleştirildi ve ödeme tutarı kaydedildi.",
      );
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

    if (!validateManagerReceiptForm()) {
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      const result = await analyzeManagerPaymentReceipt({
        payerName: uploadFormData.payerName.trim() || undefined,
        bankAccount: uploadFormData.bankAccount
          ? `TR${uploadFormData.bankAccount}`
          : undefined,
        amount: uploadFormData.amount,
        paymentOwnerType: uploadFormData.paymentOwnerType,
        manualApartmentId: uploadFormData.manualApartmentId || undefined,
        manualResidentUserId: uploadFormData.manualResidentUserId || undefined,
        manualVerified: Boolean(uploadFormData.manualVerified),
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
    const targetReceipt = receipts.find((receipt) => receipt.id === receiptId);
    const defaultAmount = Number(targetReceipt?.amount ?? 0) / 100;
    const amountInput = window.prompt(
      "Dekontta gerçekten ödenen tutarı giriniz.",
      defaultAmount > 0 ? String(defaultAmount).replace(".", ",") : "",
    );

    if (amountInput === null) {
      return;
    }

    const amount = parsePaymentAmount(amountInput);

    if (!amount) {
      setErrorMessage("Geçerli ve sıfırdan büyük bir ödeme tutarı giriniz.");
      return;
    }

    const reviewNote = window.prompt(
      "Onay notu yazabilirsiniz. Boş bırakabilirsiniz.",
    );

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      const approveResult = await approvePaymentReceipt(receiptId, {
        reviewNote: reviewNote || undefined,
        amount,
      });

      await loadReceipts();

      setMessage(
        approveResult?.message ??
          "Dekont onaylandı ve ödeme tutarı kaydedildi.",
      );
    } catch (error) {
      setErrorMessage(error?.message ?? "Dekont onaylanamadı.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReject(receiptId) {
    const reviewNote = window.prompt(
      "Red sebebini yazın. Boş bırakabilirsiniz.",
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

  async function handleRetryAi(receiptId) {
    const isConfirmed = window.confirm(
      "Bu dekontu AI ile tekrar kontrol etmek istiyor musunuz?",
    );

    if (!isConfirmed) {
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      await retryPaymentReceiptAi(receiptId);

      const refreshedReceipts = await loadReceipts();
      const refreshedReceipt = refreshedReceipts.find(
        (receipt) => receipt.id === receiptId,
      );

      if (refreshedReceipt) {
        setSelectedReceipt(refreshedReceipt);
      }

      setMessage(
        "Dekont AI ile tekrar kontrol edilmeye başlandı. Sonuç arka planda güncellenecek.",
      );
    } catch (error) {
      setErrorMessage(
        error?.message ?? "Dekont AI ile tekrar kontrol edilemedi.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleDownload(receiptId) {
    window.open(
      getPaymentReceiptDownloadUrl(receiptId),
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <DashboardLayout
      roleTitle="Dekontlar"
      roleBadge="Yönetici"
      userName={user?.fullName ?? "Yönetici"}
      navItems={managerNavItems}
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
          selectedFile={selectedUploadFile}
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
        onRetryAi={handleRetryAi}
        isRetryingAi={isSaving}
      />
    </DashboardLayout>
  );
}

export default ReceiptsPage;