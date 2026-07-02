import { AlertCircle, CheckCircle2, ClipboardList, CreditCard } from "lucide-react";

function ResidentStatCards({ stats }) {
  const cards = [
    {
      label: "Toplam Borç",
      value: stats.totalDebt,
      icon: CreditCard,
    },
    {
      label: "Bu Ayki Aidat",
      value: stats.currentDue,
      icon: ClipboardList,
    },
    {
      label: "Bekleyen Dekont",
      value: stats.pendingReceipts,
      icon: AlertCircle,
    },
    {
      label: "Açık Talep",
      value: stats.openRequests,
      icon: CheckCircle2,
    },
  ];

  return (
    <section className="resident-stat-grid">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div className="resident-stat-card" key={card.label}>
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

export default ResidentStatCards;