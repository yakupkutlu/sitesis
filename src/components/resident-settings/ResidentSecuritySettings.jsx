import { ShieldCheck } from "lucide-react";

function ResidentSecuritySettings({ securityData, onInputChange, onSubmit }) {
  return (
    <section className="resident-settings-card">
      <div className="resident-settings-card-header">
        <div>
          <span className="section-kicker">Güvenlik</span>

          <h3>Şifre Değiştir</h3>

          <p>
            Hesap güvenliğiniz için güçlü ve tahmin edilmesi zor bir şifre
            kullanınız.
          </p>
        </div>

        <div className="resident-settings-card-icon">
          <ShieldCheck size={22} />
        </div>
      </div>

      <form className="resident-settings-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Mevcut Şifre
            <input
              type="password"
              name="currentPassword"
              value={securityData.currentPassword}
              onChange={onInputChange}
              placeholder="Mevcut şifrenizi giriniz"
              autoComplete="current-password"
            />
          </label>

          <label>
            Yeni Şifre
            <input
              type="password"
              name="newPassword"
              value={securityData.newPassword}
              onChange={onInputChange}
              placeholder="Yeni şifrenizi giriniz"
              autoComplete="new-password"
            />
          </label>

          <label className="full-width">
            Yeni Şifre Tekrar
            <input
              type="password"
              name="confirmPassword"
              value={securityData.confirmPassword}
              onChange={onInputChange}
              placeholder="Yeni şifrenizi tekrar giriniz"
              autoComplete="new-password"
            />
          </label>
        </div>

        <div className="resident-security-note">
          <span>
            Şifre değiştirme işlemi backend tarafında mevcut şifre kontrolü ile
            doğrulanacaktır.
          </span>
        </div>

        <div className="form-actions">
          <button type="submit" className="dashboard-action-button">
            Şifreyi Güncelle
          </button>
        </div>
      </form>
    </section>
  );
}

export default ResidentSecuritySettings;