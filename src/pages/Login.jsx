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

import { loginUser } from "../api/authApi";

const roleOptions = [
  {
    label: "Süper Admin",
    value: "super-admin",
    backendRole: "SUPER_ADMIN",
    path: "/super-admin/dashboard",
    icon: Crown,
  },
  {
    label: "Yönetici",
    value: "manager",
    backendRole: "MANAGER",
    path: "/manager/dashboard",
    icon: UserCog,
  },
  {
    label: "Sakin",
    value: "resident",
    backendRole: "RESIDENT",
    path: "/resident/dashboard",
    icon: Users,
  },
];

const backendRolePaths = {
  SUPER_ADMIN: "/super-admin/dashboard",
  MANAGER: "/manager/dashboard",
  RESIDENT: "/resident/dashboard",
};

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getSelectedRoleData(selectedRole) {
  return roleOptions.find((role) => role.value === selectedRole);
}

function getUserFromLoginResult(result) {
  return result?.data?.user ?? result?.data ?? result?.user ?? null;
}

function getRoleFromLoginResult(result) {
  return (
    result?.data?.user?.role ??
    result?.data?.role ??
    result?.user?.role ??
    null
  );
}

function saveFrontendUserData({ user, role, rememberMe }) {
  localStorage.removeItem("authToken");
  sessionStorage.removeItem("authToken");

  localStorage.removeItem("userRole");
  sessionStorage.removeItem("userRole");

  localStorage.removeItem("userInfo");
  sessionStorage.removeItem("userInfo");

  const storage = rememberMe ? localStorage : sessionStorage;

  storage.setItem("userRole", role);
  storage.setItem(
    "userInfo",
    JSON.stringify({
      id: user?.id,
      fullName: user?.fullName,
      email: user?.email,
      role,
    })
  );
}

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("manager");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function clearErrorMessage() {
    if (errorMessage) {
      setErrorMessage("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    const selectedRoleData = getSelectedRoleData(selectedRole);

    if (!trimmedEmail || !password) {
      setErrorMessage("Lütfen e-posta ve şifre alanlarını doldurun.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setErrorMessage("Lütfen geçerli bir e-posta adresi girin.");
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
    setIsSubmitting(true);

    try {
      const result = await loginUser({
        email: trimmedEmail,
        password,
      });

      const user = getUserFromLoginResult(result);
      const backendRole = getRoleFromLoginResult(result);

      if (!backendRole || !backendRolePaths[backendRole]) {
        setErrorMessage("Kullanıcı rolü doğrulanamadı.");
        return;
      }

      saveFrontendUserData({
        user,
        role: backendRole,
        rememberMe,
      });

      navigate(backendRolePaths[backendRole], {
        replace: true,
      });
    } catch (error) {
      setErrorMessage(
        error?.message ?? "Giriş başarısız oldu. Lütfen bilgilerinizi kontrol edin."
      );
    } finally {
      setIsSubmitting(false);
    }
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

            <p>E-posta adresiniz ve şifreniz ile sisteme erişin.</p>
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
                    disabled={isSubmitting}
                  >
                    <Icon size={18} />
                    <span>{role.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="input-group">
            <span>E-posta</span>

            <div className="input-with-icon">
              <Mail size={19} />

              <input
                type="email"
                placeholder="ornek@mail.com"
                autoComplete="username"
                value={email}
                disabled={isSubmitting}
                onChange={(event) => {
                  setEmail(event.target.value);
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
                onChange={(event) => setRememberMe(event.target.checked)}
              />

              <span>Beni hatırla</span>
            </label>

            <Link to="/forgot-password" className="forgot-button">
              Şifremi unuttum
            </Link>
          </div>

          <button
            type="submit"
            className="login-submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
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
