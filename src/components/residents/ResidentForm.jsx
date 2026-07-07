import { X } from "lucide-react";

function ResidentForm({
  formData,
  apartments = [],
  editingResident,
  onInputChange,
  onSubmit,
  onCancel,
  isSaving = false,
}) {
  return (
    <section className="resident-form-card">
      <div className="resident-form-header">
        <div>
          <span className="section-kicker">
            {editingResident ? "Sakin Güncelle" : "Yeni Sakin"}
          </span>

          <h3>
            {editingResident ? "Sakin Bilgilerini Düzenle" : "Sakin Ekle"}
          </h3>

          <p>
            Yönetici sadece kendi yetki alanındaki dairelere sakin ekleyebilir.
          </p>
        </div>

        <button type="button" className="modal-close-button" onClick={onCancel}>
          <X size={20} />
        </button>
      </div>

      <form className="resident-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Ad Soyad
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={onInputChange}
              placeholder="Örn: Ali Can"
              required
              disabled={isSaving}
            />
          </label>

          <label>
            Rol
            <select
              name="type"
              value={formData.type}
              onChange={onInputChange}
              disabled={isSaving}
            >
              <option value="TENANT">Kiracı</option>
              <option value="OWNER">Ev Sahibi</option>
            </select>
          </label>

          <label>
            Daire
            <select
              name="apartmentId"
              value={formData.apartmentId}
              onChange={onInputChange}
              required
              disabled={isSaving}
            >
              <option value="">Daire seçiniz</option>

              {apartments.map((apartment) => (
                <option key={apartment.id} value={apartment.id}>
                  {apartment.block?.site?.name ?? "Site"} /{" "}
                  {apartment.block?.name ?? "Blok"} / Daire {apartment.number}
                </option>
              ))}
            </select>
          </label>

          <label>
            Telefon
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={onInputChange}
              placeholder="Örn: 0555 000 00 00"
              disabled={isSaving}
            />
          </label>

          <label>
            E-posta
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={onInputChange}
              placeholder="Örn: ali@example.com"
              required
              disabled={isSaving}
            />
          </label>

          <label>
            Geçici Şifre
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={onInputChange}
              placeholder="En az 8 karakter"
              required={!editingResident}
              disabled={isSaving}
            />
          </label>

          <label className="full-width">
            Not
            <textarea
              name="note"
              value={formData.note}
              onChange={onInputChange}
              rows="3"
              placeholder="Bu not şimdilik sadece form içindir, backend'e kaydedilmeyecek."
              disabled={isSaving}
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
            {isSaving ? "Kaydediliyor..." : editingResident ? "Sakini Güncelle" : "Sakini Kaydet"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ResidentForm;
