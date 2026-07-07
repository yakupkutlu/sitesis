import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  ShieldCheck,
  AlertCircle,
  KeyRound,
} from "lucide-react";

import { requestPasswordReset } from "../api/authApi";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setErrorMessage("Lütfen e-posta adresinizi girin.");
      setSuccessMessage("");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setErrorMessage("Lütfen geçerli bir e-posta adresi girin.");
      setSuccessMessage("");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      await requestPasswordReset({
        email: trimmedEmail,
      });

      setSuccessMessage(
        "Şifre sıfırlama talebiniz alınmıştır. Eğer e-posta sistemde kayıtlıysa sıfırlama bağlantısı gönderilecektir."
      );
    } catch {
      setErrorMessage("Şifre sıfırlama talebi gönderilemedi.");
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

        <span className="badge">Şifre Sıfırlama</span>

        <h1>Şifrenizi mi unuttunuz?</h1>

        <p className="forgot-description">
          E-posta adresinizi girin. Güvenlik nedeniyle sistem, bu e-postanın
          kayıtlı olup olmadığını açık şekilde söylemez.
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

        <form className="forgot-form" onSubmit={handleSubmit}>
          <label className="input-group">
            <span>E-posta</span>

            <div className="input-with-icon">
              <Mail size={19} />

              <input
                type="email"
                placeholder="ornek@mail.com"
                value={email}
                autoComplete="email"
                disabled={isSubmitting}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
              />
            </div>
          </label>

          <button
            type="submit"
            className="login-submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Gönderiliyor..."
              : "Şifre Sıfırlama Bağlantısı Gönder"}
          </button>
        </form>

        <div className="forgot-security-note">
          <ShieldCheck size={19} />

          <p>
            Güvenlik nedeniyle sistem, girilen e-postanın kayıtlı olup
            olmadığını açık şekilde söylemez.
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

export default ForgotPassword;
