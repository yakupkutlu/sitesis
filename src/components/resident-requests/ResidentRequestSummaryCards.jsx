import { CheckCircle2, Clock, MessageSquareText, SearchCheck } from "lucide-react";

function ResidentRequestSummaryCards({ summary }) {
  const safeSummary = summary || {};

  const cards = [
    {
      label: "Toplam Talep",
      value: safeSummary.total ?? 0,
      icon: MessageSquareText,
    },
    {
      label: "Yeni",
      value: safeSummary.newCount ?? 0,
      icon: Clock,
    },
    {
      label: "İnceleniyor",
      value: safeSummary.reviewing ?? 0,
      icon: SearchCheck,
    },
    {
      label: "Çözüldü",
      value: safeSummary.resolved ?? 0,
      icon: CheckCircle2,
    },
  ];

  return (
    <section className="resident-request-summary-grid">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div className="resident-request-summary-card" key={card.label}>
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

export default ResidentRequestSummaryCards;