import { managerNavItems } from "../../config/managerNavigation";
import { useAuth } from "../../hooks/useAuth";
import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Save,
  ShieldCheck,
} from "lucide-react";

import {
  changeOwnPassword,
  getCurrentUser,
  updateOwnProfile,
} from "../../api/authApi";


const emptySecurityData = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function getInitialAppearanceData() {
  return {
    themeMode: localStorage.getItem("managerThemeMode") || "Açık Tema",
    cardDensity: localStorage.getItem("managerCardDensity") || "Rahat",
  };
}

function ManagerSettingsPage() {
  const { user, refreshUser } = useAuth();

  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "MANAGER",
  });

  const [securityData, setSecurityData] = useState(emptySecurityData);
  const [appearanceData, setAppearanceData] = useState(getInitialAppearanceData);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isDarkMode = appearanceData.themeMode.toLowerCase().includes("koyu");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const result = await getCurrentUser();
        const currentUser = result?.data?.user ?? result?.user ?? user;

        if (isMounted && currentUser) {
          setProfileData({
            fullName: currentUser.fullName ?? "",
            email: currentUser.email ?? "",
            phone: currentUser.phone ?? "",
            role: currentUser.role ?? "MANAGER",
          });
        }
      } catch {
        if (isMounted) {
          setErrorMessage("Profil bilgileri alınamadı.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  function handleProfileChange(event) {
    const { name, value } = event.target;

    setProfileData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  async function handleSaveProfile(event) {
    event.preventDefault();

    if (!profileData.fullName.trim()) {
      setErrorMessage("Ad soyad zorunludur.");
      return;
    }

    try {
      setIsSavingProfile(true);
      setMessage("");
      setErrorMessage("");

      const result = await updateOwnProfile({
        fullName: profileData.fullName.trim(),
        phone: profileData.phone.trim() || null,
      });

      const updatedUser = result?.data?.user ?? result?.user;

      if (updatedUser) {
        setProfileData((currentData) => ({
          ...currentData,
          fullName: updatedUser.fullName ?? currentData.fullName,
          phone: updatedUser.phone ?? "",
        }));
      }

      await refreshUser();

      setMessage("Profil bilgileri başarıyla güncellendi.");
    } catch {
      setErrorMessage("Profil bilgileri kaydedilemedi.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  function handleSecurityChange(event) {
    const { name, value } = event.target;

    setSecurityData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  async function handleSaveSecurity(event) {
    event.preventDefault();

    if (
      !securityData.currentPassword ||
      !securityData.newPassword ||
      !securityData.confirmPassword
    ) {
      setErrorMessage("Lütfen tüm şifre alanlarını doldurun.");
      return;
    }

    if (securityData.newPassword.length < 8) {
      setErrorMessage("Yeni şifre en az 8 karakter olmalıdır.");
      return;
    }

    if (securityData.newPassword !== securityData.confirmPassword) {
      setErrorMessage("Yeni şifre ve tekrar alanı aynı olmalıdır.");
      return;
    }

    try {
      setIsSavingPassword(true);
      setMessage("");
      setErrorMessage("");

      await changeOwnPassword({
        currentPassword: securityData.currentPassword,
        newPassword: securityData.newPassword,
      });

      setSecurityData(emptySecurityData);
      setMessage("Şifre başarıyla güncellendi.");
    } catch {
      setErrorMessage("Şifre güncellenemedi. Mevcut şifrenizi kontrol edin.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  function handleAppearanceChange(event) {
    const { name, value } = event.target;

    const nextAppearanceData = {
      ...appearanceData,
      [name]: value,
    };

    setAppearanceData(nextAppearanceData);

    localStorage.setItem("managerThemeMode", nextAppearanceData.themeMode);
    localStorage.setItem("managerCardDensity", nextAppearanceData.cardDensity);
  }

  function handleSaveAppearance(event) {
    event.preventDefault();

    localStorage.setItem("managerThemeMode", appearanceData.themeMode);
    localStorage.setItem("managerCardDensity", appearanceData.cardDensity);

    setMessage("Görünüm ayarları kaydedildi.");
    setErrorMessage("");
  }

  return (
    <DashboardLayout
      roleTitle="Ayarlar"
      roleBadge="Yönetici"
      userName={profileData.fullName || user?.fullName || "Yönetici"}
      navItems={managerNavItems}
      theme="manager"
      isDarkMode={isDarkMode}
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Yönetici Ayarları</span>

          <h2>Ayarlar</h2>

          <p>
            Profil bilgilerinizi, güvenlik ayarlarınızı ve görünüm tercihinizi
            buradan yönetebilirsiniz.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="login-error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      {message && (
        <div className="login-success-message">
          <p>{message}</p>
        </div>
      )}

      {isLoading ? (
        <div className="dashboard-panel">
          <p>Ayarlar yükleniyor...</p>
        </div>
      ) : (
        <div className="manager-settings-grid">
          <section className="dashboard-panel">
            <span className="section-kicker">Profil</span>
            <h3>Profil Bilgileri</h3>

            <form className="manager-form" onSubmit={handleSaveProfile}>
              <div className="form-grid">
                <label>
                  Ad Soyad
                  <input
                    type="text"
                    name="fullName"
                    value={profileData.fullName}
                    onChange={handleProfileChange}
                    disabled={isSavingProfile}
                    required
                  />
                </label>

                <label>
                  E-posta
                  <input
                    type="email"
                    value={profileData.email}
                    disabled
                  />
                </label>

                <label>
                  Telefon
                  <input
                    type="text"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleProfileChange}
                    disabled={isSavingProfile}
                    placeholder="05xx xxx xx xx"
                  />
                </label>

                <label>
                  Rol
                  <input type="text" value={profileData.role} disabled />
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="dashboard-action-button"
                  disabled={isSavingProfile}
                >
                  <Save size={18} />
                  {isSavingProfile ? "Kaydediliyor..." : "Profili Kaydet"}
                </button>
              </div>
            </form>
          </section>

          <section className="dashboard-panel">
            <span className="section-kicker">Güvenlik</span>
            <h3>Şifre Değiştir</h3>

            <form className="manager-form" onSubmit={handleSaveSecurity}>
              <div className="form-grid">
                <label>
                  Mevcut Şifre
                  <input
                    type="password"
                    name="currentPassword"
                    value={securityData.currentPassword}
                    onChange={handleSecurityChange}
                    disabled={isSavingPassword}
                  />
                </label>

                <label>
                  Yeni Şifre
                  <input
                    type="password"
                    name="newPassword"
                    value={securityData.newPassword}
                    onChange={handleSecurityChange}
                    disabled={isSavingPassword}
                  />
                </label>

                <label>
                  Yeni Şifre Tekrar
                  <input
                    type="password"
                    name="confirmPassword"
                    value={securityData.confirmPassword}
                    onChange={handleSecurityChange}
                    disabled={isSavingPassword}
                  />
                </label>
              </div>

              <div className="login-security-note">
                <ShieldCheck size={18} />
                <p>Yeni şifre en az 8 karakter olmalıdır.</p>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="dashboard-action-button"
                  disabled={isSavingPassword}
                >
                  {isSavingPassword ? "Güncelleniyor..." : "Şifreyi Güncelle"}
                </button>
              </div>
            </form>
          </section>

          <section className="dashboard-panel">
            <span className="section-kicker">Görünüm</span>
            <h3>Görünüm Ayarları</h3>

            <form className="manager-form" onSubmit={handleSaveAppearance}>
              <div className="form-grid">
                <label>
                  Tema
                  <select
                    name="themeMode"
                    value={appearanceData.themeMode}
                    onChange={handleAppearanceChange}
                  >
                    <option>Açık Tema</option>
                    <option>Koyu Tema</option>
                  </select>
                </label>

                <label>
                  Kart Yoğunluğu
                  <select
                    name="cardDensity"
                    value={appearanceData.cardDensity}
                    onChange={handleAppearanceChange}
                  >
                    <option>Rahat</option>
                    <option>Kompakt</option>
                  </select>
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="dashboard-action-button">
                  Görünümü Kaydet
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}

export default ManagerSettingsPage;
