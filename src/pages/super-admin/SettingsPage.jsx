import { useEffect, useState } from "react";
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

import {
  getSystemSettings,
  updateSystemSettings,
} from "../../api/systemSettingsApi";
import {
  getSystemSecuritySettings,
  updateSystemSecuritySettings,
} from "../../api/systemSecuritySettingsApi";
import { useAuth } from "../../context/AuthContext";

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
    description: "Uygulamanın temel marka ve iletişim ayarları bu bölümde düzenlenir.",
    items: [
      "Uygulama adı belirlenir",
      "Logo ve web sitesi bilgisi girilir",
      "İletişim bilgileri güncellenir",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Güvenlik Kuralları",
    description:
      "Kullanıcı girişleri ve hesap güvenliği için temel kurallar takip edilir.",
    items: [
      "Oturum süresi kontrol edilir",
      "Şifre kuralları kaydedilir",
      "Hatalı giriş limiti uygulanır",
    ],
  },
  {
    icon: Globe2,
    title: "Kurumsal Bilgiler",
    description:
      "Sistemin dış dünyaya göstereceği iletişim ve destek bilgileri tanımlanır.",
    items: [
      "Web sitesi adresi girilebilir",
      "Yönetim adresi saklanabilir",
      "Destek kanalları gösterilebilir",
    ],
  },
  {
    icon: Mail,
    title: "Destek Bilgileri",
    description:
      "Kullanıcıların sorun yaşadığında ulaşacağı destek bilgileri tanımlanır.",
    items: [
      "Destek e-posta adresi girilebilir",
      "Destek telefonu kaydedilebilir",
      "İletişim bilgileri merkezi tutulur",
    ],
  },
];

