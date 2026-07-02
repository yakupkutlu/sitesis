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

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  const cleanedValue = value.replace(/\s/g, "");
  return /^(05\d{9}|\+905\d{9})$/.test(cleanedValue);
}

function ForgotPassword() {
  const [identifier, setIdentifier] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier) {
      setErrorMessage("Lütfen e-posta adresinizi veya telefon numaranızı girin.");
      setSuccessMessage("");
      return;
    }

    if (!isValidEmail(trimmedIdentifier) && !isValidPhone(trimmedIdentifier)) {
      setErrorMessage(
        "Lütfen geçerli bir e-posta adresi veya telefon numarası girin."
      );
      setSuccessMessage("");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("Talebiniz alınmıştır.");

    
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
          E-posta adresinizi veya telefon numaranızı girin. Talebiniz güvenli şekilde
          işleme alınacaktır.
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
            <span>E-posta veya Telefon</span>
            <div className="input-with-icon">
              <Mail size={19} />
              <input
                type="text"
                placeholder="ornek@mail.com veya 05xx xxx xx xx"
                value={identifier}
                onChange={(event) => {
                  setIdentifier(event.target.value);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
              />
            </div>
          </label>

          <button type="submit" className="login-submit-button">
            Şifre Sıfırlama Bağlantısı Gönder
          </button>
        </form>

        <div className="forgot-security-note">
          <ShieldCheck size={19} />
          <p>
            Güvenlik nedeniyle sistem, girilen bilginin kayıtlı olup olmadığını
            açık şekilde söylemez.
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