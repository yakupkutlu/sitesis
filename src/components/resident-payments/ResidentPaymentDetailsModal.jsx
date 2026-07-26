import { useEffect, useState } from "react";
import {
  FileText,
  LoaderCircle,
  UploadCloud,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import { downloadPaymentReceiptFile } from "../../api/paymentReceiptsApi";

function getPreviewKind(receipt, mimeType) {
  const normalizedMimeType = String(mimeType || "").toLowerCase();
  const normalizedFileName = String(
    receipt?.originalFileName || "",
  ).toLowerCase();

  if (
    normalizedMimeType === "application/pdf" ||
    normalizedFileName.endsWith(".pdf")
  ) {
    return "pdf";
  }

  if (
    normalizedMimeType.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".webp"].some((extension) =>
      normalizedFileName.endsWith(extension),
    )
  ) {
    return "image";
  }

  return "other";
}

function getReceiptStatusText(status) {
  if (status === "APPROVED") return "Onaylandı";
  if (status === "REJECTED") return "Reddedildi";
  return "Onay Bekliyor";
}

function getReceiptStatusClass(status) {
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  return "waiting";
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("tr-TR");
  } catch {
    return "-";
  }
}

function canUploadReceipt(payment) {
  return ![
    "Ödendi",
    "İptal Edildi",
    "Dekont Onayı Bekliyor",
  ].includes(payment?.status);
}

function ResidentPaymentDetailsModal({ payment, onClose }) {
  const latestReceipt = Array.isArray(payment?.receipts)
    ? payment.receipts[0] ?? null
    : null;

  const previewKey = latestReceipt?.id ?? "";

  const [previewState, setPreviewState] = useState({
    key: "",
    url: "",
    mimeType: "",
    error: "",
  });

  const isCurrentPreview = previewState.key === previewKey;
  const previewUrl = isCurrentPreview ? previewState.url : "";
  const previewMimeType = isCurrentPreview
    ? previewState.mimeType
    : "";
  const previewError = isCurrentPreview ? previewState.error : "";
  const isPreviewLoading = Boolean(
    latestReceipt?.id && !isCurrentPreview,
  );

  useEffect(() => {
    const receiptId = latestReceipt?.id;

    if (!receiptId) {
      return undefined;
    }

    let isCancelled = false;
    let createdObjectUrl = "";

    async function loadReceiptPreview() {
      try {
        const fileBlob = await downloadPaymentReceiptFile(receiptId);

        if (isCancelled) {
          return;
        }

        createdObjectUrl = URL.createObjectURL(fileBlob);

        setPreviewState({
          key: receiptId,
          url: createdObjectUrl,
          mimeType:
            fileBlob.type || "application/octet-stream",
          error: "",
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setPreviewState({
          key: receiptId,
          url: "",
          mimeType: "",
          error:
            error?.message ||
            "Dekont önizlemesi yüklenemedi.",
        });
      }
    }

    void loadReceiptPreview();

    return () => {
      isCancelled = true;

      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [latestReceipt?.id]);

  if (!payment) {
    return null;
  }

  const previewKind = getPreviewKind(
    latestReceipt,
    previewMimeType,
  );

  return (
    <div className="modal-overlay">
      <section className="details-modal resident-payment-modal">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Ödeme Detayı</span>
            <h3>{payment.title}</h3>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Ödeme detayını kapat"
          >
            <X size={20} />
          </button>
        </div>

        <div className="details-list resident-payment-details-list">
          <div>
            <span>Kategori</span>
            <strong>{payment.category}</strong>
          </div>

          <div>
            <span>Dönem</span>
            <strong>{payment.period}</strong>
          </div>

          <div>
            <span>Toplam Tutar</span>
            <strong>{payment.amount}</strong>
          </div>

          <div>
            <span>Ödenen</span>
            <strong>{payment.paidAmount}</strong>
          </div>

          <div>
            <span>Kalan</span>
            <strong>{payment.remainingAmount}</strong>
          </div>

          <div>
            <span>Fazla Ödeme</span>
            <strong>{payment.overpaymentAmount}</strong>
          </div>

          <div>
            <span>Son Ödeme Tarihi</span>
            <strong>{payment.dueDate}</strong>
          </div>

          <div>
            <span>Durum</span>
            <strong>{payment.status}</strong>
          </div>

          <div>
            <span>Daire</span>
            <strong>{payment.apartment}</strong>
          </div>
        </div>

        <div className="details-description">
          <span>Açıklama</span>
          <p>{payment.description}</p>
        </div>

        <section className="resident-payment-receipt-section">
          <div className="resident-payment-receipt-header">
            <div>
              <span>Dekont</span>
              <strong>
                {latestReceipt?.originalFileName ||
                  "Bu ödeme için dekont bulunmuyor"}
              </strong>

              {latestReceipt && (
                <small>
                  {formatDate(latestReceipt.createdAt)}
                  {" · "}
                  {getReceiptStatusText(latestReceipt.status)}
                </small>
              )}
            </div>

            {latestReceipt && (
              <span
                className={`resident-payment-receipt-status ${getReceiptStatusClass(
                  latestReceipt.status,
                )}`}
              >
                {getReceiptStatusText(latestReceipt.status)}
              </span>
            )}
          </div>

          {!latestReceipt ? (
            <div className="resident-payment-receipt-state">
              <FileText size={24} />
              <p>Bu ödeme için yüklenmiş dekont bulunmuyor.</p>
            </div>
          ) : isPreviewLoading ? (
            <div className="resident-payment-receipt-state">
              <LoaderCircle
                size={24}
                className="resident-payment-preview-spinner"
              />
              <p>Dekont yükleniyor...</p>
            </div>
          ) : previewError ? (
            <div className="resident-payment-receipt-state error">
              <FileText size={24} />
              <p>{previewError}</p>
            </div>
          ) : previewUrl && previewKind === "image" ? (
            <div className="resident-payment-receipt-preview">
              <img
                src={previewUrl}
                alt={`${payment.title} dekontu`}
              />
            </div>
          ) : previewUrl && previewKind === "pdf" ? (
            <div className="resident-payment-receipt-preview">
              <iframe
                src={previewUrl}
                title={`${payment.title} dekont PDF önizlemesi`}
              />
            </div>
          ) : (
            <div className="resident-payment-receipt-state">
              <FileText size={24} />
              <p>
                Bu dosya türü tarayıcı içinde önizlenemiyor.
              </p>
            </div>
          )}
        </section>

        {canUploadReceipt(payment) && (
          <div className="resident-payment-modal-actions">
            <Link
              to="/resident/receipts"
              state={{
                paymentAllocationId:
                  payment.paymentAllocationId,
              }}
              className="dashboard-action-button"
            >
              <UploadCloud size={17} />
              Dekont Yükle
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

export default ResidentPaymentDetailsModal;