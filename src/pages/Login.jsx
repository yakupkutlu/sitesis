import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

const roleOptions = [
  {
    label: "Süper Admin",
    value: "super-admin",
    path: "/super-admin/dashboard",
    icon: Crown,
  },
  {
    label: "Yönetici",
    value: "manager",
    path: "/manager/dashboard",
    icon: UserCog,
  },
  {
    label: "Sakin",
    value: "resident",
    path: "/resident/dashboard",
    icon: Users,
  },
];

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  const cleanedValue = value.replace(/\s/g, "");
  return /^(05\d{9}|\+905\d{9})$/.test(cleanedValue);
}

function getSelectedRoleData(selectedRole) {
  return roleOptions.find((role) => role.value === selectedRole);
}

function saveTemporaryLoginData({ identifier, selectedRole, rememberMe }) {
  const storage = rememberMe ? localStorage : sessionStorage;

  storage.setItem("authToken", "temporary-demo-token");
  storage.setItem("userRole", selectedRole);
  storage.setItem(
    "userInfo",
    JSON.stringify({
      identifier,
      role: selectedRole,
    })
  );
}

function Login() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("manager");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function clearErrorMessage() {
    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    const trimmedIdentifier = identifier.trim();
    const selectedRoleData = getSelectedRoleData(selectedRole);

    if (!trimmedIdentifier || !password) {
      setErrorMessage("Lütfen e-posta/telefon ve şifre alanlarını doldurun.");
      return;
    }

    if (!isValidEmail(trimmedIdentifier) && !isValidPhone(trimmedIdentifier)) {
      setErrorMessage(
        "Lütfen geçerli bir e-posta adresi veya telefon numarası girin."
      );
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    if (!selectedRoleData) {
      setErrorMessage("Lütfen geçerli bir kullanıcı rolü seçin.");
      return;
    }

    setErrorMessage("");

    saveTemporaryLoginData({
      identifier: trimmedIdentifier,
      selectedRole,
      rememberMe,
    });

    navigate(selectedRoleData.path);
  }

  return (
    <section className="login-page-pro">
      <div className="login-visual">
        <div className="login-brand-card">
          <div className="login-brand-icon">
            <Building2 size={34} />
          </div>

          <span className="badge">Güvenli Sistem Girişi</span>

          <h1>Yönetim panelinize güvenli şekilde erişin.</h1>

          <p>
            Süper admin, yönetici ve sakin kullanıcıları kendi yetkilerine göre
            sisteme giriş yapar.
          </p>

          <div className="login-check-list">
            <div>
              <CheckCircle2 size={18} />
              <span>Rol bazlı erişim kontrolü</span>
            </div>

            <div>
              <CheckCircle2 size={18} />
              <span>Yetkisiz alanlara erişim engeli</span>
            </div>

            <div>
              <CheckCircle2 size={18} />
              <span>Güvenli kullanıcı deneyimi</span>
            </div>
          </div>
        </div>
      </div>

      <div className="login-form-wrapper">
        <form className="login-pro-card" onSubmit={handleSubmit}>
          <div className="login-form-header">
            <div className="login-lock-icon">
              <LockKeyhole size={26} />
            </div>

            <span className="section-kicker">Panele Giriş</span>

            <h2>Hesabınıza giriş yapın</h2>

            <p>E-posta adresiniz veya telefon numaranız ile sisteme erişin.</p>
          </div>

          {errorMessage && (
            <div className="login-error-message">
              <AlertCircle size={20} />
              <p>{errorMessage}</p>
            </div>
          )}

          <div className="input-group">
            <span>Kullanıcı Rolü</span>

            <div className="login-role-grid">
              {roleOptions.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.value;

                return (
                  <button
                    type="button"
                    className={`login-role-option ${
                      isSelected ? "active" : ""
                    }`}
                    key={role.value}
                    onClick={() => {
                      setSelectedRole(role.value);
                      clearErrorMessage();
                    }}
                  >
                    <Icon size={18} />
                    <span>{role.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="input-group">
            <span>E-posta veya Telefon</span>

            <div className="input-with-icon">
              <Mail size={19} />

              <input
                type="text"
                placeholder="ornek@mail.com veya 05xx xxx xx xx"
                autoComplete="username"
                value={identifier}
                onChange={(event) => {
                  setIdentifier(event.target.value);
                  clearErrorMessage();
                }}
              />
            </div>
          </label>

          <label className="input-group">
            <span>Şifre</span>

            <div className="input-with-icon">
              <LockKeyhole size={19} />

              <input
                type={showPassword ? "text" : "password"}
                placeholder="Şifrenizi girin"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearErrorMessage();
                }}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </label>

          <div className="login-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />

              <span>Beni hatırla</span>
            </label>

            <Link to="/forgot-password" className="forgot-button">
              Şifremi unuttum
            </Link>
          </div>

          <button type="submit" className="login-submit-button">
            Giriş Yap
          </button>

          <div className="login-security-note">
            <ShieldCheck size={19} />

            <p>
              Sisteme sadece yönetim tarafından tanımlanan kullanıcılar giriş
              yapabilir. Kayıt işlemi panel içinden yapılır.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}

export default Login;