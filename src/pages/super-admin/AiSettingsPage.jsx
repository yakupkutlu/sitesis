import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  FileSearch,
  KeyRound,
  Mail,
  MessageSquareText,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import AiProviderForm from "../../components/ai-settings/AiProviderForm";
import AiUsageInfoCard from "../../components/ai-settings/AiUsageInfoCard";

import {
  createAiSetting,
  deleteAiSetting,
  getAiSettings,
  reorderAiSettings,
  testAiSettingConnection,
  updateAiSetting,
} from "../../api/aiSettingsApi";
import { useAuth } from "../../context/AuthContext";

const MAX_AI_SETTINGS = 50;

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
  { label: "Duyurular", path: "/super-admin/announcements", icon: Bell },
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
  { label: "SMS / E-posta", path: "/super-admin/notifications", icon: Mail },
  { label: "Genel Ayarlar", path: "/super-admin/settings", icon: Settings },
];

const emptyAiFormData = {
  id: null,
  provider: "GEMINI",
  status: "PASSIVE",
  name: "",
  modelName: "gemini-2.5-flash",
  baseUrl: "",
  apiKey: "",
  expiresAt: "",
  hasApiKey: false,
};

const providerLabelMap = {
  GEMINI: "Google Gemini",
  OPENAI: "OpenAI",
  CUSTOM: "Özel Sağlayıcı",
};

const failureCodeLabelMap = {
  AUTH_ERROR: "API Key Hatası",
  MODEL_OR_ENDPOINT_NOT_FOUND: "Model / Endpoint Hatası",
  RATE_LIMIT_OR_QUOTA: "Kota / İstek Sınırı",
  REQUEST_REJECTED: "İstek Reddedildi",
  SERVICE_UNAVAILABLE: "Servis Kullanılamıyor",
  TIMEOUT: "Zaman Aşımı",
  NETWORK_ERROR: "Ağ Hatası",
  INVALID_RESPONSE: "Geçersiz Cevap",
  UNKNOWN: "Bilinmeyen Hata",
};

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.settings)) return data.settings;

  return [];
}

function sortAiSettings(settings) {
  return [...settings].sort((first, second) => {
    const priorityDifference =
      Number(first.priority ?? 100) - Number(second.priority ?? 100);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
  });
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

function mapAiSettingToFormData(setting) {
  if (!setting) {
    return { ...emptyAiFormData };
  }

  return {
    id: setting.id ?? null,
    provider: setting.provider ?? "GEMINI",
    status: setting.status ?? "PASSIVE",
    name: setting.name ?? "",
    modelName:
      setting.modelName ??
      (setting.provider === "OPENAI" ? "gpt-4o-mini" : "gemini-2.5-flash"),
    baseUrl: setting.baseUrl ?? "",
    apiKey: "",
    expiresAt: toDateInputValue(setting.expiresAt),
    hasApiKey: Boolean(
      setting?.secrets?.hasApiKey ?? setting?.hasApiKey
    ),
  };
}

function buildAiSettingPayload(formData, isUpdate) {
  const payload = {
    provider: formData.provider,
    status: formData.status,
    name: formData.name.trim() || null,
    modelName: formData.modelName.trim() || null,
    baseUrl:
      formData.provider === "CUSTOM"
        ? formData.baseUrl.trim() || null
        : null,
    expiresAt: toExpiresAtPayload(formData.expiresAt, isUpdate),
  };

  if (payload.expiresAt === undefined) {
    delete payload.expiresAt;
  }

  if (formData.apiKey.trim()) {
    payload.apiKey = formData.apiKey.trim();
  }

  return payload;
}

function buildAiTestPayload(formData) {
  const payload = {
    provider: formData.provider,
    modelName: formData.modelName.trim() || null,
    baseUrl:
      formData.provider === "CUSTOM"
        ? formData.baseUrl.trim() || null
        : null,
  };

  if (formData.id) {
    payload.aiSettingId = formData.id;
  }

  if (formData.apiKey.trim()) {
    payload.apiKey = formData.apiKey.trim();
  }

  return payload;
}

function formatDate(value) {
  if (!value) return "Belirtilmedi";

  try {
    return new Date(value).toLocaleDateString("tr-TR");
  } catch {
    return "Belirtilmedi";
  }
}

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("tr-TR");
  } catch {
    return "-";
  }
}

