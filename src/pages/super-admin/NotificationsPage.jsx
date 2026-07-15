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
  MessageSquareText,
  Pencil,
  Plus,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";

import SmsSettingsForm from "../../components/notifications/SmsSettingsForm";
import EmailSettingsForm from "../../components/notifications/EmailSettingsForm";
import NotificationInfoCard from "../../components/notifications/NotificationInfoCard";

import {
  createSmsSetting,
  deleteSmsSetting,
  getSmsSettings,
  updateSmsSetting,
} from "../../api/smsSettingsApi";
import {
  createEmailSetting,
  deleteEmailSetting,
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
  {
    label: "İletişim Mesajları",
    path: "/super-admin/contact-messages",
    icon: MessageSquareText,
  },
  { label: "AI API Ayarları", path: "/super-admin/ai-settings", icon: BrainCircuit },
  { label: "SMS / E-posta", path: "/super-admin/notifications", icon: Mail },
  { label: "Genel Ayarlar", path: "/super-admin/settings", icon: Settings },
];

const initialSmsSettings = {
  id: null,
  provider: "NETGSM",
  status: "PASSIVE",
  expiresAt: "",
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
  expiresAt: "",
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

const initialLogPagination = {
  page: 1,
  limit: 10,
  totalCount: 0,
  totalPages: 1,
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

function getPaginationMeta(result) {
  const pagination = result?.pagination ?? result?.data?.pagination;

  return {
    page: Number(pagination?.page) || 1,
    limit: Number(pagination?.limit) || 10,
    totalCount: Number(pagination?.totalCount) || 0,
    totalPages: Math.max(1, Number(pagination?.totalPages) || 1),
  };
}

function toDateInputValue(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function toExpiresAtPayload(value, allowNull) {
  if (!value) {
    return allowNull ? null : undefined;
  }

  return new Date(`${value}T23:59:59.999Z`).toISOString();
}

function mapSmsSettingToFormData(setting) {
  if (!setting) return { ...initialSmsSettings };

  return {
    id: setting.id ?? null,
    provider: setting.provider ?? "NETGSM",
    status: setting.status ?? "PASSIVE",
    expiresAt: toDateInputValue(setting.expiresAt),
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
  if (!setting) return { ...initialEmailSettings };

  return {
    id: setting.id ?? null,
    provider: setting.provider ?? "SMTP",
    status: setting.status ?? "PASSIVE",
    expiresAt: toDateInputValue(setting.expiresAt),
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
    expiresAt: toExpiresAtPayload(formData.expiresAt, isUpdate),
  };

  if (payload.expiresAt === undefined) {
    delete payload.expiresAt;
  }

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
    expiresAt: toExpiresAtPayload(formData.expiresAt, isUpdate),
  };

  if (payload.expiresAt === undefined) {
    delete payload.expiresAt;
  }

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

function formatDate(value) {
  if (!value) return "Belirtilmedi";

  try {
    return new Date(value).toLocaleDateString("tr-TR");
  } catch {
    return "Belirtilmedi";
  }
}

function getExpiryStatus(value) {
  if (!value) {
    return {
      label: "Süre Belirtilmedi",
      className: "none",
    };
  }

  const expiresAt = new Date(value);
  const now = new Date();

  if (Number.isNaN(expiresAt.getTime())) {
    return {
      label: "Tarih Geçersiz",
      className: "expired",
    };
  }

  const diffDays = Math.ceil(
    (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return {
      label: "Süresi Doldu",
      className: "expired",
    };
  }

  if (diffDays <= 7) {
    return {
      label: `${diffDays} gün kaldı`,
      className: "soon",
    };
  }

  return {
    label: "Geçerli",
    className: "valid",
  };
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

  if (!targetType) return "-";

  return targetTypeLabelMap[targetType] ?? targetType;
}

function getVisiblePageNumbers(currentPage, totalPages) {
  const pages = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  return pages;
}

function NotificationsPage() {
  const { user } = useAuth();

  const [smsSettingsList, setSmsSettingsList] = useState([]);
  const [emailSettingsList, setEmailSettingsList] = useState([]);

  const [smsFormData, setSmsFormData] = useState(initialSmsSettings);
  const [emailFormData, setEmailFormData] = useState(initialEmailSettings);
  const [settingsModal, setSettingsModal] = useState(null);

  const [notificationLogs, setNotificationLogs] = useState([]);
  const [logPagination, setLogPagination] = useState(initialLogPagination);
  const [logFilters, setLogFilters] = useState({
    channel: "",
    status: "",
    search: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isSavingSms, setIsSavingSms] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [deletingSettingId, setDeletingSettingId] = useState(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [logErrorMessage, setLogErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      getSmsSettings(),
      getEmailSettings(),
      getNotificationLogs({ page: 1, limit: 10 }),
    ])
      .then(([smsResult, emailResult, logsResult]) => {
        if (!isMounted) return;

        if (smsResult.status === "fulfilled") {
          setSmsSettingsList(getDataArray(smsResult.value));
        }

        if (emailResult.status === "fulfilled") {
          setEmailSettingsList(getDataArray(emailResult.value));
        }

        if (logsResult.status === "fulfilled") {
          setNotificationLogs(getDataArray(logsResult.value));
          setLogPagination(getPaginationMeta(logsResult.value));
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
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const notificationStats = useMemo(
    () => ({
      total: logPagination.totalCount,
      sent: notificationLogs.filter((log) => log.status === "SENT").length,
      pending: notificationLogs.filter((log) => log.status === "PENDING").length,
      failed: notificationLogs.filter((log) => log.status === "FAILED").length,
      skipped: notificationLogs.filter((log) => log.status === "SKIPPED").length,
    }),
    [notificationLogs, logPagination.totalCount]
  );

  const visibleLogPages = useMemo(
    () => getVisiblePageNumbers(logPagination.page, logPagination.totalPages),
    [logPagination.page, logPagination.totalPages]
  );

  async function loadNotificationLogs(
    nextFilters = logFilters,
    nextPage = logPagination.page
  ) {
    try {
      setIsLoadingLogs(true);
      setLogErrorMessage("");

      const result = await getNotificationLogs({
        page: nextPage,
        limit: logPagination.limit,
        channel: nextFilters.channel,
        status: nextFilters.status,
        search: nextFilters.search,
      });

      setNotificationLogs(getDataArray(result));
      setLogPagination(getPaginationMeta(result));
    } catch (error) {
      setLogErrorMessage(error?.message ?? "Bildirim kayıtları alınamadı.");
    } finally {
      setIsLoadingLogs(false);
    }
  }

  function openCreateSms() {
    setSmsFormData({ ...initialSmsSettings });
    setSettingsModal("sms");
    setMessage("");
    setErrorMessage("");
  }

  function openEditSms(setting) {
    setSmsFormData(mapSmsSettingToFormData(setting));
    setSettingsModal("sms");
    setMessage("");
    setErrorMessage("");
  }

  function openCreateEmail() {
    setEmailFormData({ ...initialEmailSettings });
    setSettingsModal("email");
    setMessage("");
    setErrorMessage("");
  }

  function openEditEmail(setting) {
    setEmailFormData(mapEmailSettingToFormData(setting));
    setSettingsModal("email");
    setMessage("");
    setErrorMessage("");
  }

  function closeSettingsModal() {
    setSettingsModal(null);
  }

  function handleSmsChange(event) {
    const { name, value, type, checked } = event.target;

    setSmsFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleEmailChange(event) {
    const { name, value, type, checked } = event.target;

    setEmailFormData((current) => ({
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
    await loadNotificationLogs(logFilters, 1);
  }

  async function handleSmsSubmit(event) {
    event.preventDefault();

    try {
      setIsSavingSms(true);
      setMessage("");
      setErrorMessage("");

      const isUpdate = Boolean(smsFormData.id);
      const payload = buildSmsPayload(smsFormData, isUpdate);

      const result = isUpdate
        ? await updateSmsSetting(smsFormData.id, payload)
        : await createSmsSetting(payload);

      const savedSetting = result?.data ?? result;

      setSmsSettingsList((current) =>
        isUpdate
          ? current.map((setting) =>
              setting.id === savedSetting.id ? savedSetting : setting
            )
          : [savedSetting, ...current]
      );

      setSettingsModal(null);
      setMessage(
        isUpdate
          ? "SMS ayarı başarıyla güncellendi."
          : "SMS ayarı başarıyla eklendi."
      );
    } catch (error) {
      setErrorMessage(error?.message ?? "SMS ayarı kaydedilemedi.");
    } finally {
      setIsSavingSms(false);
    }
  }

  async function handleEmailSubmit(event) {
    event.preventDefault();

    if (!emailFormData.fromEmail.trim()) {
      setErrorMessage("Gönderen e-posta boş bırakılamaz.");
      setMessage("");
      return;
    }

    if (
      emailFormData.provider === "SMTP" &&
      !emailFormData.id &&
      (!emailFormData.smtpHost.trim() ||
        !emailFormData.smtpPort.trim() ||
        !emailFormData.smtpUsername.trim() ||
        !emailFormData.smtpPassword.trim())
    ) {
      setErrorMessage(
        "Yeni SMTP ayarı için host, port, kullanıcı adı ve şifre zorunludur."
      );
      setMessage("");
      return;
    }

    if (
      emailFormData.provider === "SENDGRID" &&
      !emailFormData.id &&
      !emailFormData.sendgridApiKey.trim()
    ) {
      setErrorMessage("Yeni SendGrid ayarı için API key zorunludur.");
      setMessage("");
      return;
    }

    try {
      setIsSavingEmail(true);
      setMessage("");
      setErrorMessage("");

      const isUpdate = Boolean(emailFormData.id);
      const payload = buildEmailPayload(emailFormData, isUpdate);

      const result = isUpdate
        ? await updateEmailSetting(emailFormData.id, payload)
        : await createEmailSetting(payload);

      const savedSetting = result?.data ?? result;

      setEmailSettingsList((current) =>
        isUpdate
          ? current.map((setting) =>
              setting.id === savedSetting.id ? savedSetting : setting
            )
          : [savedSetting, ...current]
      );

      setSettingsModal(null);
      setMessage(
        isUpdate
          ? "E-posta ayarı başarıyla güncellendi."
          : "E-posta ayarı başarıyla eklendi."
      );
    } catch (error) {
      setErrorMessage(error?.message ?? "E-posta ayarı kaydedilemedi.");
    } finally {
      setIsSavingEmail(false);
    }
  }


  async function handleDeleteSms(setting) {
    const isConfirmed = window.confirm(
      `${setting.provider} SMS ayarını kalıcı olarak silmek istiyor musunuz?`
    );

    if (!isConfirmed) {
      return;
    }

    try {
      setDeletingSettingId(setting.id);
      setMessage("");
      setErrorMessage("");

      await deleteSmsSetting(setting.id);

      setSmsSettingsList((current) =>
        current.filter((item) => item.id !== setting.id)
      );
      setMessage("SMS ayarı başarıyla silindi.");
    } catch (error) {
      setErrorMessage(error?.message ?? "SMS ayarı silinemedi.");
    } finally {
      setDeletingSettingId(null);
    }
  }

  async function handleDeleteEmail(setting) {
    const isConfirmed = window.confirm(
      `${setting.provider} e-posta ayarını kalıcı olarak silmek istiyor musunuz?`
    );

    if (!isConfirmed) {
      return;
    }

    try {
      setDeletingSettingId(setting.id);
      setMessage("");
      setErrorMessage("");

      await deleteEmailSetting(setting.id);

      setEmailSettingsList((current) =>
        current.filter((item) => item.id !== setting.id)
      );
      setMessage("E-posta ayarı başarıyla silindi.");
    } catch (error) {
      setErrorMessage(error?.message ?? "E-posta ayarı silinemedi.");
    } finally {
      setDeletingSettingId(null);
    }
  }

  function handleTestSms() {
    setMessage(
      "Test SMS gönderimi için backend test endpointi eklendiğinde gerçek gönderim yapılacaktır."
    );
    setErrorMessage("");
  }

  function handleTestEmail() {
    setMessage(
      "Test e-posta gönderimi için backend test endpointi eklendiğinde gerçek gönderim yapılacaktır."
    );
    setErrorMessage("");
  }

  const helpContent = (
    <section className="notification-help-grid">
      <NotificationInfoCard
        icon={MessageSquare}
        title="SMS Gönderimi"
        description="Duyuru, aidat ve ödeme bilgilendirmeleri için SMS sağlayıcı ayarları yapılır."
        items={[
          "Netgsm, İleti Merkezi veya Twilio seçilebilir",
          "Gönderici başlığı ve son kullanım tarihi tanımlanabilir",
          "Aktif ve süresi geçmemiş ayarlar gönderimde kullanılır",
        ]}
      />

      <NotificationInfoCard
        icon={Mail}
        title="E-posta Gönderimi"
        description="Sistem kullanıcılarına SMTP veya SendGrid üzerinden e-posta gönderilir."
        items={[
          "SMTP veya SendGrid sağlayıcısı seçilebilir",
          "TLS güvenli bağlantı tercihi yapılabilir",
          "Süresi dolan ayarlar gönderimde kullanılmaz",
        ]}
      />

      <NotificationInfoCard
        icon={ShieldCheck}
        title="Güvenlik Notu"
        description="Gönderim bilgileri yalnızca yetkili kişiler tarafından yönetilmelidir."
        items={[
          "Gizli bilgiler backend tarafında şifreli saklanır",
          "Frontend'e gerçek şifre veya API key geri gönderilmez",
          "Ayar değişiklikleri audit log ile takip edilir",
        ]}
      />

      <NotificationInfoCard
        icon={Info}
        title="Gönderim Bilgileri"
        description="SMS ve e-posta kayıtları bu sayfadaki tablolardan takip edilir."
        items={[
          "Birden fazla sağlayıcı ayarı eklenebilir",
          "Düzenle butonu kayıtlı ayarı yeniden açar",
          "Gönderim logları sayfalı olarak görüntülenir",
        ]}
      />
    </section>
  );

  return (
    <DashboardLayout
      roleTitle="SMS / E-posta"
      roleBadge="Süper Admin"
      userName={user?.fullName ?? "Süper Admin"}
      navItems={navItems}
      theme="super-admin"
      helpTitle="SMS / E-posta Yardımı"
      helpContent={helpContent}
    >
      <div className="dashboard-page-header">
        <div>
          <h2>SMS ve E-posta Ayarları</h2>
          <p>
            Gönderim ayarlarını ekleyebilir, düzenleyebilir, son kullanım
            tarihlerini takip edebilir ve gönderim loglarını inceleyebilirsiniz.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-action-button secondary-action"
          onClick={() => loadNotificationLogs(logFilters, logPagination.page)}
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

      {isLoading ? (
        <div className="dashboard-panel">
          <p>Bildirim ayarları yükleniyor...</p>
        </div>
      ) : (
        <>
          <section className="notification-setting-list-card">
            <div className="notification-setting-list-header">
              <div>
                <span className="section-kicker">SMS Ayarları</span>
                <h3>Kayıtlı SMS Ayarları</h3>
                <p>{smsSettingsList.length} ayar kaydı bulunuyor.</p>
              </div>

              <button
                type="button"
                className="dashboard-action-button"
                onClick={openCreateSms}
              >
                <Plus size={18} />
                SMS Ayarı Ekle
              </button>
            </div>

            {smsSettingsList.length === 0 ? (
              <p className="notification-empty-state">
                Henüz SMS ayarı eklenmemiş.
              </p>
            ) : (
              <div className="notification-setting-table-wrapper">
                <table className="notification-setting-table">
                  <thead>
                    <tr>
                      <th>Sağlayıcı</th>
                      <th>Gönderici</th>
                      <th>Durum</th>
                      <th>Son Kullanım</th>
                      <th>Güncelleme</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>

                  <tbody>
                    {smsSettingsList.map((setting) => {
                      const expiry = getExpiryStatus(setting.expiresAt);

                      return (
                        <tr key={setting.id}>
                          <td>
                            <strong>{setting.provider}</strong>
                          </td>
                          <td>{setting.senderName || setting.fromPhone || "-"}</td>
                          <td>
                            <span
                              className={`notification-status-badge ${
                                setting.status === "ACTIVE" ? "active" : "passive"
                              }`}
                            >
                              {setting.status === "ACTIVE" ? "Aktif" : "Pasif"}
                            </span>
                          </td>
                          <td>
                            <strong>{formatDate(setting.expiresAt)}</strong>
                            <span
                              className={`notification-expiry-badge ${expiry.className}`}
                            >
                              {expiry.label}
                            </span>
                          </td>
                          <td>{formatDateTime(setting.updatedAt)}</td>
                          <td>
                            <div className="notification-table-actions">
                              <button
                                type="button"
                                className="notification-table-action"
                                onClick={() => openEditSms(setting)}
                                disabled={deletingSettingId === setting.id}
                              >
                                <Pencil size={16} />
                                Düzenle
                              </button>

                              <button
                                type="button"
                                className="notification-table-action danger"
                                onClick={() => handleDeleteSms(setting)}
                                disabled={deletingSettingId === setting.id}
                              >
                                <Trash2 size={16} />
                                {deletingSettingId === setting.id
                                  ? "Siliniyor..."
                                  : "Sil"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="notification-setting-list-card">
            <div className="notification-setting-list-header">
              <div>
                <span className="section-kicker">E-posta Ayarları</span>
                <h3>Kayıtlı E-posta Ayarları</h3>
                <p>{emailSettingsList.length} ayar kaydı bulunuyor.</p>
              </div>

              <button
                type="button"
                className="dashboard-action-button"
                onClick={openCreateEmail}
              >
                <Plus size={18} />
                E-posta Ayarı Ekle
              </button>
            </div>

            {emailSettingsList.length === 0 ? (
              <p className="notification-empty-state">
                Henüz e-posta ayarı eklenmemiş.
              </p>
            ) : (
              <div className="notification-setting-table-wrapper">
                <table className="notification-setting-table">
                  <thead>
                    <tr>
                      <th>Sağlayıcı</th>
                      <th>Gönderen</th>
                      <th>Durum</th>
                      <th>Son Kullanım</th>
                      <th>Güncelleme</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>

                  <tbody>
                    {emailSettingsList.map((setting) => {
                      const expiry = getExpiryStatus(setting.expiresAt);

                      return (
                        <tr key={setting.id}>
                          <td>
                            <strong>{setting.provider}</strong>
                          </td>
                          <td>{setting.fromEmail || "-"}</td>
                          <td>
                            <span
                              className={`notification-status-badge ${
                                setting.status === "ACTIVE" ? "active" : "passive"
                              }`}
                            >
                              {setting.status === "ACTIVE" ? "Aktif" : "Pasif"}
                            </span>
                          </td>
                          <td>
                            <strong>{formatDate(setting.expiresAt)}</strong>
                            <span
                              className={`notification-expiry-badge ${expiry.className}`}
                            >
                              {expiry.label}
                            </span>
                          </td>
                          <td>{formatDateTime(setting.updatedAt)}</td>
                          <td>
                            <div className="notification-table-actions">
                              <button
                                type="button"
                                className="notification-table-action"
                                onClick={() => openEditEmail(setting)}
                                disabled={deletingSettingId === setting.id}
                              >
                                <Pencil size={16} />
                                Düzenle
                              </button>

                              <button
                                type="button"
                                className="notification-table-action danger"
                                onClick={() => handleDeleteEmail(setting)}
                                disabled={deletingSettingId === setting.id}
                              >
                                <Trash2 size={16} />
                                {deletingSettingId === setting.id
                                  ? "Siliniyor..."
                                  : "Sil"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="dashboard-panel notification-log-panel">
            <div className="dashboard-panel-header">
              <div>
                <span className="section-kicker">Gönderim Kayıtları</span>
                <h3>SMS / E-posta Logları</h3>
              </div>
            </div>

            <div className="notification-log-stats-grid">
              <div>
                <span>Toplam Kayıt</span>
                <strong>{notificationStats.total}</strong>
              </div>

              <div>
                <span>Bu Sayfada Gönderildi</span>
                <strong>{notificationStats.sent}</strong>
              </div>

              <div>
                <span>Bu Sayfada Bekliyor</span>
                <strong>{notificationStats.pending}</strong>
              </div>

              <div>
                <span>Bu Sayfada Hatalı</span>
                <strong>{notificationStats.failed}</strong>
              </div>

              <div>
                <span>Bu Sayfada Atlandı</span>
                <strong>{notificationStats.skipped}</strong>
              </div>
            </div>

            <form
              className="notification-log-filter-bar"
              onSubmit={handleLogFilterSubmit}
            >
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
              <>
                <div className="notification-log-table-wrapper">
                  <table className="notification-log-table">
                    <thead>
                      <tr>
                        <th>Kanal</th>
                        <th>Durum</th>
                        <th>Alıcı</th>
                        <th>Hedef</th>
                        <th>Konu / Kaynak</th>
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
                                {sourceTypeLabelMap[log.sourceType] ??
                                  log.sourceType}
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

                <div className="notification-pagination">
                  <span>
                    Sayfa {logPagination.page} / {logPagination.totalPages}
                  </span>

                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        loadNotificationLogs(logFilters, logPagination.page - 1)
                      }
                      disabled={isLoadingLogs || logPagination.page <= 1}
                    >
                      Önceki
                    </button>

                    {visibleLogPages.map((page) => (
                      <button
                        type="button"
                        key={page}
                        className={page === logPagination.page ? "active" : ""}
                        onClick={() => loadNotificationLogs(logFilters, page)}
                        disabled={isLoadingLogs}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        loadNotificationLogs(logFilters, logPagination.page + 1)
                      }
                      disabled={
                        isLoadingLogs ||
                        logPagination.page >= logPagination.totalPages
                      }
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </>
      )}

      {settingsModal && (
        <div
          className="notification-settings-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeSettingsModal();
            }
          }}
        >
          <section
            className="notification-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              settingsModal === "sms"
                ? "SMS ayarı formu"
                : "E-posta ayarı formu"
            }
          >
            <button
              type="button"
              className="notification-modal-close"
              onClick={closeSettingsModal}
              aria-label="Ayar formunu kapat"
              disabled={isSavingSms || isSavingEmail}
            >
              <X size={20} />
            </button>

            {settingsModal === "sms" ? (
              <SmsSettingsForm
                formData={smsFormData}
                onInputChange={handleSmsChange}
                onSubmit={handleSmsSubmit}
                onTestSms={handleTestSms}
                isSaving={isSavingSms}
              />
            ) : (
              <EmailSettingsForm
                formData={emailFormData}
                onInputChange={handleEmailChange}
                onSubmit={handleEmailSubmit}
                onTestEmail={handleTestEmail}
                isSaving={isSavingEmail}
              />
            )}
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}

export default NotificationsPage;
