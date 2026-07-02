import { Bell, Eye } from "lucide-react";

function ResidentAnnouncementCards({ announcements, onView }) {
  if (announcements.length === 0) {
    return (
      <section className="resident-announcement-empty">
        Arama kriterlerine uygun duyuru bulunamadı.
      </section>
    );
  }

  return (
    <section className="resident-announcement-cards-grid">
      {announcements.map((announcement) => {
        const typeClass =
          announcement.type === "Acil"
            ? "urgent"
            : announcement.type === "Ödeme"
            ? "payment"
            : announcement.type === "Bakım"
            ? "maintenance"
            : "general";

        return (
          <article
            className={`resident-announcement-card ${
              announcement.isRead ? "" : "unread"
            }`}
            key={announcement.id}
          >
            <div className="resident-announcement-card-top">
              <div className="resident-announcement-icon">
                <Bell size={21} />
              </div>

              <div className="resident-announcement-badge-row">
                {!announcement.isRead && (
                  <span className="resident-announcement-read-badge">
                    Okunmamış
                  </span>
                )}

                <span className={`resident-announcement-type-badge ${typeClass}`}>
                  {announcement.type}
                </span>
              </div>
            </div>

            <div className="resident-announcement-card-content">
              <span>{announcement.date}</span>
              <h3>{announcement.title}</h3>
              <p>{announcement.content}</p>
            </div>

            <div className="resident-announcement-meta-grid">
              <div>
                <span>Hedef</span>
                <strong>{announcement.target}</strong>
              </div>

              <div>
                <span>Gönderen</span>
                <strong>{announcement.sender}</strong>
              </div>
            </div>

            <div className="resident-announcement-card-actions">
              <button type="button" onClick={() => onView(announcement)}>
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

export default ResidentAnnouncementCards;