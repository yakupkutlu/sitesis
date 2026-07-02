import { CheckCircle2, X } from "lucide-react";

function ManagerForm({
  formData,
  buildingOptions,
  editingManager,
  onInputChange,
  onSubmit,
  onCancel,
}) {
  const safeBuildingOptions = buildingOptions || [];

  return (
    <section className="manager-form-card">
      <div className="manager-form-header">
        <div>
          <span className="section-kicker">
            {editingManager ? "Yönetici Düzenleme" : "Yeni Yönetici"}
          </span>

          <h3>
            {editingManager
              ? "Yönetici Bilgilerini Düzenle"
              : "Yeni Yönetici Ekle"}
          </h3>

          <p>
            Yönetici bilgilerini eksiksiz doldurun. Daha sonra bu yönetici
            site/apartman kayıtlarına atanabilir.
          </p>
        </div>

        <button
          type="button"
          className="modal-close-button"
          onClick={onCancel}
          aria-label="Yönetici formunu kapat"
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
              name="name"
              placeholder="Örn: Ahmet Yılmaz"
              value={formData.name}
              onChange={onInputChange}
              required
            />
          </label>

          <label>
            Görev / Ünvan
            <input
              type="text"
              name="title"
              placeholder="Örn: Site Yöneticisi"
              value={formData.title}
              onChange={onInputChange}
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
              required
            />
          </label>

          <label className="full-width">
            Atanacağı Site / Apartman
            <select
              name="assignedBuilding"
              value={formData.assignedBuilding}
              onChange={onInputChange}
            >
              <option value="">Henüz atama yapma</option>

              {safeBuildingOptions.map((building) => (
                <option key={building}>{building}</option>
              ))}
            </select>
          </label>

          <label className="full-width">
            Not
            <textarea
              name="note"
              rows="3"
              placeholder="Yönetici hakkında kısa not yazın"
              value={formData.note}
              onChange={onInputChange}
            />
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
            {editingManager ? "Değişiklikleri Kaydet" : "Yönetici Ekle"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ManagerForm;