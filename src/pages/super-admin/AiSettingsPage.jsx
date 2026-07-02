import { useState } from "react";
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
import AiTestPanel from "../../components/ai-settings/AiTestPanel";

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
  provider: "ChatGPT / OpenAI",
  modelName: "",
  endpointUrl: "",
  apiKey: "",
  confidenceThreshold: "80",
  usageMode: "Dekont okuma ve eşleştirme",
  isActive: false,
  requireAdminApproval: true,
};

function AiSettingsPage() {
  const [aiSettings, setAiSettings] = useState(initialAiSettings);
  const [testText, setTestText] = useState("");
  const [testResult, setTestResult] = useState(null);

  function handleAiChange(event) {
    const { name, value, type, checked } = event.target;

    setAiSettings((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleAiSubmit(event) {
  event.preventDefault();

  alert("AI ayarları kaydedildi.");
 }

  function handleRunTest() {
    if (!testText.trim()) {
      alert("Lütfen test etmek için örnek dekont metni girin.");
      return;
    }

    setTestResult({
      fullName: "Ahmet Yılmaz",
      apartment: "A Blok / Daire 5",
      amount: "1.250 TL",
      description: "Haziran aidatı",
      paymentOwnerType: "Kiracı ödemesi",
      matchStatus: "Yönetici onayı bekliyor",
    });
  }

  return (
    <DashboardLayout
      roleTitle="AI API Ayarları"
      roleBadge="Süper Admin"
      userName="Alaa"
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
            "Servis anahtarları gizli tutulmalıdır",
            "Yetkisiz kişilerle paylaşılmamalıdır",
            "Ayar değişiklikleri sistem kayıtlarında takip edilmelidir",
         ]}
        />
      </section>

      <div className="ai-settings-layout">
        <AiProviderForm
          formData={aiSettings}
          onInputChange={handleAiChange}
          onSubmit={handleAiSubmit}
        />

        <AiTestPanel
          testText={testText}
          testResult={testResult}
          onTestTextChange={setTestText}
          onRunTest={handleRunTest}
        />
      </div>
    </DashboardLayout>
  );
}

export default AiSettingsPage;