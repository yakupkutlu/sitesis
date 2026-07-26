import { Eye, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";

function ResidentPaymentTable({ payments, onView }) {
  if (payments.length === 0) {
    return (
      <section className="resident-payment-empty">
        Arama kriterlerine uygun ödeme kaydı bulunamadı.
      </section>
    );
  }

  return (
    <section className="resident-payments-table-card">
      <div className="resident-payments-table-wrapper">
        <table className="resident-payments-table">
          <thead>
            <tr>
              <th>Ödeme</th>
              <th>Kategori</th>
              <th>Dönem</th>
              <th>Tutar</th>
              <th>Ödenen</th>
              <th>Kalan</th>
              <th>Fazla Ödeme</th>
              <th>Son Ödeme</th>
              <th>Durum</th>
              <th>İşlem</th>
            </tr>
          </thead>

          <tbody>
            {payments.map((payment) => {
              const statusClass =
                payment.status === "Ödendi"
                  ? "paid"
                  : payment.status === "Gecikti"
                  ? "late"
                  : payment.status === "Kısmi Ödendi"
                  ? "partial"
                  : "waiting";

              return (
                <tr key={payment.id}>
                  <td>
                    <div className="resident-payment-main-cell">
                      <strong>{payment.title}</strong>
                      <span>{payment.description}</span>
                    </div>
                  </td>

                  <td>
                    <span className="resident-payment-category-badge">
                      {payment.category}
                    </span>
                  </td>

                  <td>{payment.period}</td>
                  <td>{payment.amount}</td>
                  <td>{payment.paidAmount}</td>
                  <td>{payment.remainingAmount}</td>
                  <td>{payment.overpaymentAmount}</td>
                  <td>{payment.dueDate}</td>

                  <td>
                    <span className={`resident-payment-status-badge ${statusClass}`}>
                      {payment.status}
                    </span>
                  </td>

                  <td>
                    <div className="resident-payment-table-actions">
                      <button type="button" onClick={() => onView(payment)}>
                        <Eye size={16} />
                      </button>

                      {payment.status !== "Ödendi" && (
                        <Link to="/resident/receipts" title="Dekont Yükle">
                          <UploadCloud size={16} />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default ResidentPaymentTable;