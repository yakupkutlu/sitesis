import { Bell, TriangleAlert } from "lucide-react";



function ResidentRecentAnnouncements({
  announcements = [],
  warnings = [],
}) {
  const safeAnnouncements = announcements.slice(0, 3);
  const safeWarnings = warnings.slice(0, 3);

  return (
    <section className="resident-dashboard-card resident-notices-card">
      <div className="resident-card-header resident-notices-card-header">
        <div>
          <span className="section-kicker">Duyurular / Uyarılar</span>
          <h3>Son Bildirimler</h3>
        </div>

        <div className="resident-notice-header-icons" aria-hidden="true">
          <span className="resident-notice-header-icon announcement">
            <Bell size={34} strokeWidth={2.2} />
          </span>

          <span className="resident-notice-header-icon warning">
            <TriangleAlert size={37} strokeWidth={2.4} />
          </span>
        </div>
      </div>

      <div className="resident-notice-preview-grid">
        <div className="resident-notice-preview-section">
          <div className="resident-notice-preview-title">
            <Bell size={30} strokeWidth={2.2} />
            <strong>Duyurular</strong>
          </div>

          <div className="resident-list resident-notice-list">
            {safeAnnouncements.map((announcement) => (
              <div
                className="resident-list-item resident-announcement-preview-item"
                key={announcement.id}
              >
                <span className="resident-announcement-preview-icon">
                  <Bell size={31} strokeWidth={2.2} />
                </span>

                <div>
                  <strong>{announcement.title}</strong>
                  <span>{announcement.date}</span>
                  <p>{announcement.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="resident-notice-preview-section">
          <div className="resident-notice-preview-title">
            <TriangleAlert size={32} strokeWidth={2.4} />
            <strong>Uyarılar</strong>
            {safeWarnings.length > 0 && (
              <span className="resident-warning-count">
                {safeWarnings.length}
              </span>
            )}
          </div>

          <div className="resident-list resident-notice-list">
            {safeWarnings.length > 0 ? (
              safeWarnings.map((warning) => (
                <div
                  className={`resident-list-item resident-warning-preview-item tone-${warning.tone}`}
                  key={warning.id}
                >
                  <span className="resident-warning-preview-icon">
                    <TriangleAlert size={38} strokeWidth={2.5} />
                  </span>

                  <div>
                    <strong>{warning.title}</strong>
                    <span>
                      {new Date(warning.date).toLocaleDateString("tr-TR")}
                    </span>
                    <p>{warning.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="resident-warning-empty">
                <TriangleAlert size={28} />
                <div>
                  <strong>Uyarı bulunmuyor</strong>
                  <p>Ödeme ve dekont işlemlerinizle ilgili güncel uyarı yok.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ResidentRecentAnnouncements;
