import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  Mail,
  MessageSquareText,
  Plus,
  Settings,
  UserRound,
  Users,
} from "lucide-react";

const navItems = [
  { label: "Panel", path: "/super-admin/dashboard", icon: BarChart3 },
  { label: "Site / Apartmanlar", path: "/super-admin/buildings", icon: Building2 },
  { label: "Yöneticiler", path: "/super-admin/managers", icon: Users },
  { label: "Kullanıcılar / Sakinler", path: "/super-admin/users", icon: UserRound },
  { label: "Duyurular", path: "/super-admin/announcements", icon: Bell },
  { label: "AI API Ayarları", path: "/super-admin/ai-settings", icon: BrainCircuit },
  { label: "SMS / E-posta", path: "/super-admin/notifications", icon: Mail },
  { label: "Genel Ayarlar", path: "/super-admin/settings", icon: Settings },
];

const stats = [
  {
    label: "Toplam Site / Apartman",
    value: "24",
    description: "Sisteme kayıtlı yönetim alanı",
    icon: Building2,
  },
  {
    label: "Toplam Yönetici",
    value: "18",
    description: "Aktif yönetici hesabı",
    icon: Users,
  },
  {
    label: "Toplam Kullanıcı",
    value: "642",
    description: "Kiracı ve ev sahibi kayıtları",
    icon: UserRound,
  },
  {
    label: "Gönderilen Bildirim",
    value: "1.284",
    description: "SMS ve e-posta bilgilendirmeleri",
    icon: MessageSquareText,
  },
];

const recentActivities = [
  {
    title: "Yeni apartman eklendi",
    description: "Güneş Apartmanı sisteme kaydedildi.",
    icon: Building2,
  },
  {
    title: "Yeni sakin kaydı oluşturuldu",
    description: "Mavi Site / A Blok / Daire 5 için kiracı kaydı eklendi.",
    icon: UserRound,
  },
  {
    title: "AI dekont okuma kullanıldı",
    description: "12 dekont otomatik okuma kuyruğuna alındı.",
    icon: BrainCircuit,
  },
  {
    title: "E-posta ayarları güncellendi",
    description: "SMTP sağlayıcı bilgileri kontrol edildi.",
    icon: Mail,
  },
];

const quickActions = [
  {
    label: "Site / Apartman Oluştur",
    path: "/super-admin/buildings",
    icon: Building2,
  },
  {
    label: "Yönetici Ata",
    path: "/super-admin/managers",
    icon: Users,
  },
  {
    label: "Kullanıcıları Görüntüle",
    path: "/super-admin/users",
    icon: UserRound,
  },
  {
    label: "AI API Ayarları",
    path: "/super-admin/ai-settings",
    icon: BrainCircuit,
  },
  {
    label: "Genel Duyuru Yayınla",
    path: "/super-admin/announcements",
    icon: Bell,
  },
];

function SuperAdminDashboard() {
  return (
    <DashboardLayout
      roleTitle="Süper Admin Paneli"
      roleBadge="Süper Admin"
      userName="Alaa"
      navItems={navItems}
      theme="super-admin"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Genel Bakış</span>
          <h2>Süper Admin Paneli</h2>
          <p>
            Site, apartman, yönetici, kullanıcı, bildirim ve sistem ayarlarını
            buradan takip edebilirsiniz.
          </p>
        </div>

        <Link to="/super-admin/buildings" className="dashboard-action-button">
          <Plus size={18} />
          Yeni Site / Apartman
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
              <span className="section-kicker">Aktiviteler</span>
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
    </DashboardLayout>
  );
}

export default SuperAdminDashboard;