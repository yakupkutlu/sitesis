import {
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
} from "lucide-react";

function ResidentPaymentSummaryCards({ summary }) {
  const cards = [
    {
      label: "Toplam Borç",
      value: summary.totalDebt,
      icon: CreditCard,
    },
    {
      label: "Ödenen Tutar",
      value: summary.paidAmount,
      icon: CheckCircle2,
    },
    {
      label: "Kalan Tutar",
      value: summary.remainingAmount,
      icon: Clock3,
    },
    {
      label: "Fazla Ödeme",
      value: summary.overpaymentAmount,
      icon: CircleDollarSign,
    },
  ];

  return (
    <section className="resident-payment-summary-grid">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div className="resident-payment-summary-card" key={card.label}>
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

export default ResidentPaymentSummaryCards;
