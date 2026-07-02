import { X } from "lucide-react";

const blockOptions = ["A Blok", "B Blok", "C Blok"];
const statusOptions = ["Dolu", "Boş", "Bakımda"];
const usageTypeOptions = ["Kiracı", "Ev Sahibi", "Boş"];
const paymentStatusOptions = ["Ödendi", "Bekliyor", "Gecikmiş", "Yok"];

function ApartmentForm({
  formData,
  editingApartment,
  onInputChange,
  onSubmit,
  onCancel,
}) {
  return (
    <section className="apartment-form-card">
      <div className="apartment-form-header">
        <div>
          <span className="section-kicker">
            {editingApartment ? "Daire Güncelle" : "Yeni Daire"}
          </span>

          <h3>
            {editingApartment ? "Daire Bilgilerini Düzenle" : "Daire Ekle"}
          </h3>

          <p>
            Daire numarası, blok, kat, kullanım durumu ve sakin bağlantısı
            buradan yönetilir.
          </p>
        </div>

        <button
          type="button"
          className="modal-close-button"
          onClick={onCancel}
          aria-label="Daire formunu kapat"
        >
          <X size={20} />
        </button>
      </div>

      <form className="apartment-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Daire No
            <input
              type="text"
              name="apartmentNo"
              value={formData.apartmentNo}
              onChange={onInputChange}
              placeholder="Örn: Daire 12"
              required
            />
          </label>

          <label>
            Blok / Apartman
            <select
              name="block"
              value={formData.block}
              onChange={onInputChange}
              required
            >
              {blockOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            Kat
            <input
              type="text"
              name="floor"
              value={formData.floor}
              onChange={onInputChange}
              placeholder="Örn: 3. Kat"
              required
            />
          </label>

          <label>
            Durum
            <select
              name="status"
              value={formData.status}
              onChange={onInputChange}
              required
            >
              {statusOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            Kullanım Tipi
            <select
              name="usageType"
              value={formData.usageType}
              onChange={onInputChange}
            >
              {usageTypeOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            Sakin Adı
            <input
              type="text"
              name="residentName"
              value={formData.residentName}
              onChange={onInputChange}
              placeholder="Örn: Ali Can"
            />
          </label>

          <label>
            Telefon
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={onInputChange}
              placeholder="Örn: 0555 000 00 00"
              autoComplete="tel"
            />
          </label>

          <label>
            Aidat Durumu
            <select
              name="paymentStatus"
              value={formData.paymentStatus}
              onChange={onInputChange}
            >
              {paymentStatusOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="full-width">
            Not
            <textarea
              name="note"
              value={formData.note}
              onChange={onInputChange}
              rows="3"
              placeholder="Daire ile ilgili kısa not yazabilirsiniz."
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
            {editingApartment ? "Daireyi Güncelle" : "Daireyi Kaydet"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ApartmentForm;