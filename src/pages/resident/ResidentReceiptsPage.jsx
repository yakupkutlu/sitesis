import { useAuth } from "../../hooks/useAuth";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { residentNavItems } from "../../config/residentNavigation";
import ResidentReceiptSummaryCards from "../../components/resident-receipts/ResidentReceiptSummaryCards";
import ResidentReceiptUploadForm from "../../components/resident-receipts/ResidentReceiptUploadForm";
import ResidentReceiptCards from "../../components/resident-receipts/ResidentReceiptCards";

import { getMyPaymentAllocations } from "../../api/paymentBatchesApi";
import { uploadPaymentReceipt } from "../../api/paymentReceiptsApi";


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

function getAutomaticPaymentsArray(result, allocations = []) {
  const data = result?.data ?? result;

  const directItems = Array.isArray(data?.automaticPayments)
    ? data.automaticPayments
    : Array.isArray(result?.automaticPayments)
      ? result.automaticPayments
      : [];

  const nestedItems = allocations.flatMap((allocation) => {
    const items = Array.isArray(allocation?.automaticPayments)
      ? allocation.automaticPayments
      : [];

    return items.map((payment) => ({
      ...payment,
      paymentAllocation: payment.paymentAllocation ?? allocation,
    }));
  });

  const uniquePayments = new Map();

  [...directItems, ...nestedItems].forEach((payment, index) => {
    const allocationId =
      payment?.paymentAllocation?.id ??
      payment?.paymentAllocationId ??
      "allocation";

    const uniqueKey =
      payment?.id ??
      `${allocationId}-${payment?.createdAt ?? "date"}-${payment?.amountKurus ?? index}`;

    if (!uniquePayments.has(uniqueKey)) {
      uniquePayments.set(uniqueKey, payment);
    }
  });

  return Array.from(uniquePayments.values());
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

  /*
   * Çift kodlanmış adları da düzeltmek için dönüşüm en fazla üç kez
   * uygulanır. Örnek:
   * "Ä°ÅŸlem" → "İşlem"
   * "Ã„Â°Ã…Å¸lem" → "Ä°ÅŸlem" → "İşlem"
   */
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

function getReceiptStatusText(status) {
  if (status === "APPROVED") return "Onaylandı";
  if (status === "REJECTED") return "Reddedildi";
  return "Dekont Onayı Bekliyor";
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

function getPaidAmountKurus(allocation) {
  return Math.max(0, Number(allocation?.paidAmountKurus) || 0);
}

function getRemainingAmountKurus(allocation) {
  const totalAmountKurus = Math.max(0, Number(allocation?.amountKurus) || 0);
  const paidAmountKurus = getPaidAmountKurus(allocation);

  return Math.max(totalAmountKurus - paidAmountKurus, 0);
}

function hasPendingReceipt(allocation) {
  const receipts = Array.isArray(allocation?.receipts)
    ? allocation.receipts
    : [];

  return receipts.some((receipt) => receipt.status === "PENDING");
}


function canUploadReceiptForAllocation(allocation) {
  return (
    allocation?.status !== "PAID" &&
    allocation?.status !== "CANCELLED" &&
    getRemainingAmountKurus(allocation) > 0 &&
    !hasPendingReceipt(allocation)
  );
}

function mapAllocationToPaymentOption(allocation) {
  return {
    id: allocation.id,
    title: getPaymentTitle(allocation),
    remainingAmount: formatCurrencyFromKurus(
      getRemainingAmountKurus(allocation)
    ),
  };
}

function getReceiptAmountKurus(receipt, allocation) {
  const savedReceiptAmount = Number(receipt?.paymentAmountKurus);

  if (Number.isFinite(savedReceiptAmount) && savedReceiptAmount > 0) {
    return savedReceiptAmount;
  }

  return getRemainingAmountKurus(allocation) || Number(allocation?.amountKurus) || 0;
}

function getReceiptReviewText(receipt) {
  if (receipt.status === "PENDING") {
    return "Yönetici onayı bekleniyor";
  }

  if (receipt.reviewNote?.trim()) {
    return receipt.reviewNote.trim();
  }

  if (receipt.status === "APPROVED") {
    return "Yönetici tarafından onaylandı";
  }

  if (receipt.status === "REJECTED") {
    return "Yönetici tarafından reddedildi";
  }

  return "-";
}

function mapReceiptToViewModel(receipt, allocation) {
  return {
    id: receipt.id,
    isAutomaticPayment: false,
    paymentTitle: getPaymentTitle(allocation),
    amount: formatCurrencyFromKurus(
      getReceiptAmountKurus(receipt, allocation)
    ),
    description: receipt.note || "Sakin tarafından ödeme dekontu yüklendi.",
    fileName: fixTurkishFileName(receipt.originalFileName || "-"),
    fileSize: formatFileSize(receipt.sizeBytes),
    status: getReceiptStatusText(receipt.status),
    apartment: getApartmentText(allocation),
    uploadedAt: formatDate(receipt.createdAt),
    reviewNote: getReceiptReviewText(receipt),
    raw: receipt,
  };
}

function mapAutomaticPaymentToViewModel(payment) {
  const allocation = payment?.paymentAllocation ?? {};
  const automaticPaymentId =
    payment?.id ??
    `${allocation?.id ?? "allocation"}-${payment?.createdAt ?? "date"}`;

  return {
    id: `automatic-${automaticPaymentId}`,
    isAutomaticPayment: true,
    paymentTitle: getPaymentTitle(allocation),
    amount: formatCurrencyFromKurus(payment?.amountKurus ?? 0),
    description:
      payment?.description ||
      "Fazla bakiye bu borca sistem tarafından otomatik olarak kullanıldı.",
    fileName: "Otomatik Ödeme",
    fileSize: "-",
    status: "Otomatik Ödeme",
    apartment: getApartmentText(allocation),
    uploadedAt: formatDate(payment?.createdAt),
    reviewNote: "Sistem tarafından otomatik ödendi",
    raw: payment,
  };
}

function ResidentReceiptsPage() {
  const { user, selectedApartmentId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const requestedPaymentAllocationIdRef = useRef(
    location.state?.paymentAllocationId ?? "",
  );

  const [allocations, setAllocations] = useState([]);
  const [automaticPayments, setAutomaticPayments] = useState([]);
  const [formData, setFormData] = useState(emptyFormData);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    const result = await getMyPaymentAllocations();
    const nextAllocations = getDataArray(result);

    setAllocations(nextAllocations);
    setAutomaticPayments(
      getAutomaticPaymentsArray(result, nextAllocations),
    );
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setMessage("");
        setAllocations([]);
        setAutomaticPayments([]);
        setSelectedFile(null);
        setFileError("");

        const result = await getMyPaymentAllocations();

        if (isMounted) {
          const nextAllocations = getDataArray(result);
          const requestedAllocation = nextAllocations.find(
            (allocation) =>
              allocation.id === requestedPaymentAllocationIdRef.current &&
              canUploadReceiptForAllocation(allocation),
          );

          setAllocations(nextAllocations);
          setAutomaticPayments(
            getAutomaticPaymentsArray(result, nextAllocations),
          );
          setFormData({
            ...emptyFormData,
            paymentAllocationId: requestedAllocation?.id ?? "",
          });

          if (requestedPaymentAllocationIdRef.current) {
            navigate(location.pathname, {
              replace: true,
              state: null,
            });
          }
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
  }, [
    location.pathname,
    navigate,
    selectedApartmentId,
  ]);

  const paymentOptions = useMemo(() => {
    return allocations
      .filter(canUploadReceiptForAllocation)
      .map(mapAllocationToPaymentOption);
  }, [allocations]);

  const pendingReceiptCount = useMemo(() => {
    return allocations.filter(hasPendingReceipt).length;
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

  const receiptHistoryItems = useMemo(() => {
    const automaticPaymentCards = automaticPayments.map(
      mapAutomaticPaymentToViewModel,
    );

    return [...receipts, ...automaticPaymentCards].sort((left, right) => {
      const leftDate = new Date(left.raw?.createdAt ?? 0).getTime();
      const rightDate = new Date(right.raw?.createdAt ?? 0).getTime();

      return rightDate - leftDate;
    });
  }, [receipts, automaticPayments]);

  const summary = useMemo(() => {
    return {
      total: receipts.length,
      waiting: receipts.filter((receipt) => receipt.status === "Dekont Onayı Bekliyor")
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
      name: fixTurkishFileName(file.name),
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
      setMessage("Dekont başarıyla gönderildi. Yönetici onayı bekleniyor.");
    } catch (error) {
      const autoRejectReason =
        error?.details?.data?.autoRejectReason ??
        error?.details?.data?.data?.autoRejectReason;

      if (
        autoRejectReason === "DUPLICATE_FILE" ||
        autoRejectReason === "DUPLICATE_TRANSACTION"
      ) {
        await loadData();

        setFormData(emptyFormData);
        setSelectedFile(null);
        setFileError("");
        setErrorMessage("");
        setMessage(
          "Dekont kontrol sonucu Duyurular / Uyarılar bölümüne eklendi.",
        );
        return;
      }

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
      navItems={residentNavItems}
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
          {paymentOptions.length > 0 ? (
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
          ) : (
            <section className="resident-receipt-form-card">
              <div className="resident-receipt-form-header">
                <div>
                  <span className="section-kicker">
                    {pendingReceiptCount > 0
                      ? "Dekont Onayı Bekliyor"
                      : "Dekont Yükleme"}
                  </span>

                  <h3>
                    {pendingReceiptCount > 0
                      ? "Yeni Dekont Yüklenemez"
                      : "Bekleyen Ödeme Bulunmuyor"}
                  </h3>

                  <p>
                    {pendingReceiptCount > 0
                      ? "Bu ödeme için yüklediğiniz dekont yönetici onayı bekliyor. Yönetici dekontu onaylayana veya reddedene kadar aynı ödeme için tekrar dekont yükleyemezsiniz."
                      : "Dekont yükleyebileceğiniz kalan borç bulunmuyor."}
                  </p>
                </div>
              </div>
            </section>
          )}

          <div className="resident-section-heading">
            <span className="section-kicker">Geçmiş</span>
            <h3>Yüklenen Dekontlar</h3>
          </div>

          <ResidentReceiptCards receipts={receiptHistoryItems} />
        </>
      )}

    </DashboardLayout>
  );
}

export default ResidentReceiptsPage;