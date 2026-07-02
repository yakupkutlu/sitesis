import {
  CalendarDays,
  Eye,
  FileText,
  History,
  Home,
  Pencil,
  Phone,
  UserRound,
} from "lucide-react";

function getPriorityClass(priority) {
  if (priority === "Yüksek") {
    return "high";
  }

  if (priority === "Düşük") {
    return "low";
  }

  return "medium";
}

function getStatusClass(status) {
  if (status === "Yeni") {
    return "new";
  }

  if (status === "İnceleniyor") {
    return "reviewing";
  }

  if (status === "Çözüldü") {
    return "resolved";
  }

  if (status === "Reddedildi") {
    return "rejected";
  }

  return "new";
}

function ManagerRequestCards({ requests, onView, onEdit, onHistory }) {
  const safeRequests = requests || [];

  if (safeRequests.length === 0) {
    return (
      <section className="manager-request-empty">
        Arama kriterlerine uygun talep bulunamadı.
      </section>
    );
  }

  return (
    <section className="manager-request-cards-grid">
      {safeRequests.map((request) => {
        const priorityClass = getPriorityClass(request.priority);
        const statusClass = getStatusClass(request.status);
        const hasFile = Boolean(request.fileName);

        return (
          <article
            className="manager-request-card"
            key={request.id || request.title}
          >
            <div className="manager-request-card-top">
              <div>
                <span className="manager-request-number">
                  Talep No #{request.id || "-"}
                </span>

                <h3>{request.title || "Başlıksız Talep"}</h3>
              </div>
            </div>

            <p className="manager-request-card-description">
              {request.description || "Talep açıklaması bulunmuyor."}
            </p>

            <div className="manager-request-badges-row">
              <span className="manager-request-category-badge">
                {request.category || "Genel"}
              </span>

              <span
                className={`manager-request-priority-badge ${priorityClass}`}
              >
                {request.priority || "Orta"}
              </span>

              <span className={`manager-request-status-badge ${statusClass}`}>
                {request.status || "Yeni"}
              </span>

              <span
                className={`manager-request-file-badge ${
                  hasFile ? "" : "empty"
                }`}
              >
                <FileText size={14} />
                {hasFile ? "Ek dosya var" : "Ek dosya yok"}
              </span>
            </div>

            <div className="manager-request-info-grid">
              <div>
                <UserRound size={17} />
                <span>Sakin</span>
                <strong>{request.residentName || "-"}</strong>
              </div>

              <div>
                <Phone size={17} />
                <span>Telefon</span>
                <strong>{request.phone || "-"}</strong>
              </div>

              <div>
                <Home size={17} />
                <span>Daire</span>
                <strong>{request.apartmentLabel || "-"}</strong>
              </div>

              <div>
                <CalendarDays size={17} />
                <span>Son Güncelleme</span>
                <strong>{request.updatedAt || request.createdAt || "-"}</strong>
              </div>
            </div>

            <div className="manager-request-card-actions">
              <button
                type="button"
                onClick={() => onView(request)}
                aria-label={`${request.title || "Talep"} detayını görüntüle`}
              >
                <Eye size={16} />
                Görüntüle
              </button>

              <button
                type="button"
                className="request-edit-button"
                onClick={() => onEdit(request)}
                aria-label={`${request.title || "Talep"} düzenle`}
              >
                <Pencil size={16} />
                Düzenle
              </button>

              <button
                type="button"
                className="request-history-button"
                onClick={() => onHistory(request)}
                aria-label={`${request.title || "Talep"} geçmişini görüntüle`}
              >
                <History size={16} />
                Geçmiş
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export default ManagerRequestCards;