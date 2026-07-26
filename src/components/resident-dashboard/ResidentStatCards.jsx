import {
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
} from "lucide-react";

function ResidentStatCards({ stats }) {
  const cards = [
    {
      label: "Toplam Borç",
      value: stats.totalDebt,
      icon: CreditCard,
    },
    {
      label: "Ödenen Tutar",
      value: stats.paidAmount,
      icon: CheckCircle2,
    },
    {
      label: "Kalan Tutar",
      value: stats.remainingAmount,
      icon: Clock3,
    },
    {
      label: "Fazla Ödeme",
      value: stats.overpaymentAmount,
      icon: CircleDollarSign,
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
