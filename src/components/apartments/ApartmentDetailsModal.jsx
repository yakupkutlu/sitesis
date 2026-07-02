import { X } from "lucide-react";

function ApartmentDetailsModal({ apartment, onClose }) {
  if (!apartment) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <section className="details-modal">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Daire Detayı</span>

            <h3>{apartment.apartmentNo || "Daire Detayı"}</h3>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Daire detay penceresini kapat"
          >
            <X size={20} />
          </button>
        </div>

        <div className="details-list apartment-details-list">
          <div>
            <span>Blok / Apartman</span>
            <strong>{apartment.block || "-"}</strong>
          </div>

          <div>
            <span>Kat</span>
            <strong>{apartment.floor || "-"}</strong>
          </div>

          <div>
            <span>Daire Durumu</span>
            <strong>{apartment.status || "-"}</strong>
          </div>

          <div>
            <span>Kullanım Tipi</span>
            <strong>{apartment.usageType || "-"}</strong>
          </div>

          <div>
            <span>Sakin</span>
            <strong>{apartment.residentName || "-"}</strong>
          </div>

          <div>
            <span>Telefon</span>
            <strong>{apartment.phone || "-"}</strong>
          </div>

          <div>
            <span>Aidat Durumu</span>
            <strong>{apartment.paymentStatus || "-"}</strong>
          </div>

          <div>
            <span>Kayıt Tarihi</span>
            <strong>{apartment.createdAt || "-"}</strong>
          </div>
        </div>

        <div className="details-description">
          <span>Not</span>

          <p>{apartment.note || "Bu daire için not bulunmuyor."}</p>
        </div>
      </section>
    </div>
  );
}

export default ApartmentDetailsModal;