import { Archive, CheckCircle2, ClipboardList, FileText } from "lucide-react";

function ManagerAnnouncementSummaryCards({ summary }) {
  const cards = [
    {
      label: "Toplam Duyuru",
      value: summary.total,
      icon: ClipboardList,
    },
    {
      label: "Yayında",
      value: summary.published,
      icon: CheckCircle2,
    },
    {
      label: "Taslak",
      value: summary.draft,
      icon: FileText,
    },
    {
      label: "Arşivlenen",
      value: summary.archived,
      icon: Archive,
    },
  ];

  return (
    <section className="manager-announcement-summary-grid">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div className="manager-announcement-summary-card" key={card.label}>
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

export default ManagerAnnouncementSummaryCards;