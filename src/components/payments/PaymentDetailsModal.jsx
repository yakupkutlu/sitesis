import { X } from "lucide-react";

function PaymentDetailsModal({ payment, onClose }) {
  if (!payment) {
    return null;
  }

  const chargedApartments = payment.chargedApartments || [];
  const exemptApartments = payment.exemptApartments || [];

  return (
    <div className="modal-overlay">
      <section className="details-modal">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Ödeme Detayı</span>

            <h3>{payment.title}</h3>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Detay penceresini kapat"
          >
            <X size={20} />
          </button>
        </div>

        <div className="details-list payment-details-list">
          <div>
            <span>Kategori</span>
            <strong>{payment.category}</strong>
          </div>

          <div>
            <span>Kapsam</span>
            <strong>{payment.scopeText}</strong>
          </div>

          <div>
            <span>Toplam Tutar</span>
            <strong>{payment.totalAmountText}</strong>
          </div>

          <div>
            <span>Daire Başı Tutar</span>
            <strong>{payment.unitAmountText}</strong>
          </div>

          <div>
            <span>Borçlandırılan Daire</span>
            <strong>{payment.chargedCount}</strong>
          </div>

          <div>
            <span>Muaf Daire</span>
            <strong>{payment.exemptCount}</strong>
          </div>

          <div>
            <span>Son Ödeme Tarihi</span>
            <strong>{payment.dueDateText}</strong>
          </div>

          <div>
            <span>Durum</span>
            <strong>{payment.status}</strong>
          </div>
        </div>

        <div className="details-description">
          <span>Borçlandırılan Daireler</span>

          <div className="payment-detail-pill-list">
            {chargedApartments.map((apartment) => (
              <strong key={apartment.id}>{apartment.label}</strong>
            ))}
          </div>
        </div>

        {exemptApartments.length > 0 && (
          <div className="details-description">
            <span>Muaf Daireler</span>

            <div className="payment-detail-pill-list exempt">
              {exemptApartments.map((apartment) => (
                <strong key={apartment.id}>{apartment.label}</strong>
              ))}
            </div>
          </div>
        )}

        <div className="details-description">
          <span>Açıklama</span>

          <p>{payment.description || "Bu ödeme için açıklama bulunmuyor."}</p>
        </div>
      </section>
    </div>
  );
}

export default PaymentDetailsModal;