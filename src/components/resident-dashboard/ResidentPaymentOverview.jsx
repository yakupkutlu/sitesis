function ResidentPaymentOverview({ payment }) {
  return (
    <section className="resident-dashboard-card">
      <div className="resident-card-header">
        <div>
          <span className="section-kicker">Borç Özeti</span>
          <h3>Ödeme Durumu</h3>
        </div>

        <span className={`resident-payment-status ${payment.statusClass}`}>
          {payment.status}
        </span>
      </div>

      <div className="resident-payment-overview-grid">
        <div>
          <span>Bu Ayki Borcunuz</span>
          <strong>{payment.currentDue}</strong>
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
          <span>Fazla Ödeme</span>
          <strong>{payment.overpaymentAmount}</strong>
        </div>

        <div>
          <span>Son Ödeme</span>
          <strong>{payment.dueDate}</strong>
        </div>
      </div>

      <div className="resident-progress-box">
        <div>
          <span>Ödeme Tamamlanma</span>
          <strong>{payment.progress}%</strong>
        </div>

        <div className="resident-progress-bar">
          <span style={{ width: `${payment.progress}%` }} />
        </div>
      </div>
    </section>
  );
}

export default ResidentPaymentOverview;