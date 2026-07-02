import { Bell, Eye, Pencil, Trash2 } from "lucide-react";

function ManagerAnnouncementCards({ announcements, onView, onEdit, onDelete }) {
  if (announcements.length === 0) {
    return (
      <section className="manager-announcement-empty">
        Arama kriterlerine uygun duyuru bulunamadı.
      </section>
    );
  }

  return (
    <section className="manager-announcement-cards-grid">
      {announcements.map((announcement) => {
        const statusClass =
          announcement.status === "Yayında"
            ? "published"
            : announcement.status === "Taslak"
            ? "draft"
            : "archived";

        return (
          <article className="manager-announcement-card" key={announcement.id}>
            <div className="manager-announcement-card-top">
              <div className="manager-announcement-icon">
                <Bell size={20} />
              </div>

              <span className={`manager-announcement-status ${statusClass}`}>
                {announcement.status}
              </span>
            </div>

            <div className="manager-announcement-card-content">
              <span className="manager-announcement-type">{announcement.type}</span>
              <h3>{announcement.title}</h3>
              <p>{announcement.content}</p>
            </div>

            <div className="manager-announcement-meta">
              <div>
                <span>Hedef</span>
                <strong>{announcement.targetText}</strong>
              </div>

              <div>
                <span>SMS</span>
                <strong>{announcement.sendSms}</strong>
              </div>

              <div>
                <span>E-posta</span>
                <strong>{announcement.sendEmail}</strong>
              </div>

              <div>
                <span>Tarih</span>
                <strong>{announcement.createdAt}</strong>
              </div>
            </div>

            <div className="manager-announcement-card-actions">
              <button type="button" onClick={() => onView(announcement)}>
                <Eye size={16} />
                Görüntüle
              </button>

              <button type="button" onClick={() => onEdit(announcement)}>
                <Pencil size={16} />
                Düzenle
              </button>

              <button
                type="button"
                className="danger-card-button"
                onClick={() => onDelete(announcement.id)}
              >
                <Trash2 size={16} />
                Sil
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export default ManagerAnnouncementCards;