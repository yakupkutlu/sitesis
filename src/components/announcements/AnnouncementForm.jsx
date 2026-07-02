import { CheckCircle2, X } from "lucide-react";

const targetTypeOptions = [
  "Tüm Sistem",
  "Yöneticiler",
  "Sakinler",
  "Belirli Site / Apartman",
  "Belirli Blok",
  "Belirli Daire",
  "Seçili Kişiler",
];

const targetTypesWithSite = [
  "Belirli Site / Apartman",
  "Belirli Blok",
  "Belirli Daire",
];

const targetTypesWithBlock = ["Belirli Blok", "Belirli Daire"];

const priorityOptions = ["Normal", "Önemli", "Acil"];
const statusOptions = ["Yayında", "Taslak", "Pasif"];

const notificationOptions = [
  { name: "sendSms", label: "SMS ile bilgilendir" },
  { name: "sendEmail", label: "E-posta ile bilgilendir" },
];

function AnnouncementForm({
  formData,
  editingAnnouncement,
  siteOptions,
  blockOptions,
  apartmentOptions,
  userOptions,
  onInputChange,
  onUserSelectionChange,
  onSubmit,
  onCancel,
}) {
  const safeSiteOptions = siteOptions || [];
  const safeBlockOptions = blockOptions || [];
  const safeApartmentOptions = apartmentOptions || [];
  const safeUserOptions = userOptions || [];

  const selectedUserIds = Array.isArray(formData.selectedUserIds)
    ? formData.selectedUserIds
    : [];

  const selectedTargetType = formData.targetType || "Tüm Sistem";
  const shouldShowSiteSelect = targetTypesWithSite.includes(selectedTargetType);
  const shouldShowBlockSelect = targetTypesWithBlock.includes(selectedTargetType);
  const shouldShowApartmentSelect = selectedTargetType === "Belirli Daire";
  const shouldShowUserSelect = selectedTargetType === "Seçili Kişiler";

  return (
    <section className="announcement-form-card">
      <div className="announcement-form-header">
        <div>
          <span className="section-kicker">
            {editingAnnouncement ? "Duyuru Düzenleme" : "Yeni Duyuru"}
          </span>

          <h3>
            {editingAnnouncement
              ? "Duyuru Bilgilerini Düzenle"
              : "Yeni Duyuru Oluştur"}
          </h3>

          <p>
            Duyuru başlığı, hedef kitlesi ve bilgilendirme seçeneklerini
            belirleyin.
          </p>
        </div>

        <button
          type="button"
          className="modal-close-button"
          onClick={onCancel}
          aria-label="Duyuru formunu kapat"
        >
          <X size={20} />
        </button>
      </div>

      <form className="announcement-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="full-width">
            Duyuru Başlığı
            <input
              name="title"
              type="text"
              placeholder="Örn: Asansör bakım duyurusu"
              value={formData.title || ""}
              onChange={onInputChange}
              required
            />
          </label>

          <label>
            Hedef Türü
            <select
              name="targetType"
              value={selectedTargetType}
              onChange={onInputChange}
            >
              {targetTypeOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          {shouldShowSiteSelect && (
            <label>
              Site / Apartman Seç
              <select
                name="targetSite"
                value={formData.targetSite || ""}
                onChange={onInputChange}
                required
              >
                <option value="">Site / Apartman seçin</option>

                {safeSiteOptions.map((site) => (
                  <option key={site}>{site}</option>
                ))}
              </select>
            </label>
          )}

          {shouldShowBlockSelect && (
            <label>
              Blok Seç
              <select
                name="targetBlock"
                value={formData.targetBlock || ""}
                onChange={onInputChange}
                required
              >
                <option value="">Blok seçin</option>

                {safeBlockOptions.map((block) => (
                  <option key={block}>{block}</option>
                ))}
              </select>
            </label>
          )}

          {shouldShowApartmentSelect && (
            <label>
              Daire Seç
              <select
                name="targetApartment"
                value={formData.targetApartment || ""}
                onChange={onInputChange}
                required
              >
                <option value="">Daire seçin</option>

                {safeApartmentOptions.map((apartment) => (
                  <option key={apartment}>{apartment}</option>
                ))}
              </select>
            </label>
          )}

          {shouldShowUserSelect && (
            <div className="full-width announcement-send-options">
              <span>Kişi Seçimi</span>

              {safeUserOptions.length > 0 ? (
                safeUserOptions.map((user) => (
                  <label key={user.id}>
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => onUserSelectionChange(user.id)}
                    />
                    {user.name || "İsimsiz kullanıcı"} -{" "}
                    {user.apartment || "Daire bilgisi yok"}
                  </label>
                ))
              ) : (
                <p>Seçilebilir kullanıcı bulunamadı.</p>
              )}
            </div>
          )}

          <label>
            Öncelik
            <select
              name="priority"
              value={formData.priority || "Normal"}
              onChange={onInputChange}
            >
              {priorityOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            Durum
            <select
              name="status"
              value={formData.status || "Yayında"}
              onChange={onInputChange}
            >
              {statusOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <div className="announcement-send-options">
            <span>Bilgilendirme Seçenekleri</span>

            {notificationOptions.map((option) => (
              <label key={option.name}>
                <input
                  name={option.name}
                  type="checkbox"
                  checked={Boolean(formData[option.name])}
                  onChange={onInputChange}
                />
                {option.label}
              </label>
            ))}
          </div>

          <label className="full-width">
            Duyuru İçeriği
            <textarea
              name="content"
              rows="5"
              placeholder="Duyuru metnini buraya yazın..."
              value={formData.content || ""}
              onChange={onInputChange}
              required
            ></textarea>
          </label>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="secondary-form-button"
            onClick={onCancel}
          >
            Vazgeç
          </button>

          <button type="submit" className="dashboard-action-button">
            <CheckCircle2 size={18} />
            {editingAnnouncement ? "Değişiklikleri Kaydet" : "Duyuru Oluştur"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default AnnouncementForm;