import { CheckCircle2, ShieldCheck } from "lucide-react";

const sessionDurationOptions = [
  { value: "30", label: "30 dakika" },
  { value: "60", label: "1 saat" },
  { value: "120", label: "2 saat" },
  { value: "240", label: "4 saat" },
];

const minPasswordLengthOptions = [
  { value: "8", label: "8 karakter" },
  { value: "10", label: "10 karakter" },
  { value: "12", label: "12 karakter" },
];

const loginAttemptLimitOptions = [
  { value: "3", label: "3 deneme" },
  { value: "5", label: "5 deneme" },
  { value: "10", label: "10 deneme" },
];

const lockDurationOptions = [
  { value: "5", label: "5 dakika" },
  { value: "15", label: "15 dakika" },
  { value: "30", label: "30 dakika" },
  { value: "60", label: "1 saat" },
];

const switchOptions = [
  {
    name: "requireStrongPassword",
    label: "Güçlü şifre zorunlu olsun",
  },
  {
    name: "enableTwoFactor",
    label: "İki aşamalı doğrulama desteği",
  },
  {
    name: "allowPublicRegister",
    label: "Herkese açık kayıt olma izni",
  },
  {
    name: "logSecurityEvents",
    label: "Güvenlik olaylarını logla",
  },
];

function SecuritySettingsForm({ formData, onInputChange, onSubmit }) {
  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-title">
          <div className="settings-card-icon">
            <ShieldCheck size={22} />
          </div>

          <div>
            <span className="section-kicker">Güvenlik Ayarları</span>

            <h3>Sistem Güvenlik Kuralları</h3>
          </div>
        </div>
      </div>

      <p className="settings-card-description">
        Kullanıcı oturumu, şifre politikası ve hesap güvenliğiyle ilgili genel
        kurallar buradan tanımlanır.
      </p>

      <form className="settings-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Oturum Süresi
            <select
              name="sessionDuration"
              value={formData.sessionDuration}
              onChange={onInputChange}
            >
              {sessionDurationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Minimum Şifre Uzunluğu
            <select
              name="minPasswordLength"
              value={formData.minPasswordLength}
              onChange={onInputChange}
            >
              {minPasswordLengthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Hatalı Giriş Limiti
            <select
              name="loginAttemptLimit"
              value={formData.loginAttemptLimit}
              onChange={onInputChange}
            >
              {loginAttemptLimitOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Kilit Süresi
            <select
              name="lockDuration"
              value={formData.lockDuration}
              onChange={onInputChange}
            >
              {lockDurationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {switchOptions.map((option) => (
            <label className="settings-switch-label" key={option.name}>
              <input
                type="checkbox"
                name={option.name}
                checked={Boolean(formData[option.name])}
                onChange={onInputChange}
              />

              <span>{option.label}</span>
            </label>
          ))}
        </div>

        <div className="settings-form-actions">
          <button type="submit" className="dashboard-action-button">
            <CheckCircle2 size={18} />
            Güvenlik Ayarlarını Kaydet
          </button>
        </div>
      </form>
    </section>
  );
}

export default SecuritySettingsForm;