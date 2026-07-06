import { useEffect, useState } from "react";
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

import {
  createSmsSetting,
  getSmsSettings,
  updateSmsSetting,
} from "../../api/smsSettingsApi";
import {
  createEmailSetting,
  getEmailSettings,
  updateEmailSetting,
} from "../../api/emailSettingsApi";
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

const initialSmsSettings = {
  id: null,
  provider: "NETGSM",
  status: "PASSIVE",
  senderName: "",
  fromPhone: "",
  username: "",
  password: "",
  apiKey: "",
  apiSecret: "",
  hasUsername: false,
  hasPassword: false,
  hasApiKey: false,
  hasApiSecret: false,
};

const initialEmailSettings = {
  id: null,
  provider: "SMTP",
  status: "PASSIVE",
  fromEmail: "",
  fromName: "",
  smtpHost: "",
  smtpPort: "",
  smtpSecure: true,
  smtpUsername: "",
  smtpPassword: "",
  sendgridApiKey: "",
  hasSmtpUsername: false,
  hasSmtpPassword: false,
  hasSendgridApiKey: false,
};

function getFirstSetting(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) {
    return data[0] ?? null;
  }

  if (Array.isArray(data?.items)) {
    return data.items[0] ?? null;
  }

  return data ?? null;
}

function mapSmsSettingToFormData(setting) {
  if (!setting) {
    return initialSmsSettings;
  }

  return {
    id: setting.id ?? null,
    provider: setting.provider ?? "NETGSM",
    status: setting.status ?? "PASSIVE",
    senderName: setting.senderName ?? "",
    fromPhone: setting.fromPhone ?? "",
    username: "",
    password: "",
    apiKey: "",
    apiSecret: "",
    hasUsername: Boolean(setting?.secrets?.hasUsername),
    hasPassword: Boolean(setting?.secrets?.hasPassword),
    hasApiKey: Boolean(setting?.secrets?.hasApiKey),
    hasApiSecret: Boolean(setting?.secrets?.hasApiSecret),
  };
}

function mapEmailSettingToFormData(setting) {
  if (!setting) {
    return initialEmailSettings;
  }

  return {
    id: setting.id ?? null,
    provider: setting.provider ?? "SMTP",
    status: setting.status ?? "PASSIVE",
    fromEmail: setting.fromEmail ?? "",
    fromName: setting.fromName ?? "",
    smtpHost: setting.smtpHost ?? "",
    smtpPort: setting.smtpPort ? String(setting.smtpPort) : "",
    smtpSecure: Boolean(setting.smtpSecure),
    smtpUsername: "",
    smtpPassword: "",
    sendgridApiKey: "",
    hasSmtpUsername: Boolean(setting?.secrets?.hasSmtpUsername),
    hasSmtpPassword: Boolean(setting?.secrets?.hasSmtpPassword),
    hasSendgridApiKey: Boolean(setting?.secrets?.hasSendgridApiKey),
  };
}

function addTextValue(payload, key, value, { allowNull }) {
  const trimmedValue = String(value ?? "").trim();

  if (trimmedValue) {
    payload[key] = trimmedValue;
    return;
  }

  if (allowNull) {
    payload[key] = null;
  }
}

function buildSmsPayload(formData, isUpdate) {
  const payload = {
    provider: formData.provider,
    status: formData.status,
  };

  addTextValue(payload, "senderName", formData.senderName, {
    allowNull: isUpdate,
  });

  addTextValue(payload, "fromPhone", formData.fromPhone, {
    allowNull: isUpdate,
  });

  addTextValue(payload, "username", formData.username, {
    allowNull: false,
  });

  addTextValue(payload, "password", formData.password, {
    allowNull: false,
  });

  addTextValue(payload, "apiKey", formData.apiKey, {
    allowNull: false,
  });

  addTextValue(payload, "apiSecret", formData.apiSecret, {
    allowNull: false,
  });

  return payload;
}

function buildEmailPayload(formData, isUpdate) {
  const payload = {
    provider: formData.provider,
    status: formData.status,
    smtpSecure: Boolean(formData.smtpSecure),
  };

  addTextValue(payload, "fromEmail", formData.fromEmail, {
    allowNull: false,
  });

  addTextValue(payload, "fromName", formData.fromName, {
    allowNull: isUpdate,
  });

  if (formData.provider === "SMTP") {
    addTextValue(payload, "smtpHost", formData.smtpHost, {
      allowNull: isUpdate,
    });

    if (String(formData.smtpPort ?? "").trim()) {
      payload.smtpPort = Number(formData.smtpPort);
    } else if (isUpdate) {
      payload.smtpPort = null;
    }

    addTextValue(payload, "smtpUsername", formData.smtpUsername, {
      allowNull: false,
    });

    addTextValue(payload, "smtpPassword", formData.smtpPassword, {
      allowNull: false,
    });
  }

  if (formData.provider === "SENDGRID") {
    addTextValue(payload, "sendgridApiKey", formData.sendgridApiKey, {
      allowNull: false,
    });
  }

  return payload;
}

