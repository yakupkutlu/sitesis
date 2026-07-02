import { X } from "lucide-react";

function ResidentAnnouncementDetailsModal({ announcement, onClose }) {
  if (!announcement) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <section className="details-modal resident-announcement-modal">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Duyuru Detayı</span>
            <h3>{announcement.title}</h3>
          </div>

          <button type="button" className="modal-close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="details-list resident-announcement-details-list">
          <div>
            <span>Duyuru Tipi</span>
            <strong>{announcement.type}</strong>
          </div>

          <div>
            <span>Tarih</span>
            <strong>{announcement.date}</strong>
          </div>

          <div>
            <span>Hedef</span>
            <strong>{announcement.target}</strong>
          </div>

          <div>
            <span>Gönderen</span>
            <strong>{announcement.sender}</strong>
          </div>

          <div>
            <span>Okunma Durumu</span>
            <strong>{announcement.isRead ? "Okundu" : "Okunmamış"}</strong>
          </div>

          <div>
            <span>Site / Apartman</span>
            <strong>{announcement.siteName}</strong>
          </div>
        </div>

        <div className="details-description">
          <span>Duyuru Metni</span>
          <p>{announcement.content}</p>
        </div>
      </section>
    </div>
  );
}

export default ResidentAnnouncementDetailsModal;