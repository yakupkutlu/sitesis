import { Camera, Save } from "lucide-react";

function getInitials(fullName) {
  const initials = fullName
    ?.trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase();

  return initials || "Y";
}

function ManagerProfileSettings({
  profileData,
  onProfileChange,
  onAvatarChange,
  onSaveProfile,
  avatarError,
}) {
  const profileInitials = getInitials(profileData.fullName);

  return (
    <section className="manager-settings-card">
      <div className="manager-settings-card-header">
        <div>
          <span className="section-kicker">Profil</span>

          <h3>Profil Bilgileri</h3>

          <p>
            Ad soyad, iletişim bilgileri ve profil görselinizi buradan
            güncelleyebilirsiniz.
          </p>
        </div>
      </div>

      <div className="manager-profile-settings-layout">
        <div className="manager-profile-avatar-box">
          <div className="manager-profile-avatar-preview">
            {profileData.avatarPreview ? (
              <img src={profileData.avatarPreview} alt="Profil görseli" />
            ) : (
              <span>{profileInitials}</span>
            )}
          </div>

          <label className="manager-avatar-upload-button">
            <Camera size={17} />
            <span>Görsel Seç</span>

            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={onAvatarChange}
            />
          </label>

          <small>PNG, JPG, JPEG veya WEBP / Maksimum 2 MB</small>

          {avatarError && (
            <div className="manager-avatar-error">
              <strong>{avatarError}</strong>
            </div>
          )}
        </div>

        <form className="manager-profile-settings-form" onSubmit={onSaveProfile}>
          <div className="form-grid">
            <label>
              Ad Soyad
              <input
                type="text"
                name="fullName"
                value={profileData.fullName}
                onChange={onProfileChange}
                placeholder="Ad soyad giriniz"
                required
              />
            </label>

            <label>
              Ünvan
              <input
                type="text"
                name="title"
                value={profileData.title}
                onChange={onProfileChange}
                placeholder="Örn: Site Yöneticisi"
              />
            </label>

            <label>
              E-posta
              <input
                type="email"
                name="email"
                value={profileData.email}
                onChange={onProfileChange}
                placeholder="ornek@mail.com"
                required
              />
            </label>

            <label>
              Telefon
              <input
                type="tel"
                name="phone"
                value={profileData.phone}
                onChange={onProfileChange}
                placeholder="05xx xxx xx xx"
              />
            </label>
          </div>

          <div className="manager-profile-preview-card">
            <span>Profil Önizleme</span>

            <div>
              <div className="manager-profile-preview-avatar">
                {profileData.avatarPreview ? (
                  <img src={profileData.avatarPreview} alt="Profil önizleme" />
                ) : (
                  <strong>{profileInitials}</strong>
                )}
              </div>

              <div>
                <strong>{profileData.fullName || "Yönetici"}</strong>
                <small>{profileData.title || "Yönetici"}</small>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="dashboard-action-button">
              <Save size={18} />
              Profili Kaydet
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default ManagerProfileSettings;