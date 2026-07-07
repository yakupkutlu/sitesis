import { AlertTriangle, FileCheck2, ShieldCheck, X } from "lucide-react";
import ReceiptMatchPreview from "./ReceiptMatchPreview";

const allowedReceiptFileTypesText = "PDF, PNG, JPG, JPEG ve WEBP";
const maxReceiptFileSizeText = "10 MB";
const paymentOwnerTypeOptions = ["Kiracı Ödemesi", "Ev Sahibi Ödemesi"];

function ReceiptUploadForm({
  formData,
  apartmentOptions,
  fileError,
  matchResult,
  onInputChange,
  onFileChange,
  onSubmit,
  onCancel,
  onConfirmMatch,
  isSaving = false,
}) {
  const safeApartmentOptions = apartmentOptions || {};

  return (
    <section className="receipt-form-card">
      <div className="receipt-form-header">
        <div>
          <span className="section-kicker">Yeni Dekont</span>

          <h3>Dekont Ekle</h3>

          <p>
            Dekont bilgileri daire, sakin, tutar ve açıklama alanlarına göre
            kontrol edilir. Yönetici onayı olmadan ödeme kaydına işlenmez.
          </p>
        </div>

        <button
          type="button"
          className="modal-close-button"
          onClick={onCancel}
          aria-label="Dekont formunu kapat"
          disabled={isSaving}
        >
          <X size={20} />
        </button>
      </div>

      <div className="receipt-security-note">
        <ShieldCheck size={20} />

        <div>
          <strong>Güvenlik Kontrolü</strong>

          <span>
            Yalnızca {allowedReceiptFileTypesText} dosyaları kabul edilir. Dosya
            boyutu en fazla {maxReceiptFileSizeText} olmalıdır.
          </span>
        </div>
      </div>

      <form className="receipt-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Ödeyen Ad Soyad
            <input
              type="text"
              name="payerName"
              value={formData.payerName}
              onChange={onInputChange}
              placeholder="Örn: Ali Can"
              disabled={isSaving}
            />
          </label>

          <label>
            Banka Hesap No / IBAN
            <input
              type="text"
              name="bankAccount"
              value={formData.bankAccount}
              onChange={onInputChange}
              placeholder="Örn: TR00 0000 0000 0000"
              disabled={isSaving}
            />
          </label>

          <label>
            Ödenen Tutar
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={onInputChange}
              placeholder="Örn: 1250"
              min="0"
              disabled={isSaving}
            />
          </label>

          <label>
            Ödeme Tipi
            <select
              name="paymentOwnerType"
              value={formData.paymentOwnerType}
              onChange={onInputChange}
              disabled={isSaving}
            >
              {paymentOwnerTypeOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            Manuel Daire Seçimi
            <select
              name="manualApartmentId"
              value={formData.manualApartmentId}
              onChange={onInputChange}
              disabled={isSaving}
            >
              <option value="">Otomatik eşleştir</option>

              {safeApartmentOptions.map((apartment) => (
                <option key={apartment.id} value={apartment.id}>
                  {apartment.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Dekont Dosyası
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={onFileChange}
              disabled={isSaving}
              required
            />
          </label>

          {formData.fileName && (
            <div className="full-width receipt-file-info">
              <FileCheck2 size={20} />

              <div>
                <strong>{formData.fileName}</strong>

                <span>
                  {formData.fileType} - {formData.fileSizeText}
                </span>
              </div>
            </div>
          )}

          {fileError && (
            <div className="full-width receipt-file-error">
              <AlertTriangle size={20} />
              <span>{fileError}</span>
            </div>
          )}

          <label className="full-width">
            Açıklama
            <textarea
              name="description"
              value={formData.description}
              onChange={onInputChange}
              rows="3"
              placeholder="Örn: A Blok Daire 5 Temmuz aidatı"
              disabled={isSaving}
            />
          </label>
        </div>

        <ReceiptMatchPreview
          matchResult={matchResult}
          onConfirm={onConfirmMatch}
          isSaving={isSaving}
        />

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
            disabled={Boolean(fileError) || isSaving}
          >
            {isSaving ? "Kontrol Ediliyor..." : "Eşleştirme Önizle"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ReceiptUploadForm;


