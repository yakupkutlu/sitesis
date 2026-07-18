import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, KeyRound, Lock, ShieldCheck } from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { changeOwnPassword } from "../api/authApi";

function ChangePasswordRequiredPage() {
  const navigate = useNavigate();
  const { roleHomePath, refreshUser, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordAgain, setNewPasswordAgain] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!currentPassword || !newPassword || !newPasswordAgain) {
      setErrorMessage("Lütfen tüm alanları doldurun.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("Yeni şifre en az 8 karakter olmalıdır.");
      return;
    }

    if (newPassword !== newPasswordAgain) {
      setErrorMessage("Yeni şifreler eşleşmiyor.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      await changeOwnPassword({
        currentPassword,
        newPassword,
      });

      const nextUser = await refreshUser();

      navigate(
        nextUser?.requiresModeSelection
          ? "/select-account-mode"
          : roleHomePath,
        { replace: true }
      );
    } catch (error) {
      setErrorMessage(error?.message || "Şifre güncellenemedi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <section className="forgot-page">
      <div className="forgot-card">
        <div className="forgot-icon">
          <KeyRound size={30} />
        </div>

        <span className="badge">Şifre Değişikliği Zorunlu</span>

        <h1>Devam etmek için şifrenizi değiştirin</h1>

        <p className="forgot-description">
          Bu hesap bir kurulum/kurtarma işlemiyle oluşturuldu. Güvenliğiniz
          için devam etmeden önce şifrenizi değiştirmeniz gerekiyor.
        </p>

        {errorMessage && (
          <div className="login-error-message">
            <AlertCircle size={20} />
            <p>{errorMessage}</p>
          </div>
        )}

        <form className="forgot-form" onSubmit={handleSubmit}>
          <label className="input-group">
            <span>Mevcut Şifre</span>
            <div className="input-with-icon">
              <Lock size={19} />
              <input
                type="password"
                placeholder="Mevcut şifrenizi girin"
                value={currentPassword}
                autoComplete="current-password"
                disabled={isSubmitting}
                onChange={(event) => {
                  setCurrentPassword(event.target.value);
                  setErrorMessage("");
                }}
              />
            </div>
          </label>

          <label className="input-group">
            <span>Yeni Şifre</span>
            <div className="input-with-icon">
              <Lock size={19} />
              <input
                type="password"
                placeholder="Yeni şifrenizi girin"
                value={newPassword}
                autoComplete="new-password"
                disabled={isSubmitting}
                onChange={(event) => {
                  setNewPassword(event.target.value);
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
                value={newPasswordAgain}
                autoComplete="new-password"
                disabled={isSubmitting}
                onChange={(event) => {
                  setNewPasswordAgain(event.target.value);
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
            {isSubmitting ? "Güncelleniyor..." : "Şifreyi Güncelle ve Devam Et"}
          </button>
        </form>

        <div className="forgot-security-note">
          <ShieldCheck size={19} />
          <p>Şifrenizi değiştirene kadar diğer sayfalara erişemezsiniz.</p>
        </div>

        <button type="button" className="back-login-link" onClick={handleLogout}>
          Çıkış yap
        </button>
      </div>
    </section>
  );
}

export default ChangePasswordRequiredPage;
