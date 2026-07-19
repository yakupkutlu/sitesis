import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  Info,
  Mail,
  MessageSquare,
  MessageSquareText,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import {
  createSmsSetting,
  deleteSmsSetting,
  getSmsSettings,
  updateSmsSetting,
} from "../../api/smsSettingsApi";
import ManualNotificationForm from "../../components/notifications/ManualNotificationForm";
import NotificationInfoCard from "../../components/notifications/NotificationInfoCard";
import NotificationLogsPanel from "../../components/notifications/NotificationLogsPanel";
import SmsSettingsForm from "../../components/notifications/SmsSettingsForm";
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
  accountSid: "",
  authToken: "",
  hasUsername: false,
  hasPassword: false,
  hasApiKey: false,
  hasApiSecret: false,
  hasAccountSid: false,
  hasAuthToken: false,
};

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
}

function toDateInputValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toISOString().slice(0, 10);
}

function toExpiresAtPayload(value, allowNull) {
  if (!value) {
    return allowNull ? null : undefined;
  }

  return new Date(`${value}T23:59:59.999Z`).toISOString();
}

function formatDate(value) {
  if (!value) {
    return "Belirtilmedi";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Belirtilmedi"
    : date.toLocaleDateString("tr-TR");
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("tr-TR");
}

function getExpiryStatus(value) {
  if (!value) {
    return {
      label: "Süre Belirtilmedi",
      className: "none",
    };
  }

  const expiresAt = new Date(value);

  if (Number.isNaN(expiresAt.getTime())) {
    return {
      label: "Tarih Geçersiz",
      className: "expired",
    };
  }

  const differenceInDays = Math.ceil(
    (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (differenceInDays < 0) {
    return {
      label: "Süresi Doldu",
      className: "expired",
    };
  }

  if (differenceInDays <= 7) {
    return {
      label: `${differenceInDays} gün kaldı`,
      className: "soon",
    };
  }

  return {
    label: "Geçerli",
    className: "valid",
  };
}

function mapSmsSettingToFormData(setting) {
  if (!setting) {
    return { ...initialSmsSettings };
  }

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
    accountSid: "",
    authToken: "",
    hasUsername: Boolean(setting?.secrets?.hasUsername),
    hasPassword: Boolean(setting?.secrets?.hasPassword),
    hasApiKey: Boolean(setting?.secrets?.hasApiKey),
    hasApiSecret: Boolean(setting?.secrets?.hasApiSecret),
    hasAccountSid: Boolean(setting?.secrets?.hasAccountSid),
    hasAuthToken: Boolean(setting?.secrets?.hasAuthToken),
  };
}

function addOptionalText(payload, key, value) {
  const normalizedValue = String(value ?? "").trim();

  if (normalizedValue) {
    payload[key] = normalizedValue;
  }
}

function buildSmsPayload(formData, isUpdate) {
  const expiresAt = toExpiresAtPayload(formData.expiresAt, isUpdate);

  const payload = {
    provider: formData.provider,
    status: formData.status,
  };

  if (expiresAt !== undefined) {
    payload.expiresAt = expiresAt;
  }

  if (formData.provider === "NETGSM") {
    payload.senderName = formData.senderName.trim();
    addOptionalText(payload, "username", formData.username);
    addOptionalText(payload, "password", formData.password);
  }

  if (formData.provider === "ILETIMERKEZI") {
    payload.senderName = formData.senderName.trim();
    addOptionalText(payload, "apiKey", formData.apiKey);
    addOptionalText(payload, "apiSecret", formData.apiSecret);
  }

  if (formData.provider === "TWILIO") {
    payload.fromPhone = formData.fromPhone.trim();
    addOptionalText(payload, "accountSid", formData.accountSid);
    addOptionalText(payload, "authToken", formData.authToken);
    addOptionalText(payload, "apiKey", formData.apiKey);
    addOptionalText(payload, "apiSecret", formData.apiSecret);
  }

  return payload;
}

function validateSmsForm(formData) {
  if (formData.provider === "NETGSM") {
    if (!formData.senderName.trim()) {
      return "Netgsm gönderici başlığı zorunludur.";
    }

    if (!formData.username.trim() && !formData.hasUsername) {
      return "Netgsm kullanıcı adı zorunludur.";
    }

    if (!formData.password.trim() && !formData.hasPassword) {
      return "Netgsm şifresi zorunludur.";
    }
  }

  if (formData.provider === "ILETIMERKEZI") {
    if (!formData.senderName.trim()) {
      return "İleti Merkezi gönderici başlığı zorunludur.";
    }

    if (!formData.apiKey.trim() && !formData.hasApiKey) {
      return "İleti Merkezi API anahtarı zorunludur.";
    }

    if (!formData.apiSecret.trim() && !formData.hasApiSecret) {
      return "İleti Merkezi API hash bilgisi zorunludur.";
    }
  }

  if (formData.provider === "TWILIO") {
    if (!formData.fromPhone.trim()) {
      return "Twilio gönderen telefon numarası zorunludur.";
    }

    if (!formData.accountSid.trim() && !formData.hasAccountSid) {
      return "Twilio Account SID zorunludur.";
    }

    const hasAuthToken =
      Boolean(formData.authToken.trim()) || formData.hasAuthToken;

    const hasApiKeyPair =
      (Boolean(formData.apiKey.trim()) || formData.hasApiKey) &&
      (Boolean(formData.apiSecret.trim()) || formData.hasApiSecret);

    if (!hasAuthToken && !hasApiKeyPair) {
      return "Twilio için Auth Token veya API Key SID / Secret çifti zorunludur.";
    }
  }

  return "";
}

function SmsManagementPage() {
  const { user } = useAuth();

  const [settings, setSettings] = useState([]);
  const [formData, setFormData] = useState(initialSmsSettings);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingSettingId, setDeletingSettingId] = useState(null);
  const [logsVersion, setLogsVersion] = useState(0);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadSettings() {
      try {
        const result = await getSmsSettings();

        if (isCancelled) {
          return;
        }

        setSettings(getDataArray(result));
        setErrorMessage("");
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error?.message ?? "SMS ayarları alınamadı.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      isCancelled = true;
    };
  }, []);

  function openCreateModal() {
    setFormData({ ...initialSmsSettings });
    setMessage("");
    setErrorMessage("");
    setIsModalOpen(true);
  }

  function openEditModal(setting) {
    setFormData(mapSmsSettingToFormData(setting));
    setMessage("");
    setErrorMessage("");
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
  }

  function handleInputChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((current) => {
      const nextFormData = {
        ...current,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "provider") {
        return {
          ...initialSmsSettings,
          id: current.id,
          status: current.status,
          expiresAt: current.expiresAt,
          provider: value,
        };
      }

      return nextFormData;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationMessage = validateSmsForm(formData);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      setMessage("");
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      const isUpdate = Boolean(formData.id);
      const payload = buildSmsPayload(formData, isUpdate);

      const result = isUpdate
        ? await updateSmsSetting(formData.id, payload)
        : await createSmsSetting(payload);

      const savedSetting = result?.data ?? result;

      setSettings((current) =>
        isUpdate
          ? current.map((setting) =>
              setting.id === savedSetting.id ? savedSetting : setting
            )
          : [savedSetting, ...current]
      );

      setIsModalOpen(false);
      setMessage(
        isUpdate
          ? "SMS ayarı başarıyla güncellendi."
          : "SMS ayarı başarıyla eklendi."
      );
    } catch (error) {
      setErrorMessage(error?.message ?? "SMS ayarı kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(setting) {
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

      setSettings((current) =>
        current.filter((item) => item.id !== setting.id)
      );

      setMessage("SMS ayarı başarıyla silindi.");
    } catch (error) {
      setErrorMessage(error?.message ?? "SMS ayarı silinemedi.");
    } finally {
      setDeletingSettingId(null);
    }
  }

  function handleTestSms() {
    setMessage(
      "Test gönderimi için aşağıdaki Manuel SMS Gönder bölümünü kullanın."
    );
    setErrorMessage("");
  }

  function handleManualSendCompleted() {
    setLogsVersion((current) => current + 1);
  }

  const helpContent = (
    <section className="notification-help-grid">
      <NotificationInfoCard
        icon={MessageSquare}
        title="SMS Sağlayıcıları"
        description="Sistem için kullanılacak SMS sağlayıcısını güvenli biçimde tanımlayın."
        items={[
          "Netgsm, İleti Merkezi ve Twilio desteklenir",
          "Aktif ve süresi geçmemiş en yeni ayar kullanılır",
          "Sağlayıcıya göre yalnızca gerekli alanlar gösterilir",
        ]}
      />

      <NotificationInfoCard
        icon={ShieldCheck}
        title="Güvenlik"
        description="Gizli bilgiler frontend tarafında saklanmaz veya tekrar gösterilmez."
        items={[
          "API anahtarları backend tarafında şifrelenir",
          "Şifreler ve tokenlar loglara yazılmaz",
          "Ayar değişiklikleri audit log ile izlenir",
        ]}
      />

      <NotificationInfoCard
        icon={Info}
        title="Gönderim Takibi"
        description="Manuel ve otomatik SMS sonuçları aynı sayfadan takip edilir."
        items={[
          "Başarılı, hatalı ve atlanan kayıtlar görüntülenir",
          "Kayıtlar yalnızca SMS kanalına göre filtrelenir",
          "Alıcı ve hata bilgileri aranabilir",
        ]}
      />
    </section>
  );

  return (
    <DashboardLayout
      roleTitle="SMS Yönetimi"
      roleBadge="Süper Admin"
      userName={user?.fullName ?? "Süper Admin"}
      navItems={navItems}
      theme="super-admin"
      helpTitle="SMS Yönetimi Yardımı"
      helpContent={helpContent}
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">SMS Yönetimi</span>
          <h2>SMS Ayarları ve Gönderimler</h2>
          <p>
            SMS sağlayıcılarını yönetin, seçili kullanıcılara manuel SMS
            gönderin ve gönderim sonuçlarını takip edin.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-action-button"
          onClick={openCreateModal}
          disabled={isLoading}
        >
          <Plus size={18} />
          SMS Ayarı Ekle
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

      <section className="notification-setting-list-card">
        <div className="notification-setting-list-header">
          <div>
            <span className="section-kicker">Sağlayıcı Ayarları</span>
            <h3>Kayıtlı SMS Ayarları</h3>
            <p>{settings.length} ayar kaydı bulunuyor.</p>
          </div>
        </div>

        {isLoading ? (
          <p className="notification-empty-state">SMS ayarları yükleniyor...</p>
        ) : settings.length === 0 ? (
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
                {settings.map((setting) => {
                  const expiryStatus = getExpiryStatus(setting.expiresAt);

                  return (
                    <tr key={setting.id}>
                      <td>
                        <strong>{setting.provider}</strong>
                      </td>

                      <td>
                        {setting.senderName || setting.fromPhone || "-"}
                      </td>

                      <td>
                        <span
                          className={`notification-status-badge ${
                            setting.status === "ACTIVE"
                              ? "active"
                              : "passive"
                          }`}
                        >
                          {setting.status === "ACTIVE" ? "Aktif" : "Pasif"}
                        </span>
                      </td>

                      <td>
                        <strong>{formatDate(setting.expiresAt)}</strong>

                        <span
                          className={`notification-expiry-badge ${expiryStatus.className}`}
                        >
                          {expiryStatus.label}
                        </span>
                      </td>

                      <td>{formatDateTime(setting.updatedAt)}</td>

                      <td>
                        <div className="notification-table-actions">
                          <button
                            type="button"
                            className="notification-table-action"
                            onClick={() => openEditModal(setting)}
                            disabled={deletingSettingId === setting.id}
                          >
                            <Pencil size={16} />
                            Düzenle
                          </button>

                          <button
                            type="button"
                            className="notification-table-action danger"
                            onClick={() => {
                              void handleDelete(setting);
                            }}
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

      <ManualNotificationForm
        channel="SMS"
        onSent={handleManualSendCompleted}
      />

      <NotificationLogsPanel
        key={logsVersion}
        channel="SMS"
        title="SMS Gönderim Kayıtları"
        description="Manuel ve otomatik SMS gönderim sonuçlarını inceleyebilirsiniz."
      />

      {isModalOpen && (
        <div
          className="notification-settings-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <section
            className="notification-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-label="SMS ayarı formu"
          >
            <button
              type="button"
              className="notification-modal-close"
              onClick={closeModal}
              aria-label="SMS ayarı formunu kapat"
              disabled={isSaving}
            >
              <X size={20} />
            </button>

            <SmsSettingsForm
              formData={formData}
              onInputChange={handleInputChange}
              onSubmit={handleSubmit}
              onTestSms={handleTestSms}
              isSaving={isSaving}
            />
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}

export default SmsManagementPage;