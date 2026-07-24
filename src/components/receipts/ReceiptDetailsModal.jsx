import { useEffect, useState } from "react";
import {
  Download,
  ExternalLink,
  FileSearch,
  LoaderCircle,
  RefreshCw,
  X,
} from "lucide-react";

import { downloadPaymentReceiptFile } from "../../api/paymentReceiptsApi";


function formatAiAmount(amountKurus) {
  if (amountKurus === null || amountKurus === undefined) {
    return "-";
  }

  return `${(Number(amountKurus) / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} TL`;
}

function formatAiConfidence(confidence) {
  if (confidence === null || confidence === undefined) {
    return "-";
  }

  return `%${Math.round(Number(confidence) * 100)}`;
}

const aiStatusLabels = {
  NOT_CHECKED: "Kontrol edilmedi",
  PROCESSING: "AI kontrol ediyor",
  MATCHED: "AI kontrolü uyumlu",
  REVIEW_REQUIRED: "Manuel kontrol gerekli",
  FAILED: "AI kontrolü tamamlanamadı",
};

function formatMatchResult(value) {
  if (value === true) {
    return "Eşleşiyor";
  }

  if (value === false) {
    return "Eşleşmiyor";
  }

  return "Kontrol edilemedi";
}

function maskIban(value) {
  if (!value) {
    return "-";
  }

  const normalized = String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (normalized.length <= 8) {
    return normalized;
  }

  return `${normalized.slice(0, 4)} **** **** **** **** **${normalized.slice(-4)}`;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  try {
    return new Date(value).toLocaleString("tr-TR");
  } catch {
    return "-";
  }
}

