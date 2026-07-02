import { useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Bell,
  CreditCard,
  Home,
  MessageSquareText,
  Settings,
  UploadCloud,
} from "lucide-react";

import ResidentProfileSettings from "../../components/resident-settings/ResidentProfileSettings";
import ResidentApartmentInfo from "../../components/resident-settings/ResidentApartmentInfo";
import ResidentNotificationSettings from "../../components/resident-settings/ResidentNotificationSettings";
import ResidentSecuritySettings from "../../components/resident-settings/ResidentSecuritySettings";
import ResidentAppearanceSettings from "../../components/resident-settings/ResidentAppearanceSettings";

const navItems = [
  { label: "Panel", path: "/resident/dashboard", icon: Home },
  { label: "Aidat ve Ödemeler", path: "/resident/payments", icon: CreditCard },
  { label: "Dekont Yükle", path: "/resident/receipts", icon: UploadCloud },
  { label: "Duyurular", path: "/resident/announcements", icon: Bell },
  { label: "Talepler", path: "/resident/requests", icon: MessageSquareText },
  { label: "Ayarlar", path: "/resident/settings", icon: Settings },
];

const allowedAvatarTypes = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const maxAvatarSize = 2 * 1024 * 1024;

const apartmentInfo = {
  siteName: "Mavi Site",
  apartment: "A Blok / Daire 5",
  address: "İskenderun / Hatay",
  residentType: "Kiracı",
};

const initialProfileData = {
  fullName: "Ali Can",
  role: "Kiracı",
  email: "ali.can@example.com",
  phone: "+90 555 000 00 00",
  avatarPreview: "",
};

const initialNotificationData = {
  smsEnabled: true,
  emailEnabled: true,
  requestStatusNotify: true,
};

const initialSecurityData = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function getInitialAppearanceData() {
  return {
    themeMode: localStorage.getItem("residentThemeMode") || "Açık Tema",
    cardDensity: localStorage.getItem("residentCardDensity") || "Rahat",
  };
}

function isValidAvatarFile(file) {
  return allowedAvatarTypes.includes(file.type) && file.size <= maxAvatarSize;
}

function ResidentSettingsPage() {
  const [profileData, setProfileData] = useState(initialProfileData);
  const [notificationData, setNotificationData] = useState(
    initialNotificationData
  );
  const [securityData, setSecurityData] = useState(initialSecurityData);
  const [appearanceData, setAppearanceData] = useState(
    getInitialAppearanceData
  );
  const [avatarError, setAvatarError] = useState("");

  const isDarkMode = appearanceData.themeMode.toLowerCase().includes("koyu");

  function handleProfileChange(event) {
    const { name, value } = event.target;

    setProfileData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];

    setAvatarError("");

    if (!file) {
      return;
    }

    if (!allowedAvatarTypes.includes(file.type)) {
      setAvatarError("Lütfen PNG, JPG, JPEG veya WEBP formatında görsel seçin.");
      return;
    }

    if (file.size > maxAvatarSize) {
      setAvatarError("Profil fotoğrafı en fazla 2 MB olabilir.");
      return;
    }

    if (!isValidAvatarFile(file)) {
      setAvatarError("Seçilen profil fotoğrafı geçerli değil.");
      return;
    }

    const avatarUrl = URL.createObjectURL(file);

    setProfileData((currentData) => ({
      ...currentData,
      avatarPreview: avatarUrl,
    }));
  }

  function handleNotificationChange(event) {
    const { name, checked } = event.target;

    setNotificationData((currentData) => ({
      ...currentData,
      [name]: checked,
    }));
  }

  function handleSecurityChange(event) {
    const { name, value } = event.target;

    setSecurityData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleSecuritySubmit(event) {
    event.preventDefault();

    if (
      !securityData.currentPassword ||
      !securityData.newPassword ||
      !securityData.confirmPassword
    ) {
      alert("Lütfen tüm şifre alanlarını doldurunuz.");
      return;
    }

    if (securityData.newPassword.length < 6) {
      alert("Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }

    if (securityData.newPassword !== securityData.confirmPassword) {
      alert("Yeni şifreler eşleşmiyor.");
      return;
    }

    setSecurityData(initialSecurityData);

    alert("Şifre güncelleme talebi alındı.");
  }

  function handleAppearanceChange(event) {
    const { name, value } = event.target;

    const newAppearanceData = {
      ...appearanceData,
      [name]: value,
    };

    setAppearanceData(newAppearanceData);

    localStorage.setItem("residentThemeMode", newAppearanceData.themeMode);
    localStorage.setItem("residentCardDensity", newAppearanceData.cardDensity);
  }

  return (
    <DashboardLayout
      roleTitle="Ayarlar"
      roleBadge="Sakin"
      userName={profileData.fullName}
      userAvatar={profileData.avatarPreview}
      navItems={navItems}
      theme="resident"
      isDarkMode={isDarkMode}
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Sakin Ayarları</span>

          <h2>Profil ve Ayarlar</h2>

          <p>
            Profil, bildirim, güvenlik ve görünüm tercihlerinizi buradan
            yönetebilirsiniz.
          </p>
        </div>
      </div>

      <div className="resident-settings-grid">
        <ResidentProfileSettings
          profileData={profileData}
          onInputChange={handleProfileChange}
          onAvatarChange={handleAvatarChange}
          avatarError={avatarError}
        />

        <ResidentApartmentInfo apartmentInfo={apartmentInfo} />

        <ResidentNotificationSettings
          notificationData={notificationData}
          onToggleChange={handleNotificationChange}
        />

        <ResidentSecuritySettings
          securityData={securityData}
          onInputChange={handleSecurityChange}
          onSubmit={handleSecuritySubmit}
        />

        <ResidentAppearanceSettings
          appearanceData={appearanceData}
          onInputChange={handleAppearanceChange}
        />
      </div>
    </DashboardLayout>
  );
}

export default ResidentSettingsPage;