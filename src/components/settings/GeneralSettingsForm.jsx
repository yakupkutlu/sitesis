import { CheckCircle2, Settings } from "lucide-react";

const languageOptions = ["Türkçe", "Arapça", "İngilizce"];
const currencyOptions = ["TRY", "USD", "EUR"];
const themeOptions = ["Açık", "Koyu"];
const timezoneOptions = ["Europe/Istanbul", "UTC", "Europe/London"];

function GeneralSettingsForm({ formData, onInputChange, onSubmit }) {
  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-title">
          <div className="settings-card-icon">
            <Settings size={22} />
          </div>

          <div>
            <span className="section-kicker">Genel Ayarlar</span>

            <h3>Sistem Genel Bilgileri</h3>
          </div>
        </div>
      </div>

      <p className="settings-card-description">
        Sistemin genel adı, varsayılan dil, para birimi ve destek bilgileri
        buradan yönetilir.
      </p>

      <form className="settings-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Sistem Adı
            <input
              type="text"
              name="systemName"
              placeholder="Örn: Apartman Yönetim Sistemi"
              value={formData.systemName}
              onChange={onInputChange}
            />
          </label>

          <label>
            Marka / Uygulama Adı
            <input
              type="text"
              name="brandName"
              placeholder="Örn: Apartmanım"
              value={formData.brandName}
              onChange={onInputChange}
            />
          </label>

          <label>
            Varsayılan Dil
            <select
              name="defaultLanguage"
              value={formData.defaultLanguage}
              onChange={onInputChange}
            >
              {languageOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            Para Birimi
            <select
              name="currency"
              value={formData.currency}
              onChange={onInputChange}
            >
              {currencyOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            Görünüm
            <select
              name="themeMode"
              value={formData.themeMode}
              onChange={onInputChange}
            >
              {themeOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            Saat Dilimi
            <select
              name="timezone"
              value={formData.timezone}
              onChange={onInputChange}
            >
              {timezoneOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            Destek E-posta
            <input
              type="email"
              name="supportEmail"
              placeholder="destek@example.com"
              value={formData.supportEmail}
              onChange={onInputChange}
            />
          </label>

          <label className="full-width">
            Sistem Açıklaması
            <textarea
              name="systemDescription"
              rows="4"
              placeholder="Sistem hakkında kısa açıklama yazın..."
              value={formData.systemDescription}
              onChange={onInputChange}
            />
          </label>

          <label className="settings-switch-label">
            <input
              type="checkbox"
              name="maintenanceMode"
              checked={Boolean(formData.maintenanceMode)}
              onChange={onInputChange}
            />

            <span>Bakım modunu aktif et</span>
          </label>
        </div>

        <div className="settings-form-actions">
          <button type="submit" className="dashboard-action-button">
            <CheckCircle2 size={18} />
            Genel Ayarları Kaydet
          </button>
        </div>
      </form>
    </section>
  );
}

export default GeneralSettingsForm;