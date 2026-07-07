import { X } from "lucide-react";

function formatAiAmount(amountKurus) {
  if (amountKurus === null || amountKurus === undefined) {
    return "-";
  }

  return `${(Number(amountKurus) / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} TL`;
}

function formatAiConfidence(confidence) {
  if (confidence === null || confidence === undefined) {
    return "-";
  }

  return `%${Math.round(Number(confidence) * 100)}`;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  try {
    return new Date(value).toLocaleString("tr-TR");
  } catch {
    return "-";
  }
}

function ReceiptDetailsModal({ receipt, onClose }) {
  if (!receipt) {
    return null;
  }

  const rawReceipt = receipt.raw || {};

  const hasAiInfo = Boolean(
    rawReceipt.aiProvider ||
      rawReceipt.aiModelName ||
      rawReceipt.aiPayerName ||
      rawReceipt.aiAmountKurus !== null && rawReceipt.aiAmountKurus !== undefined ||
      rawReceipt.aiApartmentNumber ||
      rawReceipt.aiDescription ||
      rawReceipt.aiPaymentDate ||
      rawReceipt.aiConfidence !== null && rawReceipt.aiConfidence !== undefined
  );

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

        {hasAiInfo && (
          <div className="receipt-ai-result-card">
            <div>
              <span className="section-kicker">AI Analiz Bilgileri</span>
              <h4>Dekont AI ile analiz edilerek kaydedildi.</h4>
            </div>

            <div className="receipt-match-grid">
              <div>
                <span>Sağlayıcı</span>
                <strong>{rawReceipt.aiProvider || "-"}</strong>
              </div>

              <div>
                <span>Model</span>
                <strong>{rawReceipt.aiModelName || "-"}</strong>
              </div>

              <div>
                <span>Okunan Tutar</span>
                <strong>{formatAiAmount(rawReceipt.aiAmountKurus)}</strong>
              </div>

              <div>
                <span>Güven Oranı</span>
                <strong>{formatAiConfidence(rawReceipt.aiConfidence)}</strong>
              </div>

              <div>
                <span>Ödeyen</span>
                <strong>{rawReceipt.aiPayerName || "-"}</strong>
              </div>

              <div>
                <span>Okunan Daire No</span>
                <strong>{rawReceipt.aiApartmentNumber || "-"}</strong>
              </div>

              <div>
                <span>Ödeme Tarihi</span>
                <strong>{rawReceipt.aiPaymentDate || "-"}</strong>
              </div>

              <div>
                <span>Analiz Tarihi</span>
                <strong>{formatDateTime(rawReceipt.aiAnalyzedAt)}</strong>
              </div>

              <div className="full-width">
                <span>Okunan Açıklama</span>
                <strong>{rawReceipt.aiDescription || "-"}</strong>
              </div>
            </div>
          </div>
        )}

        {!hasAiInfo && (
          <div className="details-description">
            <span>AI Analiz Bilgileri</span>
            <p>Bu dekont için kayıtlı AI analiz bilgisi bulunmuyor.</p>
          </div>
        )}

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
