import { CheckCircle2, Eye, EyeOff, MessageSquare, Send } from "lucide-react";
import { useState } from "react";

function SmsSettingsForm({ formData, onInputChange, onSubmit }) {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <section className="notification-settings-card">
      <div className="notification-card-header">
        <div className="notification-card-title">
          <div className="notification-card-icon">
            <MessageSquare size={22} />
          </div>

          <div>
            <span className="section-kicker">SMS Ayarları</span>
            <h3>SMS Gönderim Ayarları</h3>
          </div>
        </div>

        <span
          className={`notification-status-badge ${
            formData.isActive ? "active" : "passive"
          }`}
        >
          {formData.isActive ? "Aktif" : "Pasif"}
        </span>
      </div>

      <p className="notification-card-description">
        SMS sağlayıcısı, gönderici başlığı ve gönderim ayarları buradan tanımlanır.
      </p>

      <form className="notification-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            SMS Sağlayıcı
            <select
              name="provider"
              value={formData.provider}
              onChange={onInputChange}
            >
              <option>Netgsm</option>
              <option>İleti Merkezi</option>
              <option>Twilio</option>
            </select>
          </label>

          <label>
            Gönderici Başlığı
            <input
              name="senderTitle"
              type="text"
              placeholder="Örn: APARTMANIM"
              value={formData.senderTitle}
              onChange={onInputChange}
            />
          </label>

          <label>
            API Kullanıcı Adı
            <input
              name="username"
              type="text"
              placeholder="API kullanıcı adını girin"
              value={formData.username}
              onChange={onInputChange}
            />
          </label>

          <label>
            API Key / Secret
            <div className="secret-input-wrapper">
              <input
                name="apiKey"
                type={showApiKey ? "text" : "password"}
                placeholder="API key veya secret girin"
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

          <label className="notification-switch-label">
            <input
              name="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={onInputChange}
            />
            SMS gönderimini aktif et
          </label>
        </div>

        <div className="notification-form-actions">
          <button type="button" className="secondary-form-button">
            <Send size={17} />
            Test SMS Gönder
          </button>

          <button type="submit" className="dashboard-action-button">
            <CheckCircle2 size={18} />
            SMS Ayarlarını Kaydet
          </button>
        </div>
      </form>
    </section>
  );
}

export default SmsSettingsForm;