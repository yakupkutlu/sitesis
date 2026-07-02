import { X } from "lucide-react";

function ManagerAnnouncementDetailsModal({ announcement, onClose }) {
  if (!announcement) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <section className="details-modal">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Duyuru Detayı</span>
            <h3>{announcement.title}</h3>
          </div>

          <button type="button" className="modal-close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="details-list manager-announcement-details-list">
          <div>
            <span>Duyuru Tipi</span>
            <strong>{announcement.type}</strong>
          </div>

          <div>
            <span>Hedef Kapsam</span>
            <strong>{announcement.targetText}</strong>
          </div>

          <div>
            <span>Durum</span>
            <strong>{announcement.status}</strong>
          </div>

          <div>
            <span>SMS Bildirimi</span>
            <strong>{announcement.sendSms}</strong>
          </div>

          <div>
            <span>E-posta Bildirimi</span>
            <strong>{announcement.sendEmail}</strong>
          </div>

          <div>
            <span>Oluşturma Tarihi</span>
            <strong>{announcement.createdAt}</strong>
          </div>

          <div>
            <span>Hedef Daire Sayısı</span>
            <strong>{announcement.targetCount}</strong>
          </div>
        </div>

        {announcement.targetApartments.length > 0 && (
          <div className="details-description">
            <span>Hedef Daireler</span>

            <div className="manager-announcement-pill-list">
              {announcement.targetApartments.map((apartment) => (
                <strong key={apartment.id}>{apartment.label}</strong>
              ))}
            </div>
          </div>
        )}

        <div className="details-description">
          <span>Duyuru Metni</span>
          <p>{announcement.content}</p>
        </div>
      </section>
    </div>
  );
}

export default ManagerAnnouncementDetailsModal;