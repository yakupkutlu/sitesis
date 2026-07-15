import {
  BarChart3,
  Bell,
  CreditCard,
  Home,
  MessageSquareText,
  ReceiptText,
  Settings,
  TrendingDown,
  TrendingUp,
  UserRound,
  WalletCards,
} from "lucide-react";

export const managerNavItems = [
  { label: "Panel", path: "/manager/dashboard", icon: BarChart3 },
  { label: "Daireler", path: "/manager/apartments", icon: Home },
  { label: "Sakinler", path: "/manager/residents", icon: UserRound },
  {
    key: "accounting",
    label: "Kasa / Ön Muhasebe",
    icon: WalletCards,
    children: [
      {
        label: "Genel Bakış",
        path: "/manager/accounting",
        icon: BarChart3,
        end: true,
      },
      {
        label: "Gelirler",
        path: "/manager/accounting/income",
        icon: TrendingUp,
      },
      {
        label: "Giderler",
        path: "/manager/accounting/expenses",
        icon: TrendingDown,
      },
    ],
  },
  {
    label: "Aidat ve Ödemeler",
    path: "/manager/payments",
    icon: CreditCard,
  },
  { label: "Dekontlar", path: "/manager/receipts", icon: ReceiptText },
  { label: "Duyurular", path: "/manager/announcements", icon: Bell },
  { label: "Talepler", path: "/manager/requests", icon: MessageSquareText },
  { label: "Ayarlar", path: "/manager/settings", icon: Settings },
];
