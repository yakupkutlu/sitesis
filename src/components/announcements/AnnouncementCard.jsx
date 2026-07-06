import { Eye, Megaphone, Pencil, Power } from "lucide-react";

function getAnnouncementStatusClass(status) {
  return status === "Yayında" ? "active" : "passive";
}

function AnnouncementCard({ announcement, onView, onEdit, onToggleStatus }) {
  const statusClass = getAnnouncementStatusClass(announcement.status);
  const isPublished = announcement.status === "Yayında";

  return (
    <article className="announcement-card">
      <div className="announcement-card-top">
        <div className="announcement-icon">
          <Megaphone size={25} />
        </div>

        <div className="announcement-badges">
          <span className={`announcement-status ${statusClass}`}>
            {announcement.status || "Arşiv"}
          </span>
        </div>
      </div>

      <div className="announcement-card-content">
        <span>{announcement.target || "Hedef belirtilmedi"}</span>

        <h3>{announcement.title || "Başlıksız Duyuru"}</h3>

        <p>{announcement.content || "Duyuru içeriği bulunmuyor."}</p>

        <div className="announcement-meta">
          <div>
            <span>Tarih</span>
            <strong>{announcement.createdAt || "-"}</strong>
          </div>

          <div>
            <span>Oluşturan</span>
            <strong>{announcement.createdBy || "-"}</strong>
          </div>

          <div>
            <span>Hedef</span>
            <strong>{announcement.targetTypeLabel || "-"}</strong>
          </div>
        </div>

        <div className="announcement-card-actions">
          <button
            type="button"
            onClick={() => onView(announcement)}
            aria-label={`${announcement.title || "Duyuru"} detayını görüntüle`}
          >
            <Eye size={16} />
            Görüntüle
          </button>

          <button
            type="button"
            onClick={() => onEdit(announcement)}
            aria-label={`${announcement.title || "Duyuru"} düzenle`}
          >
            <Pencil size={16} />
            Düzenle
          </button>

          <button
            type="button"
            className="danger-button"
            onClick={() => onToggleStatus(announcement)}
            aria-label={`${announcement.title || "Duyuru"} durumunu değiştir`}
          >
            <Power size={16} />
            {isPublished ? "Arşivle" : "Yayına Al"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default AnnouncementCard;
