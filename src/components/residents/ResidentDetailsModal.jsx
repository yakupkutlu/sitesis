import { X } from "lucide-react";

function ResidentDetailsModal({ resident, onClose }) {
  if (!resident) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <section className="details-modal">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Sakin Detayı</span>
            <h3>{resident.name}</h3>
          </div>

          <button type="button" className="modal-close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="details-list resident-details-list">
          <div>
            <span>Rol</span>
            <strong>{resident.role}</strong>
          </div>

          <div>
            <span>Durum</span>
            <strong>{resident.status}</strong>
          </div>

          <div>
            <span>Site</span>
            <strong>{resident.site}</strong>
          </div>

          <div>
            <span>Blok / Apartman</span>
            <strong>{resident.block}</strong>
          </div>

          <div>
            <span>Daire</span>
            <strong>{resident.apartment}</strong>
          </div>

          <div>
            <span>Telefon</span>
            <strong>{resident.phone}</strong>
          </div>

          <div>
            <span>E-posta</span>
            <strong>{resident.email}</strong>
          </div>

          <div>
            <span>Kayıt Tarihi</span>
            <strong>{resident.createdAt}</strong>
          </div>

          <div>
            <span>Son Ödeme Tarihi</span>
            <strong>{resident.lastPaymentDate}</strong>
          </div>
        </div>

        {resident.owner && (
          <div className="details-description">
            <span>Ev Sahibi Bilgileri</span>

            <div className="resident-payment-detail-grid">
              <div>
                <span>Ad Soyad</span>
                <strong>{resident.owner.name}</strong>
              </div>

              <div>
                <span>Hesap Durumu</span>
                <strong>{resident.owner.status}</strong>
              </div>

              <div>
                <span>E-posta</span>
                <strong>{resident.owner.email}</strong>
              </div>

              <div>
                <span>Telefon</span>
                <strong>{resident.owner.phone}</strong>
              </div>
            </div>
          </div>
        )}

        <div className="details-description">
          <span>Not</span>
          <p>{resident.note || "Bu sakin için not bulunmuyor."}</p>
        </div>
      </section>
    </div>
  );
}

export default ResidentDetailsModal;
