import { Eye, MapPin, Pencil, Power } from "lucide-react";
import SecureImage from "../common/SecureImage";

function getBuildingStatusClass(status) {
  return status === "Aktif" ? "active" : "passive";
}

function BuildingCard({ building, onView, onEdit, onToggleStatus }) {
  const statusClass = getBuildingStatusClass(building.status);
  const isActive = building.status === "Aktif";

  return (
    <article className="building-card">
      <div className="building-image">
        <SecureImage
          src={building.image}
          alt={building.name || "Site / Apartman görseli"}
        />

        <span className={`building-status ${statusClass}`}>
          {building.status || "Pasif"}
        </span>
      </div>

      <div className="building-content">
        <div className="building-title-row">
          <div>
            <span>{building.type || "Site / Apartman"}</span>
            <h3>{building.name || "İsimsiz Kayıt"}</h3>
          </div>
        </div>

        <div className="building-location">
          <MapPin size={17} />
          <span>{building.address || "Adres bilgisi girilmemiş"}</span>
        </div>

        <div className="building-meta-grid">
          <div>
            <strong>{building.blocks ?? 0}</strong>
            <span>Blok</span>
          </div>

          <div>
            <strong>{building.apartments ?? 0}</strong>
            <span>Daire</span>
          </div>

          <div>
            <strong>{building.manager || "Atanmadı"}</strong>
            <span>Yönetici</span>
          </div>
        </div>

        <div className="building-card-actions">
          <button type="button" onClick={() => onView(building)}>
            <Eye size={16} />
            Görüntüle
          </button>

          <button type="button" onClick={() => onEdit(building)}>
            <Pencil size={16} />
            Düzenle
          </button>

          <button
            type="button"
            className="danger-button"
            onClick={() => onToggleStatus(building)}
          >
            <Power size={16} />
            {isActive ? "Pasifleştir" : "Aktifleştir"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default BuildingCard;
