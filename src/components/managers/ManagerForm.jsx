import { CheckCircle2, X } from "lucide-react";

function ManagerForm({
  formData,
  sites,
  blocks,
  editingManager,
  onInputChange,
  onSubmit,
  onCancel,
  isSaving = false,
}) {
  const safeSites = sites || [];
  const safeBlocks = blocks || [];
  const isEditMode = Boolean(editingManager);
  const isSiteScope = formData.scopeType === "SITE";
  const isBlockScope = formData.scopeType === "BLOCK";

  return (
    <section className="manager-form-card">
      <div className="manager-form-header">
        <div>
          <span className="section-kicker">
            {isEditMode ? "Yönetici Düzenleme" : "Yeni Yönetici"}
          </span>

          <h3>
            {isEditMode
              ? "Yönetici Bilgilerini Düzenle"
              : "Yeni Yönetici Ekle"}
          </h3>

          <p>
            Yönetici kullanıcı hesabı oluşturulur ve site ya da blok yetkisi
            atanır.
          </p>
        </div>

        <button
          type="button"
          className="modal-close-button"
          onClick={onCancel}
          aria-label="Yönetici formunu kapat"
          disabled={isSaving}
        >
          <X size={20} />
        </button>
      </div>

      <form className="manager-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Ad Soyad
            <input
              type="text"
              name="fullName"
              placeholder="Örn: Ahmet Yılmaz"
              value={formData.fullName}
              onChange={onInputChange}
              disabled={isSaving}
              required
            />
          </label>

          <label>
            E-posta
            <input
              type="email"
              name="email"
              placeholder="ornek@mail.com"
              value={formData.email}
              onChange={onInputChange}
              autoComplete="email"
              disabled={isSaving}
              required
            />
          </label>

          <label>
            Telefon
            <input
              type="tel"
              name="phone"
              placeholder="05xx xxx xx xx"
              value={formData.phone}
              onChange={onInputChange}
              autoComplete="tel"
              disabled={isSaving}
            />
          </label>

          <label>
            Şifre
            <input
              type="password"
              name="password"
              placeholder={
                isEditMode
                  ? "Değiştirmek istemiyorsanız boş bırakın"
                  : "En az 8 karakter"
              }
              value={formData.password}
              onChange={onInputChange}
              autoComplete="new-password"
              disabled={isSaving}
              required={!isEditMode}
            />
          </label>

          <label>
            Yetki Türü
            <select
              name="scopeType"
              value={formData.scopeType}
              onChange={onInputChange}
              disabled={isSaving}
            >
              <option value="SITE">Tüm Site Yetkisi</option>
              <option value="BLOCK">Blok / Apartman Yetkisi</option>
            </select>
          </label>

          {isSiteScope && (
            <label>
              Site Seç
              <select
                name="siteId"
                value={formData.siteId}
                onChange={onInputChange}
                disabled={isSaving}
              >
                <option value="">Henüz atama yapma</option>

                {safeSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {isBlockScope && (
            <label>
              Blok / Apartman Seç
              <select
                name="blockId"
                value={formData.blockId}
                onChange={onInputChange}
                disabled={isSaving}
              >
                <option value="">Henüz atama yapma</option>

                {safeBlocks.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.site?.name ? `${block.site.name} / ` : ""}
                    {block.name}
                  </option>
                ))}
              </select>
            </label>
          )}
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
                : "Yönetici Ekle"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ManagerForm;
