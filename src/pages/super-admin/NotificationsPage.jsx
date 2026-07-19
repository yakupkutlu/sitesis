import {
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  Mail,
  MessageSquare,
  MessageSquareText,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import DashboardLayout from "../../layouts/DashboardLayout";

const navItems = [
  { label: "Panel", path: "/super-admin/dashboard", icon: BarChart3 },
  {
    label: "Site / Apartmanlar",
    path: "/super-admin/buildings",
    icon: Building2,
  },
  { label: "Yöneticiler", path: "/super-admin/managers", icon: Users },
  {
    label: "Kullanıcılar / Sakinler",
    path: "/super-admin/users",
    icon: UserRound,
  },
  {
    label: "Duyurular",
    path: "/super-admin/announcements",
    icon: Bell,
  },
  {
    label: "İletişim Mesajları",
    path: "/super-admin/contact-messages",
    icon: MessageSquareText,
  },
  {
    label: "AI API Ayarları",
    path: "/super-admin/ai-settings",
    icon: BrainCircuit,
  },
  {
    label: "SMS / E-posta",
    path: "/super-admin/notifications",
    icon: Mail,
  },
  {
    label: "Genel Ayarlar",
    path: "/super-admin/settings",
    icon: Settings,
  },
];

function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <DashboardLayout
      roleTitle="SMS / E-posta"
      roleBadge="Süper Admin"
      userName={user?.fullName ?? "Süper Admin"}
      navItems={navItems}
      theme="super-admin"
      helpTitle="Bildirim Yönetimi Yardımı"
      helpContent={
        <div>
          <p>
            SMS ve e-posta ayarları ayrı sayfalardan yönetilir. Her sayfada
            sağlayıcı ayarları, manuel gönderim alanı ve ilgili kanalın
            gönderim kayıtları bulunur.
          </p>
        </div>
      }
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Bildirim Yönetimi</span>
          <h2>SMS ve E-posta</h2>
          <p>
            Yönetmek istediğiniz iletişim kanalını seçin. SMS ve e-posta
            ayarları birbirinden bağımsız olarak yönetilir.
          </p>
        </div>
      </div>

      <section className="notification-setting-list-card">
        <div className="notification-card-header">
          <div className="notification-card-title">
            <div className="notification-card-icon">
              <MessageSquare size={24} />
            </div>

            <div>
              <span className="section-kicker">SMS</span>
              <h3>SMS Yönetimi</h3>
            </div>
          </div>
        </div>

        <p className="notification-card-description">
          Netgsm, İleti Merkezi veya Twilio ayarlarını yönetin. Yönetici,
          sakin veya doğrudan telefon numaralarına SMS gönderin ve yalnızca SMS
          kayıtlarını inceleyin.
        </p>

        <div className="notification-form-actions">
          <button
            type="button"
            className="dashboard-action-button"
            onClick={() => navigate("/super-admin/notifications/sms")}
          >
            <MessageSquare size={18} />
            SMS Yönetimine Git
          </button>
        </div>
      </section>

      <section className="notification-setting-list-card">
        <div className="notification-card-header">
          <div className="notification-card-title">
            <div className="notification-card-icon">
              <Mail size={24} />
            </div>

            <div>
              <span className="section-kicker">E-posta</span>
              <h3>E-posta Yönetimi</h3>
            </div>
          </div>
        </div>

        <p className="notification-card-description">
          SMTP veya SendGrid ayarlarını yönetin. Yönetici, sakin veya doğrudan
          e-posta adreslerine mesaj gönderin ve yalnızca e-posta kayıtlarını
          inceleyin.
        </p>

        <div className="notification-form-actions">
          <button
            type="button"
            className="dashboard-action-button"
            onClick={() => navigate("/super-admin/notifications/email")}
          >
            <Mail size={18} />
            E-posta Yönetimine Git
          </button>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default NotificationsPage;