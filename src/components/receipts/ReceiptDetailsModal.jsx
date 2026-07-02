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

            <h3>{receipt.payerName || "Dekont Bilgisi"}</h3>
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
            <span>Ödeyen</span>
            <strong>{receipt.payerName || "-"}</strong>
          </div>

          <div>
            <span>Banka Hesap No / IBAN</span>
            <strong>{receipt.bankAccount || "-"}</strong>
          </div>

          <div>
            <span>Eşleşen Daire</span>
            <strong>{receipt.apartmentLabel || "-"}</strong>
          </div>

          <div>
            <span>Ödeme Tipi</span>
            <strong>{receipt.paymentOwnerType || "-"}</strong>
          </div>

          <div>
            <span>Ödenen Tutar</span>
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
        </div>

        <div className="details-description">
          <span>Eşleştirme Notu</span>

          <p>{receipt.matchMessage || "Eşleştirme notu bulunmuyor."}</p>
        </div>

        <div className="details-description">
          <span>Açıklama</span>

          <p>{receipt.description || "Bu dekont için açıklama bulunmuyor."}</p>
        </div>
      </section>
    </div>
  );
}

export default ReceiptDetailsModal;