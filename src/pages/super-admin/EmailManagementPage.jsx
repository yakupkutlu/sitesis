import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  Info,
  Mail,
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
  createEmailSetting,
  deleteEmailSetting,
  getEmailSettings,
  updateEmailSetting,
} from "../../api/emailSettingsApi";
import EmailSettingsForm from "../../components/notifications/EmailSettingsForm";
import ManualNotificationForm from "../../components/notifications/ManualNotificationForm";
import NotificationInfoCard from "../../components/notifications/NotificationInfoCard";
import NotificationLogsPanel from "../../components/notifications/NotificationLogsPanel";
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
    path: "/super-admin/notifications/email",
    icon: Mail,
  },
  {
    label: "Genel Ayarlar",
    path: "/super-admin/settings",
    icon: Settings,
  },
];

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

function mapEmailSettingToFormData(setting) {
  if (!setting) {
    return { ...initialEmailSettings };
  }

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

function addOptionalText(payload, key, value) {
  const normalizedValue = String(value ?? "").trim();

  if (normalizedValue) {
    payload[key] = normalizedValue;
  }
}

function buildEmailPayload(formData, isUpdate) {
  const expiresAt = toExpiresAtPayload(formData.expiresAt, isUpdate);

  const payload = {
    provider: formData.provider,
    status: formData.status,
    smtpSecure: Boolean(formData.smtpSecure),
    fromEmail: formData.fromEmail.trim(),
  };

  if (expiresAt !== undefined) {
    payload.expiresAt = expiresAt;
  }

  if (formData.fromName.trim()) {
    payload.fromName = formData.fromName.trim();
  } else if (isUpdate) {
    payload.fromName = null;
  }

  if (formData.provider === "SMTP") {
    payload.smtpHost = formData.smtpHost.trim();
    payload.smtpPort = Number(formData.smtpPort);

    addOptionalText(payload, "smtpUsername", formData.smtpUsername);
    addOptionalText(payload, "smtpPassword", formData.smtpPassword);
  }

  if (formData.provider === "SENDGRID") {
    addOptionalText(payload, "sendgridApiKey", formData.sendgridApiKey);
  }

  return payload;
}

function validateEmailForm(formData) {
  if (!formData.fromEmail.trim()) {
    return "Gönderen e-posta adresi zorunludur.";
  }

  if (formData.provider === "SMTP") {
    if (!formData.smtpHost.trim()) {
      return "SMTP host zorunludur.";
    }

    const smtpPort = Number(formData.smtpPort);

    if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
      return "SMTP port 1 ile 65535 arasında geçerli bir sayı olmalıdır.";
    }

    if (!formData.smtpUsername.trim() && !formData.hasSmtpUsername) {
      return "SMTP kullanıcı adı zorunludur.";
    }

    if (!formData.smtpPassword.trim() && !formData.hasSmtpPassword) {
      return "SMTP şifresi zorunludur.";
    }
  }

  if (
    formData.provider === "SENDGRID" &&
    !formData.sendgridApiKey.trim() &&
    !formData.hasSendgridApiKey
  ) {
    return "SendGrid API key zorunludur.";
  }

  return "";
}

