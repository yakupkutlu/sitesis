import { FileCheck2, Paperclip, PlusCircle, ShieldCheck } from "lucide-react";

const allowedRequestFileTypesText = "PDF, PNG, JPG, JPEG veya WEBP";
const maxRequestFileSizeText = "5 MB";

const categoryOptions = [
  "Arıza",
  "Bakım",
  "Temizlik",
  "Güvenlik",
  "Otopark",
  "Diğer",
];

const priorityOptions = ["Normal", "Önemli", "Acil"];

const contactPreferenceOptions = [
  "Uygulama üzerinden",
  "SMS ile bilgilendir",
  "E-posta ile bilgilendir",
  "SMS ve E-posta",
];

function ResidentRequestForm({
  formData,
  selectedFile,
  fileError,
  onInputChange,
  onFileChange,
  onSubmit,
}) {
  const safeFormData = formData || {};

  return (
    <section className="resident-request-form-card">
      <div className="resident-request-form-header">
        <div>
          <span className="section-kicker">Talep Oluştur</span>

          <h3>Yönetime Yeni Talep Gönder</h3>

          <p>
            Arıza, bakım, temizlik veya güvenlik ile ilgili taleplerinizi
            buradan yönetime iletebilirsiniz.
          </p>
        </div>
      </div>

      <div className="resident-request-security-note">
        <ShieldCheck size={22} />

        <div>
          <strong>Dosya Eki Kontrolü</strong>

          <span>
            Talebe dosya eklemek isterseniz {allowedRequestFileTypesText}
            yükleyebilirsiniz. Maksimum dosya boyutu {maxRequestFileSizeText}
            olabilir.
          </span>
        </div>
      </div>

      <form className="resident-request-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Talep Başlığı
            <input
              type="text"
              name="title"
              value={safeFormData.title || ""}
              onChange={onInputChange}
              placeholder="Örn: Asansör çalışmıyor"
              required
            />
          </label>

          <label>
            Kategori
            <select
              name="category"
              value={safeFormData.category || ""}
              onChange={onInputChange}
              required
            >
              <option value="">Kategori seçiniz</option>

              {categoryOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            Öncelik
            <select
              name="priority"
              value={safeFormData.priority || "Normal"}
              onChange={onInputChange}
              required
            >
              {priorityOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            İletişim Tercihi
            <select
              name="contactPreference"
              value={safeFormData.contactPreference || "Uygulama üzerinden"}
              onChange={onInputChange}
            >
              {contactPreferenceOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="full-width">
            Açıklama
            <textarea
              name="description"
              value={safeFormData.description || ""}
              onChange={onInputChange}
              rows="4"
              placeholder="Talebinizi açık ve anlaşılır şekilde yazınız."
              required
            />
          </label>

          <div className="full-width resident-request-upload-area">
            <label className="resident-request-upload-label">
              <Paperclip size={19} />

              <span>Dosya Eki Seç</span>

              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={onFileChange}
              />
            </label>

            {selectedFile && (
              <div className="resident-request-file-info">
                <FileCheck2 size={20} />

                <div>
                  <strong>{selectedFile.name || "Seçilen dosya"}</strong>
                  <span>{selectedFile.sizeText || "Dosya boyutu alındı"}</span>
                </div>
              </div>
            )}

            {fileError && (
              <div className="resident-request-file-error">
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
            <PlusCircle size={18} />
            Talep Oluştur
          </button>
        </div>
      </form>
    </section>
  );
}

export default ResidentRequestForm;