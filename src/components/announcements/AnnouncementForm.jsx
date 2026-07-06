import { CheckCircle2, X } from "lucide-react";

const targetTypeOptions = [
  { value: "ALL", label: "Tüm Sistem" },
  { value: "SITE", label: "Belirli Site" },
  { value: "BLOCK", label: "Belirli Blok" },
  { value: "APARTMENT", label: "Belirli Daire" },
];

function getBlockSiteId(block) {
  return block.siteId ?? block.site?.id ?? "";
}

function getApartmentBlockId(apartment) {
  return apartment.blockId ?? apartment.block?.id ?? "";
}

function AnnouncementForm({
  formData,
  sites,
  blocks,
  apartments,
  editingAnnouncement,
  onInputChange,
  onSubmit,
  onCancel,
  isSaving = false,
}) {
  const safeSites = sites || [];
  const safeBlocks = blocks || [];
  const safeApartments = apartments || [];
  const isEditMode = Boolean(editingAnnouncement);

  const shouldShowSiteSelect = formData.targetType !== "ALL";
  const shouldShowBlockSelect =
    formData.targetType === "BLOCK" || formData.targetType === "APARTMENT";
  const shouldShowApartmentSelect = formData.targetType === "APARTMENT";

  const filteredBlocks = formData.siteId
    ? safeBlocks.filter((block) => getBlockSiteId(block) === formData.siteId)
    : [];

  const filteredApartments = formData.blockId
    ? safeApartments.filter(
        (apartment) => getApartmentBlockId(apartment) === formData.blockId
      )
    : [];

  return (
    <section className="announcement-form-card">
      <div className="announcement-form-header">
        <div>
          <span className="section-kicker">
            {isEditMode ? "Duyuru Düzenleme" : "Yeni Duyuru"}
          </span>

          <h3>{isEditMode ? "Duyuruyu Düzenle" : "Yeni Duyuru Oluştur"}</h3>

          <p>
            Duyuru hedefi oluşturma sırasında belirlenir. Yayındaki duyurularda
            hedef değiştirmek yerine yeni duyuru oluşturmak daha güvenlidir.
          </p>
        </div>

        <button
          type="button"
          className="modal-close-button"
          onClick={onCancel}
          aria-label="Duyuru formunu kapat"
          disabled={isSaving}
        >
          <X size={20} />
        </button>
      </div>

      <form className="announcement-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="full-width">
            Duyuru Başlığı
            <input
              type="text"
              name="title"
              placeholder="Örn: Aidat ödeme hatırlatması"
              value={formData.title}
              onChange={onInputChange}
              disabled={isSaving}
              maxLength={120}
              required
            />
          </label>

          <label>
            Hedef Türü
            <select
              name="targetType"
              value={formData.targetType}
              onChange={onInputChange}
              disabled={isSaving || isEditMode}
            >
              {targetTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {shouldShowSiteSelect && (
            <label>
              Site Seç
              <select
                name="siteId"
                value={formData.siteId}
                onChange={onInputChange}
                disabled={isSaving || isEditMode}
                required
              >
                <option value="">Site seçin</option>

                {safeSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {shouldShowBlockSelect && (
            <label>
              Blok / Apartman Seç
              <select
                name="blockId"
                value={formData.blockId}
                onChange={onInputChange}
                disabled={isSaving || isEditMode || !formData.siteId}
                required
              >
                <option value="">
                  {formData.siteId ? "Blok seçin" : "Önce site seçin"}
                </option>

                {filteredBlocks.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {shouldShowApartmentSelect && (
            <label>
              Daire Seç
              <select
                name="apartmentId"
                value={formData.apartmentId}
                onChange={onInputChange}
                disabled={isSaving || isEditMode || !formData.blockId}
                required
              >
                <option value="">
                  {formData.blockId ? "Daire seçin" : "Önce blok seçin"}
                </option>

                {filteredApartments.map((apartment) => (
                  <option key={apartment.id} value={apartment.id}>
                    Daire {apartment.number}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!isEditMode && (
            <div className="announcement-send-options">
              <span>Bilgilendirme Seçenekleri</span>

              <label>
                <input
                  name="sendSms"
                  type="checkbox"
                  checked={Boolean(formData.sendSms)}
                  onChange={onInputChange}
                  disabled={isSaving}
                />
                SMS gönder
              </label>

              <label>
                <input
                  name="sendEmail"
                  type="checkbox"
                  checked={Boolean(formData.sendEmail)}
                  onChange={onInputChange}
                  disabled={isSaving}
                />
                E-posta gönder
              </label>
            </div>
          )}

          {isEditMode && (
            <div className="announcement-send-options">
              <span>Not</span>
              <p>
                Düzenleme sırasında sadece başlık ve içerik güncellenir. Hedef
                ve bildirim seçenekleri değiştirilmez.
              </p>
            </div>
          )}

          <label className="full-width">
            Duyuru İçeriği
            <textarea
              name="content"
              rows="5"
              placeholder="Duyuru metnini buraya yazın..."
              value={formData.content}
              onChange={onInputChange}
              disabled={isSaving}
              maxLength={2000}
              required
            />
          </label>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="secondary-form-button"
            onClick={onCancel}
            disabled={isSaving}
          >
            Vazgeç
          </button>

          <button
            type="submit"
            className="dashboard-action-button"
            disabled={isSaving}
          >
            <CheckCircle2 size={18} />
            {isSaving
              ? "Kaydediliyor..."
              : isEditMode
                ? "Değişiklikleri Kaydet"
                : "Duyuru Oluştur"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default AnnouncementForm;
