import { useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  Info,
  Mail,
  MessageSquare,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import SmsSettingsForm from "../../components/notifications/SmsSettingsForm";
import EmailSettingsForm from "../../components/notifications/EmailSettingsForm";
import NotificationInfoCard from "../../components/notifications/NotificationInfoCard";

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
const initialSmsSettings = {
  provider: "Netgsm",
  senderTitle: "",
  username: "",
  apiKey: "",
  isActive: false,
};

const initialEmailSettings = {
  provider: "SMTP",
  senderName: "",
  host: "",
  port: "",
  email: "",
  password: "",
  useTls: true,
  isActive: false,
};

function NotificationsPage() {
  const [smsSettings, setSmsSettings] = useState(initialSmsSettings);
  const [emailSettings, setEmailSettings] = useState(initialEmailSettings);

  function handleSmsChange(event) {
    const { name, value, type, checked } = event.target;

    setSmsSettings((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleEmailChange(event) {
    const { name, value, type, checked } = event.target;

    setEmailSettings((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleSmsSubmit(event) {
  event.preventDefault();

  alert("SMS ayarları kaydedildi.");
  }

  function handleEmailSubmit(event) {
  event.preventDefault();

  alert("E-posta ayarları kaydedildi.");
  }

  return (
    <DashboardLayout
      roleTitle="SMS / E-posta"
      roleBadge="Süper Admin"
      userName="Alaa"
      navItems={navItems}
      theme="super-admin"
    >
      <div className="dashboard-page-header">
        <div>
          <h2>SMS ve E-posta Ayarları</h2>
          <p>
            Duyuru, aidat, ödeme ve talep süreçlerinde kullanılacak SMS ve
            e-posta gönderim ayarlarını buradan yönetebilirsiniz.
          </p>
        </div>
      </div>

      <section className="notification-info-grid">
        <NotificationInfoCard
          icon={MessageSquare}
          title="SMS Gönderimi"
          description="Sistem içindeki duyuru, aidat ve ödeme bilgilendirmeleri için SMS sağlayıcı ayarları yapılır."
          items={[
            "Netgsm, İleti Merkezi veya Twilio seçilebilir",
            "Gönderici başlığı tanımlanabilir",
            "Aktif edilirse ilgili işlemlerde SMS gönderimi kullanılabilir",
          ]}
        />

        <NotificationInfoCard
          icon={Mail}
          title="E-posta Gönderimi"
          description="Sakinlere, yöneticilere ve sistem kullanıcılarına e-posta bildirimi göndermek için kullanılır."
          items={[
            "SMTP veya SendGrid sağlayıcısı seçilebilir",
            "TLS güvenli bağlantı tercihi yapılabilir",
            "Duyuru ve ödeme hatırlatmalarında kullanılabilir",
          ]}
        />

        <NotificationInfoCard
          icon={ShieldCheck}
          title="Güvenlik Notu"
          description="SMS ve e-posta gönderim bilgileri yalnızca yetkili kişiler tarafından yönetilmelidir."
          items={[
            "Hassas bilgiler gizli tutulmalıdır",
            "Yetkisiz kişilerle paylaşılmamalıdır",
            "Ayar değişiklikleri sistem kayıtlarında takip edilmelidir",
          ]}
        />


        <NotificationInfoCard
          icon={Info}
          title="Gönderim Bilgileri"
          description="SMS ve e-posta gönderim ayarları bu sayfadan yönetilir."
          items={[
              "Kaydedilen ayarlar bildirim gönderiminde kullanılır",
              "Test gönderimi ile ayarlar kontrol edilebilir",
              "Başarılı ve hatalı gönderimler sistem kayıtlarında takip edilir",
          ]}
        />
      </section>

      <div className="notification-settings-grid">
        <SmsSettingsForm
          formData={smsSettings}
          onInputChange={handleSmsChange}
          onSubmit={handleSmsSubmit}
        />

        <EmailSettingsForm
          formData={emailSettings}
          onInputChange={handleEmailChange}
          onSubmit={handleEmailSubmit}
        />
      </div>
    </DashboardLayout>
  );
}

export default NotificationsPage;