import { FileCheck2, ShieldCheck, UploadCloud } from "lucide-react";

const allowedReceiptFileTypesText = "PDF, PNG, JPG, JPEG ve WEBP";
const maxReceiptFileSizeText = "10 MB";

function ResidentReceiptUploadForm({
  formData,
  paymentOptions,
  selectedFile,
  fileError,
  onInputChange,
  onFileChange,
  onSubmit,
}) {
  const safeFormData = formData || {};
  const safePaymentOptions = paymentOptions || [];

  return (
    <section className="resident-receipt-form-card">
      <div className="resident-receipt-form-header">
        <div>
          <span className="section-kicker">Dekont Yükleme</span>

          <h3>Banka Dekontu Yükle</h3>

          <p>
            Havale/EFT sonrası banka dekontunuzu yükleyerek ödeme onayı için
            yönetime gönderebilirsiniz.
          </p>
        </div>
      </div>

      <div className="resident-receipt-security-note">
        <ShieldCheck size={22} />

        <div>
          <strong>Güvenli Dosya Kontrolü</strong>

          <span>
            Sadece {allowedReceiptFileTypesText} dosyaları kabul edilir. Maksimum
            dosya boyutu {maxReceiptFileSizeText} olabilir.
          </span>
        </div>
      </div>

      <form className="resident-receipt-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            İlgili Ödeme
            <select
              name="paymentId"
              value={safeFormData.paymentId || ""}
              onChange={onInputChange}
              required
            >
              <option value="">Ödeme seçiniz</option>

              {safePaymentOptions.map((payment) => (
                <option key={payment.id} value={payment.id}>
                  {payment.title || "Ödeme"} -{" "}
                  {payment.remainingAmount || "Tutar bilgisi yok"}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ödenen Tutar
            <input
              type="number"
              name="amount"
              value={safeFormData.amount || ""}
              onChange={onInputChange}
              placeholder="Örn: 1250"
              min="0"
              required
            />
          </label>

          <label className="full-width">
            Açıklama
            <textarea
              name="description"
              value={safeFormData.description || ""}
              onChange={onInputChange}
              rows="4"
              placeholder="Örn: Temmuz aidatı için ödeme dekontudur."
            />
          </label>

          <div className="full-width resident-receipt-upload-area">
            <label className="resident-receipt-upload-label">
              <UploadCloud size={19} />

              <span>Dekont Dosyası Seç</span>

              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={onFileChange}
                required
              />
            </label>

            {selectedFile && (
              <div className="resident-receipt-file-info">
                <FileCheck2 size={20} />

                <div>
                  <strong>{selectedFile.name || "Seçilen dosya"}</strong>
                  <span>{selectedFile.sizeText || "Dosya boyutu alındı"}</span>
                </div>
              </div>
            )}

            {fileError && (
              <div className="resident-receipt-file-error">
                <strong>{fileError}</strong>
              </div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="dashboard-action-button"
            disabled={Boolean(fileError)}
          >
            <UploadCloud size={18} />
            Dekontu Gönder
          </button>
        </div>
      </form>
    </section>
  );
}

export default ResidentReceiptUploadForm;