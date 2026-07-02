import { X } from "lucide-react";

function ResidentReceiptDetailsModal({ receipt, onClose }) {
  if (!receipt) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <section className="details-modal resident-receipt-modal">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Dekont Detayı</span>

            <h3>{receipt.paymentTitle || "Dekont Detayı"}</h3>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Dekont detay penceresini kapat"
          >
            <X size={20} />
          </button>
        </div>

        <div className="details-list resident-receipt-details-list">
          <div>
            <span>Ödenen Tutar</span>
            <strong>{receipt.amount || "-"}</strong>
          </div>

          <div>
            <span>Durum</span>
            <strong>{receipt.status || "-"}</strong>
          </div>

          <div>
            <span>Dosya Adı</span>
            <strong>{receipt.fileName || "-"}</strong>
          </div>

          <div>
            <span>Dosya Boyutu</span>
            <strong>{receipt.fileSize || "-"}</strong>
          </div>

          <div>
            <span>Daire</span>
            <strong>{receipt.apartment || "-"}</strong>
          </div>

          <div>
            <span>Yükleme Tarihi</span>
            <strong>{receipt.uploadedAt || "-"}</strong>
          </div>

          <div>
            <span>Yönetici Kontrolü</span>
            <strong>{receipt.reviewNote || "-"}</strong>
          </div>

          <div>
            <span>Ödeme</span>
            <strong>{receipt.paymentTitle || "-"}</strong>
          </div>
        </div>

        <div className="details-description">
          <span>Açıklama</span>

          <p>{receipt.description || "Açıklama bulunmuyor."}</p>
        </div>
      </section>
    </div>
  );
}

export default ResidentReceiptDetailsModal;