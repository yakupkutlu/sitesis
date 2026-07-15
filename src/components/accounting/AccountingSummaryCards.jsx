import {
  CircleDollarSign,
  Clock3,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import { formatKurus } from "../../utils/accounting";

function AccountingSummaryCards({ summary }) {
  const cards = [
    {
      label: "Kasa Bakiyesi",
      value: formatKurus(summary?.cashBalanceKurus),
      icon: WalletCards,
      tone: Number(summary?.cashBalanceKurus ?? 0) >= 0 ? "positive" : "negative",
      help: "Tahsil edilen gelirlerden aktif giderler çıkarılır.",
    },
    {
      label: "Tahsil Edilen Gelir",
      value: formatKurus(summary?.totalCollectedIncomeKurus),
      icon: TrendingUp,
      tone: "positive",
      help: "Sadece gerçekten ödenmiş aidat ve ek ödemeler.",
    },
    {
      label: "Toplam Gider",
      value: formatKurus(summary?.totalExpenseKurus),
      icon: TrendingDown,
      tone: "negative",
      help: "İptal edilmemiş gider kayıtlarının toplamı.",
    },
    {
      label: "Bekleyen Alacak",
      value: formatKurus(summary?.period?.outstandingIncomeKurus),
      icon: Clock3,
      tone: "warning",
      help: "Seçili dönemde henüz ödenmemiş tutar.",
    },
    {
      label: "Beklenen Gelir",
      value: formatKurus(summary?.totalExpectedIncomeKurus),
      icon: CircleDollarSign,
      tone: "neutral",
      help: "Ödenmiş ve bekleyen tüm aktif ödeme tahakkukları.",
    },
  ];

  return (
    <div className="accounting-summary-grid">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            className={`accounting-summary-card accounting-tone-${card.tone}`}
            key={card.label}
          >
            <span className="accounting-summary-icon">
              <Icon size={22} />
            </span>

            <div>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.help}</small>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default AccountingSummaryCards;
