import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, FileCheck2, ShieldCheck, X } from "lucide-react";
import ReceiptMatchPreview from "./ReceiptMatchPreview";

const allowedReceiptFileTypesText = "PDF, PNG, JPG, JPEG ve WEBP";
const maxReceiptFileSizeText = "10 MB";
const paymentOwnerTypeOptions = ["Kiracı Ödemesi", "Ev Sahibi Ödemesi"];

function getResidentTypeLabel(type) {
  return type === "OWNER" ? "Ev Sahibi" : "Kiracı";
}

function ReceiptUploadForm({
  formData,
  apartmentOptions,
  selectedFile,
  fileError,
  matchResult,
  onInputChange,
  onFileChange,
  onSubmit,
  onCancel,
  onConfirmMatch,
  isSaving = false,
}) {
  const safeApartmentOptions = useMemo(
    () => (Array.isArray(apartmentOptions) ? apartmentOptions : []),
    [apartmentOptions]
  );

  const [previewUrl, setPreviewUrl] = useState("");
  const previewUrlRef = useRef("");

  const manualApartmentId = formData.manualApartmentId ?? "";
  const manualResidentUserId = formData.manualResidentUserId ?? "";
  const manualVerified = Boolean(formData.manualVerified);

  const selectedApartment = useMemo(
    () =>
      safeApartmentOptions.find(
        (apartment) => apartment.id === manualApartmentId
      ) ?? null,
    [safeApartmentOptions, manualApartmentId]
  );

  const selectedApartmentResidents = useMemo(
    () =>
      Array.isArray(selectedApartment?.residents)
        ? selectedApartment.residents
        : [],
    [selectedApartment]
  );

  const isManualMode = Boolean(manualApartmentId);

  const manualModeIsIncomplete =
    isManualMode && (!manualResidentUserId || !manualVerified);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function replacePreviewUrl(file) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }

    const nextPreviewUrl = file ? URL.createObjectURL(file) : "";

    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null;

    replacePreviewUrl(file);
    onFileChange(event);
  }

  function handleManualVerifiedChange(event) {
    onInputChange({
      target: {
        name: "manualVerified",
        value: event.target.checked,
      },
    });
  }

  return (
    <section className="receipt-form-card">
      <div className="receipt-form-header">
        <div>
          <span className="section-kicker">Yeni Dekont</span>

          <h3>Dekont Ekle</h3>

          <p>
            Otomatik modda dekont AI ile analiz edilir. AI kullanılamıyorsa
            daire, kayıtlı sakin ve tutar seçilerek manuel doğrulama
            yapılabilir.
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
            Dekontta Yazılı Ödeyen Ad Soyad
            <input
              type="text"
              name="payerName"
              value={formData.payerName}
              onChange={onInputChange}
              placeholder="Örn: Ali Can"
              disabled={isSaving}
            />
            <small>
              Bu alan, dekontta görünen gönderen kişidir. Kayıtlı sakin seçimi
              aşağıdaki daire alanından ayrıca doğrulanır.
            </small>
          </label>

          <label>
            IBAN
            <div className="iban-input-wrapper">
              <span className="iban-prefix">TR</span>

              <input
                type="text"
                name="bankAccount"
                value={formData.bankAccount}
                onChange={onInputChange}
                placeholder="24 rakam giriniz"
                inputMode="numeric"
                autoComplete="off"
                minLength={24}
                maxLength={24}
                pattern="[0-9]{24}"
                title="TR kodundan sonra tam olarak 24 rakam giriniz."
                disabled={isSaving}
              />
            </div>
          </label>

          <label>
            Ödenen Tutar
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={onInputChange}
              placeholder="Örn: 1250"
              min="0.01"
              step="0.01"
              required={isManualMode}
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
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ödemesi Yapılacak Daire
            <select
              name="manualApartmentId"
              value={manualApartmentId}
              onChange={onInputChange}
              disabled={isSaving}
            >
              <option value="">AI ile otomatik eşleştir</option>

              {safeApartmentOptions.map((apartment) => (
                <option key={apartment.id} value={apartment.id}>
                  {apartment.label}
                </option>
              ))}
            </select>
          </label>

          {isManualMode && (
            <label>
              Daireye Kayıtlı Sakin
              <select
                name="manualResidentUserId"
                value={manualResidentUserId}
                onChange={onInputChange}
                disabled={isSaving || selectedApartmentResidents.length === 0}
                required
              >
                <option value="">Kayıtlı sakini seçiniz</option>

                {selectedApartmentResidents.map((resident) => (
                  <option
                    key={`${resident.userId}-${resident.type}`}
                    value={resident.userId}
                  >
                    {resident.fullName} - {getResidentTypeLabel(resident.type)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Dekont Dosyası
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={handleFileChange}
              disabled={isSaving}
              required
            />
          </label>

          {isManualMode && selectedApartmentResidents.length === 0 && (
            <div className="full-width receipt-file-error">
              <AlertTriangle size={20} />
              <span>
                Seçilen daireye kayıtlı sakin bulunmuyor. Manuel eşleştirme
                yapılamaz.
              </span>
            </div>
          )}

          {isManualMode && selectedApartmentResidents.length > 0 && (
            <div className="full-width receipt-manual-info">
              <strong>Manuel doğrulama modu</strong>
              <span>
                Sistem seçilen daire, kayıtlı sakin, ödeme tipi ve tutar
                ilişkisini Backend tarafında tekrar kontrol edecektir.
              </span>
            </div>
          )}

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

          {previewUrl && (
            <div className="full-width receipt-file-preview-card">
              <div className="receipt-file-preview-header">
                <strong>Dosya Önizlemesi</strong>
                <span>
                  Manuel işlemde dosyayı görsel olarak kontrol etmeniz gerekir.
                </span>
              </div>

              {selectedFile?.type?.startsWith("image/") ? (
                <img
                  src={previewUrl}
                  alt="Yüklenen dekont önizlemesi"
                  className="receipt-file-preview-image"
                />
              ) : (
                <object
                  data={previewUrl}
                  type="application/pdf"
                  className="receipt-file-preview-pdf"
                  aria-label="Yüklenen PDF dekont önizlemesi"
                >
                  <p>PDF önizlemesi tarayıcı tarafından gösterilemedi.</p>
                </object>
              )}
            </div>
          )}

          {isManualMode && (
            <label className="full-width receipt-manual-confirmation">
              <input
                type="checkbox"
                name="manualVerified"
                checked={manualVerified}
                onChange={handleManualVerifiedChange}
                disabled={isSaving || selectedApartmentResidents.length === 0}
                required
              />

              <span>
                Dosyayı görüntüledim; seçilen daireyi, kayıtlı sakini, ödeme
                tipini ve tutarı manuel olarak doğruladım.
              </span>
            </label>
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
            disabled={
              Boolean(fileError) ||
              isSaving ||
              manualModeIsIncomplete ||
              (isManualMode && selectedApartmentResidents.length === 0)
            }
          >
            {isSaving ? "Kontrol Ediliyor..." : "Eşleştirme Önizle"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ReceiptUploadForm;