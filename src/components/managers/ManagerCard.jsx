import { Eye, Mail, Pencil, Phone, Power, UserRound } from "lucide-react";

function getManagerStatusClass(status) {
  return status === "Aktif" ? "active" : "passive";
}

function ManagerCard({ manager, onView, onEdit, onToggleStatus }) {
  const statusClass = getManagerStatusClass(manager.status);
  const isActive = manager.status === "Aktif";

  return (
    <article className="manager-card">
      <div className="manager-card-top">
        <div className="manager-avatar">
          <UserRound size={26} />
        </div>

        <span className={`manager-status ${statusClass}`}>
          {manager.status || "Pasif"}
        </span>
      </div>

      <div className="manager-card-content">
        <span>{manager.title || "Yönetici"}</span>

        <h3>{manager.name || "İsimsiz Yönetici"}</h3>

        <div className="manager-info-list">
          <div>
            <Mail size={17} />
            <span>{manager.email || "E-posta bilgisi yok"}</span>
          </div>

          <div>
            <Phone size={17} />
            <span>{manager.phone || "Telefon bilgisi yok"}</span>
          </div>
        </div>

        <div className="manager-assigned-box">
          <span>Atandığı Site / Apartman</span>
          <strong>{manager.assignedBuilding || "Henüz atanmadı"}</strong>
        </div>

        <div className="manager-card-actions">
          <button
            type="button"
            onClick={() => onView(manager)}
            aria-label={`${manager.name || "Yönetici"} detayını görüntüle`}
          >
            <Eye size={16} />
            Görüntüle
          </button>

          <button
            type="button"
            onClick={() => onEdit(manager)}
            aria-label={`${manager.name || "Yönetici"} düzenle`}
          >
            <Pencil size={16} />
            Düzenle
          </button>

          <button
            type="button"
            className="danger-button"
            onClick={() => onToggleStatus(manager)}
            aria-label={`${manager.name || "Yönetici"} durumunu değiştir`}
          >
            <Power size={16} />
            {isActive ? "Pasifleştir" : "Aktifleştir"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default ManagerCard;