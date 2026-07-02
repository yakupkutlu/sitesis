import { X } from "lucide-react";

function ManagerDetailsModal({ manager, onClose }) {
  if (!manager) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <section className="details-modal">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Yönetici Detayı</span>

            <h3>{manager.name || "Yönetici Detayı"}</h3>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Yönetici detay penceresini kapat"
          >
            <X size={20} />
          </button>
        </div>

        <div className="details-list manager-details-list">
          <div>
            <span>Ad Soyad</span>
            <strong>{manager.name || "-"}</strong>
          </div>

          <div>
            <span>Görev</span>
            <strong>{manager.title || "Yönetici"}</strong>
          </div>

          <div>
            <span>E-posta</span>
            <strong>{manager.email || "-"}</strong>
          </div>

          <div>
            <span>Telefon</span>
            <strong>{manager.phone || "-"}</strong>
          </div>

          <div>
            <span>Atandığı Site / Apartman</span>
            <strong>{manager.assignedBuilding || "Henüz atanmadı"}</strong>
          </div>

          <div>
            <span>Durum</span>
            <strong>{manager.status || "-"}</strong>
          </div>

          <div>
            <span>Kayıt Tarihi</span>
            <strong>{manager.createdAt || "-"}</strong>
          </div>
        </div>

        <div className="details-description">
          <span>Not</span>

          <p>{manager.note || "Not girilmedi."}</p>
        </div>
      </section>
    </div>
  );
}

export default ManagerDetailsModal;