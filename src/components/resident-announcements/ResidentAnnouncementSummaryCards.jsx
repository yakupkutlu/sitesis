import { Bell, CheckCircle2, Megaphone, TriangleAlert } from "lucide-react";

function ResidentAnnouncementSummaryCards({ summary }) {
  const cards = [
    {
      label: "Toplam Duyuru",
      value: summary.total,
      icon: Bell,
    },
    {
      label: "Okunmamış",
      value: summary.unread,
      icon: Megaphone,
    },
    {
      label: "Acil Duyuru",
      value: summary.urgent,
      icon: TriangleAlert,
    },
    {
      label: "Okunan",
      value: summary.read,
      icon: CheckCircle2,
    },
  ];

  return (
    <section className="resident-announcement-summary-grid">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div className="resident-announcement-summary-card" key={card.label}>
            <div>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>

            <Icon size={24} />
          </div>
        );
      })}
    </section>
  );
}

export default ResidentAnnouncementSummaryCards;