import { X } from "lucide-react";
import CalculationPreview from "./CalculationPreview";

const categoryOptions = ["Aidat", "Asansör", "Temizlik", "Güvenlik", "Bakım", "Diğer"];
const blockOptions = ["A Blok", "B Blok", "C Blok"];
const statusOptions = ["Aktif", "Tamamlandı", "İptal"];
const notifyOptions = ["Gönder", "Gönderme"];

function PaymentForm({
  formData,
  apartmentOptions,
  availableTargetApartments,
  calculation,
  managerManagedArea,
  onInputChange,
  onApartmentSelectionChange,
  onExemptSelectionChange,
  onSubmit,
  onCancel,
}) {
  const isSiteManager = managerManagedArea?.type === "site";
  const safeApartmentOptions = apartmentOptions || [];
  const safeAvailableTargetApartments = availableTargetApartments || [];
  const selectedApartmentIds = formData.selectedApartmentIds || [];
  const exemptApartmentIds = formData.exemptApartmentIds || [];
  const chargedCount = calculation?.chargedCount || 0;

  return (
    <section className="payment-form-card">
      <div className="payment-form-header">
        <div>
          <span className="section-kicker">Yeni Aidat / Gider</span>

          <h3>Aidat veya Gider Ekle</h3>

          <p>
            Tutar, kapsam ve muaf daireleri belirleyerek ödeme dağıtımını
            oluşturabilirsiniz.
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

      <form className="payment-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Başlık
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={onInputChange}
              placeholder="Örn: Temmuz Aidatı"
              required
            />
          </label>

          <label>
            Kategori
            <select
              name="category"
              value={formData.category}
              onChange={onInputChange}
            >
              {categoryOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            Toplam Tutar
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={onInputChange}
              placeholder="Örn: 9000"
              min="0"
              required
            />
          </label>

          <label>
            Son Ödeme Tarihi
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={onInputChange}
              required
            />
          </label>

          <label>
            Kapsam
            <select
              name="scopeType"
              value={formData.scopeType}
              onChange={onInputChange}
            >
              {isSiteManager ? (
                <option>Tüm Site</option>
              ) : (
                <option>Tüm Apartman</option>
              )}

              {isSiteManager && <option>Belirli Blok</option>}

              <option>Belirli Daireler</option>
            </select>
          </label>

          {isSiteManager && formData.scopeType === "Belirli Blok" && (
            <label>
              Blok
              <select
                name="block"
                value={formData.block}
                onChange={onInputChange}
              >
                {blockOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          )}

          <label>
            Durum
            <select
              name="status"
              value={formData.status}
              onChange={onInputChange}
            >
              {statusOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            SMS / E-posta Bilgilendirme
            <select
              name="notifyResidents"
              value={formData.notifyResidents}
              onChange={onInputChange}
            >
              {notifyOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          {formData.scopeType === "Belirli Daireler" && (
            <div className="full-width payment-check-section">
              <span>Kapsama Dahil Daireler</span>

              <div className="payment-checkbox-grid">
                {safeApartmentOptions.map((apartment) => (
                  <label key={apartment.id}>
                    <input
                      type="checkbox"
                      checked={selectedApartmentIds.includes(apartment.id)}
                      onChange={() => onApartmentSelectionChange(apartment.id)}
                    />

                    {apartment.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="full-width payment-check-section">
            <span>Muaf Daireler</span>

            <div className="payment-checkbox-grid">
              {safeAvailableTargetApartments.map((apartment) => (
                <label key={apartment.id}>
                  <input
                    type="checkbox"
                    checked={exemptApartmentIds.includes(apartment.id)}
                    onChange={() => onExemptSelectionChange(apartment.id)}
                  />

                  {apartment.label}
                </label>
              ))}
            </div>
          </div>

          <label className="full-width">
            Açıklama
            <textarea
              name="description"
              value={formData.description}
              onChange={onInputChange}
              rows="3"
              placeholder="Bu ödeme ile ilgili kısa açıklama yazabilirsiniz."
            />
          </label>
        </div>

        <CalculationPreview calculation={calculation} />

        <div className="form-actions">
          <button
            type="button"
            className="secondary-form-button"
            onClick={onCancel}
          >
            Vazgeç
          </button>

          <button
            type="submit"
            className="dashboard-action-button"
            disabled={chargedCount === 0}
          >
            Borçlandırmayı Oluştur
          </button>
        </div>
      </form>
    </section>
  );
}

export default PaymentForm;