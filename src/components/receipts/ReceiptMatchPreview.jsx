function ReceiptMatchPreview({ matchResult }) {
  if (!matchResult) {
    return null;
  }

  const matchedApartment = matchResult.apartment;

  return (
    <section className="receipt-match-preview">
      <div>
        <span className="section-kicker">Eşleştirme Önizlemesi</span>

        <h4>{matchResult.status || "Eşleştirme Durumu"}</h4>

        <p>{matchResult.message || "Eşleştirme sonucu henüz oluşturulmadı."}</p>
      </div>

      {matchedApartment && (
        <div className="receipt-match-grid">
          <div>
            <span>Eşleşen Daire</span>
            <strong>{matchedApartment.label || "-"}</strong>
          </div>

          <div>
            <span>Sakin</span>
            <strong>{matchedApartment.residentName || "-"}</strong>
          </div>

          <div>
            <span>Ödeme Tipi</span>
            <strong>{matchedApartment.residentRole || "-"}</strong>
          </div>

          <div>
            <span>Beklenen Tutar</span>
            <strong>{matchedApartment.expectedAmountText || "-"}</strong>
          </div>
        </div>
      )}
    </section>
  );
}

export default ReceiptMatchPreview;