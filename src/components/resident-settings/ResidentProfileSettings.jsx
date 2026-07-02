import { Camera, UserRound } from "lucide-react";

function ResidentProfileSettings({
  profileData,
  onInputChange,
  onAvatarChange,
  avatarError,
}) {
  const profileInitial = profileData.fullName?.trim().charAt(0) || "K";

  return (
    <section className="resident-settings-card">
      <div className="resident-settings-card-header">
        <div>
          <span className="section-kicker">Profil Bilgileri</span>

          <h3>Kişisel Bilgiler</h3>

          <p>
            Profil fotoğrafınızı ve iletişim bilgilerinizi buradan
            güncelleyebilirsiniz.
          </p>
        </div>

        <div className="resident-settings-card-icon">
          <UserRound size={22} />
        </div>
      </div>

      <div className="resident-profile-settings-layout">
        <div className="resident-profile-avatar-box">
          <div className="resident-profile-avatar-preview">
            {profileData.avatarPreview ? (
              <img src={profileData.avatarPreview} alt="Profil" />
            ) : (
              <span>{profileInitial}</span>
            )}
          </div>

          <label className="resident-avatar-upload-button">
            <Camera size={18} />
            <span>Fotoğraf Seç</span>

            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={onAvatarChange}
            />
          </label>

          <small>PNG, JPG, JPEG veya WEBP / Maksimum 2 MB</small>

          {avatarError && (
            <div className="resident-avatar-error">
              <strong>{avatarError}</strong>
            </div>
          )}
        </div>

        <form className="resident-profile-settings-form">
          <div className="form-grid">
            <label>
              Ad Soyad
              <input
                type="text"
                name="fullName"
                value={profileData.fullName}
                onChange={onInputChange}
              />
            </label>

            <label>
              Rol
              <input type="text" name="role" value={profileData.role} readOnly />
            </label>

            <label>
              E-posta
              <input
                type="email"
                name="email"
                value={profileData.email}
                onChange={onInputChange}
              />
            </label>

            <label>
              Telefon
              <input
                type="tel"
                name="phone"
                value={profileData.phone}
                onChange={onInputChange}
              />
            </label>
          </div>

          <div className="resident-profile-preview-card">
            <span>Üst bar önizleme</span>

            <div>
              <div className="resident-profile-preview-avatar">
                {profileData.avatarPreview ? (
                  <img src={profileData.avatarPreview} alt="Profil" />
                ) : (
                  <strong>{profileInitial}</strong>
                )}
              </div>

              <div>
                <strong>{profileData.fullName || "Kullanıcı"}</strong>
                <small>{profileData.role}</small>
              </div>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

export default ResidentProfileSettings;