function NotificationsPage() {
  const { user } = useAuth();

  const [smsSettings, setSmsSettings] = useState(initialSmsSettings);
  const [emailSettings, setEmailSettings] = useState(initialEmailSettings);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSms, setIsSavingSms] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadNotificationSettings() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [smsResult, emailResult] = await Promise.all([
          getSmsSettings(),
          getEmailSettings(),
        ]);

        const smsSetting = getFirstSetting(smsResult);
        const emailSetting = getFirstSetting(emailResult);

        if (isMounted) {
          setSmsSettings(mapSmsSettingToFormData(smsSetting));
          setEmailSettings(mapEmailSettingToFormData(emailSetting));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error?.message ?? "Bildirim ayarları alınamadı."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadNotificationSettings();

    return () => {
      isMounted = false;
    };
  }, []);

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

  async function handleSmsSubmit(event) {
    event.preventDefault();

    try {
      setIsSavingSms(true);
      setMessage("");
      setErrorMessage("");

      const isUpdate = Boolean(smsSettings.id);
      const payload = buildSmsPayload(smsSettings, isUpdate);

      const result = isUpdate
        ? await updateSmsSetting(smsSettings.id, payload)
        : await createSmsSetting(payload);

      const savedSetting = result?.data ?? result;

      setSmsSettings(mapSmsSettingToFormData(savedSetting));
      setMessage("SMS ayarları başarıyla kaydedildi.");
    } catch (error) {
      setErrorMessage(error?.message ?? "SMS ayarları kaydedilemedi.");
    } finally {
      setIsSavingSms(false);
    }
  }

  async function handleEmailSubmit(event) {
    event.preventDefault();

    if (!emailSettings.fromEmail.trim()) {
      setErrorMessage("Gönderen e-posta boş bırakılamaz.");
      setMessage("");
      return;
    }

    if (
      emailSettings.provider === "SMTP" &&
      !emailSettings.id &&
      (!emailSettings.smtpHost.trim() ||
        !emailSettings.smtpPort.trim() ||
        !emailSettings.smtpUsername.trim() ||
        !emailSettings.smtpPassword.trim())
    ) {
      setErrorMessage(
        "Yeni SMTP ayarı oluşturmak için host, port, kullanıcı adı ve şifre zorunludur."
      );
      setMessage("");
      return;
    }

    if (
      emailSettings.provider === "SENDGRID" &&
      !emailSettings.id &&
      !emailSettings.sendgridApiKey.trim()
    ) {
      setErrorMessage("Yeni SendGrid ayarı için API key zorunludur.");
      setMessage("");
      return;
    }

    try {
      setIsSavingEmail(true);
      setMessage("");
      setErrorMessage("");

      const isUpdate = Boolean(emailSettings.id);
      const payload = buildEmailPayload(emailSettings, isUpdate);

      const result = isUpdate
        ? await updateEmailSetting(emailSettings.id, payload)
        : await createEmailSetting(payload);

      const savedSetting = result?.data ?? result;

      setEmailSettings(mapEmailSettingToFormData(savedSetting));
      setMessage("E-posta ayarları başarıyla kaydedildi.");
    } catch (error) {
      setErrorMessage(error?.message ?? "E-posta ayarları kaydedilemedi.");
    } finally {
      setIsSavingEmail(false);
    }
  }

  function handleTestSms() {
    setMessage(
      "Test SMS gönderimi için backend tarafında test endpointi eklendiğinde gerçek gönderim yapılacaktır."
    );
    setErrorMessage("");
  }

  function handleTestEmail() {
    setMessage(
      "Test e-posta gönderimi için backend tarafında test endpointi eklendiğinde gerçek gönderim yapılacaktır."
    );
    setErrorMessage("");
  }

  return (
    <DashboardLayout
      roleTitle="SMS / E-posta"
      roleBadge="Süper Admin"
      userName={user?.fullName ?? "Süper Admin"}
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

      {errorMessage && (
        <div className="login-error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      {message && (
        <div className="login-success-message">
          <p>{message}</p>
        </div>
      )}

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
            "Hassas bilgiler backend tarafında şifreli saklanır",
            "Frontend'e gerçek şifre veya API key geri gönderilmez",
            "Ayar değişiklikleri audit log ile takip edilir",
          ]}
        />

        <NotificationInfoCard
          icon={Info}
          title="Gönderim Bilgileri"
          description="SMS ve e-posta gönderim ayarları bu sayfadan yönetilir."
          items={[
            "Kaydedilen ayarlar bildirim gönderiminde kullanılır",
            "Test gönderimi için ayrıca backend test endpointi gerekir",
            "Başarılı ve hatalı gönderimler sistem kayıtlarında takip edilir",
          ]}
        />
      </section>

      {isLoading ? (
        <div className="dashboard-panel">
          <p>Bildirim ayarları yükleniyor...</p>
        </div>
      ) : (
        <div className="notification-settings-grid">
          <SmsSettingsForm
            formData={smsSettings}
            onInputChange={handleSmsChange}
            onSubmit={handleSmsSubmit}
            onTestSms={handleTestSms}
            isSaving={isSavingSms}
          />

          <EmailSettingsForm
            formData={emailSettings}
            onInputChange={handleEmailChange}
            onSubmit={handleEmailSubmit}
            onTestEmail={handleTestEmail}
            isSaving={isSavingEmail}
          />
        </div>
      )}
    </DashboardLayout>
  );
}

export default NotificationsPage;
