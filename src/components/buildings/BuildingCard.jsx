import { useState } from "react";
import {
  Building2,
  Eye,
  MapPin,
  Pencil,
  Power,
} from "lucide-react";

function getBuildingStatusClass(status) {
  return status === "Aktif" ? "active" : "passive";
}

function BuildingCard({ building, onView, onEdit, onToggleStatus }) {
  const [failedImageSource, setFailedImageSource] = useState("");

  const statusClass = getBuildingStatusClass(building.status);
  const isActive = building.status === "Aktif";

  const imageSource = building.image || "";

  const imageFailed =
    Boolean(imageSource) && failedImageSource === imageSource;

  const hasValidImage = Boolean(imageSource) && !imageFailed;

  return (
    <article className="building-card">
      <div className="building-image">
        {hasValidImage ? (
          <img
            key={imageSource}
            src={imageSource}
            alt={building.name || "Site / Apartman görseli"}
            loading="lazy"
            crossOrigin="use-credentials"
            onError={() => setFailedImageSource(imageSource)}
          />
        ) : (
          <div className="building-image-placeholder">
            <div className="building-image-placeholder-icon">
              <Building2 size={56} strokeWidth={1.7} />
            </div>

            <strong>Apartman / Rezidans</strong>
            <span>Görsel bulunamadı</span>
          </div>
        )}

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
          <button
            type="button"
            onClick={() => onView(building)}
            aria-label={`${building.name || "Kayıt"} detayını görüntüle`}
          >
            <Eye size={16} />
            Görüntüle
          </button>

          <button
            type="button"
            onClick={() => onEdit(building)}
            aria-label={`${building.name || "Kayıt"} düzenle`}
          >
            <Pencil size={16} />
            Düzenle
          </button>

          {onToggleStatus && (
            <button
              type="button"
              className="danger-button"
              onClick={() => onToggleStatus(building)}
              aria-label={`${building.name || "Kayıt"} durumunu değiştir`}
            >
              <Power size={16} />

              {isActive ? "Pasifleştir" : "Aktifleştir"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default BuildingCard;