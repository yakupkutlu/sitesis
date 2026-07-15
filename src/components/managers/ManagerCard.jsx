import {
  Eye,
  Mail,
  Pencil,
  Phone,
  Power,
  Trash2,
  UserRound,
} from "lucide-react";

function getManagerStatusClass(status) {
  return status === "Aktif" ? "active" : "passive";
}

function getAssignmentLabel(assignment) {
  if (!assignment) {
    return "Henüz atanmadı";
  }

  if (assignment.scopeType === "SITE") {
    return assignment.site?.name ?? "Site ataması";
  }

  const siteName = assignment.block?.site?.name;
  const blockName = assignment.block?.name;

  if (siteName && blockName) {
    return `${siteName} / ${blockName}`;
  }

  return blockName ?? "Blok / Apartman ataması";
}

function getAssignmentTypeLabel(assignment) {
  return assignment?.scopeType === "SITE" ? "Site" : "Blok";
}

function ManagerCard({
  manager,
  onView,
  onEdit,
  onToggleStatus,
  onDeleteAssignment,
  isSaving = false,
}) {
  const statusClass = getManagerStatusClass(manager.status);
  const isActive = manager.status === "Aktif";
  const assignments = Array.isArray(manager.assignments)
    ? manager.assignments
    : [];

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

        <div className="manager-card-assignment-section">
          <span className="manager-card-assignment-title">
            Yetki Alanları
          </span>

          {assignments.length > 0 ? (
            <div className="manager-card-assignment-list">
              {assignments.map((assignment) => (
                <div
                  className="manager-card-assignment-item"
                  key={assignment.id}
                >
                  <div>
                    <span>{getAssignmentTypeLabel(assignment)}</span>
                    <strong>{getAssignmentLabel(assignment)}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteAssignment(assignment)}
                    disabled={isSaving}
                    title="Bu yetkiyi kaldır"
                    aria-label={`${getAssignmentLabel(
                      assignment
                    )} yetkisini kaldır`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <strong className="manager-card-no-assignment">
              Henüz atanmadı
            </strong>
          )}
        </div>

        <div className="manager-card-actions">
          <button
            type="button"
            onClick={() => onView(manager)}
            aria-label={`${manager.name || "Yönetici"} detayını görüntüle`}
            disabled={isSaving}
          >
            <Eye size={16} />
            Görüntüle
          </button>

          <button
            type="button"
            onClick={() => onEdit(manager)}
            aria-label={`${manager.name || "Yönetici"} düzenle`}
            disabled={isSaving}
          >
            <Pencil size={16} />
            Düzenle
          </button>

          <button
            type="button"
            className="danger-button"
            onClick={() => onToggleStatus(manager)}
            aria-label={`${manager.name || "Yönetici"} durumunu değiştir`}
            disabled={isSaving}
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
