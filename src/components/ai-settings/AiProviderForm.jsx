import { Bot, CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";

const providerOptions = [
  { value: "OPENAI", label: "OpenAI / ChatGPT" },
  { value: "GEMINI", label: "Google Gemini" },
  { value: "CUSTOM", label: "Custom API" },
];

const statusOptions = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "PASSIVE", label: "Pasif" },
];

function AiProviderForm({
  formData,
  onInputChange,
  onSubmit,
  onTestConnection,
  isSaving = false,
}) {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <section className="ai-settings-card">
      <div className="ai-card-header">
        <div className="ai-card-title">
          <div className="ai-card-icon">
            <Bot size={23} />
          </div>

          <div>
            <span className="section-kicker">AI API Ayarları</span>
            <h3>Yapay Zeka Sağlayıcı Ayarları</h3>
          </div>
        </div>

        <span
          className={`ai-status-badge ${
            formData.status === "ACTIVE" ? "active" : "passive"
          }`}
        >
          {formData.status === "ACTIVE" ? "Aktif" : "Pasif"}
        </span>
      </div>

      <p className="ai-card-description">
        Banka dekontlarını okumak ve ödeme eşleştirme önerisi oluşturmak için
        kullanılacak yapay zeka sağlayıcısı buradan seçilir.
      </p>

      <form className="ai-provider-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            AI Sağlayıcı
            <select
              name="provider"
              value={formData.provider}
              onChange={onInputChange}
              disabled={isSaving}
            >
              {providerOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Durum
            <select
              name="status"
              value={formData.status}
              onChange={onInputChange}
              disabled={isSaving}
            >
              {statusOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ayar Adı
            <input
              name="name"
              type="text"
              placeholder="Örn: Ana OpenAI Ayarı"
              value={formData.name}
              onChange={onInputChange}
              disabled={isSaving}
            />
          </label>

          <label>
            Model Adı
            <input
              name="modelName"
              type="text"
              placeholder="Örn: gpt-4.1-mini, gemini-1.5-pro"
              value={formData.modelName}
              onChange={onInputChange}
              disabled={isSaving}
            />
          </label>

          <label className="full-width">
            Base URL
            <input
              name="baseUrl"
              type="text"
              placeholder="Örn: https://api.provider.com/v1"
              value={formData.baseUrl}
              onChange={onInputChange}
              disabled={isSaving}
            />
          </label>

          <label className="full-width">
            API Key
            <div className="secret-input-wrapper">
              <input
                name="apiKey"
                autoComplete="new-password"
                type={showApiKey ? "text" : "password"}
                placeholder={
                  formData.hasApiKey
                    ? "Yeni API key girmek isterseniz doldurun"
                    : "API key girin"
                }
                value={formData.apiKey}
                onChange={onInputChange}
                disabled={isSaving}
              />

              <button
                type="button"
                onClick={() => setShowApiKey((current) => !current)}
                aria-label="API key görünürlüğünü değiştir"
                disabled={isSaving}
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {formData.hasApiKey && (
              <small>Mevcut API key güvenli şekilde kayıtlıdır.</small>
            )}
          </label>
        </div>

        <div className="ai-form-actions">
          <button
            type="button"
            className="secondary-form-button"
            onClick={onTestConnection}
            disabled={isSaving}
          >
            <KeyRound size={17} />
            Bağlantıyı Test Et
          </button>

          <button
            type="submit"
            className="dashboard-action-button"
            disabled={isSaving}
          >
            <CheckCircle2 size={18} />
            {isSaving ? "Kaydediliyor..." : "AI Ayarlarını Kaydet"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default AiProviderForm;

