import { X } from "lucide-react";

function ResidentForm({
  formData,
  editingResident,
  onInputChange,
  onSubmit,
  onCancel,
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
            Kiracı veya ev sahibi bilgilerini, daire bağlantısını ve iletişim
            bilgilerini buradan yönetebilirsiniz.
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
              name="name"
              value={formData.name}
              onChange={onInputChange}
              placeholder="Örn: Ali Can"
              required
            />
          </label>

          <label>
            Rol
            <select name="role" value={formData.role} onChange={onInputChange}>
              <option>Kiracı</option>
              <option>Ev Sahibi</option>
            </select>
          </label>

          <label>
            Blok / Apartman
            <select
              name="block"
              value={formData.block}
              onChange={onInputChange}
            >
              <option>A Blok</option>
              <option>B Blok</option>
              <option>C Blok</option>
            </select>
          </label>

          <label>
            Daire
            <select
              name="apartment"
              value={formData.apartment}
              onChange={onInputChange}
            >
              <option>Daire 1</option>
              <option>Daire 2</option>
              <option>Daire 5</option>
              <option>Daire 8</option>
              <option>Daire 12</option>
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
              required
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
            />
          </label>

          <label>
            Durum
            <select
              name="status"
              value={formData.status}
              onChange={onInputChange}
            >
              <option>Aktif</option>
              <option>Pasif</option>
              <option>Onay Bekliyor</option>
            </select>
          </label>

          <label>
            Aidat Durumu
            <select
              name="paymentStatus"
              value={formData.paymentStatus}
              onChange={onInputChange}
            >
              <option>Ödendi</option>
              <option>Bekliyor</option>
              <option>Gecikmiş</option>
              <option>Kısmi Ödeme</option>
            </select>
          </label>

          <label>
            Toplam Borç
            <input
              type="text"
              name="totalDebt"
              value={formData.totalDebt}
              onChange={onInputChange}
              placeholder="Örn: 2.500 TL"
            />
          </label>

          <label>
            Ödenen Tutar
            <input
              type="text"
              name="paidAmount"
              value={formData.paidAmount}
              onChange={onInputChange}
              placeholder="Örn: 1.250 TL"
            />
          </label>

          <label>
            Kalan Borç
            <input
              type="text"
              name="remainingDebt"
              value={formData.remainingDebt}
              onChange={onInputChange}
              placeholder="Örn: 1.250 TL"
            />
          </label>

          <label>
            Son Ödeme Tarihi
            <input
              type="text"
              name="lastPaymentDate"
              value={formData.lastPaymentDate}
              onChange={onInputChange}
              placeholder="Örn: 10.06.2026"
            />
          </label>

          <label className="full-width">
            Not
            <textarea
              name="note"
              value={formData.note}
              onChange={onInputChange}
              rows="3"
              placeholder="Sakin ile ilgili kısa not yazabilirsiniz."
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="button" className="secondary-form-button" onClick={onCancel}>
            Vazgeç
          </button>

          <button type="submit" className="dashboard-action-button">
            {editingResident ? "Sakini Güncelle" : "Sakini Kaydet"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ResidentForm;