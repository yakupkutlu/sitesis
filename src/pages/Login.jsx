import { useAuth } from "../hooks/useAuth";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { loginUser } from "../api/authApi";


const backendRolePaths = {
  SUPER_ADMIN: "/super-admin/dashboard",
  MANAGER: "/manager/dashboard",
  RESIDENT: "/resident/dashboard",
};

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getUserFromLoginResult(result) {
  return result?.data?.user ?? result?.data ?? result?.user ?? null;
}

function getModeFromLoginResult(result) {
  return (
    result?.data?.user?.accountMode ??
    result?.data?.user?.role ??
    result?.data?.accountMode ??
    result?.user?.accountMode ??
    result?.user?.role ??
    null
  );
}

function saveFrontendUserData({ user, role, rememberMe }) {
  localStorage.removeItem("authToken");
  sessionStorage.removeItem("authToken");

  localStorage.removeItem("userRole");
  sessionStorage.removeItem("userRole");
  localStorage.removeItem("accountMode");
  sessionStorage.removeItem("accountMode");

  localStorage.removeItem("userInfo");
  sessionStorage.removeItem("userInfo");

  const storage = rememberMe ? localStorage : sessionStorage;

  storage.setItem("userRole", role);
  storage.setItem("accountMode", role);
  storage.setItem(
    "userInfo",
    JSON.stringify({
      ...user,
      role,
      accountMode: user?.accountMode ?? role,
    })
  );
}

function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const result = await loginUser({
        email: trimmedEmail,
        password,
      });

      const user = getUserFromLoginResult(result);
      const accountMode = user?.accountMode ?? getModeFromLoginResult(result);

      if (!user || !accountMode || !backendRolePaths[accountMode]) {
        setErrorMessage("Kullanıcı rolü doğrulanamadı.");
        return;
      }

      saveFrontendUserData({
        user,
        role: accountMode,
        rememberMe,
      });
      setUser(user);

      navigate(
        user.requiresModeSelection
          ? "/select-account-mode"
          : backendRolePaths[accountMode],
        {
          replace: true,
        }
      );
    } catch {
      setErrorMessage("E-posta veya şifre hatalı.");
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
            Kullanıcı rolü veritabanındaki hesap bilgisine göre otomatik
            belirlenir.
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
              Giriş sonrası sistem sizi veritabanındaki rolünüze göre doğru
              panele yönlendirir.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}

export default Login;
