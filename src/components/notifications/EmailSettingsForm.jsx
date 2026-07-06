import { CheckCircle2, Eye, EyeOff, Mail, Send } from "lucide-react";
import { useState } from "react";

const providerOptions = [
  { value: "SMTP", label: "SMTP" },
  { value: "SENDGRID", label: "SendGrid" },
];

const statusOptions = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "PASSIVE", label: "Pasif" },
];

function EmailSettingsForm({
  formData,
  onInputChange,
  onSubmit,
  onTestEmail,
  isSaving = false,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showSendgridKey, setShowSendgridKey] = useState(false);

  const isSmtp = formData.provider === "SMTP";
  const isSendgrid = formData.provider === "SENDGRID";

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
            formData.status === "ACTIVE" ? "active" : "passive"
          }`}
        >
          {formData.status === "ACTIVE" ? "Aktif" : "Pasif"}
        </span>
      </div>

      <p className="notification-card-description">
        SMTP veya SendGrid üzerinden e-posta gönderim ayarları yapılır.
      </p>

      <form className="notification-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            E-posta Sağlayıcı
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
            Gönderen E-posta
            <input
              name="fromEmail"
              type="email"
              placeholder="ornek@mail.com"
              value={formData.fromEmail}
              onChange={onInputChange}
              disabled={isSaving}
            />
          </label>

          <label>
            Gönderen Adı
            <input
              name="fromName"
              type="text"
              placeholder="Örn: Sitesis Yönetimi"
              value={formData.fromName}
              onChange={onInputChange}
              disabled={isSaving}
            />
          </label>

          {isSmtp && (
            <>
              <label>
                SMTP Host
                <input
                  name="smtpHost"
                  type="text"
                  placeholder="Örn: smtp.gmail.com"
                  value={formData.smtpHost}
                  onChange={onInputChange}
                  disabled={isSaving}
                />
              </label>

              <label>
                SMTP Port
                <input
                  name="smtpPort"
                  type="number"
                  placeholder="Örn: 587"
                  value={formData.smtpPort}
                  onChange={onInputChange}
                  disabled={isSaving}
                />
              </label>

              <label>
                SMTP Kullanıcı Adı
                <input
                  name="smtpUsername"
                  type="text"
                  placeholder={
                    formData.hasSmtpUsername
                      ? "Mevcut kullanıcı adı kayıtlı"
                      : "SMTP kullanıcı adı"
                  }
                  value={formData.smtpUsername}
                  onChange={onInputChange}
                  disabled={isSaving}
                />
              </label>

              <label>
                SMTP Şifre
                <div className="secret-input-wrapper">
                  <input
                    name="smtpPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder={
                      formData.hasSmtpPassword
                        ? "Mevcut şifre kayıtlı"
                        : "SMTP şifre"
                    }
                    value={formData.smtpPassword}
                    onChange={onInputChange}
                    disabled={isSaving}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label="Şifre görünürlüğünü değiştir"
                    disabled={isSaving}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <label className="notification-switch-label">
                <input
                  name="smtpSecure"
                  type="checkbox"
                  checked={Boolean(formData.smtpSecure)}
                  onChange={onInputChange}
                  disabled={isSaving}
                />
                TLS / güvenli bağlantı kullan
              </label>
            </>
          )}

          {isSendgrid && (
            <label className="full-width">
              SendGrid API Key
              <div className="secret-input-wrapper">
                <input
                  name="sendgridApiKey"
                  type={showSendgridKey ? "text" : "password"}
                  placeholder={
                    formData.hasSendgridApiKey
                      ? "Mevcut SendGrid API key kayıtlı"
                      : "SendGrid API key"
                  }
                  value={formData.sendgridApiKey}
                  onChange={onInputChange}
                  disabled={isSaving}
                />

                <button
                  type="button"
                  onClick={() => setShowSendgridKey((current) => !current)}
                  aria-label="SendGrid API key görünürlüğünü değiştir"
                  disabled={isSaving}
                >
                  {showSendgridKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
          )}
        </div>

        <div className="notification-form-actions">
          <button
            type="button"
            className="secondary-form-button"
            onClick={onTestEmail}
            disabled={isSaving}
          >
            <Send size={17} />
            Test E-posta Gönder
          </button>

          <button
            type="submit"
            className="dashboard-action-button"
            disabled={isSaving}
          >
            <CheckCircle2 size={18} />
            {isSaving ? "Kaydediliyor..." : "E-posta Ayarlarını Kaydet"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default EmailSettingsForm;
