import { X } from "lucide-react";

function BuildingDetailsModal({ building, onClose }) {
  if (!building) {
    return null;
  }

  const buildingSystems = Array.isArray(building.systems)
    ? building.systems
    : [];

  return (
    <div className="modal-overlay">
      <section className="details-modal">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Kayıt Detayı</span>

            <h3>{building.name || "Site / Apartman Detayı"}</h3>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Detay penceresini kapat"
          >
            <X size={20} />
          </button>
        </div>

        <img
          className="details-modal-image"
          src={building.image}
          alt={building.name || "Site / Apartman görseli"}
        />

        <div className="details-list">
          <div>
            <span>Yapı Türü</span>
            <strong>{building.type || "-"}</strong>
          </div>

          <div>
            <span>Adres</span>
            <strong>{building.address || "-"}</strong>
          </div>

          <div>
            <span>Blok Bilgisi</span>
            <strong>{building.blockInfo || "Tek yapı"}</strong>
          </div>

          <div>
            <span>Daire Sayısı</span>
            <strong>{building.apartments ?? 0}</strong>
          </div>

          <div>
            <span>Yönetici</span>
            <strong>{building.manager || "Atanmadı"}</strong>
          </div>

          <div>
            <span>Asansör</span>
            <strong>{building.elevator || "-"}</strong>
          </div>

          <div>
            <span>Durum</span>
            <strong>{building.status || "-"}</strong>
          </div>

          <div>
            <span>Kullanılan Sistemler</span>

            <strong>
              {buildingSystems.length > 0
                ? buildingSystems.join(", ")
                : "Belirtilmedi"}
            </strong>
          </div>
        </div>

        <div className="details-description">
          <span>Açıklama</span>

          <p>{building.description || "Açıklama girilmedi."}</p>
        </div>
      </section>
    </div>
  );
}

export default BuildingDetailsModal;