import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  FileSearch,
  KeyRound,
  Mail,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";

import AiProviderForm from "../../components/ai-settings/AiProviderForm";
import AiUsageInfoCard from "../../components/ai-settings/AiUsageInfoCard";

import {
  createAiSetting,
  getAiSettings,
  updateAiSetting,
} from "../../api/aiSettingsApi";
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

const initialAiSettings = {
  id: null,
  provider: "OPENAI",
  status: "PASSIVE",
  name: "",
  modelName: "",
  baseUrl: "",
  apiKey: "",
  hasApiKey: false,
};

function getFirstAiSetting(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) {
    return data[0] ?? null;
  }

  if (Array.isArray(data?.items)) {
    return data.items[0] ?? null;
  }

  if (Array.isArray(data?.aiSettings)) {
    return data.aiSettings[0] ?? null;
  }

  return data ?? null;
}

function mapAiSettingToFormData(setting) {
  if (!setting) {
    return initialAiSettings;
  }

  return {
    id: setting.id ?? null,
    provider: setting.provider ?? "OPENAI",
    status: setting.status ?? "PASSIVE",
    name: setting.name ?? "",
    modelName: setting.modelName ?? "",
    baseUrl: setting.baseUrl ?? "",
    apiKey: "",
    hasApiKey: Boolean(setting?.secrets?.hasApiKey ?? setting?.hasApiKey),
  };
}

function buildAiSettingPayload(formData) {
  const payload = {
    provider: formData.provider,
    status: formData.status,
    name: formData.name.trim() || null,
    modelName: formData.modelName.trim() || null,
    baseUrl: formData.baseUrl.trim() || null,
  };

  if (formData.apiKey.trim()) {
    payload.apiKey = formData.apiKey.trim();
  }

  return payload;
}

function AiSettingsPage() {
  const { user } = useAuth();

  const [aiSettings, setAiSettings] = useState(initialAiSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");


  useEffect(() => {
    let isMounted = true;

    async function loadAiSettings() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const result = await getAiSettings();
        const firstSetting = getFirstAiSetting(result);

        if (isMounted) {
          setAiSettings(mapAiSettingToFormData(firstSetting));
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

  function handleAiChange(event) {
    const { name, value } = event.target;

    setAiSettings((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleAiSubmit(event) {
    event.preventDefault();

    if (aiSettings.baseUrl.trim()) {
      try {
        new URL(aiSettings.baseUrl.trim());
      } catch {
        setErrorMessage("Base URL geçerli bir URL olmalıdır.");
        setMessage("");
        return;
      }
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      const payload = buildAiSettingPayload(aiSettings);

      const result = aiSettings.id
        ? await updateAiSetting(aiSettings.id, payload)
        : await createAiSetting(payload);

      const savedSetting = result?.data ?? result;

      setAiSettings(mapAiSettingToFormData(savedSetting));
      setMessage("AI ayarları başarıyla kaydedildi.");
    } catch (error) {
      setErrorMessage(error?.message ?? "AI ayarları kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleTestConnection() {
    if (!aiSettings.hasApiKey && !aiSettings.apiKey.trim()) {
      setErrorMessage("Bağlantı testi için önce API key girilmelidir.");
      setMessage("");
      return;
    }

    setMessage(
      "API key güvenli şekilde backend tarafında saklanır. Gerçek bağlantı testi için ayrıca backend test endpointi eklenmelidir."
    );
    setErrorMessage("");
  }


  return (
    <DashboardLayout
      roleTitle="AI API Ayarları"
      roleBadge="Süper Admin"
      userName={user?.fullName ?? "Süper Admin"}
      navItems={navItems}
      theme="super-admin"
    >
      <div className="dashboard-page-header">
        <div>
          <h2>AI API Ayarları</h2>
          <p>
            Banka dekontlarını okumak, ödeme bilgilerini çıkarmak ve daire
            eşleştirme önerisi oluşturmak için kullanılacak AI ayarlarını
            buradan yönetebilirsiniz.
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

      <section className="ai-info-grid">
        <AiUsageInfoCard
          icon={FileSearch}
          title="Dekont Okuma"
          description="Yüklenen banka dekontundan önemli ödeme bilgileri çıkarılır."
          items={[
            "Ad soyad bilgisi okunur",
            "Ödenen tutar tespit edilir",
            "Açıklama alanındaki daire bilgisi analiz edilir",
          ]}
        />

        <AiUsageInfoCard
          icon={Sparkles}
          title="Akıllı Eşleştirme"
          description="AI, dekont bilgisini sistemdeki daire ve sakin kayıtlarıyla eşleştirmeye çalışır."
          items={[
            "Daire numarası tahmin edilir",
            "Ev sahibi veya kiracı ödemesi ayırt edilir",
            "Eşleşme güven oranı oluşturulur",
          ]}
        />

        <AiUsageInfoCard
          icon={ShieldCheck}
          title="Yönetici Onayı"
          description="AI sonucu direkt kesin kayıt olarak kabul edilmez, yönetici onayıyla tamamlanır."
          items={[
            "Yanlış eşleşme riski azaltılır",
            "Eşleşmeyen dekontlar ayrıca listelenir",
            "Onay sonrası ödeme kaydı oluşturulur",
          ]}
        />

        <AiUsageInfoCard
          icon={KeyRound}
          title="API Güvenliği"
          description="AI servis anahtarları yalnızca yetkili kişiler tarafından yönetilmelidir."
          items={[
            "Servis anahtarları backend tarafında şifreli saklanır",
            "Frontend'e gerçek API key geri gönderilmez",
            "Ayar değişiklikleri audit log ile takip edilir",
          ]}
        />
      </section>

      {isLoading ? (
        <div className="dashboard-panel">
          <p>AI ayarları yükleniyor...</p>
        </div>
      ) : (
        <div className="ai-settings-layout">
          <AiProviderForm
            formData={aiSettings}
            onInputChange={handleAiChange}
            onSubmit={handleAiSubmit}
            onTestConnection={handleTestConnection}
            isSaving={isSaving}
          />
        </div>
      )}
    </DashboardLayout>
  );
}

export default AiSettingsPage;

