import { CheckCircle2, X } from "lucide-react";

const residentTypeOptions = [
  { value: "TENANT", label: "Kiracı" },
  { value: "OWNER", label: "Ev Sahibi" },
];

function UserForm({
  formData,
  apartments,
  editingUser,
  onInputChange,
  onSubmit,
  onCancel,
  isSaving = false,
}) {
  const safeApartments = apartments || [];
  const isEditMode = Boolean(editingUser);

  return (
    <section className="manager-form-card">
      <div className="manager-form-header">
        <div>
          <span className="section-kicker">
            {isEditMode ? "Sakin Düzenleme" : "Yeni Sakin"}
          </span>

          <h3>{isEditMode ? "Sakin Bilgilerini Düzenle" : "Yeni Sakin Ekle"}</h3>

          <p>
            Kiracı veya ev sahibi hesabı oluşturulur ve seçilen daireye bağlanır.
          </p>
        </div>

        <button
          type="button"
          className="modal-close-button"
          onClick={onCancel}
          aria-label="Sakin formunu kapat"
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
              placeholder="Örn: Ali Can"
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
            Sakin Türü
            <select
              name="residentType"
              value={formData.residentType}
              onChange={onInputChange}
              disabled={isSaving}
            >
              {residentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Daire Seç
            <select
              name="apartmentId"
              value={formData.apartmentId}
              onChange={onInputChange}
              disabled={isSaving}
              required
            >
              <option value="">Daire seçin</option>

              {safeApartments.map((apartment) => (
                <option key={apartment.id} value={apartment.id}>
                  {apartment.block?.site?.name || "Site"} /{" "}
                  {apartment.block?.name || "Blok"} / Daire {apartment.number}
                </option>
              ))}
            </select>
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
                : "Sakin Ekle"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default UserForm;
