import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  FileText,
  Home,
  MessageSquareText,
  Plus,
  ReceiptText,
  Settings,
  UploadCloud,
  UserRound,
  Users,
} from "lucide-react";

const navItems = [
  { label: "Panel", path: "/manager/dashboard", icon: BarChart3 },
  { label: "Daireler", path: "/manager/apartments", icon: Home },
  { label: "Sakinler", path: "/manager/residents", icon: UserRound },
  { label: "Aidat ve Ödemeler", path: "/manager/payments", icon: CreditCard },
  { label: "Dekontlar", path: "/manager/receipts", icon: UploadCloud },
  { label: "Duyurular", path: "/manager/announcements", icon: Bell },
  { label: "Talepler", path: "/manager/requests", icon: MessageSquareText },
  { label: "Ayarlar", path: "/manager/settings", icon: Settings },
];

const stats = [
  {
    label: "Toplam Daire",
    value: "48",
    description: "Yönetilen daire sayısı",
    icon: Home,
  },
  {
    label: "Aktif Sakin",
    value: "126",
    description: "Kiracı ve ev sahibi kayıtları",
    icon: Users,
  },
  {
    label: "Bu Ay Tahsilat",
    value: "84.500 TL",
    description: "Kaydedilen ödeme toplamı",
    icon: CreditCard,
  },
  {
    label: "Bekleyen Talep",
    value: "7",
    description: "Yanıt bekleyen sakin talepleri",
    icon: MessageSquareText,
  },
];

const recentActivities = [
  {
    title: "Yeni ödeme kaydedildi",
    description: "A Blok / Daire 12 için aidat ödemesi işlendi.",
    icon: CreditCard,
  },
  {
    title: "Yeni sakin eklendi",
    description: "B Blok / Daire 8 için kiracı kaydı oluşturuldu.",
    icon: UserRound,
  },
  {
    title: "Dekont yüklendi",
    description: "Bir ödeme dekontu kontrol listesine alındı.",
    icon: UploadCloud,
  },
  {
    title: "Yeni talep oluşturuldu",
    description: "Asansör bakım konusu için sakin talebi geldi.",
    icon: MessageSquareText,
  },
];

const quickActions = [
  {
    label: "Yeni Daire Ekle",
    path: "/manager/apartments",
    icon: Home,
  },
  {
    label: "Yeni Sakin Ekle",
    path: "/manager/residents",
    icon: UserRound,
  },
  {
    label: "Aidat / Gider Ekle",
    path: "/manager/payments",
    icon: ReceiptText,
  },
  {
    label: "Dekontları Kontrol Et",
    path: "/manager/receipts",
    icon: UploadCloud,
  },
  {
    label: "Duyuru Yayınla",
    path: "/manager/announcements",
    icon: Bell,
  },
];

function ManagerDashboard() {
  return (
    <DashboardLayout
      roleTitle="Yönetici Paneli"
      roleBadge="Yönetici"
      userName="Alaa"
      navItems={navItems}
      theme="manager"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Genel Bakış</span>
          <h2>Yönetici Paneli</h2>
          <p>
            Daireler, sakinler, aidat ödemeleri, dekontlar, duyurular ve talepler
            bu panel üzerinden yönetilir.
          </p>
        </div>

        <Link to="/manager/payments" className="dashboard-action-button">
          <Plus size={18} />
          Yeni Aidat / Gider
        </Link>
      </div>

      <section className="dashboard-stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article className="dashboard-stat-card" key={stat.label}>
              <div className="dashboard-stat-icon">
                <Icon size={24} />
              </div>

              <div>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <p>{stat.description}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="dashboard-panels-grid">
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <span className="section-kicker">Hareketler</span>
              <h3>Son İşlemler</h3>
            </div>
          </div>

          <div className="activity-list">
            {recentActivities.map((activity) => {
              const Icon = activity.icon;

              return (
                <div className="activity-item" key={activity.title}>
                  <div className="activity-icon">
                    <Icon size={18} />
                  </div>

                  <div>
                    <strong>{activity.title}</strong>
                    <p>{activity.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <span className="section-kicker">Kısayollar</span>
              <h3>Hızlı İşlemler</h3>
            </div>
          </div>

          <div className="quick-actions">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  to={action.path}
                  className="quick-action-link"
                  key={action.label}
                >
                  <Icon size={19} />
                  <span>{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="manager-dashboard-summary">
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <span className="section-kicker">Aidat Durumu</span>
              <h3>Bu Ay Ödeme Özeti</h3>
            </div>
          </div>

          <div className="manager-summary-grid">
            <div>
              <span>Toplam Borçlandırma</span>
              <strong>96.000 TL</strong>
            </div>

            <div>
              <span>Tahsil Edilen</span>
              <strong>84.500 TL</strong>
            </div>

            <div>
              <span>Kalan Borç</span>
              <strong>11.500 TL</strong>
            </div>

            <div>
              <span>Gecikmiş Ödeme</span>
              <strong>5 Daire</strong>
            </div>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <span className="section-kicker">Belgeler</span>
              <h3>Dekont Kontrolü</h3>
            </div>
          </div>

          <div className="manager-document-list">
            <div>
              <FileText size={18} />
              <span>Onay bekleyen dekont</span>
              <strong>4</strong>
            </div>

            <div>
              <Building2 size={18} />
              <span>Eşleşen ödeme</span>
              <strong>18</strong>
            </div>

            <div>
              <ReceiptText size={18} />
              <span>Eşleşme bekleyen kayıt</span>
              <strong>2</strong>
            </div>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default ManagerDashboard;