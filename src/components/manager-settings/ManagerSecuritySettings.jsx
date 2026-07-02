import { KeyRound, Save, ShieldAlert } from "lucide-react";

function ManagerSecuritySettings({
  securityData,
  onSecurityChange,
  onSaveSecurity,
}) {
  return (
    <section className="manager-settings-card">
      <div className="manager-settings-card-header">
        <div>
          <span className="section-kicker">Güvenlik</span>

          <h3>Şifre ve Güvenlik</h3>

          <p>
            Hesap güvenliği için şifre değiştirme işlemini buradan
            yönetebilirsiniz.
          </p>
        </div>

        <div className="manager-settings-card-icon">
          <ShieldAlert size={22} />
        </div>
      </div>

      <form className="manager-settings-form" onSubmit={onSaveSecurity}>
        <div className="form-grid">
          <label>
            Mevcut Şifre
            <input
              type="password"
              name="currentPassword"
              value={securityData.currentPassword}
              onChange={onSecurityChange}
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
              onChange={onSecurityChange}
              placeholder="Yeni şifre giriniz"
              autoComplete="new-password"
            />
          </label>

          <label>
            Yeni Şifre Tekrar
            <input
              type="password"
              name="confirmPassword"
              value={securityData.confirmPassword}
              onChange={onSecurityChange}
              placeholder="Yeni şifreyi tekrar giriniz"
              autoComplete="new-password"
            />
          </label>
        </div>

        <div className="manager-security-note">
          <KeyRound size={18} />

          <span>
            Güçlü şifre için büyük harf, küçük harf, rakam ve özel karakter
            kullanmanız önerilir.
          </span>
        </div>

        <div className="form-actions">
          <button type="submit" className="dashboard-action-button">
            <Save size={18} />
            Şifreyi Güncelle
          </button>
        </div>
      </form>
    </section>
  );
}

export default ManagerSecuritySettings;