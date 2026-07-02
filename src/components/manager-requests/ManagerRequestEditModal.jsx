import { Bell, X } from "lucide-react";

const statusOptions = ["Yeni", "İnceleniyor", "Çözüldü", "Reddedildi"];
const notificationOptions = ["Gönder", "Gönderme"];

function ManagerRequestEditModal({
  request,
  updateData,
  onInputChange,
  onSubmit,
  onClose,
}) {
  if (!request) {
    return null;
  }

  const safeUpdateData = updateData || {};

  return (
    <div className="modal-overlay">
      <section className="details-modal manager-request-edit-modal">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Talep Düzenle</span>

            <h3>{request.title || "Talep Detayı"}</h3>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Talep düzenleme penceresini kapat"
          >
            <X size={20} />
          </button>
        </div>

        <div className="manager-request-edit-summary">
          <div>
            <span>Talep No</span>
            <strong>#{request.id || "-"}</strong>
          </div>

          <div>
            <span>Sakin</span>
            <strong>{request.residentName || "-"}</strong>
          </div>

          <div>
            <span>Daire</span>
            <strong>{request.apartmentLabel || "-"}</strong>
          </div>

          <div>
            <span>Mevcut Durum</span>
            <strong>{request.status || "-"}</strong>
          </div>
        </div>

        <form className="manager-request-edit-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              Talep Durumu
              <select
                name="status"
                value={safeUpdateData.status || "Yeni"}
                onChange={onInputChange}
              >
                {statusOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              Sakine SMS Bildirimi
              <select
                name="sendSms"
                value={safeUpdateData.sendSms || "Gönder"}
                onChange={onInputChange}
              >
                {notificationOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              Sakine E-posta Bildirimi
              <select
                name="sendEmail"
                value={safeUpdateData.sendEmail || "Gönder"}
                onChange={onInputChange}
              >
                {notificationOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="full-width">
              Yönetici Cevabı
              <textarea
                name="managerResponse"
                value={safeUpdateData.managerResponse || ""}
                onChange={onInputChange}
                rows="5"
                placeholder="Talep ile ilgili cevabınızı yazınız..."
              />
            </label>
          </div>

          <div className="manager-request-notify-note">
            <Bell size={18} />

            <span>
              Bilgilendirme seçimi sistem ayarlarına göre SMS veya e-posta
              olarak çalışacaktır.
            </span>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="secondary-form-button"
              onClick={onClose}
            >
              Vazgeç
            </button>

            <button type="submit" className="dashboard-action-button">
              Değişiklikleri Kaydet
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ManagerRequestEditModal;