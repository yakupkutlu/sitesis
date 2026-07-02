import { Bot, CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";

function AiProviderForm({ formData, onInputChange, onSubmit }) {
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
            formData.isActive ? "active" : "passive"
          }`}
        >
          {formData.isActive ? "Aktif" : "Pasif"}
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
            >
              <option>ChatGPT / OpenAI</option>
              <option>Google Gemini</option>
              <option>Claude</option>
              <option>Azure OpenAI</option>
              <option>Grok</option>
              <option>Custom API</option>
            </select>
          </label>

          <label>
            Model Adı
            <input
              name="modelName"
              type="text"
              placeholder="Örn: gpt-4.1-mini, gemini-1.5-pro"
              value={formData.modelName}
              onChange={onInputChange}
            />
          </label>

          <label className="full-width">
            Endpoint URL
            <input
              name="endpointUrl"
              type="text"
              placeholder="Örn: https://api.provider.com/v1/..."
              value={formData.endpointUrl}
              onChange={onInputChange}
            />
          </label>

          <label className="full-width">
            API Key
            <div className="secret-input-wrapper">
              <input
                name="apiKey"
                type={showApiKey ? "text" : "password"}
                placeholder="API key girin"
                value={formData.apiKey}
                onChange={onInputChange}
              />

              <button
                type="button"
                onClick={() => setShowApiKey((current) => !current)}
                aria-label="API key görünürlüğünü değiştir"
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label>
            Minimum Güven Oranı
            <select
              name="confidenceThreshold"
              value={formData.confidenceThreshold}
              onChange={onInputChange}
            >
              <option value="60">%60</option>
              <option value="70">%70</option>
              <option value="80">%80</option>
              <option value="90">%90</option>
            </select>
          </label>

          <label>
            Kullanım Amacı
            <select
              name="usageMode"
              value={formData.usageMode}
              onChange={onInputChange}
            >
              <option>Dekont okuma ve eşleştirme</option>
              <option>Sadece dekont okuma</option>
              <option>Sadece öneri oluşturma</option>
            </select>
          </label>

          <label className="ai-switch-label">
            <input
              name="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={onInputChange}
            />
            AI desteğini aktif et
          </label>

          <label className="ai-switch-label">
            <input
              name="requireAdminApproval"
              type="checkbox"
              checked={formData.requireAdminApproval}
              onChange={onInputChange}
            />
            AI eşleşmesini yönetici onayına gönder
          </label>
        </div>

        <div className="ai-form-actions">
          <button type="button" className="secondary-form-button">
            <KeyRound size={17} />
            Bağlantıyı Test Et
          </button>

          <button type="submit" className="dashboard-action-button">
            <CheckCircle2 size={18} />
            AI Ayarlarını Kaydet
          </button>
        </div>
      </form>
    </section>
  );
}

export default AiProviderForm;