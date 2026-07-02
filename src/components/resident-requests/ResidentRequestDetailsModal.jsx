import { X } from "lucide-react";

function ResidentRequestDetailsModal({ request, onClose }) {
  if (!request) {
    return null;
  }

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

        <div className="resident-request-manager-response">
          <span>Yönetici Cevabı</span>

          <p>{request.managerResponse || "Henüz yönetici cevabı yok."}</p>
        </div>
      </section>
    </div>
  );
}

export default ResidentRequestDetailsModal;