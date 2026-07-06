import { CheckCircle2, Settings } from "lucide-react";

const themeOptions = ["Açık", "Koyu"];

function GeneralSettingsForm({
  formData,
  onInputChange,
  onSubmit,
  isSaving = false,
}) {
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
        Sistemin adı, logo adresi, iletişim ve destek bilgileri buradan
        yönetilir.
      </p>

      <form className="settings-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Uygulama Adı
            <input
              type="text"
              name="appName"
              placeholder="Örn: Konut Yönetim"
              value={formData.appName}
              onChange={onInputChange}
              disabled={isSaving}
            />
          </label>

          <label>
            Logo URL
            <input
              type="text"
              name="logoUrl"
              placeholder="https://example.com/logo.png"
              value={formData.logoUrl}
              onChange={onInputChange}
              disabled={isSaving}
            />
          </label>

          <label>
            İletişim E-posta
            <input
              type="email"
              name="contactEmail"
              placeholder="iletisim@example.com"
              value={formData.contactEmail}
              onChange={onInputChange}
              disabled={isSaving}
            />
          </label>

          <label>
            İletişim Telefon
            <input
              type="text"
              name="contactPhone"
              placeholder="+90 5xx xxx xx xx"
              value={formData.contactPhone}
              onChange={onInputChange}
              disabled={isSaving}
            />
          </label>

          <label>
            Web Sitesi
            <input
              type="text"
              name="websiteUrl"
              placeholder="https://example.com"
              value={formData.websiteUrl}
              onChange={onInputChange}
              disabled={isSaving}
            />
          </label>

          <label>
            Destek E-posta
            <input
              type="email"
              name="supportEmail"
              placeholder="destek@example.com"
              value={formData.supportEmail}
              onChange={onInputChange}
              disabled={isSaving}
            />
          </label>

          <label>
            Destek Telefon
            <input
              type="text"
              name="supportPhone"
              placeholder="+90 5xx xxx xx xx"
              value={formData.supportPhone}
              onChange={onInputChange}
              disabled={isSaving}
            />
          </label>

          <label>
            Görünüm
            <select
              name="themeMode"
              value={formData.themeMode}
              onChange={onInputChange}
              disabled={isSaving}
            >
              {themeOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="full-width">
            Adres
            <textarea
              name="address"
              rows="4"
              placeholder="Şirket / yönetim adresi..."
              value={formData.address}
              onChange={onInputChange}
              disabled={isSaving}
            />
          </label>
        </div>

        <div className="settings-form-actions">
          <button
            type="submit"
            className="dashboard-action-button"
            disabled={isSaving}
          >
            <CheckCircle2 size={18} />
            {isSaving ? "Kaydediliyor..." : "Genel Ayarları Kaydet"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default GeneralSettingsForm;
