import { Eye, MessageSquareText, Paperclip } from "lucide-react";

function getRequestStatusClass(status) {
  if (status === "Çözüldü") {
    return "resolved";
  }

  if (status === "İnceleniyor") {
    return "reviewing";
  }

  if (status === "Reddedildi") {
    return "rejected";
  }

  return "new";
}

function getRequestPriorityClass(priority) {
  if (priority === "Acil") {
    return "high";
  }

  if (priority === "Önemli") {
    return "medium";
  }

  return "low";
}

function ResidentRequestCards({ requests, onView }) {
  const safeRequests = requests || [];

  if (safeRequests.length === 0) {
    return (
      <section className="resident-request-empty">
        Henüz oluşturulmuş talep bulunmuyor.
      </section>
    );
  }

  return (
    <section className="resident-request-cards-grid">
      {safeRequests.map((request) => {
        const statusClass = getRequestStatusClass(request.status);
        const priorityClass = getRequestPriorityClass(request.priority);
        const hasFile = Boolean(request.fileName);

        return (
          <article className="resident-request-card" key={request.id}>
            <div className="resident-request-card-top">
              <div className="resident-request-icon">
                <MessageSquareText size={21} />
              </div>

              <div className="resident-request-badges">
                <span
                  className={`resident-request-priority-badge ${priorityClass}`}
                >
                  {request.priority || "Normal"}
                </span>

                <span className={`resident-request-status-badge ${statusClass}`}>
                  {request.status || "Yeni"}
                </span>
              </div>
            </div>

            <div className="resident-request-card-content">
              <span>{request.requestNo || `#${request.id || "-"}`}</span>

              <h3>{request.title || "Başlıksız Talep"}</h3>

              <p>{request.description || "Talep açıklaması bulunmuyor."}</p>
            </div>

            <div className="resident-request-meta-grid">
              <div>
                <span>Kategori</span>
                <strong>{request.category || "-"}</strong>
              </div>

              <div>
                <span>Tarih</span>
                <strong>{request.createdAt || "-"}</strong>
              </div>

              <div>
                <span>Daire</span>
                <strong>{request.apartment || "-"}</strong>
              </div>

              <div>
                <span>Dosya</span>
                <strong>
                  {hasFile ? (
                    <>
                      <Paperclip size={14} />
                      {request.fileName}
                    </>
                  ) : (
                    "Dosya yok"
                  )}
                </strong>
              </div>
            </div>

            <div className="resident-request-answer-box">
              <span>Yönetici Cevabı</span>

              <p>{request.managerResponse || "Henüz yönetici cevabı yok."}</p>
            </div>

            <div className="resident-request-card-actions">
              <button
                type="button"
                onClick={() => onView(request)}
                aria-label={`${request.title || "Talep"} detayını görüntüle`}
              >
                <Eye size={16} />
                Görüntüle
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export default ResidentRequestCards;