function isPastDate(value) {
  if (!value) return false;

  const date = new Date(value);

  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
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

function getHealthStatus(setting) {
  if (setting.status !== "ACTIVE") {
    return {
      label: "Pasif",
      className: "passive",
      detail: "Bu ayar sistem tarafından kullanılmaz.",
    };
  }

  if (isPastDate(setting.expiresAt)) {
    return {
      label: "Süresi Doldu",
      className: "expired",
      detail: "Son kullanım tarihi geçtiği için atlanır.",
    };
  }

  if (setting.cooldownUntil && !isPastDate(setting.cooldownUntil)) {
    return {
      label: "Beklemede",
      className: "cooldown",
      detail: `${formatDateTime(setting.cooldownUntil)} tarihine kadar atlanır.`,
    };
  }

  if (Number(setting.consecutiveFailureCount ?? 0) > 0) {
    return {
      label: "Kontrol Gerekli",
      className: "warning",
      detail: `${setting.consecutiveFailureCount} ardışık hata kaydedildi.`,
    };
  }

  return {
    label: "Hazır",
    className: "ready",
    detail: "Sırası geldiğinde kullanılabilir.",
  };
}

function getTestSuccessMessage(result) {
  const data = result?.data ?? result;
  const latencyText =
    typeof data?.latencyMs === "number" ? ` (${data.latencyMs} ms)` : "";

  return `${data?.message ?? "AI bağlantı testi başarılı."}${latencyText}`;
}

function AiSettingsPage() {
  const { user } = useAuth();

  const [aiSettingsList, setAiSettingsList] = useState([]);
  const [formData, setFormData] = useState({ ...emptyAiFormData });
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingForm, setIsTestingForm] = useState(false);
  const [testingSettingId, setTestingSettingId] = useState("");
  const [deletingSettingId, setDeletingSettingId] = useState("");
  const [isReordering, setIsReordering] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadAiSettings() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const result = await getAiSettings();

        if (isMounted) {
          setAiSettingsList(sortAiSettings(getDataArray(result)));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error?.message ?? "AI ayarları alınamadı.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAiSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeSettingsCount = useMemo(
    () =>
      aiSettingsList.filter((setting) => setting.status === "ACTIVE").length,
    [aiSettingsList]
  );

  const readySettingsCount = useMemo(
    () =>
      aiSettingsList.filter(
        (setting) => getHealthStatus(setting).className === "ready"
      ).length,
    [aiSettingsList]
  );

  async function reloadAiSettings() {
    const result = await getAiSettings();
    const settings = sortAiSettings(getDataArray(result));
    setAiSettingsList(settings);
    return settings;
  }

  function openCreateForm() {
    if (aiSettingsList.length >= MAX_AI_SETTINGS) {
      setErrorMessage(
        `En fazla ${MAX_AI_SETTINGS} AI sağlayıcı ayarı eklenebilir.`
      );
      setMessage("");
      return;
    }

    setFormData({ ...emptyAiFormData });
    setIsFormOpen(true);
    setMessage("");
    setErrorMessage("");
  }

  function openEditForm(setting) {
    setFormData(mapAiSettingToFormData(setting));
    setIsFormOpen(true);
    setMessage("");
    setErrorMessage("");
  }

  function closeForm() {
    if (isSaving || isTestingForm) return;

    setIsFormOpen(false);
    setFormData({ ...emptyAiFormData });
  }

  function handleInputChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((current) => {
      const nextData = {
        ...current,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "provider") {
        if (value === "GEMINI") {
          nextData.modelName = "gemini-2.5-flash";
        }

        if (value === "OPENAI") {
          nextData.modelName = "gpt-4o-mini";
        }

        if (value === "CUSTOM") {
          nextData.modelName =
            current.provider === "CUSTOM" ? current.modelName : "";
        }

        if (value !== "CUSTOM") {
          nextData.baseUrl = "";
        }
      }

      return nextData;
    });
  }

  function validateForm({ forTest = false } = {}) {
    if (!formData.name.trim() && !forTest) {
      setErrorMessage("Ayar adı zorunludur.");
      setMessage("");
      return false;
    }

    if (formData.provider === "CUSTOM") {
      if (!formData.baseUrl.trim()) {
        setErrorMessage("Özel sağlayıcı için Base URL zorunludur.");
        setMessage("");
        return false;
      }

      try {
        const customUrl = new URL(formData.baseUrl.trim());

        if (customUrl.protocol !== "https:") {
          throw new Error("HTTPS gerekli.");
        }
      } catch {
        setErrorMessage(
          "Base URL geçerli ve HTTPS ile başlayan bir adres olmalıdır."
        );
        setMessage("");
        return false;
      }
    }

    const needsApiKey =
      forTest || (!formData.id && formData.status === "ACTIVE");

    if (needsApiKey && !formData.hasApiKey && !formData.apiKey.trim()) {
      setErrorMessage("Bu işlem için API key zorunludur.");
      setMessage("");
      return false;
    }

    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateForm()) return;

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      const isUpdate = Boolean(formData.id);
      const payload = buildAiSettingPayload(formData, isUpdate);

      if (isUpdate) {
        await updateAiSetting(formData.id, payload);
      } else {
        await createAiSetting(payload);
      }

      await reloadAiSettings();

      setIsFormOpen(false);
      setFormData({ ...emptyAiFormData });
      setMessage(
        isUpdate
          ? "AI ayarı başarıyla güncellendi."
          : "AI ayarı başarıyla eklendi."
      );
    } catch (error) {
      setErrorMessage(error?.message ?? "AI ayarı kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFormConnectionTest() {
    if (!validateForm({ forTest: true })) return;

    try {
      setIsTestingForm(true);
      setMessage("");
      setErrorMessage("");

      const result = await testAiSettingConnection(buildAiTestPayload(formData));

      setMessage(getTestSuccessMessage(result));
    } catch (error) {
      setErrorMessage(error?.message ?? "AI bağlantı testi başarısız.");
    } finally {
      if (formData.id) {
        try {
          await reloadAiSettings();
        } catch {
          // Test sonucu ana mesajı korunur.
        }
      }

      setIsTestingForm(false);
    }
  }

  async function handleSavedConnectionTest(setting) {
    try {
      setTestingSettingId(setting.id);
      setMessage("");
      setErrorMessage("");

      const result = await testAiSettingConnection({
        aiSettingId: setting.id,
      });

      setMessage(getTestSuccessMessage(result));
    } catch (error) {
      setErrorMessage(error?.message ?? "AI bağlantı testi başarısız.");
    } finally {
      try {
        await reloadAiSettings();
      } catch {
        // Test sonucu ana mesajı korunur.
      }

      setTestingSettingId("");
    }
  }

  async function handleMove(settingId, direction) {
    const orderedSettings = sortAiSettings(aiSettingsList);
    const currentIndex = orderedSettings.findIndex(
      (setting) => setting.id === settingId
    );
    const targetIndex = currentIndex + direction;

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= orderedSettings.length
    ) {
      return;
    }

    const nextSettings = [...orderedSettings];
    const currentSetting = nextSettings[currentIndex];
    const targetSetting = nextSettings[targetIndex];

    nextSettings[currentIndex] = targetSetting;
    nextSettings[targetIndex] = currentSetting;

    try {
      setIsReordering(true);
      setMessage("");
      setErrorMessage("");

      const result = await reorderAiSettings(
        nextSettings.map((setting) => setting.id)
      );

      setAiSettingsList(sortAiSettings(getDataArray(result)));
      setMessage("AI kullanım sırası güncellendi.");
    } catch (error) {
      setErrorMessage(error?.message ?? "AI ayar sırası güncellenemedi.");
    } finally {
      setIsReordering(false);
    }
  }

  async function handleDelete(setting) {
    const isConfirmed = window.confirm(
      `${setting.name || providerLabelMap[setting.provider]} ayarını kalıcı olarak silmek istiyor musunuz?`
    );

    if (!isConfirmed) return;

    try {
      setDeletingSettingId(setting.id);
      setMessage("");
      setErrorMessage("");

      const result = await deleteAiSetting(setting.id);
      const returnedSettings = getDataArray(result);

      if (returnedSettings.length > 0 || aiSettingsList.length === 1) {
        setAiSettingsList(sortAiSettings(returnedSettings));
      } else {
        await reloadAiSettings();
      }

      setMessage("AI ayarı başarıyla silindi.");
    } catch (error) {
      setErrorMessage(error?.message ?? "AI ayarı silinemedi.");
    } finally {
      setDeletingSettingId("");
    }
  }

  const helpContent = (
    <section className="ai-help-grid">
      <AiUsageInfoCard
        icon={FileSearch}
        title="Dekont Okuma"
        description="Yönetici dekont yüklediğinde Backend AI ayarlarını sırayla dener."
        items={[
          "Öncelik 1 ile başlanır",
          "Başarısız anahtar atlanarak sonraki ayara geçilir",
          "Başarılı sonuç yöneticiye eşleştirme önizlemesi olarak gösterilir",
        ]}
      />

      <AiUsageInfoCard
        icon={Sparkles}
        title="Yedekli Çalışma"
        description={`Aynı veya farklı sağlayıcılardan en fazla ${MAX_AI_SETTINGS} ayar eklenebilir.`}
        items={[
          "Sıra oklarla değiştirilebilir",
          "Cooldown içindeki ayara istek gönderilmez",
          "İlk başarılı sağlayıcıdan sonra işlem tamamlanır",
        ]}
      />

      <AiUsageInfoCard
        icon={ShieldCheck}
        title="API Güvenliği"
        description="API anahtarları yalnızca backend tarafında yönetilir."
        items={[
          "Anahtarlar şifreli saklanır",
          "Gerçek API key frontend'e geri gönderilmez",
          "Test ve ayar değişiklikleri audit log'a yazılır",
        ]}
      />

      <AiUsageInfoCard
        icon={Activity}
        title="Sağlık Bilgileri"
        description="Son başarı ve son hata ilgili API ayarının teknik durumudur."
        items={[
          "Bu bilgiler yöneticiyi değil API anahtarını gösterir",
          "429 hatasında anahtar geçici beklemeye alınır",
          "401 veya 403 hatasında ayar otomatik pasife alınır",
        ]}
      />
    </section>
  );

  return (
    <DashboardLayout
      roleTitle="AI API Ayarları"
      roleBadge="Süper Admin"
      userName={user?.fullName ?? "Süper Admin"}
      navItems={navItems}
      theme="super-admin"
      helpTitle="AI API Ayarları Yardımı"
      helpContent={helpContent}
    >
      <div className="dashboard-page-header">
        <div>
          <h2>AI API Ayarları</h2>
          <p>
            En fazla {MAX_AI_SETTINGS} AI ayarı ekleyebilir, kullanım sırasını
            belirleyebilir ve başarısız ayarlardan yedek sağlayıcıya otomatik
            geçiş yapabilirsiniz.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-action-button"
          onClick={openCreateForm}
          disabled={aiSettingsList.length >= MAX_AI_SETTINGS}
        >
          <Plus size={18} />
          {aiSettingsList.length >= MAX_AI_SETTINGS
            ? "AI Ayar Limiti Doldu"
            : "AI Ayarı Ekle"}
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

      <section className="ai-settings-summary">
        <div>
          <span>Toplam Ayar</span>
          <strong>
            {aiSettingsList.length} / {MAX_AI_SETTINGS}
          </strong>
        </div>

        <div>
          <span>Aktif Ayar</span>
          <strong>{activeSettingsCount}</strong>
        </div>

        <div>
          <span>Kullanıma Hazır</span>
          <strong>{readySettingsCount}</strong>
        </div>

        <div>
          <span>Sağlayıcı Türü</span>
          <strong>
            {new Set(aiSettingsList.map((setting) => setting.provider)).size}
          </strong>
        </div>
      </section>

      <section className="ai-settings-list-card">
        <div className="ai-settings-list-header">
          <div>
            <span className="section-kicker">Yedekli Kullanım Sırası</span>
            <h3>Yapay Zeka Sağlayıcıları</h3>
            <p>
              Sistem önce 1.inci  sıraya dener. Süresi dolmuş, pasif veya cooldown
              içindeki kayıtları hiç çağırmadan sonraki sıraya geçer.
            </p>
          </div>
        </div>

        {isLoading ? (
          <p>AI ayarları yükleniyor...</p>
        ) : aiSettingsList.length === 0 ? (
          <p className="ai-empty-state">
            Henüz AI sağlayıcı ayarı eklenmemiş.
          </p>
        ) : (
          <div className="ai-settings-table-wrapper">
            <table className="ai-settings-table ai-fallback-table">
              <thead>
                <tr>
                  <th>Sıra</th>
                  <th>Sağlayıcı / Ayar</th>
                  <th>Model</th>
                  <th>Durum</th>
                  <th>Sağlık</th>
                  <th>Son Kullanım</th>
                  <th>Son Başarı</th>
                  <th>Son Hata</th>
                  <th>İşlem</th>
                </tr>
              </thead>

              <tbody>
                {sortAiSettings(aiSettingsList).map((setting, index, settings) => {
                  const expiry = getExpiryStatus(setting.expiresAt);
                  const health = getHealthStatus(setting);
                  const isTesting = testingSettingId === setting.id;
                  const isDeleting = deletingSettingId === setting.id;
                  const failureLabel =
                    failureCodeLabelMap[setting.lastFailureCode] ??
                    setting.lastFailureCode ??
                    "-";

                  return (
                    <tr key={setting.id}>
                      <td>
                        <div className="ai-priority-controls">
                          <span className="ai-priority-badge">
                            {setting.priority ?? index + 1}
                          </span>

                          <div>
                            <button
                              type="button"
                              onClick={() => handleMove(setting.id, -1)}
                              disabled={
                                index === 0 ||
                                isReordering ||
                                Boolean(testingSettingId) ||
                                Boolean(deletingSettingId)
                              }
                              aria-label={`${setting.name || "AI ayarı"} sırasını yükselt`}
                              title="Yukarı taşı"
                            >
                              <ArrowUp size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleMove(setting.id, 1)}
                              disabled={
                                index === settings.length - 1 ||
                                isReordering ||
                                Boolean(testingSettingId) ||
                                Boolean(deletingSettingId)
                              }
                              aria-label={`${setting.name || "AI ayarı"} sırasını düşür`}
                              title="Aşağı taşı"
                            >
                              <ArrowDown size={14} />
                            </button>
                          </div>
                        </div>
                      </td>

                      <td>
                        <strong>
                          {providerLabelMap[setting.provider] ??
                            setting.provider}
                        </strong>
                        <span className="ai-table-subtext">
                          {setting.name || "-"}
                        </span>
                      </td>

                      <td>{setting.modelName || "Varsayılan model"}</td>

                      <td>
                        <span
                          className={`ai-status-badge ${
                            setting.status === "ACTIVE"
                              ? "active"
                              : "passive"
                          }`}
                        >
                          {setting.status === "ACTIVE" ? "Aktif" : "Pasif"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`ai-health-badge ${health.className}`}
                          title={health.detail}
                        >
                          {health.label}
                        </span>

                        {setting.cooldownUntil &&
                          !isPastDate(setting.cooldownUntil) && (
                            <span className="ai-table-subtext">
                              {formatDateTime(setting.cooldownUntil)} tarihine
                              kadar
                            </span>
                          )}

                        {Number(setting.consecutiveFailureCount ?? 0) > 0 && (
                          <span className="ai-table-subtext">
                            Ardışık hata: {setting.consecutiveFailureCount}
                          </span>
                        )}
                      </td>

                      <td>
                        <strong>{formatDate(setting.expiresAt)}</strong>
                        <span
                          className={`ai-expiry-badge ${expiry.className}`}
                        >
                          {expiry.label}
                        </span>
                      </td>

                      <td>{formatDateTime(setting.lastSuccessAt)}</td>

                      <td>
                        <strong title={setting.lastFailureMessage || ""}>
                          {failureLabel}
                        </strong>
                        <span className="ai-table-subtext">
                          {formatDateTime(setting.lastFailureAt)}
                        </span>
                      </td>

                      <td>
                        <div className="ai-table-actions">
                          <button
                            type="button"
                            className="ai-table-action test"
                            onClick={() =>
                              handleSavedConnectionTest(setting)
                            }
                            disabled={
                              Boolean(testingSettingId) ||
                              Boolean(deletingSettingId) ||
                              isReordering
                            }
                          >
                            <KeyRound size={15} />
                            {isTesting ? "Test Ediliyor..." : "Test"}
                          </button>

                          <button
                            type="button"
                            className="ai-table-action edit"
                            onClick={() => openEditForm(setting)}
                            disabled={
                              Boolean(testingSettingId) ||
                              Boolean(deletingSettingId) ||
                              isReordering
                            }
                          >
                            <Pencil size={15} />
                            Düzenle
                          </button>

                          <button
                            type="button"
                            className="ai-table-action delete"
                            onClick={() => handleDelete(setting)}
                            disabled={
                              Boolean(testingSettingId) ||
                              Boolean(deletingSettingId) ||
                              isReordering
                            }
                          >
                            <Trash2 size={15} />
                            {isDeleting ? "Siliniyor..." : "Sil"}
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

      {isFormOpen && (
        <div
          className="ai-settings-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <section
            className="ai-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-label="AI ayarı formu"
          >
            <button
              type="button"
              className="ai-modal-close"
              onClick={closeForm}
              aria-label="AI ayarı formunu kapat"
              disabled={isSaving || isTestingForm}
            >
              <X size={20} />
            </button>

            <AiProviderForm
              formData={formData}
              onInputChange={handleInputChange}
              onSubmit={handleSubmit}
              onTestConnection={handleFormConnectionTest}
              isSaving={isSaving}
              isTesting={isTestingForm}
            />
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}

export default AiSettingsPage;
