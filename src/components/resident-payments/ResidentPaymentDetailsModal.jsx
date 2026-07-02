import { X } from "lucide-react";
import { Link } from "react-router-dom";

function ResidentPaymentDetailsModal({ payment, onClose }) {
  if (!payment) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <section className="details-modal resident-payment-modal">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Ödeme Detayı</span>
            <h3>{payment.title}</h3>
          </div>

          <button type="button" className="modal-close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="details-list resident-payment-details-list">
          <div>
            <span>Kategori</span>
            <strong>{payment.category}</strong>
          </div>

          <div>
            <span>Dönem</span>
            <strong>{payment.period}</strong>
          </div>

          <div>
            <span>Toplam Tutar</span>
            <strong>{payment.amount}</strong>
          </div>

          <div>
            <span>Ödenen</span>
            <strong>{payment.paidAmount}</strong>
          </div>

          <div>
            <span>Kalan</span>
            <strong>{payment.remainingAmount}</strong>
          </div>

          <div>
            <span>Son Ödeme Tarihi</span>
            <strong>{payment.dueDate}</strong>
          </div>

          <div>
            <span>Durum</span>
            <strong>{payment.status}</strong>
          </div>

          <div>
            <span>Daire</span>
            <strong>{payment.apartment}</strong>
          </div>
        </div>

        <div className="details-description">
          <span>Açıklama</span>
          <p>{payment.description}</p>
        </div>

        {payment.status !== "Ödendi" && (
          <div className="resident-payment-modal-actions">
            <Link to="/resident/receipts" className="dashboard-action-button">
              Dekont Yükle
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

export default ResidentPaymentDetailsModal;