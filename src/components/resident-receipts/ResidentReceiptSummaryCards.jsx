import { CheckCircle2, Clock, FileText, XCircle } from "lucide-react";

function ResidentReceiptSummaryCards({ summary }) {
  const safeSummary = summary || {};

  const cards = [
    {
      label: "Toplam Dekont",
      value: safeSummary.total ?? 0,
      icon: FileText,
    },
    {
      label: "Onay Bekleyen",
      value: safeSummary.waiting ?? 0,
      icon: Clock,
    },
    {
      label: "Onaylanan",
      value: safeSummary.approved ?? 0,
      icon: CheckCircle2,
    },
    {
      label: "Reddedilen",
      value: safeSummary.rejected ?? 0,
      icon: XCircle,
    },
  ];

  return (
    <section className="resident-receipt-summary-grid">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div className="resident-receipt-summary-card" key={card.label}>
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

export default ResidentReceiptSummaryCards;