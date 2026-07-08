import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Clock,
  Info,
  Mail,
  MessageSquare,
  RefreshCcw,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  XCircle,
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
import { getNotificationLogs } from "../../api/notificationLogsApi";
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

const statusLabelMap = {
  PENDING: "Bekliyor",
  SENT: "Gönderildi",
  FAILED: "Hatalı",
  SKIPPED: "Atlandı",
};

const sourceTypeLabelMap = {
  MANUAL: "Manuel",
  PAYMENT_BATCH: "Aidat / Ödeme",
  ANNOUNCEMENT: "Duyuru",
  RESIDENT_REQUEST: "Talep",
  SYSTEM: "Sistem",
};

const targetTypeLabelMap = {
  ALL: "Tüm Sistem",
  SITE: "Site",
  BLOCK: "Blok",
  APARTMENT: "Daire",
};

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.notificationLogs)) return data.notificationLogs;

  return [];
}

function getFirstSetting(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data[0] ?? null;
  if (Array.isArray(data?.items)) return data.items[0] ?? null;

  return data ?? null;
}

function mapSmsSettingToFormData(setting) {
  if (!setting) return initialSmsSettings;

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
  if (!setting) return initialEmailSettings;

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

  addTextValue(payload, "senderName", formData.senderName, { allowNull: isUpdate });
  addTextValue(payload, "fromPhone", formData.fromPhone, { allowNull: isUpdate });
  addTextValue(payload, "username", formData.username, { allowNull: false });
  addTextValue(payload, "password", formData.password, { allowNull: false });
  addTextValue(payload, "apiKey", formData.apiKey, { allowNull: false });
  addTextValue(payload, "apiSecret", formData.apiSecret, { allowNull: false });

  return payload;
}

function buildEmailPayload(formData, isUpdate) {
  const payload = {
    provider: formData.provider,
    status: formData.status,
    smtpSecure: Boolean(formData.smtpSecure),
  };

  addTextValue(payload, "fromEmail", formData.fromEmail, { allowNull: false });
  addTextValue(payload, "fromName", formData.fromName, { allowNull: isUpdate });

  if (formData.provider === "SMTP") {
    addTextValue(payload, "smtpHost", formData.smtpHost, { allowNull: isUpdate });

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

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("tr-TR");
  } catch {
    return "-";
  }
}

function getRecipientText(log) {
  const recipientName = log?.recipientUser?.fullName;
  const recipientValue =
    log?.channel === "EMAIL"
      ? log?.recipientEmail || log?.recipientUser?.email
      : log?.recipientPhone || log?.recipientUser?.phone;

  if (recipientName && recipientValue) return `${recipientName} - ${recipientValue}`;
  return recipientName || recipientValue || "-";
}

function getStatusIcon(status) {
  if (status === "SENT") return CheckCircle2;
  if (status === "FAILED") return XCircle;
  if (status === "SKIPPED") return Info;
  return Clock;
}

function getTargetText(log) {
  const targetType = log?.metadata?.targetType;

  if (!targetType) {
    return "-";
  }

  return targetTypeLabelMap[targetType] ?? targetType;
}

