import { CheckCircle2, ImagePlus, Upload, X } from "lucide-react";

const buildingTypeOptions = ["Site", "Tek Apartman", "Rezidans"];
const elevatorOptions = ["Var", "Yok", "Bloklara göre değişir"];
const allowedImageTypesText = "PNG, JPG, JPEG veya WEBP";
const maxImageSizeText = "5 MB";

function BuildingForm({
  formData,
  previewImage,
  managers,
  systemOptions,
  editingBuilding,
  onInputChange,
  onSystemChange,
  onImageChange,
  onSubmit,
  onCancel,
}) {
  const safeManagers = managers || [];
  const safeSystemOptions = systemOptions || [];
  const selectedSystems = formData.systems || [];

  const shouldShowBlockInfo =
    formData.type === "Site" || formData.type === "Rezidans";

  return (
    <section className="building-form-card">
      <div className="building-form-header">
        <div>
          <span className="section-kicker">
            {editingBuilding ? "Kayıt Düzenleme" : "Yeni Kayıt"}
          </span>

          <h3>
            {editingBuilding
              ? "Site / Apartman Bilgilerini Düzenle"
              : "Site / Apartman Oluştur"}
          </h3>

          <p>
            Site, apartman veya rezidans bilgilerini eksiksiz doldurun. Görsel
            seçerseniz ön izleme burada görünecektir.
          </p>
        </div>

        <button
          type="button"
          className="modal-close-button"
          onClick={onCancel}
          aria-label="Formu kapat"
        >
          <X size={20} />
        </button>
      </div>

      <form className="building-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Yapı Türü
            <select name="type" value={formData.type} onChange={onInputChange}>
              {buildingTypeOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            Site / Apartman İsmi
            <input
              type="text"
              name="name"
              placeholder="Örn: Mavi Site"
              value={formData.name}
              onChange={onInputChange}
              required
            />
          </label>

          <label>
            Daire Sayısı
            <input
              type="number"
              name="apartments"
              min="1"
              placeholder="Örn: 48"
              value={formData.apartments}
              onChange={onInputChange}
              required
            />
          </label>

          <label>
            Yönetici Belirle
            <select
              name="manager"
              value={formData.manager}
              onChange={onInputChange}
            >
              <option value="">Yönetici seçin</option>

              {safeManagers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                {manager.fullName} - {manager.email}
                </option>
              ))}
            </select>
          </label>

          {shouldShowBlockInfo && (
            <label>
              Blok / Apartman Bilgileri
              <input
                type="text"
                name="blockInfo"
                placeholder="Örn: A Blok, B Blok, C Blok"
                value={formData.blockInfo}
                onChange={onInputChange}
              />
            </label>
          )}

          <label>
            Asansör Bilgisi
            <select
              name="elevator"
              value={formData.elevator}
              onChange={onInputChange}
            >
              {elevatorOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="full-width">
            Adres
            <textarea
              name="address"
              rows="3"
              placeholder="Adres bilgisini girin"
              value={formData.address}
              onChange={onInputChange}
              required
            />
          </label>

          <label className="full-width">
            Kısa Açıklama
            <textarea
              name="description"
              rows="3"
              placeholder="Site/apartman hakkında kısa açıklama yazın"
              value={formData.description}
              onChange={onInputChange}
            />
          </label>

          <div className="full-width building-systems">
            <span>Kullanılan Sistemler</span>

            <div className="checkbox-grid">
              {safeSystemOptions.map((system) => (
                <label key={system}>
                  <input
                    type="checkbox"
                    checked={selectedSystems.includes(system)}
                    onChange={() => onSystemChange(system)}
                  />

                  {system}
                </label>
              ))}
            </div>
          </div>

          <div className="full-width image-upload-area">
            <div className="image-preview-box">
              {previewImage ? (
                <img src={previewImage} alt="Seçilen site/apartman görseli" />
              ) : (
                <div className="empty-image-preview">
                  <ImagePlus size={38} />
                  <span>Henüz görsel seçilmedi</span>
                </div>
              )}
            </div>

            <label className="upload-label">
              <Upload size={20} />

              <span>Site / Apartman Resmi Seç</span>

              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                onChange={onImageChange}
              />
            </label>

            <p>
              {allowedImageTypesText} formatında görsel seçebilirsiniz. Dosya
              boyutu en fazla {maxImageSizeText} olmalıdır.
            </p>
          </div>
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
            {editingBuilding ? "Değişiklikleri Kaydet" : "Kaydı Oluştur"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default BuildingForm;