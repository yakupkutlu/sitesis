import {
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { useState } from "react";

const providerOptions = [
  { value: "GEMINI", label: "Google Gemini" },
  { value: "OPENAI", label: "OpenAI" },
  { value: "CUSTOM", label: "Özel Sağlayıcı" },
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
  isTesting = false,
}) {
  const [showApiKey, setShowApiKey] = useState(false);
  const isCustomProvider = formData.provider === "CUSTOM";

  return (
    <section className="ai-settings-card">
      <div className="ai-card-header">
        <div className="ai-card-title">
          <div className="ai-card-icon">
            <Bot size={23} />
          </div>

          <div>
            <span className="section-kicker">AI API Ayarları</span>
            <h3>
              {formData.id ? "AI Ayarını Düzenle" : "Yeni AI Ayarı"}
            </h3>
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
        Dekont analizi için kullanılacak sağlayıcı, model, API anahtarı ve son
        kullanım tarihi tanımlanır.
      </p>

      <div className="ai-priority-form-note">
        Kayıt eklendikten sonra kullanım sırasını tablodaki yukarı ve aşağı
        oklarıyla değiştirebilirsiniz.
      </div>

      <form className="ai-provider-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            AI Sağlayıcı
            <select
              name="provider"
              value={formData.provider}
              onChange={onInputChange}
              disabled={isSaving || isTesting}
            >
              {providerOptions.map((option) => (
                <option key={option.value} value={option.value}>
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
              disabled={isSaving || isTesting}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
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
              placeholder="Örn: Gemini Dekont Okuma"
              value={formData.name}
              onChange={onInputChange}
              disabled={isSaving || isTesting}
              required
            />
          </label>

          <label>
            Model Adı
            <input
              name="modelName"
              type="text"
              placeholder={
                formData.provider === "GEMINI"
                  ? "Örn: gemini-2.5-flash"
                  : formData.provider === "OPENAI"
                    ? "Örn: gpt-4o-mini"
                    : "Özel model adı"
              }
              value={formData.modelName}
              onChange={onInputChange}
              disabled={isSaving || isTesting}
            />
          </label>

          <label>
            Son Kullanım Tarihi
            <input
              name="expiresAt"
              type="date"
              value={formData.expiresAt}
              onChange={onInputChange}
              disabled={isSaving || isTesting}
            />
          </label>

          {isCustomProvider && (
            <label className="full-width">
              Base URL
              <input
                name="baseUrl"
                type="url"
                placeholder="https://api.provider.com/v1/analyze"
                value={formData.baseUrl}
                onChange={onInputChange}
                disabled={isSaving || isTesting}
                required
              />
              <small>
                Güvenlik nedeniyle yalnızca herkese açık HTTPS adresleri kabul
                edilir. Localhost ve özel ağ adresleri reddedilir.
              </small>
            </label>
          )}

          <label className="full-width">
            API Key
            <div className="secret-input-wrapper">
              <input
                name="apiKey"
                type={showApiKey ? "text" : "password"}
                placeholder={
                  formData.hasApiKey
                    ? "Mevcut API key kayıtlı; değiştirmek için yeni key girin"
                    : "API key girin"
                }
                value={formData.apiKey}
                onChange={onInputChange}
                disabled={isSaving || isTesting}
                autoComplete="new-password"
              />

              <button
                type="button"
                onClick={() => setShowApiKey((current) => !current)}
                aria-label="API key görünürlüğünü değiştir"
                disabled={isSaving || isTesting}
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {formData.hasApiKey && (
              <small>Mevcut API key backend tarafında şifreli saklanıyor.</small>
            )}
          </label>
        </div>

        <div className="ai-form-actions">
          <button
            type="button"
            className="secondary-form-button"
            onClick={onTestConnection}
            disabled={isSaving || isTesting}
          >
            <KeyRound size={17} />
            {isTesting ? "Bağlantı Test Ediliyor..." : "Bağlantıyı Test Et"}
          </button>

          <button
            type="submit"
            className="dashboard-action-button"
            disabled={isSaving || isTesting}
          >
            <CheckCircle2 size={18} />
            {isSaving
              ? "Kaydediliyor..."
              : formData.id
                ? "AI Ayarını Güncelle"
                : "AI Ayarını Ekle"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default AiProviderForm;
