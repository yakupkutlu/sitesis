import { CheckCircle2, Eye, EyeOff, Mail, Send } from "lucide-react";
import { useState } from "react";

function EmailSettingsForm({ formData, onInputChange, onSubmit }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <section className="notification-settings-card">
      <div className="notification-card-header">
        <div className="notification-card-title">
          <div className="notification-card-icon">
            <Mail size={22} />
          </div>

          <div>
            <span className="section-kicker">E-posta Ayarları</span>
            <h3>E-posta Gönderim Ayarları</h3>
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
        SMTP veya SendGrid gibi sağlayıcılar üzerinden e-posta gönderim ayarları yapılır.
      </p>
      
      <form className="notification-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            E-posta Sağlayıcı
            <select
              name="provider"
              value={formData.provider}
              onChange={onInputChange}
            >
              <option>SMTP</option>
              <option>SendGrid</option>
            </select>
          </label>

          <label>
            Gönderen Adı
            <input
              name="senderName"
              type="text"
              placeholder="Örn: Apartman Yönetimi"
              value={formData.senderName}
              onChange={onInputChange}
            />
          </label>

          <label>
            SMTP Host
            <input
              name="host"
              type="text"
              placeholder="Örn: smtp.gmail.com"
              value={formData.host}
              onChange={onInputChange}
            />
          </label>

          <label>
            SMTP Port
            <input
              name="port"
              type="number"
              placeholder="Örn: 587"
              value={formData.port}
              onChange={onInputChange}
            />
          </label>

          <label>
            Kullanıcı E-posta
            <input
              name="email"
              type="email"
              placeholder="ornek@mail.com"
              value={formData.email}
              onChange={onInputChange}
            />
          </label>

          <label>
            Şifre / API Key
            <div className="secret-input-wrapper">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Şifre veya API key girin"
                value={formData.password}
                onChange={onInputChange}
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label="Şifre görünürlüğünü değiştir"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label className="notification-switch-label">
            <input
              name="useTls"
              type="checkbox"
              checked={formData.useTls}
              onChange={onInputChange}
            />
            TLS / güvenli bağlantı kullan
          </label>

          <label className="notification-switch-label">
            <input
              name="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={onInputChange}
            />
            E-posta gönderimini aktif et
          </label>
        </div>

        <div className="notification-form-actions">
          <button type="button" className="secondary-form-button">
            <Send size={17} />
            Test E-posta Gönder
          </button>

          <button type="submit" className="dashboard-action-button">
            <CheckCircle2 size={18} />
            E-posta Ayarlarını Kaydet
          </button>
        </div>
      </form>
    </section>
  );
}

export default EmailSettingsForm;