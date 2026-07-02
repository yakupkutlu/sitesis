import { useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BarChart3,
  Bell,
  CreditCard,
  Home,
  MessageSquareText,
  Settings,
  UploadCloud,
  UserRound,
} from "lucide-react";

import ManagerProfileSettings from "../../components/manager-settings/ManagerProfileSettings";
import ManagerAreaSettings from "../../components/manager-settings/ManagerAreaSettings";
import ManagerNotificationSettings from "../../components/manager-settings/ManagerNotificationSettings";
import ManagerSecuritySettings from "../../components/manager-settings/ManagerSecuritySettings";
import ManagerAppearanceSettings from "../../components/manager-settings/ManagerAppearanceSettings";

const navItems = [
  { label: "Panel", path: "/manager/dashboard", icon: BarChart3 },
  { label: "Daireler", path: "/manager/apartments", icon: Home },
  { label: "Sakinler", path: "/manager/residents", icon: UserRound },
  { label: "Aidat ve Ödemeler", path: "/manager/payments", icon: CreditCard },
  { label: "Dekontlar", path: "/manager/receipts", icon: UploadCloud },
  { label: "Duyurular", path: "/manager/announcements", icon: Bell },
  { label: "Talepler", path: "/manager/requests", icon: MessageSquareText },
  { label: "Ayarlar", path: "/manager/settings", icon: Settings },
];

const allowedAvatarTypes = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const maxAvatarSize = 2 * 1024 * 1024;

const initialProfileData = {
  fullName: "Alaa Aldeen",
  title: "Site Yöneticisi",
  email: "alaa@example.com",
  phone: "0555 111 22 33",
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

const areaData = {
  managementType: "Site Yöneticisi",
  areaName: "Mavi Site",
  blockCount: "3 Blok",
  apartmentCount: "48 Daire",
};

function getInitialAppearanceData() {
  return {
    themeMode: localStorage.getItem("managerThemeMode") || "Açık Tema",
    cardDensity: localStorage.getItem("managerCardDensity") || "Rahat",
  };
}

function ManagerSettingsPage() {
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
      setAvatarError("Profil görseli en fazla 2 MB olabilir.");
      return;
    }

    const avatarUrl = URL.createObjectURL(file);

    setProfileData((currentData) => ({
      ...currentData,
      avatarPreview: avatarUrl,
    }));
  }

  function handleSaveProfile(event) {
    event.preventDefault();

    alert("Profil bilgileri kaydedildi.");
  }

  function handleNotificationChange(event) {
    const { name, checked } = event.target;

    setNotificationData((currentData) => ({
      ...currentData,
      [name]: checked,
    }));
  }

  function handleSaveNotifications(event) {
    event.preventDefault();

    alert("Bildirim tercihleri kaydedildi.");
  }

  function handleSecurityChange(event) {
    const { name, value } = event.target;

    setSecurityData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleSaveSecurity(event) {
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
      alert("Yeni şifre ve tekrar alanı aynı olmalıdır.");
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

    localStorage.setItem("managerThemeMode", newAppearanceData.themeMode);
    localStorage.setItem("managerCardDensity", newAppearanceData.cardDensity);
  }

  function handleSaveAppearance(event) {
    event.preventDefault();

    localStorage.setItem("managerThemeMode", appearanceData.themeMode);
    localStorage.setItem("managerCardDensity", appearanceData.cardDensity);

    alert("Görünüm ayarları kaydedildi.");
  }

  return (
    <DashboardLayout
      roleTitle="Ayarlar"
      roleBadge="Yönetici"
      userName={profileData.fullName}
      userAvatar={profileData.avatarPreview}
      navItems={navItems}
      theme="manager"
      isDarkMode={isDarkMode}
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Yönetici Ayarları</span>

          <h2>Ayarlar</h2>

          <p>
            Profil bilgilerinizi, bildirim tercihlerinizi, güvenlik ve görünüm
            ayarlarınızı buradan yönetebilirsiniz.
          </p>
        </div>
      </div>

      <div className="manager-settings-grid">
        <ManagerProfileSettings
          profileData={profileData}
          onProfileChange={handleProfileChange}
          onAvatarChange={handleAvatarChange}
          onSaveProfile={handleSaveProfile}
          avatarError={avatarError}
        />

        <ManagerAreaSettings areaData={areaData} />

        <ManagerNotificationSettings
          notificationData={notificationData}
          onNotificationChange={handleNotificationChange}
          onSaveNotifications={handleSaveNotifications}
        />

        <ManagerSecuritySettings
          securityData={securityData}
          onSecurityChange={handleSecurityChange}
          onSaveSecurity={handleSaveSecurity}
        />

        <ManagerAppearanceSettings
          appearanceData={appearanceData}
          onAppearanceChange={handleAppearanceChange}
          onSaveAppearance={handleSaveAppearance}
        />
      </div>
    </DashboardLayout>
  );
}

export default ManagerSettingsPage;