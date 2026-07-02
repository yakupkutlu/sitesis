import { Eye, FileText } from "lucide-react";

function getReceiptStatusClass(status) {
  if (status === "Onaylandı") {
    return "approved";
  }

  if (status === "Reddedildi") {
    return "rejected";
  }

  return "waiting";
}

function ResidentReceiptCards({ receipts, onView }) {
  const safeReceipts = receipts || [];

  if (safeReceipts.length === 0) {
    return (
      <section className="resident-receipt-empty">
        Henüz yüklenmiş dekont bulunmuyor.
      </section>
    );
  }

  return (
    <section className="resident-receipt-cards-grid">
      {safeReceipts.map((receipt) => {
        const statusClass = getReceiptStatusClass(receipt.status);

        return (
          <article className="resident-receipt-card" key={receipt.id}>
            <div className="resident-receipt-card-top">
              <div className="resident-receipt-icon">
                <FileText size={21} />
              </div>

              <span className={`resident-receipt-status-badge ${statusClass}`}>
                {receipt.status || "Beklemede"}
              </span>
            </div>

            <div className="resident-receipt-card-content">
              <span>{receipt.paymentTitle || "Ödeme bilgisi yok"}</span>

              <h3>{receipt.amount || "-"}</h3>

              <p>{receipt.description || "Açıklama bulunmuyor."}</p>
            </div>

            <div className="resident-receipt-meta-grid">
              <div>
                <span>Dosya</span>
                <strong>{receipt.fileName || "-"}</strong>
              </div>

              <div>
                <span>Yükleme Tarihi</span>
                <strong>{receipt.uploadedAt || "-"}</strong>
              </div>

              <div>
                <span>Daire</span>
                <strong>{receipt.apartment || "-"}</strong>
              </div>

              <div>
                <span>Kontrol</span>
                <strong>{receipt.reviewNote || "-"}</strong>
              </div>
            </div>

            <div className="resident-receipt-card-actions">
              <button
                type="button"
                onClick={() => onView(receipt)}
                aria-label={`${receipt.paymentTitle || "Dekont"} detayını görüntüle`}
              >
                <Eye size={16} />
                Görüntüle
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export default ResidentReceiptCards;