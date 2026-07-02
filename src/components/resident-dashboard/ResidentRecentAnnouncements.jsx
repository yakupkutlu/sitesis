import { Bell } from "lucide-react";

function ResidentRecentAnnouncements({ announcements }) {
  return (
    <section className="resident-dashboard-card">
      <div className="resident-card-header">
        <div>
          <span className="section-kicker">Duyurular</span>
          <h3>Son Duyurular</h3>
        </div>
      </div>

      <div className="resident-list">
        {announcements.map((announcement) => (
          <div className="resident-list-item" key={announcement.id}>
            <Bell size={18} />

            <div>
              <strong>{announcement.title}</strong>
              <span>{announcement.date}</span>
              <p>{announcement.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ResidentRecentAnnouncements;