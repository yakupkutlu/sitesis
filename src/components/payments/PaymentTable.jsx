import { Eye, Trash2 } from "lucide-react";

function getStatusClass(status) {
  if (status === "Aktif") {
    return "active";
  }

  if (status === "Tamamlandı") {
    return "paid";
  }

  return "passive";
}

function PaymentTable({ payments, onView, onDelete }) {
  const safePayments = payments || [];

  return (
    <section className="payments-table-card">
      <div className="payments-table-wrapper">
        <table className="payments-table">
          <thead>
            <tr>
              <th>Başlık</th>
              <th>Kategori</th>
              <th>Kapsam</th>
              <th>Toplam Tutar</th>
              <th>Daire Başı</th>
              <th>Borçlandırılan</th>
              <th>Muaf</th>
              <th>Son Ödeme</th>
              <th>Durum</th>
              <th>İşlem</th>
            </tr>
          </thead>

          <tbody>
            {safePayments.length > 0 ? (
              safePayments.map((payment) => {
                const statusClass = getStatusClass(payment.status);

                return (
                  <tr key={payment.id}>
                    <td>
                      <div className="payment-main-cell">
                        <strong>{payment.title}</strong>
                        <span>{payment.description || "Açıklama yok"}</span>
                      </div>
                    </td>

                    <td>
                      <span className="payment-category-badge">
                        {payment.category}
                      </span>
                    </td>

                    <td>{payment.scopeText}</td>
                    <td>{payment.totalAmountText}</td>
                    <td>{payment.unitAmountText}</td>
                    <td>{payment.chargedCount} daire</td>
                    <td>{payment.exemptCount} daire</td>
                    <td>{payment.dueDateText}</td>

                    <td>
                      <span className={`payment-status-badge ${statusClass}`}>
                        {payment.status}
                      </span>
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          onClick={() => onView(payment)}
                          aria-label={`${payment.title} detayını görüntüle`}
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          type="button"
                          className="danger-table-button"
                          onClick={() => onDelete(payment.id)}
                          aria-label={`${payment.title} kaydını sil`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" className="empty-table-message">
                  Arama kriterlerine uygun ödeme kaydı bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default PaymentTable;