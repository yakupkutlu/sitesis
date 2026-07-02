function CalculationPreview({ calculation }) {
  const chargedApartments = calculation.chargedApartments || [];
  const exemptApartments = calculation.exemptApartments || [];

  return (
    <section className="calculation-preview">
      <div className="calculation-preview-header">
        <span className="section-kicker">Hesaplama Önizlemesi</span>

        <h4>Dağıtım Özeti</h4>
      </div>

      <div className="calculation-grid">
        <div>
          <span>Toplam Tutar</span>
          <strong>{calculation.totalAmountText}</strong>
        </div>

        <div>
          <span>Kapsama Giren Daire</span>
          <strong>{calculation.targetCount}</strong>
        </div>

        <div>
          <span>Muaf Daire</span>
          <strong>{calculation.exemptCount}</strong>
        </div>

        <div>
          <span>Ödeme Yapacak Daire</span>
          <strong>{calculation.chargedCount}</strong>
        </div>

        <div>
          <span>Daire Başı Tutar</span>
          <strong>{calculation.unitAmountText}</strong>
        </div>
      </div>

      {chargedApartments.length > 0 && (
        <div className="calculation-apartment-list">
          <span>Borçlandırılacak Daireler</span>

          <div>
            {chargedApartments.map((apartment) => (
              <strong key={apartment.id}>{apartment.label}</strong>
            ))}
          </div>
        </div>
      )}

      {exemptApartments.length > 0 && (
        <div className="calculation-apartment-list exempt">
          <span>Muaf Tutulan Daireler</span>

          <div>
            {exemptApartments.map((apartment) => (
              <strong key={apartment.id}>{apartment.label}</strong>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default CalculationPreview;