function EmailManagementPage() {
  const { user } = useAuth();

  const [settings, setSettings] = useState([]);
  const [formData, setFormData] = useState(initialEmailSettings);
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
        const result = await getEmailSettings();

        if (isCancelled) {
          return;
        }

        setSettings(getDataArray(result));
        setErrorMessage("");
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error?.message ?? "E-posta ayarları alınamadı."
          );
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
    setFormData({ ...initialEmailSettings });
    setMessage("");
    setErrorMessage("");
    setIsModalOpen(true);
  }

  function openEditModal(setting) {
    setFormData(mapEmailSettingToFormData(setting));
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
      if (name === "provider") {
        return {
          ...initialEmailSettings,
          id: current.id,
          status: current.status,
          expiresAt: current.expiresAt,
          fromEmail: current.fromEmail,
          fromName: current.fromName,
          provider: value,
        };
      }

      return {
        ...current,
        [name]: type === "checkbox" ? checked : value,
      };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationMessage = validateEmailForm(formData);

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
      const payload = buildEmailPayload(formData, isUpdate);

      const result = isUpdate
        ? await updateEmailSetting(formData.id, payload)
        : await createEmailSetting(payload);

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
          ? "E-posta ayarı başarıyla güncellendi."
          : "E-posta ayarı başarıyla eklendi."
      );
    } catch (error) {
      setErrorMessage(
        error?.message ?? "E-posta ayarı kaydedilemedi."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(setting) {
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

      setSettings((current) =>
        current.filter((item) => item.id !== setting.id)
      );

      setMessage("E-posta ayarı başarıyla silindi.");
    } catch (error) {
      setErrorMessage(
        error?.message ?? "E-posta ayarı silinemedi."
      );
    } finally {
      setDeletingSettingId(null);
    }
  }

  function handleTestEmail() {
    setMessage(
      "Test gönderimi için aşağıdaki Manuel E-posta Gönder bölümünü kullanın."
    );
    setErrorMessage("");
  }

  function handleManualSendCompleted() {
    setLogsVersion((current) => current + 1);
  }

  const helpContent = (
    <section className="notification-help-grid">
      <NotificationInfoCard
        icon={Mail}
        title="E-posta Sağlayıcıları"
        description="Sistem e-postaları için SMTP veya SendGrid ayarlarını tanımlayın."
        items={[
          "Gönderen e-posta adresi ve adı belirlenebilir",
          "SMTP için host, port ve TLS tercihi yapılabilir",
          "Aktif ve süresi geçmemiş en yeni ayar kullanılır",
        ]}
      />

      <NotificationInfoCard
        icon={ShieldCheck}
        title="Güvenlik"
        description="Şifre ve API anahtarı frontend tarafına geri gönderilmez."
        items={[
          "Gizli bilgiler backend tarafında şifrelenir",
          "Kayıtlı şifreler yalnızca var/yok olarak gösterilir",
          "Ayar değişiklikleri audit log ile takip edilir",
        ]}
      />

      <NotificationInfoCard
        icon={Info}
        title="Gönderim Takibi"
        description="Manuel ve otomatik e-posta sonuçları aynı sayfadan izlenir."
        items={[
          "Sadece e-posta kanalına ait loglar gösterilir",
          "Başarılı, hatalı ve atlanan kayıtlar görüntülenir",
          "Alıcı, konu, mesaj ve hata bilgisi aranabilir",
        ]}
      />
    </section>
  );

  return (
    <DashboardLayout
      roleTitle="E-posta Yönetimi"
      roleBadge="Süper Admin"
      userName={user?.fullName ?? "Süper Admin"}
      navItems={navItems}
      theme="super-admin"
      helpTitle="E-posta Yönetimi Yardımı"
      helpContent={helpContent}
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">E-posta Yönetimi</span>
          <h2>E-posta Ayarları ve Gönderimler</h2>
          <p>
            E-posta sağlayıcılarını yönetin, seçili kullanıcılara manuel
            e-posta gönderin ve gönderim sonuçlarını takip edin.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-action-button"
          onClick={openCreateModal}
          disabled={isLoading}
        >
          <Plus size={18} />
          E-posta Ayarı Ekle
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
            <h3>Kayıtlı E-posta Ayarları</h3>
            <p>{settings.length} ayar kaydı bulunuyor.</p>
          </div>
        </div>

        {isLoading ? (
          <p className="notification-empty-state">
            E-posta ayarları yükleniyor...
          </p>
        ) : settings.length === 0 ? (
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
                {settings.map((setting) => {
                  const expiryStatus = getExpiryStatus(setting.expiresAt);

                  return (
                    <tr key={setting.id}>
                      <td>
                        <strong>{setting.provider}</strong>
                      </td>

                      <td>
                        <strong>{setting.fromName || "-"}</strong>
                        <span className="notification-source-text">
                          {setting.fromEmail || "-"}
                        </span>
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
        channel="EMAIL"
        onSent={handleManualSendCompleted}
      />

      <NotificationLogsPanel
        key={logsVersion}
        channel="EMAIL"
        title="E-posta Gönderim Kayıtları"
        description="Manuel ve otomatik e-posta gönderim sonuçlarını inceleyebilirsiniz."
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
            aria-label="E-posta ayarı formu"
          >
            <button
              type="button"
              className="notification-modal-close"
              onClick={closeModal}
              aria-label="E-posta ayarı formunu kapat"
              disabled={isSaving}
            >
              <X size={20} />
            </button>

            <EmailSettingsForm
              formData={formData}
              onInputChange={handleInputChange}
              onSubmit={handleSubmit}
              onTestEmail={handleTestEmail}
              isSaving={isSaving}
            />
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}

export default EmailManagementPage;