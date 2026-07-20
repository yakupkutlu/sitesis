import {
  CheckCircle2,
  ImagePlus,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";

const buildingTypeOptions = ["Site", "Tek Apartman", "Rezidans"];
const elevatorOptions = ["Var", "Yok", "Bloklara göre değişir"];
const allowedImageTypesText = "PNG, JPG, JPEG veya WEBP";
const maxImageSizeText = "5 MB";

function getApartmentCount(value) {
  const count = Number(value);

  if (!Number.isInteger(count) || count < 1) {
    return 0;
  }

  return count;
}

function BuildingForm({
  formData,
  previewImage,
  managers,
  systemOptions,
  editingBuilding,
  onInputChange,
  onSystemChange,
  onImageChange,
  onBlockChange,
  onAddBlock,
  onRemoveBlock,
  onSubmit,
  onCancel,
  isSaving = false,
}) {
  const safeManagers = managers || [];
  const safeSystemOptions = systemOptions || [];
  const selectedSystems = formData.systems || [];
  const blocks = Array.isArray(formData.blocks) ? formData.blocks : [];

  const canAddMultipleBlocks =
    formData.type === "Site" || formData.type === "Rezidans";

  const totalApartmentCount = blocks.reduce(
    (total, block) => total + getApartmentCount(block.apartmentCount),
    0
  );

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
            Her blok için daire sayısını ayrı ayrı belirleyin. Toplam daire
            sayısı otomatik hesaplanır.
          </p>
        </div>

        <button
          type="button"
          className="modal-close-button"
          onClick={onCancel}
          aria-label="Formu kapat"
          disabled={isSaving}
        >
          <X size={20} />
        </button>
      </div>

      <form className="building-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Yapı Türü
            <select
              name="type"
              value={formData.type}
              onChange={onInputChange}
              disabled={isSaving}
            >
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
              disabled={isSaving}
              required
            />
          </label>

          <label>
            Site Genel Yöneticisi (Opsiyonel)
            <select
              name="manager"
              value={formData.manager}
              onChange={onInputChange}
              disabled={isSaving || Boolean(editingBuilding)}
              title={
                editingBuilding
                  ? "Mevcut yönetici atamalarını Yöneticiler sayfasından değiştirebilirsiniz."
                  : undefined
              }
            >
              <option value="">Genel yönetici seçilmedi</option>

              {safeManagers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.fullName} - {manager.email}
                </option>
              ))}
            </select>

            {editingBuilding && (
              <small>
                Yönetici atamalarını değiştirmek için Yöneticiler sayfasını
                kullanın.
              </small>
            )}
          </label>

          <label>
            Asansör Bilgisi
            <select
              name="elevator"
              value={formData.elevator}
              onChange={onInputChange}
              disabled={isSaving}
            >
              {elevatorOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <div className="full-width building-block-distribution">
            <div className="building-block-distribution-header">
              <div>
                <span className="section-kicker">
                  Blok ve Daire Dağılımı
                </span>
                <h4>
                  {canAddMultipleBlocks
                    ? "Blokları ve daire sayılarını belirleyin"
                    : "Apartman bilgilerini belirleyin"}
                </h4>
              </div>

              <div className="building-apartment-total">
                <span>Toplam Daire</span>
                <strong>{totalApartmentCount}</strong>
              </div>
            </div>

            <div className="building-block-list">
              {blocks.map((block, index) => {
                const isExistingBlock = Boolean(block.id);
                const cannotRemove =
                  blocks.length === 1 ||
                  (Boolean(editingBuilding) && isExistingBlock);

                return (
                  <div
                    className="building-block-row"
                    key={block.id ?? block.clientId ?? index}
                  >
                    <label>
                      {canAddMultipleBlocks
                        ? `${index + 1}. Blok Adı`
                        : "Apartman / Blok Adı"}
                      <input
                        type="text"
                        value={block.name}
                        placeholder={
                          canAddMultipleBlocks
                            ? "Örn: A Blok"
                            : "Örn: Mavi Apartman"
                        }
                        onChange={(event) =>
                          onBlockChange(index, "name", event.target.value)
                        }
                        disabled={isSaving}
                        required
                      />
                    </label>

                    <label>
                      Daire Sayısı
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        step="1"
                        value={block.apartmentCount}
                        placeholder="Örn: 12"
                        onChange={(event) =>
                          onBlockChange(
                            index,
                            "apartmentCount",
                            event.target.value
                          )
                        }
                        disabled={isSaving}
                        required
                      />
                    </label>

                    <label>
                      Blok Yöneticisi (Opsiyonel)
                      <select
                        value={block.managerId ?? ""}
                        onChange={(event) =>
                          onBlockChange(
                            index,
                            "managerId",
                            event.target.value
                          )
                        }
                        disabled={isSaving || Boolean(editingBuilding)}
                        title={
                          editingBuilding
                            ? "Mevcut yönetici atamalarını Yöneticiler sayfasından değiştirebilirsiniz."
                            : undefined
                        }
                      >
                        <option value="">Blok yöneticisi seçilmedi</option>

                        {safeManagers.map((manager) => (
                          <option
                            key={manager.id}
                            value={manager.id}
                            disabled={manager.id === formData.manager}
                          >
                            {manager.fullName} - {manager.email}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      className="building-block-remove-button"
                      onClick={() => onRemoveBlock(index)}
                      disabled={isSaving || cannotRemove}
                      title={
                        isExistingBlock && editingBuilding
                          ? "Mevcut bloklar güvenlik nedeniyle bu ekrandan silinemez."
                          : blocks.length === 1
                            ? "En az bir blok/apartman bulunmalıdır."
                            : "Bu satırı kaldır"
                      }
                      aria-label={`${index + 1}. blok satırını kaldır`}
                    >
                      <Trash2 size={18} />
                      Sil
                    </button>
                  </div>
                );
              })}
            </div>

            {canAddMultipleBlocks && (
              <button
                type="button"
                className="secondary-form-button building-add-block-button"
                onClick={onAddBlock}
                disabled={isSaving}
              >
                <Plus size={18} />
                Yeni Blok Ekle
              </button>
            )}

            <p className="building-block-help">
              Daireler bloklara otomatik dağıtılmaz. Her blok için girdiğiniz
              sayı kadar daire oluşturulur. Genel yönetici tüm siteyi, blok
              yöneticisi ise yalnızca seçilen bloğu görür. Düzenleme sırasında
              mevcut daireler güvenlik amacıyla otomatik silinmez.
            </p>
          </div>

          <label className="full-width">
            Adres
            <textarea
              name="address"
              rows="3"
              placeholder="Adres bilgisini girin"
              value={formData.address}
              onChange={onInputChange}
              disabled={isSaving}
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
              disabled={isSaving}
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
                    disabled={isSaving}
                  />

                  {system}
                </label>
              ))}
            </div>
          </div>

          <div className="full-width image-upload-area">
            <div className="image-preview-box">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="Seçilen site/apartman görseli"
                />
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
                disabled={isSaving}
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
              : editingBuilding
                ? "Değişiklikleri Kaydet"
                : "Kaydı Oluştur"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default BuildingForm;