function NotificationsPage() {
  const { user } = useAuth();

  const [smsSettings, setSmsSettings] = useState(initialSmsSettings);
  const [emailSettings, setEmailSettings] = useState(initialEmailSettings);
  const [notificationLogs, setNotificationLogs] = useState([]);
  const [logFilters, setLogFilters] = useState({
    channel: "",
    status: "",
    search: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isSavingSms, setIsSavingSms] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [logErrorMessage, setLogErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      getSmsSettings(),
      getEmailSettings(),
      getNotificationLogs({ page: 1, limit: 20 }),
    ])
      .then(([smsResult, emailResult, logsResult]) => {
        if (!isMounted) return;

        if (smsResult.status === "fulfilled") {
          setSmsSettings(mapSmsSettingToFormData(getFirstSetting(smsResult.value)));
        }

        if (emailResult.status === "fulfilled") {
          setEmailSettings(
            mapEmailSettingToFormData(getFirstSetting(emailResult.value))
          );
        }

        if (logsResult.status === "fulfilled") {
          setNotificationLogs(getDataArray(logsResult.value));
          setLogErrorMessage("");
        } else {
          setLogErrorMessage(
            logsResult.reason?.message ?? "Bildirim kayıtları alınamadı."
          );
        }

        if (smsResult.status === "rejected" || emailResult.status === "rejected") {
          setErrorMessage("Bildirim ayarları alınırken hata oluştu.");
        } else {
          setErrorMessage("");
        }
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const notificationStats = useMemo(
    () => ({
      total: notificationLogs.length,
      sent: notificationLogs.filter((log) => log.status === "SENT").length,
      pending: notificationLogs.filter((log) => log.status === "PENDING").length,
      failed: notificationLogs.filter((log) => log.status === "FAILED").length,
      skipped: notificationLogs.filter((log) => log.status === "SKIPPED").length,
    }),
    [notificationLogs]
  );

  async function loadNotificationLogs(nextFilters = logFilters) {
    try {
      setIsLoadingLogs(true);
      setLogErrorMessage("");

      const result = await getNotificationLogs({
        page: 1,
        limit: 20,
        channel: nextFilters.channel,
        status: nextFilters.status,
        search: nextFilters.search,
      });

      setNotificationLogs(getDataArray(result));
    } catch (error) {
      setLogErrorMessage(error?.message ?? "Bildirim kayıtları alınamadı.");
    } finally {
      setIsLoadingLogs(false);
    }
  }

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

  function handleLogFilterChange(event) {
    const { name, value } = event.target;

    setLogFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleLogFilterSubmit(event) {
    event.preventDefault();
    await loadNotificationLogs(logFilters);
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

        <button
          type="button"
          className="dashboard-action-button secondary-action"
          onClick={() => loadNotificationLogs(logFilters)}
          disabled={isLoadingLogs}
        >
          <RefreshCcw size={18} />
          {isLoadingLogs ? "Yenileniyor..." : "Kayıtları Yenile"}
        </button>
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
            "Bildirim kayıtları aşağıdaki tabloda takip edilir",
            "Atlandı durumu aktif SMS veya e-posta ayarı bulunmadığını gösterir",
            "Başarılı ve hatalı gönderimler sistem kayıtlarında görünür",
          ]}
        />
      </section>

      {isLoading ? (
        <div className="dashboard-panel">
          <p>Bildirim ayarları yükleniyor...</p>
        </div>
      ) : (
        <>
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

          <section className="dashboard-panel notification-log-panel">
            <div className="dashboard-panel-header">
              <div>
                <span className="section-kicker">Gönderim Kayıtları</span>
                <h3>SMS / E-posta Logları</h3>
              </div>
            </div>

            <div className="notification-log-stats-grid">
              <div>
                <span>Gösterilen Kayıt</span>
                <strong>{notificationStats.total}</strong>
              </div>

              <div>
                <span>Gönderildi</span>
                <strong>{notificationStats.sent}</strong>
              </div>

              <div>
                <span>Bekliyor</span>
                <strong>{notificationStats.pending}</strong>
              </div>

              <div>
                <span>Hatalı</span>
                <strong>{notificationStats.failed}</strong>
              </div>

              <div>
                <span>Atlandı</span>
                <strong>{notificationStats.skipped}</strong>
              </div>
            </div>

            <form className="notification-log-filter-bar" onSubmit={handleLogFilterSubmit}>
              <input
                type="search"
                name="search"
                value={logFilters.search}
                onChange={handleLogFilterChange}
                placeholder="Alıcı, konu, mesaj veya hata ara..."
              />

              <select
                name="channel"
                value={logFilters.channel}
                onChange={handleLogFilterChange}
              >
                <option value="">Tüm kanallar</option>
                <option value="EMAIL">E-posta</option>
                <option value="SMS">SMS</option>
              </select>

              <select
                name="status"
                value={logFilters.status}
                onChange={handleLogFilterChange}
              >
                <option value="">Tüm durumlar</option>
                <option value="PENDING">Bekliyor</option>
                <option value="SENT">Gönderildi</option>
                <option value="FAILED">Hatalı</option>
                <option value="SKIPPED">Atlandı</option>
              </select>

              <button
                type="submit"
                className="dashboard-action-button"
                disabled={isLoadingLogs}
              >
                Filtrele
              </button>
            </form>

            {logErrorMessage && (
              <div className="login-error-message">
                <p>{logErrorMessage}</p>
              </div>
            )}

            {isLoadingLogs ? (
              <p>Bildirim kayıtları yükleniyor...</p>
            ) : notificationLogs.length === 0 ? (
              <p>Henüz bildirim kaydı bulunmuyor.</p>
            ) : (
              <div className="notification-log-table-wrapper">
                <table className="notification-log-table">
                  <thead>
                    <tr>
                      <th>Kanal</th>
                      <th>Durum</th>
                      <th>Alıcı</th><th>Hedef</th><th>Konu / Kaynak</th>
                      <th>Mesaj</th>
                      <th>Sonuç</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>

                  <tbody>
                    {notificationLogs.map((log) => {
                      const StatusIcon = getStatusIcon(log.status);

                      return (
                        <tr key={log.id}>
                          <td>
                            <span className="notification-channel-pill">
                              {log.channel === "EMAIL" ? "E-posta" : "SMS"}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`notification-status-pill ${String(
                                log.status
                              ).toLowerCase()}`}
                            >
                              <StatusIcon size={14} />
                              {statusLabelMap[log.status] ?? log.status}
                            </span>
                          </td>

                          <td className="notification-recipient-cell">
                            {getRecipientText(log)}
                          </td>

                          <td>
                            <span className="notification-target-pill">
                              {getTargetText(log)}
                            </span>
                          </td>

                          <td>
                            <strong>{log.subject || "-"}</strong>
                            <span className="notification-source-text">
                              {sourceTypeLabelMap[log.sourceType] ?? log.sourceType}
                            </span>
                          </td>

                          <td>
                            <span className="notification-message-cell">
                              {log.message}
                            </span>
                          </td>

                          <td>
                            {log.errorMessage ? (
                              <span className="notification-error-text">
                                {log.errorMessage}
                              </span>
                            ) : (
                              <span className="notification-success-text">-</span>
                            )}
                          </td>

                          <td>{formatDateTime(log.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </DashboardLayout>
  );
}

export default NotificationsPage;


