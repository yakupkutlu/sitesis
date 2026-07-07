import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Lock,
  ShieldCheck,
} from "lucide-react";

import { resetPassword } from "../api/authApi";

function ResetPassword() {
  const [searchParams] = useSearchParams();

  const token = useMemo(() => {
    return searchParams.get("token") || "";
  }, [searchParams]);

  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!token) {
      setErrorMessage("Şifre sıfırlama bağlantısı geçersiz.");
      setSuccessMessage("");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Yeni şifre en az 8 karakter olmalıdır.");
      setSuccessMessage("");
      return;
    }

    if (password !== passwordAgain) {
      setErrorMessage("Yeni şifreler eşleşmiyor.");
      setSuccessMessage("");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      await resetPassword({
          token,
          password,
      });

      setSuccessMessage("Şifreniz başarıyla güncellendi.");
      setPassword("");
      setPasswordAgain("");
    } catch (error) {
      setErrorMessage(
        error?.message ||
          "Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="forgot-page">
      <div className="forgot-card">
        <div className="forgot-icon">
          <KeyRound size={30} />
        </div>

        <span className="badge">Yeni Şifre</span>

        <h1>Yeni şifrenizi belirleyin</h1>

        <p className="forgot-description">
          Güvenliğiniz için en az 8 karakterli yeni bir şifre belirleyin.
        </p>

        {errorMessage && (
          <div className="login-error-message">
            <AlertCircle size={20} />
            <p>{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="forgot-success-message">
            <CheckCircle2 size={20} />
            <p>{successMessage}</p>
          </div>
        )}

        {!successMessage && (
          <form className="forgot-form" onSubmit={handleSubmit}>
            <label className="input-group">
              <span>Yeni Şifre</span>
              <div className="input-with-icon">
                <Lock size={19} />
                <input
                  type="password"
                  placeholder="Yeni şifrenizi girin"
                  value={password}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrorMessage("");
                  }}
                />
              </div>
            </label>

            <label className="input-group">
              <span>Yeni Şifre Tekrar</span>
              <div className="input-with-icon">
                <Lock size={19} />
                <input
                  type="password"
                  placeholder="Yeni şifrenizi tekrar girin"
                  value={passwordAgain}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setPasswordAgain(event.target.value);
                    setErrorMessage("");
                  }}
                />
              </div>
            </label>

            <button
              type="submit"
              className="login-submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Güncelleniyor..." : "Şifreyi Güncelle"}
            </button>
          </form>
        )}

        <div className="forgot-security-note">
          <ShieldCheck size={19} />
          <p>
            Şifre sıfırlama bağlantısı tek kullanımlıktır ve belirli süre sonra
            geçerliliğini kaybeder.
          </p>
        </div>

        <Link to="/login" className="back-login-link">
          <ArrowLeft size={18} />
          Giriş sayfasına dön
        </Link>
      </div>
    </section>
  );
}

export default ResetPassword;
