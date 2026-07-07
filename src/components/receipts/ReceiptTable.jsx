import { CheckCircle2, Download, Eye, XCircle } from "lucide-react";

function getReceiptStatusClass(status) {
  if (status === "Onaylandı") {
    return "approved";
  }

  if (status === "Reddedildi") {
    return "rejected";
  }

  return "waiting";
}

function ReceiptTable({
  receipts,
  onView,
  onApprove,
  onReject,
  onDownload,
  isSaving = false,
}) {
  const safeReceipts = receipts || [];

  return (
    <section className="receipts-table-card">
      <div className="receipts-table-wrapper">
        <table className="receipts-table">
          <thead>
            <tr>
              <th>Yükleyen</th>
              <th>Daire</th>
              <th>Ödeme</th>
              <th>Tutar</th>
              <th>Dosya</th>
              <th>Durum</th>
              <th>Tarih</th>
              <th>İşlem</th>
            </tr>
          </thead>

          <tbody>
            {safeReceipts.length > 0 ? (
              safeReceipts.map((receipt) => {
                const statusClass = getReceiptStatusClass(receipt.status);
                const isWaitingApproval = receipt.status === "Onay Bekliyor";

                return (
                  <tr key={receipt.id}>
                    <td>
                      <div className="receipt-main-cell">
                        <strong>{receipt.payerName || "Yükleyen yok"}</strong>
                        <span>{receipt.payerEmail || "-"}</span>
                      </div>
                    </td>

                    <td>{receipt.apartmentLabel || "-"}</td>
                    <td>{receipt.paymentTitle || "-"}</td>
                    <td>{receipt.amountText || "-"}</td>
                    <td>{receipt.fileName || "-"}</td>

                    <td>
                      <span className={`receipt-status-badge ${statusClass}`}>
                        {receipt.status || "Onay Bekliyor"}
                      </span>
                    </td>

                    <td>{receipt.createdAt || "-"}</td>

                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          onClick={() => onView(receipt)}
                          aria-label={`${receipt.fileName || "Dekont"} detayını görüntüle`}
                          disabled={isSaving}
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDownload(receipt.id)}
                          aria-label={`${receipt.fileName || "Dekont"} indir`}
                          disabled={isSaving}
                        >
                          <Download size={16} />
                        </button>

                        {isWaitingApproval && (
                          <button
                            type="button"
                            className="success-table-button"
                            onClick={() => onApprove(receipt.id)}
                            aria-label={`${receipt.fileName || "Dekont"} onayla`}
                            disabled={isSaving}
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}

                        {isWaitingApproval && (
                          <button
                            type="button"
                            className="warning-table-button"
                            onClick={() => onReject(receipt.id)}
                            aria-label={`${receipt.fileName || "Dekont"} reddet`}
                            disabled={isSaving}
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" className="empty-table-message">
                  Arama kriterlerine uygun dekont bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default ReceiptTable;
