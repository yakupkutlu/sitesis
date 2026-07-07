import { X } from "lucide-react";

function ReceiptDetailsModal({ receipt, onClose }) {
  if (!receipt) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <section className="details-modal">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Dekont Detayı</span>
            <h3>{receipt.fileName || "Dekont Bilgisi"}</h3>
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

        <div className="details-list receipt-details-list">
          <div>
            <span>Yükleyen</span>
            <strong>{receipt.payerName || "-"}</strong>
          </div>

          <div>
            <span>E-posta</span>
            <strong>{receipt.payerEmail || "-"}</strong>
          </div>

          <div>
            <span>Daire</span>
            <strong>{receipt.apartmentLabel || "-"}</strong>
          </div>

          <div>
            <span>Ödeme Başlığı</span>
            <strong>{receipt.paymentTitle || "-"}</strong>
          </div>

          <div>
            <span>Son Ödeme Tarihi</span>
            <strong>{receipt.dueDate || "-"}</strong>
          </div>

          <div>
            <span>Tutar</span>
            <strong>{receipt.amountText || "-"}</strong>
          </div>

          <div>
            <span>Dosya</span>
            <strong>{receipt.fileName || "-"}</strong>
          </div>

          <div>
            <span>Dosya Türü</span>
            <strong>{receipt.fileType || "-"}</strong>
          </div>

          <div>
            <span>Dosya Boyutu</span>
            <strong>{receipt.fileSizeText || "-"}</strong>
          </div>

          <div>
            <span>Durum</span>
            <strong>{receipt.status || "-"}</strong>
          </div>

          <div>
            <span>Yükleme Tarihi</span>
            <strong>{receipt.createdAt || "-"}</strong>
          </div>

          <div>
            <span>İnceleyen</span>
            <strong>{receipt.reviewedBy || "-"}</strong>
          </div>
        </div>

        <div className="details-description">
          <span>Dekont Notu</span>
          <p>{receipt.description || "Bu dekont için açıklama bulunmuyor."}</p>
        </div>

        <div className="details-description">
          <span>İnceleme Notu</span>
          <p>{receipt.reviewNote || "İnceleme notu bulunmuyor."}</p>
        </div>
      </section>
    </div>
  );
}

export default ReceiptDetailsModal;
