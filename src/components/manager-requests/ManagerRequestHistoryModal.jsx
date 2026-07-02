import { X } from "lucide-react";

function ManagerRequestHistoryModal({ request, onClose }) {
  if (!request) {
    return null;
  }

  const historyItems = Array.isArray(request.history) ? request.history : [];

  return (
    <div className="modal-overlay">
      <section className="details-modal manager-request-modal">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Talep Geçmişi</span>

            <h3>{request.title || "Talep Geçmişi"}</h3>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Talep geçmişi penceresini kapat"
          >
            <X size={20} />
          </button>
        </div>

        <div className="manager-request-history-box">
          <span>İşlem Geçmişi</span>

          <div className="manager-request-history-list">
            {historyItems.length > 0 ? (
              historyItems.map((historyItem) => (
                <div key={historyItem.id}>
                  <strong>{historyItem.date || "-"}</strong>
                  <p>{historyItem.text || "İşlem açıklaması bulunmuyor."}</p>
                </div>
              ))
            ) : (
              <p>Bu talep için işlem geçmişi bulunmuyor.</p>
            )}
          </div>
        </div>

        <div className="details-description">
          <span>Not</span>

          <p>
            Bu bölümde talep ile ilgili yapılan durum değişiklikleri ve yönetici
            işlemleri görüntülenir.
          </p>
        </div>
      </section>
    </div>
  );
}

export default ManagerRequestHistoryModal;