const initialGeneralSettings = {
  appName: "Konut Yönetim",
  logoUrl: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
  websiteUrl: "",
  supportEmail: "",
  supportPhone: "",
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

function mapSystemSettingsToFormData(settings) {
  return {
    appName: settings?.appName ?? initialGeneralSettings.appName,
    logoUrl: settings?.logoUrl ?? "",
    contactEmail: settings?.contactEmail ?? "",
    contactPhone: settings?.contactPhone ?? "",
    address: settings?.address ?? "",
    websiteUrl: settings?.websiteUrl ?? "",
    supportEmail: settings?.supportEmail ?? "",
    supportPhone: settings?.supportPhone ?? "",
    themeMode:
      localStorage.getItem("superAdminThemeMode") ||
      initialGeneralSettings.themeMode,
  };
}

function mapSecuritySettingsToFormData(settings) {
  return {
    sessionDuration: String(
      settings?.sessionDurationMinutes ??
        initialSecuritySettings.sessionDuration
    ),
    minPasswordLength: String(
      settings?.minPasswordLength ?? initialSecuritySettings.minPasswordLength
    ),
    loginAttemptLimit: String(
      settings?.loginAttemptLimit ?? initialSecuritySettings.loginAttemptLimit
    ),
    lockDuration: String(
      settings?.lockDurationMinutes ?? initialSecuritySettings.lockDuration
    ),
    requireStrongPassword:
      settings?.requireStrongPassword ??
      initialSecuritySettings.requireStrongPassword,
    enableTwoFactor:
      settings?.enableTwoFactor ?? initialSecuritySettings.enableTwoFactor,
    allowPublicRegister:
      settings?.allowPublicRegister ??
      initialSecuritySettings.allowPublicRegister,
    logSecurityEvents:
      settings?.logSecurityEvents ?? initialSecuritySettings.logSecurityEvents,
  };
}

function buildSystemSettingsPayload(formData) {
  return {
    appName: formData.appName.trim(),
    logoUrl: formData.logoUrl.trim() || null,
    contactEmail: formData.contactEmail.trim() || null,
    contactPhone: formData.contactPhone.trim() || null,
    address: formData.address.trim() || null,
    websiteUrl: formData.websiteUrl.trim() || null,
    supportEmail: formData.supportEmail.trim() || null,
    supportPhone: formData.supportPhone.trim() || null,
  };
}

function buildSecuritySettingsPayload(formData) {
  return {
    sessionDurationMinutes: Number(formData.sessionDuration),
    minPasswordLength: Number(formData.minPasswordLength),
    loginAttemptLimit: Number(formData.loginAttemptLimit),
    lockDurationMinutes: Number(formData.lockDuration),
    requireStrongPassword: Boolean(formData.requireStrongPassword),
    enableTwoFactor: Boolean(formData.enableTwoFactor),
    allowPublicRegister: Boolean(formData.allowPublicRegister),
    logSecurityEvents: Boolean(formData.logSecurityEvents),
  };
}

function SettingsPage() {
  const { user } = useAuth();

  const [generalSettings, setGeneralSettings] = useState(
    getInitialGeneralSettings
  );
  const [securitySettings, setSecuritySettings] = useState(
    initialSecuritySettings
  );

  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingGeneralSettings, setIsSavingGeneralSettings] = useState(false);
  const [isSavingSecuritySettings, setIsSavingSecuritySettings] =
    useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

  const isDarkMode = generalSettings.themeMode.toLowerCase().includes("koyu");

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        setIsLoadingSettings(true);
        setSettingsError("");

        const [systemResult, securityResult] = await Promise.all([
          getSystemSettings(),
          getSystemSecuritySettings(),
        ]);

        const systemSettings = systemResult?.data ?? systemResult;
        const securitySettingsData = securityResult?.data ?? securityResult;

        if (isMounted) {
          setGeneralSettings(mapSystemSettingsToFormData(systemSettings));
          setSecuritySettings(
            mapSecuritySettingsToFormData(securitySettingsData)
          );
        }
      } catch (error) {
        if (isMounted) {
          setSettingsError(error?.message ?? "Sistem ayarları alınamadı.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingSettings(false);
        }
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

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

  async function handleGeneralSubmit(event) {
    event.preventDefault();

    if (!generalSettings.appName.trim()) {
      setSettingsError("Uygulama adı boş bırakılamaz.");
      setSettingsMessage("");
      return;
    }

    try {
      setIsSavingGeneralSettings(true);
      setSettingsError("");
      setSettingsMessage("");

      localStorage.setItem("superAdminThemeMode", generalSettings.themeMode);

      const result = await updateSystemSettings(
        buildSystemSettingsPayload(generalSettings)
      );

      const updatedSettings = result?.data ?? result;

      setGeneralSettings(mapSystemSettingsToFormData(updatedSettings));
      setSettingsMessage("Genel ayarlar başarıyla kaydedildi.");
    } catch (error) {
      setSettingsError(error?.message ?? "Genel ayarlar kaydedilemedi.");
    } finally {
      setIsSavingGeneralSettings(false);
    }
  }

  async function handleSecuritySubmit(event) {
    event.preventDefault();

    const payload = buildSecuritySettingsPayload(securitySettings);

    if (
      payload.sessionDurationMinutes <= 0 ||
      payload.minPasswordLength < 6 ||
      payload.loginAttemptLimit <= 0 ||
      payload.lockDurationMinutes <= 0
    ) {
      setSettingsError("Lütfen güvenlik ayarlarını geçerli değerlerle doldurunuz.");
      setSettingsMessage("");
      return;
    }

    try {
      setIsSavingSecuritySettings(true);
      setSettingsError("");
      setSettingsMessage("");

      const result = await updateSystemSecuritySettings(payload);
      const updatedSettings = result?.data ?? result;

      setSecuritySettings(mapSecuritySettingsToFormData(updatedSettings));
      setSettingsMessage("Güvenlik ayarları başarıyla kaydedildi.");
    } catch (error) {
      setSettingsError(error?.message ?? "Güvenlik ayarları kaydedilemedi.");
    } finally {
      setIsSavingSecuritySettings(false);
    }
  }

  return (
    <DashboardLayout
      roleTitle="Genel Ayarlar"
      roleBadge="Süper Admin"
      userName={user?.fullName ?? "Süper Admin"}
      navItems={navItems}
      theme="super-admin"
      isDarkMode={isDarkMode}
    >
      <div className="dashboard-page-header">
        <div>
          <h2>Genel Ayarlar</h2>

          <p>
            Sistem adı, logo, iletişim, destek bilgileri ve temel güvenlik
            kurallarını buradan yönetebilirsiniz.
          </p>
        </div>
      </div>

      {settingsError && (
        <div className="login-error-message">
          <p>{settingsError}</p>
        </div>
      )}

      {settingsMessage && (
        <div className="login-success-message">
          <p>{settingsMessage}</p>
        </div>
      )}

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

      {isLoadingSettings ? (
        <div className="dashboard-panel">
          <p>Sistem ayarları yükleniyor...</p>
        </div>
      ) : (
        <div className="settings-layout">
          <GeneralSettingsForm
            formData={generalSettings}
            onInputChange={handleGeneralChange}
            onSubmit={handleGeneralSubmit}
            isSaving={isSavingGeneralSettings}
          />

          <SecuritySettingsForm
            formData={securitySettings}
            onInputChange={handleSecurityChange}
            onSubmit={handleSecuritySubmit}
            isSaving={isSavingSecuritySettings}
          />
        </div>
      )}
    </DashboardLayout>
  );
}

export default SettingsPage;
