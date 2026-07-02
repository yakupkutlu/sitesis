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

        <div className="details-list announcement-details-list">
          <div>
            <span>Hedef Kitle</span>
            <strong>{announcement.target || "-"}</strong>
          </div>

          <div>
            <span>Öncelik</span>
            <strong>{announcement.priority || "-"}</strong>
          </div>

          <div>
            <span>Durum</span>
            <strong>{announcement.status || "-"}</strong>
          </div>

          <div>
            <span>Oluşturma Tarihi</span>
            <strong>{announcement.createdAt || "-"}</strong>
          </div>

          <div>
            <span>SMS ile Bilgilendirme</span>
            <strong>{announcement.sendSms ? "Açık" : "Kapalı"}</strong>
          </div>

          <div>
            <span>E-posta ile Bilgilendirme</span>
            <strong>{announcement.sendEmail ? "Açık" : "Kapalı"}</strong>
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