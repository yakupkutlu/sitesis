import { X } from "lucide-react";

function AnnouncementDetailsModal({ announcement, onClose }) {
  if (!announcement) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <section className="details-modal">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Duyuru Detayı</span>
            <h3>{announcement.title || "Duyuru Detayı"}</h3>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Duyuru detay penceresini kapat"
          >
            <X size={20} />
          </button>
        </div>

        <div className="details-list">
          <div>
            <span>Durum</span>
            <strong>{announcement.status || "-"}</strong>
          </div>

          <div>
            <span>Hedef Türü</span>
            <strong>{announcement.targetTypeLabel || "-"}</strong>
          </div>

          <div>
            <span>Hedef</span>
            <strong>{announcement.target || "-"}</strong>
          </div>

          <div>
            <span>Oluşturan</span>
            <strong>{announcement.createdBy || "-"}</strong>
          </div>

          <div>
            <span>Tarih</span>
            <strong>{announcement.createdAt || "-"}</strong>
          </div>
        </div>

        <div className="details-description">
          <span>Duyuru İçeriği</span>
          <p>{announcement.content || "Duyuru içeriği bulunmuyor."}</p>
        </div>
      </section>
    </div>
  );
}

export default AnnouncementDetailsModal;
