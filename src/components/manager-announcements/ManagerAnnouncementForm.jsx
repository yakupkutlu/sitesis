import { X } from "lucide-react";

function ManagerAnnouncementForm({
  formData,
  managerManagedArea,
  apartmentOptions,
  onInputChange,
  onApartmentSelectionChange,
  onSubmit,
  onCancel,
}) {
  return (
    <section className="manager-announcement-form-card">
      <div className="manager-announcement-form-header">
        <div>
          <span className="section-kicker">Yeni Duyuru</span>
          <h3>Duyuru Oluştur</h3>
          <p>Duyuru sadece sorumlu olduğunuz alan içindeki sakinlere gönderilir.</p>
        </div>

        <button type="button" className="modal-close-button" onClick={onCancel}>
          <X size={20} />
        </button>
      </div>

      <form className="manager-announcement-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Başlık
            <input
              name="title"
              value={formData.title}
              onChange={onInputChange}
              placeholder="Örn: Su kesintisi bilgilendirmesi"
              required
            />
          </label>

          <label>
            Duyuru Tipi
            <select name="type" value={formData.type} onChange={onInputChange}>
              <option>Genel</option>
              <option>Bakım</option>
              <option>Acil</option>
              <option>Ödeme</option>
              <option>Bilgilendirme</option>
            </select>
          </label>

          <label>
            Hedef Kapsam
            <select
              name="targetType"
              value={formData.targetType}
              onChange={onInputChange}
            >
              {managerManagedArea.type === "site" ? (
                <option>Tüm Site</option>
              ) : (
                <option>Tüm Apartman</option>
              )}

              {managerManagedArea.type === "site" && <option>Belirli Blok</option>}

              <option>Belirli Daireler</option>
            </select>
          </label>

          {formData.targetType === "Belirli Blok" && (
            <label>
              Blok
              <select name="block" value={formData.block} onChange={onInputChange}>
                <option>A Blok</option>
                <option>B Blok</option>
                <option>C Blok</option>
              </select>
            </label>
          )}

          <label>
            Durum
            <select name="status" value={formData.status} onChange={onInputChange}>
              <option>Yayında</option>
              <option>Taslak</option>
              <option>Arşivlendi</option>
            </select>
          </label>

          <label>
            SMS Bildirimi
            <select name="sendSms" value={formData.sendSms} onChange={onInputChange}>
              <option>Gönder</option>
              <option>Gönderme</option>
            </select>
          </label>

          <label>
            E-posta Bildirimi
            <select
              name="sendEmail"
              value={formData.sendEmail}
              onChange={onInputChange}
            >
              <option>Gönder</option>
              <option>Gönderme</option>
            </select>
          </label>

          {formData.targetType === "Belirli Daireler" && (
            <div className="full-width manager-announcement-check-section">
              <span>Duyuru Gönderilecek Daireler</span>

              <div className="manager-announcement-checkbox-grid">
                {apartmentOptions.map((apartment) => (
                  <label key={apartment.id}>
                    <input
                      type="checkbox"
                      checked={formData.selectedApartmentIds.includes(apartment.id)}
                      onChange={() => onApartmentSelectionChange(apartment.id)}
                    />
                    {apartment.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="full-width">
            Duyuru Metni
            <textarea
              name="content"
              value={formData.content}
              onChange={onInputChange}
              rows="5"
              placeholder="Duyuru içeriğini yazınız..."
              required
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="button" className="secondary-form-button" onClick={onCancel}>
            Vazgeç
          </button>

          <button type="submit" className="dashboard-action-button">
            Duyuruyu Kaydet
          </button>
        </div>
      </form>
    </section>
  );
}

export default ManagerAnnouncementForm;