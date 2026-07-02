import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Bell,
  CreditCard,
  Home,
  MessageSquareText,
  Settings,
  UploadCloud,
} from "lucide-react";

import ResidentStatCards from "../../components/resident-dashboard/ResidentStatCards";
import ResidentQuickActions from "../../components/resident-dashboard/ResidentQuickActions";
import ResidentPaymentOverview from "../../components/resident-dashboard/ResidentPaymentOverview";
import ResidentRecentAnnouncements from "../../components/resident-dashboard/ResidentRecentAnnouncements";
import ResidentOpenRequests from "../../components/resident-dashboard/ResidentOpenRequests";

const navItems = [
  { label: "Panel", path: "/resident/dashboard", icon: Home },
  { label: "Aidat ve Ödemeler", path: "/resident/payments", icon: CreditCard },
  { label: "Dekont Yükle", path: "/resident/receipts", icon: UploadCloud },
  { label: "Duyurular", path: "/resident/announcements", icon: Bell },
  { label: "Talepler", path: "/resident/requests", icon: MessageSquareText },
  { label: "Ayarlar", path: "/resident/settings", icon: Settings },
];

const residentInfo = {
  fullName: "Ali Can",
  role: "Kiracı",
  siteName: "Mavi Site",
  apartment: "A Blok / Daire 5",
};

const stats = {
  totalDebt: "3.750 TL",
  currentDue: "1.250 TL",
  pendingReceipts: "1",
  openRequests: "2",
};

const payment = {
  currentDue: "1.250 TL",
  paidAmount: "0 TL",
  remainingAmount: "1.250 TL",
  dueDate: "10.07.2026",
  status: "Ödeme Bekliyor",
  statusClass: "waiting",
  progress: 0,
};

const announcements = [
  {
    id: 1,
    title: "Su Kesintisi Bilgilendirmesi",
    date: "30.06.2026",
    description: "Yarın 10:00 - 13:00 saatleri arasında su kesintisi olacaktır.",
  },
  {
    id: 2,
    title: "Aidat Son Ödeme Hatırlatması",
    date: "29.06.2026",
    description: "Bu ayki aidat son ödeme tarihini kontrol ediniz.",
  },
];

const openRequests = [
  {
    id: 1,
    title: "Asansör çalışmıyor",
    category: "Arıza",
    status: "İnceleniyor",
    date: "30.06.2026",
  },
  {
    id: 2,
    title: "Otopark ışığı yanmıyor",
    category: "Bakım",
    status: "Yeni",
    date: "29.06.2026",
  },
];

function ResidentDashboard() {
  return (
    <DashboardLayout
      roleTitle="Panel"
      roleBadge="Sakin"
      userName={residentInfo.fullName}
      navItems={navItems}
      theme="resident"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Sakin Paneli</span>
          <h2>Hoş geldiniz, {residentInfo.fullName}</h2>
          <p>
            {residentInfo.siteName} / {residentInfo.apartment} için aidat,
            duyuru, dekont ve talep bilgilerinizi buradan takip edebilirsiniz.
          </p>
        </div>

        <div className="resident-info-badge">
          <span>{residentInfo.role}</span>
          <strong>{residentInfo.apartment}</strong>
        </div>
      </div>

      <ResidentStatCards stats={stats} />

      <div className="resident-dashboard-grid">
        <ResidentPaymentOverview payment={payment} />
        <ResidentQuickActions />
      </div>

      <div className="resident-dashboard-grid">
        <ResidentRecentAnnouncements announcements={announcements} />
        <ResidentOpenRequests requests={openRequests} />
      </div>
    </DashboardLayout>
  );
}

export default ResidentDashboard;