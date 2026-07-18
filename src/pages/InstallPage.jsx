import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Database,
  KeyRound,
  Lock,
  ShieldCheck,
  User,
} from "lucide-react";

import { installSystem } from "../api/systemApi";

function InstallPage() {
  const [searchParams] = useSearchParams();

  const tokenFromUrl = useMemo(() => {
    return searchParams.get("token") || "";
  }, [searchParams]);

  const [token, setToken] = useState(tokenFromUrl);
  const [dbName, setDbName] = useState("");
  const [dbUser, setDbUser] = useState("");
  const [dbPassword, setDbPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!token || !dbName || !dbUser || !dbPassword) {
      setErrorMessage("Lütfen tüm alanları doldurun.");
      setSuccessMessage("");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await installSystem({
        token,
        dbName,
        dbUser,
        dbPassword,
      });

      setSuccessMessage(
        result?.message ??
          "Kurulum tamamlandı. Süper admin hesabıyla giriş yapabilirsiniz."
      );
    } catch (error) {
      setErrorMessage(
        error?.message || "Kurulum sırasında bir hata oluştu."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="forgot-page">
      <div className="forgot-card">
        <div className="forgot-icon">
          <Database size={30} />
        </div>

        <span className="badge">Sistem Kurulumu</span>

        <h1>Veritabanını kur / onar</h1>

        <p className="forgot-description">
          Bu sayfa, veritabanı tablolarını oluşturur ve süper admin hesabını
          hazırlar. Devam etmek için kurulum anahtarını ve veritabanı
          bilgilerini girin.
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
              <span>Kurulum Anahtarı</span>
              <div className="input-with-icon">
                <KeyRound size={19} />
                <input
                  type="text"
                  placeholder="INSTALL_TOKEN"
                  value={token}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setToken(event.target.value);
                    setErrorMessage("");
                  }}
                />
              </div>
            </label>

            <label className="input-group">
              <span>Veritabanı Adı</span>
              <div className="input-with-icon">
                <Database size={19} />
                <input
                  type="text"
                  placeholder="Veritabanı adı"
                  value={dbName}
                  autoComplete="off"
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setDbName(event.target.value);
                    setErrorMessage("");
                  }}
                />
              </div>
            </label>

            <label className="input-group">
              <span>Veritabanı Kullanıcı Adı</span>
              <div className="input-with-icon">
                <User size={19} />
                <input
                  type="text"
                  placeholder="Veritabanı kullanıcı adı"
                  value={dbUser}
                  autoComplete="off"
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setDbUser(event.target.value);
                    setErrorMessage("");
                  }}
                />
              </div>
            </label>

            <label className="input-group">
              <span>Veritabanı Şifresi</span>
              <div className="input-with-icon">
                <Lock size={19} />
                <input
                  type="password"
                  placeholder="Veritabanı şifresi"
                  value={dbPassword}
                  autoComplete="off"
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setDbPassword(event.target.value);
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
              {isSubmitting ? "Kuruluyor..." : "Kurulumu Başlat"}
            </button>
          </form>
        )}

        <div className="forgot-security-note">
          <ShieldCheck size={19} />
          <p>
            Kurulum anahtarı ve veritabanı bilgileri sunucu tarafında
            doğrulanır. Bilgiler hatalıysa işlem gerçekleştirilmez.
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

export default InstallPage;
