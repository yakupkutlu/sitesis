import { CheckCircle2, Clock, ClipboardList, SearchCheck } from "lucide-react";

function ManagerRequestSummaryCards({ summary }) {
  const safeSummary = summary || {};

  const cards = [
    {
      label: "Toplam Talep",
      value: safeSummary.total || 0,
      icon: ClipboardList,
    },
    {
      label: "Yeni Talepler",
      value: safeSummary.newCount || 0,
      icon: Clock,
    },
    {
      label: "İnceleniyor",
      value: safeSummary.reviewingCount || 0,
      icon: SearchCheck,
    },
    {
      label: "Çözülen",
      value: safeSummary.resolvedCount || 0,
      icon: CheckCircle2,
    },
  ];

  return (
    <section className="manager-request-summary-grid">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div className="manager-request-summary-card" key={card.label}>
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

export default ManagerRequestSummaryCards;