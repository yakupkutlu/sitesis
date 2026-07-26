import {
  Bell,
  CreditCard,
  Home,
  ListTree,
  MessageSquareText,
  Settings,
  UploadCloud,
} from "lucide-react";

export const residentNavItems = [
  { label: "Panel", path: "/resident/dashboard", icon: Home },
  { label: "Aidat ve Ödemeler", path: "/resident/payments", icon: CreditCard },
  { label: "Gider Listesi", path: "/resident/expenses", icon: ListTree },
  { label: "Dekont Yükle", path: "/resident/receipts", icon: UploadCloud },
  { label: "Duyurular", path: "/resident/announcements", icon: Bell },
  { label: "Talepler", path: "/resident/requests", icon: MessageSquareText },
  { label: "Ayarlar", path: "/resident/settings", icon: Settings },
];