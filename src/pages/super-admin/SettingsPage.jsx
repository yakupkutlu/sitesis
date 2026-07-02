import { useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  Globe2,
  Mail,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Users,
} from "lucide-react";

import GeneralSettingsForm from "../../components/settings/GeneralSettingsForm";
import SecuritySettingsForm from "../../components/settings/SecuritySettingsForm";
import SystemInfoCard from "../../components/settings/SystemInfoCard";

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

const systemInfoCards = [
  {
    icon: SlidersHorizontal,
    title: "Sistem Yapılandırması",
    description: "Uygulamanın temel çalışma ayarları bu bölümde düzenlenir.",
    items: [
      "Sistem ve marka adı belirlenir",
      "Varsayılan dil ve para birimi seçilir",
      "Bakım modu kontrol edilir",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Güvenlik Kuralları",
    description:
      "Kullanıcı girişleri ve hesap güvenliği için temel kurallar tanımlanır.",
    items: [
      "Oturum süresi belirlenir",
      "Şifre kuralları ayarlanır",
      "Hatalı giriş limiti uygulanır",
    ],
  },
  {
    icon: Globe2,
    title: "Yerel Ayarlar",
    description:
      "Sistemin kullanılacağı bölgeye göre dil, saat dilimi ve para birimi ayarlanır.",
    items: [
      "Türkiye için Europe/Istanbul seçilebilir",
      "TRY varsayılan para birimi yapılabilir",
      "Çoklu dil desteği planlanabilir",
    ],
  },
  {
    icon: Mail,
    title: "Destek Bilgileri",
    description:
      "Kullanıcıların sorun yaşadığında ulaşacağı destek bilgileri tanımlanır.",
    items: [
      "Destek e-posta adresi girilebilir",
      "Sistem açıklaması güncellenebilir",
      "Kullanıcı yönlendirmeleri yapılabilir",
    ],
  },
];

const initialGeneralSettings = {
  systemName: "Apartman Yönetim Sistemi",
  brandName: "Apartmanım",
  defaultLanguage: "Türkçe",
  currency: "TRY",
  timezone: "Europe/Istanbul",
  supportEmail: "",
  systemDescription:
    "Site, apartman, daire, aidat, ödeme, duyuru ve talep süreçlerini yönetmek için geliştirilen yönetim sistemi.",
  maintenanceMode: false,
  themeMode: "Açık",
};

const initialSecuritySettings = {
  sessionDuration: "60",
  minPasswordLength: "8",
  loginAttemptLimit: "5",
  lockDuration: "15",
  requireStrongPassword: true,
  enableTwoFactor: false,
  allowPublicRegister: false,
  logSecurityEvents: true,
};

function getInitialGeneralSettings() {
  return {
    ...initialGeneralSettings,
    themeMode:
      localStorage.getItem("superAdminThemeMode") ||
      initialGeneralSettings.themeMode,
  };
}

function SettingsPage() {
  const [generalSettings, setGeneralSettings] = useState(
    getInitialGeneralSettings
  );

  const [securitySettings, setSecuritySettings] = useState(
    initialSecuritySettings
  );

  const isDarkMode = generalSettings.themeMode.toLowerCase().includes("koyu");

  function handleGeneralChange(event) {
    const { name, value, type, checked } = event.target;

    const newGeneralSettings = {
      ...generalSettings,
      [name]: type === "checkbox" ? checked : value,
    };

    setGeneralSettings(newGeneralSettings);

    if (name === "themeMode") {
      localStorage.setItem("superAdminThemeMode", value);
    }
  }

  function handleSecurityChange(event) {
    const { name, value, type, checked } = event.target;

    setSecuritySettings((currentSettings) => ({
      ...currentSettings,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleGeneralSubmit(event) {
    event.preventDefault();

    localStorage.setItem("superAdminThemeMode", generalSettings.themeMode);

    alert("Genel ayarlar kaydedildi.");
  }

  function handleSecuritySubmit(event) {
    event.preventDefault();

    const sessionDuration = Number(securitySettings.sessionDuration);
    const minPasswordLength = Number(securitySettings.minPasswordLength);
    const loginAttemptLimit = Number(securitySettings.loginAttemptLimit);
    const lockDuration = Number(securitySettings.lockDuration);

    if (
      sessionDuration <= 0 ||
      minPasswordLength < 6 ||
      loginAttemptLimit <= 0 ||
      lockDuration <= 0
    ) {
      alert("Lütfen güvenlik ayarlarını geçerli değerlerle doldurunuz.");
      return;
    }

    alert("Güvenlik ayarları kaydedildi.");
  }

  return (
    <DashboardLayout
      roleTitle="Genel Ayarlar"
      roleBadge="Süper Admin"
      userName="Alaa"
      navItems={navItems}
      theme="super-admin"
      isDarkMode={isDarkMode}
    >
      <div className="dashboard-page-header">
        <div>
          <h2>Genel Ayarlar</h2>

          <p>
            Sistem adı, marka bilgileri, dil, para birimi, bakım modu ve temel
            güvenlik kurallarını buradan yönetebilirsiniz.
          </p>
        </div>
      </div>

      <section className="system-info-grid">
        {systemInfoCards.map((card) => (
          <SystemInfoCard
            key={card.title}
            icon={card.icon}
            title={card.title}
            description={card.description}
            items={card.items}
          />
        ))}
      </section>

      <div className="settings-layout">
        <GeneralSettingsForm
          formData={generalSettings}
          onInputChange={handleGeneralChange}
          onSubmit={handleGeneralSubmit}
        />

        <SecuritySettingsForm
          formData={securitySettings}
          onInputChange={handleSecurityChange}
          onSubmit={handleSecuritySubmit}
        />
      </div>
    </DashboardLayout>
  );
}

export default SettingsPage;