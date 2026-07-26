import { useEffect, useRef, useState } from "react";
import {
  CreditCard,
  Eye,
  FileText,
  LoaderCircle,
  X,
} from "lucide-react";

import { downloadPaymentReceiptFile } from "../../api/paymentReceiptsApi";

const automaticPaymentBadgeStyle = {
  backgroundColor: "#dbeafe",
  borderColor: "#bfdbfe",
  color: "#1d4ed8",
};

function getReceiptStatusClass(receipt) {
  if (receipt?.isAutomaticPayment) {
    return "automatic";
  }

  if (receipt?.status === "Onaylandı") {
    return "approved";
  }

  if (receipt?.status === "Reddedildi") {
    return "rejected";
  }

  return "waiting";
}

function getPreviewKind(receipt, mimeType) {
  const normalizedMimeType = String(mimeType || "").toLowerCase();
  const normalizedFileName = String(receipt?.fileName || "").toLowerCase();

  if (
    normalizedMimeType === "application/pdf" ||
    normalizedFileName.endsWith(".pdf")
  ) {
    return "pdf";
  }

  if (
    normalizedMimeType.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".webp"].some((extension) =>
      normalizedFileName.endsWith(extension)
    )
  ) {
    return "image";
  }

  return "other";
}

function ResidentReceiptCards({ receipts }) {
  const safeReceipts = receipts || [];

  const [activeReceiptId, setActiveReceiptId] = useState(null);
  const [previewState, setPreviewState] = useState({
    isLoading: false,
    url: "",
    mimeType: "",
    error: "",
  });

  const objectUrlRef = useRef("");

  function releasePreviewUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = "";
    }
  }

  function closePreview() {
    releasePreviewUrl();
    setActiveReceiptId(null);
    setPreviewState({
      isLoading: false,
      url: "",
      mimeType: "",
      error: "",
    });
  }

  async function handlePreviewToggle(receipt) {
    if (activeReceiptId === receipt.id) {
      closePreview();
      return;
    }

    releasePreviewUrl();
    setActiveReceiptId(receipt.id);
    setPreviewState({
      isLoading: true,
      url: "",
      mimeType: "",
      error: "",
    });

    try {
      const fileBlob = await downloadPaymentReceiptFile(receipt.id);
      const objectUrl = URL.createObjectURL(fileBlob);

      objectUrlRef.current = objectUrl;

      setPreviewState({
        isLoading: false,
        url: objectUrl,
        mimeType: fileBlob.type,
        error: "",
      });
    } catch (error) {
      setPreviewState({
        isLoading: false,
        url: "",
        mimeType: "",
        error: error?.message || "Dekont dosyası görüntülenemedi.",
      });
    }
  }

  useEffect(() => {
    return () => {
      releasePreviewUrl();
    };
  }, []);

  if (safeReceipts.length === 0) {
    return (
      <section className="resident-receipt-empty">
        Henüz yüklenmiş dekont bulunmuyor.
      </section>
    );
  }

  return (
    <section className="resident-receipt-cards-grid">
      {safeReceipts.map((receipt) => {
        const statusClass = getReceiptStatusClass(receipt);
        const isPreviewOpen = activeReceiptId === receipt.id;
        const previewKind = getPreviewKind(
          receipt,
          isPreviewOpen ? previewState.mimeType : ""
        );

        return (
          <article className="resident-receipt-card" key={receipt.id}>
            <div className="resident-receipt-card-top">
              <div className="resident-receipt-icon">
                {receipt.isAutomaticPayment ? (
                  <CreditCard size={21} />
                ) : (
                  <FileText size={21} />
                )}
              </div>

              <span
                className={`resident-receipt-status-badge ${statusClass}`}
                style={
                  receipt.isAutomaticPayment
                    ? automaticPaymentBadgeStyle
                    : undefined
                }
              >
                {receipt.isAutomaticPayment
                  ? "Otomatik Ödeme"
                  : receipt.status || "Beklemede"}
              </span>
            </div>

            <div className="resident-receipt-card-content">
              <span>{receipt.paymentTitle || "Ödeme bilgisi yok"}</span>

              <h3>{receipt.amount || "-"}</h3>

              <p>{receipt.description || "Açıklama bulunmuyor."}</p>
            </div>

            <div className="resident-receipt-meta-grid">
              <div>
                <span>
                  {receipt.isAutomaticPayment ? "İşlem Türü" : "Dosya"}
                </span>
                <strong>
                  {receipt.isAutomaticPayment
                    ? "Otomatik Ödeme"
                    : receipt.fileName || "-"}
                </strong>
              </div>

              <div>
                <span>
                  {receipt.isAutomaticPayment
                    ? "İşlem Tarihi"
                    : "Yükleme Tarihi"}
                </span>
                <strong>{receipt.uploadedAt || "-"}</strong>
              </div>

              <div>
                <span>Daire</span>
                <strong>{receipt.apartment || "-"}</strong>
              </div>

              <div>
                <span>
                  {receipt.isAutomaticPayment ? "İşlem" : "Kontrol"}
                </span>
                <strong>{receipt.reviewNote || "-"}</strong>
              </div>
            </div>

            {!receipt.isAutomaticPayment && (
              <div className="resident-receipt-card-actions">
                <button
                  type="button"
                  onClick={() => handlePreviewToggle(receipt)}
                  aria-expanded={isPreviewOpen}
                  aria-controls={`receipt-preview-${receipt.id}`}
                  aria-label={
                    isPreviewOpen
                      ? `${receipt.paymentTitle || "Dekont"} önizlemesini kapat`
                      : `${receipt.paymentTitle || "Dekont"} dosyasını görüntüle`
                  }
                >
                  {isPreviewOpen ? <X size={16} /> : <Eye size={16} />}
                  {isPreviewOpen ? "Kapat" : "Görüntüle"}
                </button>
              </div>
            )}

            {!receipt.isAutomaticPayment && isPreviewOpen && (
              <div
                id={`receipt-preview-${receipt.id}`}
                className="resident-receipt-inline-preview"
              >
                <div className="resident-receipt-inline-preview-header">
                  <div>
                    <span>Dekont Önizlemesi</span>
                    <strong>{receipt.fileName || "Dekont dosyası"}</strong>
                  </div>

                  <button
                    type="button"
                    className="resident-receipt-inline-close"
                    onClick={closePreview}
                    aria-label="Dekont önizlemesini kapat"
                  >
                    <X size={18} />
                  </button>
                </div>

                {previewState.isLoading && (
                  <div className="resident-receipt-preview-message">
                    <LoaderCircle
                      size={22}
                      className="resident-receipt-preview-spinner"
                    />
                    <span>Dekont yükleniyor...</span>
                  </div>
                )}

                {!previewState.isLoading && previewState.error && (
                  <div className="resident-receipt-preview-error">
                    {previewState.error}
                  </div>
                )}

                {!previewState.isLoading &&
                  !previewState.error &&
                  previewState.url &&
                  previewKind === "image" && (
                    <img
                      className="resident-receipt-preview-image"
                      src={previewState.url}
                      alt={`${receipt.paymentTitle || "Ödeme"} dekontu`}
                    />
                  )}

                {!previewState.isLoading &&
                  !previewState.error &&
                  previewState.url &&
                  previewKind === "pdf" && (
                    <iframe
                      className="resident-receipt-preview-pdf"
                      src={previewState.url}
                      title={`${receipt.paymentTitle || "Ödeme"} dekont PDF önizlemesi`}
                    />
                  )}

                {!previewState.isLoading &&
                  !previewState.error &&
                  previewState.url &&
                  previewKind === "other" && (
                    <div className="resident-receipt-preview-message">
                      <FileText size={22} />
                      <span>Bu dosya türü tarayıcı içinde önizlenemiyor.</span>
                    </div>
                  )}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

export default ResidentReceiptCards;