function ReceiptDetailsModal({
  receipt,
  onClose,
  onRetryAi,
  isRetryingAi = false,
}) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewMimeType, setPreviewMimeType] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);

  useEffect(() => {
    if (!receipt?.id) {
      return undefined;
    }

    let isCancelled = false;
    let createdObjectUrl = "";

    async function loadReceiptPreview() {
      try {
        const fileBlob = await downloadPaymentReceiptFile(receipt.id);

        if (isCancelled) {
          return;
        }

        createdObjectUrl = URL.createObjectURL(fileBlob);

        setPreviewUrl(createdObjectUrl);
        setPreviewMimeType(
          fileBlob.type || receipt.fileType || "application/octet-stream",
        );
        setPreviewError("");
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setPreviewError(
          error?.message ||
            "Dekont önizlemesi yüklenemedi. Dosyayı indirerek kontrol edebilirsiniz.",
        );
      } finally {
        if (!isCancelled) {
          setIsPreviewLoading(false);
        }
      }
    }

    void loadReceiptPreview();

    return () => {
      isCancelled = true;

      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [receipt?.id, receipt?.fileType]);

  if (!receipt) {
    return null;
  }

  const rawReceipt = receipt.raw || {};

  const aiStatus = rawReceipt.aiStatus ?? "NOT_CHECKED";
  const aiStatusLabel =
    aiStatusLabels[aiStatus] ?? aiStatus ?? aiStatusLabels.NOT_CHECKED;
  const aiReasons = Array.isArray(rawReceipt.aiReasons)
    ? rawReceipt.aiReasons
    : [];

  const canRetryAi =
    receipt.rawStatus === "PENDING" &&
    aiStatus === "FAILED" &&
    typeof onRetryAi === "function";

  const hasAiInfo = Boolean(
    rawReceipt.aiStatus ||
    rawReceipt.aiProvider ||
    rawReceipt.aiModelName ||
    rawReceipt.aiPayerName ||
    (rawReceipt.aiAmountKurus !== null &&
      rawReceipt.aiAmountKurus !== undefined) ||
    rawReceipt.aiApartmentNumber ||
    rawReceipt.aiDescription ||
    rawReceipt.aiPaymentDate ||
    (rawReceipt.aiConfidence !== null && rawReceipt.aiConfidence !== undefined),
  );

  return (
    <div className="modal-overlay">
      <section className="details-modal">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Dekont Detayı</span>
            <h3>{receipt.fileName || "Dekont Bilgisi"}</h3>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Dekont detay penceresini kapat"
          >
            <X size={20} />
          </button>
        </div>

        <div className="receipt-preview-card">
          <div className="receipt-preview-header">
            <div>
              <span className="section-kicker">Dekont Önizleme</span>
              <h4>Dosyayı indirmeden görüntüleyin</h4>
            </div>

            {previewUrl && (
              <div className="receipt-preview-actions">
                <button
                  type="button"
                  onClick={() =>
                    window.open(previewUrl, "_blank", "noopener,noreferrer")
                  }
                >
                  <ExternalLink size={17} />
                  Yeni Sekmede Aç
                </button>

                <a
                  href={previewUrl}
                  download={receipt.fileName || "dekont"}
                >
                  <Download size={17} />
                  İndir
                </a>
              </div>
            )}
          </div>

          {isPreviewLoading && (
            <div className="receipt-preview-state">
              <LoaderCircle className="receipt-preview-spinner" size={28} />
              <strong>Dekont önizlemesi yükleniyor...</strong>
            </div>
          )}

          {!isPreviewLoading && previewError && (
            <div className="receipt-preview-error" role="alert">
              <FileSearch size={24} />
              <div>
                <strong>Önizleme açılamadı</strong>
                <p>{previewError}</p>
              </div>
            </div>
          )}

          {!isPreviewLoading &&
            !previewError &&
            previewUrl &&
            previewMimeType === "application/pdf" && (
              <iframe
                className="receipt-preview-frame"
                src={previewUrl}
                title={`${receipt.fileName || "Dekont"} önizlemesi`}
              />
            )}

          {!isPreviewLoading &&
            !previewError &&
            previewUrl &&
            previewMimeType.startsWith("image/") && (
              <div className="receipt-preview-image-wrapper">
                <img
                  src={previewUrl}
                  alt={`${receipt.fileName || "Dekont"} önizlemesi`}
                />
              </div>
            )}

          {!isPreviewLoading &&
            !previewError &&
            previewUrl &&
            previewMimeType !== "application/pdf" &&
            !previewMimeType.startsWith("image/") && (
              <div className="receipt-preview-state">
                <FileSearch size={28} />
                <strong>Bu dosya türü tarayıcı içinde önizlenemiyor.</strong>
                <span>Yeni sekmede açabilir veya indirebilirsiniz.</span>
              </div>
            )}
        </div>

        <div className="details-list receipt-details-list">
          <div>
            <span>Yükleyen Yönetici</span>
            <strong>{receipt.payerName || "-"}</strong>
          </div>

          <div>
            <span>Yükleyen E-posta</span>
            <strong>{receipt.payerEmail || "-"}</strong>
          </div>

          <div>
            <span>Daire</span>
            <strong>{receipt.apartmentLabel || "-"}</strong>
          </div>

          <div>
            <span>Ödeme Başlığı</span>
            <strong>{receipt.paymentTitle || "-"}</strong>
          </div>

          <div>
            <span>Son Ödeme Tarihi</span>
            <strong>{receipt.dueDate || "-"}</strong>
          </div>

          <div>
            <span>Tutar</span>
            <strong>{receipt.amountText || "-"}</strong>
          </div>

          <div>
            <span>Dosya</span>
            <strong>{receipt.fileName || "-"}</strong>
          </div>

          <div>
            <span>Dosya Türü</span>
            <strong>{receipt.fileType || "-"}</strong>
          </div>

          <div>
            <span>Dosya Boyutu</span>
            <strong>{receipt.fileSizeText || "-"}</strong>
          </div>

          <div>
            <span>Durum</span>
            <strong>{receipt.status || "-"}</strong>
          </div>

          <div>
            <span>AI Kontrolü</span>
            <strong>{aiStatusLabel}</strong>
          </div>

          <div>
            <span>Yükleme Tarihi</span>
            <strong>{receipt.createdAt || "-"}</strong>
          </div>

          <div>
            <span>İnceleyen</span>
            <strong>{receipt.reviewedBy || "-"}</strong>
          </div>
        </div>

        {hasAiInfo && (
          <div className="receipt-ai-result-card">
            <div>
              <span className="section-kicker">AI Analiz Bilgileri</span>
              <h4>Dekont AI ile analiz edilerek kaydedildi.</h4>
            </div>

            <div className="receipt-match-grid">
              <div>
                <span>AI Durumu</span>
                <strong>{aiStatusLabel}</strong>
              </div>

              <div>
                <span>Sağlayıcı</span>
                <strong>{rawReceipt.aiProvider || "-"}</strong>
              </div>

              <div>
                <span>Model</span>
                <strong>{rawReceipt.aiModelName || "-"}</strong>
              </div>

              <div>
                <span>Güven Oranı</span>
                <strong>{formatAiConfidence(rawReceipt.aiConfidence)}</strong>
              </div>

              <div>
                <span>Beklenen Tutar</span>
                <strong>
                  {formatAiAmount(rawReceipt.aiExpectedAmountKurus)}
                </strong>
              </div>

              <div>
                <span>Okunan Tutar</span>
                <strong>{formatAiAmount(rawReceipt.aiAmountKurus)}</strong>
              </div>

              <div>
                <span>Tutar Eşleşmesi</span>
                <strong>
                  {formatMatchResult(rawReceipt.aiAmountMatches)}
                </strong>
              </div>

              <div>
                <span>IBAN Eşleşmesi</span>
                <strong>{formatMatchResult(rawReceipt.aiIbanMatches)}</strong>
              </div>

              <div>
                <span>Beklenen IBAN</span>
                <strong>{maskIban(rawReceipt.aiExpectedIban)}</strong>
              </div>

              <div>
                <span>Okunan Alıcı IBAN</span>
                <strong>{maskIban(rawReceipt.aiRecipientIban)}</strong>
              </div>

              <div>
                <span>Ödeyen</span>
                <strong>{rawReceipt.aiPayerName || "-"}</strong>
              </div>

              <div>
                <span>Okunan Daire No</span>
                <strong>{rawReceipt.aiApartmentNumber || "-"}</strong>
              </div>

              <div>
                <span>Ödeme Tarihi</span>
                <strong>{rawReceipt.aiPaymentDate || "-"}</strong>
              </div>

              <div>
                <span>Analiz Tarihi</span>
                <strong>{formatDateTime(rawReceipt.aiAnalyzedAt)}</strong>
              </div>

              <div>
                <span>Kontrol Tarihi</span>
                <strong>{formatDateTime(rawReceipt.aiVerifiedAt)}</strong>
              </div>

              <div className="full-width">
                <span>Okunan Açıklama</span>
                <strong>{rawReceipt.aiDescription || "-"}</strong>
              </div>
            </div>

            {aiReasons.length > 0 && (
              <div className="details-description">
                <span>Manuel Kontrol Nedenleri</span>
                <ul>
                  {aiReasons.map((reason, index) => (
                    <li key={`${reason}-${index}`}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {rawReceipt.aiErrorMessage && (
              <div className="details-description">
                <span>AI Hata Bilgisi</span>
                <p>{rawReceipt.aiErrorMessage}</p>
              </div>
            )}

            {canRetryAi && (
              <button
                type="button"
                className="dashboard-action-button"
                onClick={() => onRetryAi(receipt.id)}
                disabled={isRetryingAi}
              >
                <RefreshCw size={18} />
                {isRetryingAi
                  ? "AI kontrolü başlatılıyor..."
                  : "AI ile Tekrar Kontrol Et"}
              </button>
            )}
          </div>
        )}

        {!hasAiInfo && (
          <div className="details-description">
            <span>Doğrulama Bilgisi</span>
            <p>
              Bu kayıt için AI analiz bilgisi bulunmuyor. Kayıt yönetici
              tarafından manuel doğrulanmış olabilir.
            </p>
          </div>
        )}

        <div className="details-description">
          <span>Dekont Notu</span>
          <p>{receipt.description || "Bu dekont için açıklama bulunmuyor."}</p>
        </div>

        <div className="details-description">
          <span>İnceleme Notu</span>
          <p>{receipt.reviewNote || "İnceleme notu bulunmuyor."}</p>
        </div>
      </section>
    </div>
  );
}

export default ReceiptDetailsModal;
