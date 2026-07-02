import { FileImage, X } from "lucide-react";

function ManagerRequestViewModal({ request, onClose }) {
  if (!request) {
    return null;
  }

  const hasFile = Boolean(request.fileName);

  return (
    <div className="modal-overlay">
      <section className="details-modal manager-request-modal">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Talep Görüntüle</span>

            <h3>{request.title || "Talep Detayı"}</h3>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Talep görüntüleme penceresini kapat"
          >
            <X size={20} />
          </button>
        </div>

        <div className="details-list manager-request-details-list">
          <div>
            <span>Talep No</span>
            <strong>#{request.id || "-"}</strong>
          </div>

          <div>
            <span>Sakin</span>
            <strong>{request.residentName || "-"}</strong>
          </div>

          <div>
            <span>Telefon</span>
            <strong>{request.phone || "-"}</strong>
          </div>

          <div>
            <span>Daire</span>
            <strong>{request.apartmentLabel || "-"}</strong>
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
            <span>Durum</span>
            <strong>{request.status || "-"}</strong>
          </div>

          <div>
            <span>Oluşturma Tarihi</span>
            <strong>{request.createdAt || "-"}</strong>
          </div>

          <div>
            <span>Son Güncelleme</span>
            <strong>{request.updatedAt || "-"}</strong>
          </div>

          <div>
            <span>Ek Dosya</span>
            <strong>{hasFile ? request.fileName : "Yok"}</strong>
          </div>
        </div>

        {hasFile && (
          <div className="manager-request-file-box">
            <FileImage size={22} />

            <div>
              <strong>{request.fileName}</strong>

              <span>
                Bu dosya sakin tarafından talep ile birlikte gönderilmiştir.
              </span>
            </div>
          </div>
        )}

        <div className="details-description">
          <span>Talep Açıklaması</span>

          <p>{request.description || "Talep açıklaması bulunmuyor."}</p>
        </div>

        {request.managerResponse && (
          <div className="details-description">
            <span>Yönetici Cevabı</span>

            <p>{request.managerResponse}</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default ManagerRequestViewModal;