import { useEffect, useState } from "react";
import { ExternalLink, FileText, LoaderCircle, X } from "lucide-react";

import { fetchRequestAttachment } from "../../api/requestAttachmentsApi";


function isImageAttachment(request, contentType) {
  const mimeType = String(contentType || request?.fileType || "").toLowerCase();
  const fileName = String(request?.fileName || "").toLowerCase();

  return (
    mimeType.startsWith("image/") ||
    /\.(png|jpe?g|webp)$/i.test(fileName)
  );
}

function isPdfAttachment(request, contentType) {
  const mimeType = String(contentType || request?.fileType || "").toLowerCase();
  const fileName = String(request?.fileName || "").toLowerCase();

  return mimeType === "application/pdf" || fileName.endsWith(".pdf");
}

function ResidentRequestDetailsModal({ request, onClose }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewContentType, setPreviewContentType] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(
  Boolean(request?.id && request?.fileName)
  );
  const hasAttachment = Boolean(request?.id && request?.fileName);

  useEffect(() => {
  let isCancelled = false;
  let objectUrl = "";

  if (!hasAttachment) {
    return undefined;
  }

  async function loadAttachment() {
    try {
      const result = await fetchRequestAttachment(request.id);

      if (isCancelled) {
        return;
      }

      objectUrl = URL.createObjectURL(result.blob);

      setPreviewUrl(objectUrl);
      setPreviewContentType(
        result.contentType || result.blob.type || ""
      );
      setPreviewError("");
    } catch (error) {
      if (!isCancelled) {
        setPreviewError(
          error?.message || "Gönderilen dosya görüntülenemedi."
        );
      }
    } finally {
      if (!isCancelled) {
        setIsPreviewLoading(false);
      }
    }
  }

  void loadAttachment();

  return () => {
    isCancelled = true;

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  };
}, [hasAttachment, request?.id]);

  if (!request) {
    return null;
  }

  const showImagePreview =
    Boolean(previewUrl) && isImageAttachment(request, previewContentType);

  const showPdfPreview =
    Boolean(previewUrl) && isPdfAttachment(request, previewContentType);

  return (
    <div className="modal-overlay">
      <section className="details-modal resident-request-modal">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Talep Detayı</span>
            <h3>{request.title || "Talep Detayı"}</h3>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Talep detay penceresini kapat"
          >
            <X size={20} />
          </button>
        </div>

        <div className="details-list resident-request-details-list">
          <div>
            <span>Talep No</span>
            <strong>{request.requestNo || `#${request.id || "-"}`}</strong>
          </div>

          <div>
            <span>Durum</span>
            <strong>{request.status || "-"}</strong>
          </div>

          <div>
            <span>Kategori</span>
            <strong>{request.category || "-"}</strong>
          </div>

          <div>
            <span>Öncelik</span>
            <strong>{request.priority || "-"}</strong>
          </div>

          <div>
            <span>Daire</span>
            <strong>{request.apartment || "-"}</strong>
          </div>

          <div>
            <span>Oluşturma Tarihi</span>
            <strong>{request.createdAt || "-"}</strong>
          </div>

          <div>
            <span>Dosya Eki</span>
            <strong>{request.fileName || "Dosya yok"}</strong>
          </div>

          <div>
            <span>İletişim Tercihi</span>
            <strong>{request.contactPreference || "-"}</strong>
          </div>
        </div>

        <div className="details-description">
          <span>Talep Açıklaması</span>
          <p>{request.description || "Talep açıklaması bulunmuyor."}</p>
        </div>

        {hasAttachment && (
          <section className="resident-request-attachment-section">
            <div className="resident-request-attachment-header">
              <div>
                <span>Gönderilen Dosya</span>
                <strong>{request.fileName}</strong>

                {request.fileSizeText && request.fileSizeText !== "-" && (
                  <small>{request.fileSizeText}</small>
                )}
              </div>

              {previewUrl ? (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="resident-request-open-file-button"
                >
                  <ExternalLink size={17} />
                  Yeni Sekmede Aç
                </a>
              ) : (
                <button
                  type="button"
                  className="resident-request-open-file-button"
                  disabled
                >
                  <ExternalLink size={17} />
                  Yeni Sekmede Aç
                </button>
              )}
            </div>

            <div className="resident-request-attachment-preview">
              {isPreviewLoading && (
                <div className="resident-request-attachment-state">
                  <LoaderCircle
                    className="resident-request-preview-spinner"
                    size={34}
                  />
                  <p>Dosya güvenli şekilde yükleniyor...</p>
                </div>
              )}

              {!isPreviewLoading && previewError && (
                <div className="resident-request-attachment-state error">
                  <FileText size={36} />
                  <p>{previewError}</p>
                </div>
              )}

              {!isPreviewLoading && !previewError && showImagePreview && (
                <img
                  src={previewUrl}
                  alt={request.fileName || "Talebe eklenen görsel"}
                />
              )}

              {!isPreviewLoading && !previewError && showPdfPreview && (
                <iframe
                  src={previewUrl}
                  title={request.fileName || "Talebe eklenen PDF"}
                />
              )}

              {!isPreviewLoading &&
                !previewError &&
                previewUrl &&
                !showImagePreview &&
                !showPdfPreview && (
                  <div className="resident-request-attachment-state">
                    <FileText size={36} />
                    <p>Bu dosya tarayıcı içinde önizlenemiyor.</p>
                    <a href={previewUrl} target="_blank" rel="noreferrer">
                      Dosyayı aç
                    </a>
                  </div>
                )}
            </div>
          </section>
        )}

        <div className="resident-request-manager-response">
          <span>Yönetici Cevabı</span>
          <p>{request.managerResponse || "Henüz yönetici cevabı yok."}</p>
        </div>
      </section>
    </div>
  );
}

export default ResidentRequestDetailsModal;
