function formatConfidence(confidence) {
  if (typeof confidence !== "number") {
    return "-";
  }

  return `%${Math.round(confidence * 100)}`;
}

function formatAmount(amount) {
  if (typeof amount !== "number") {
    return "-";
  }

  return amount.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ReceiptMatchPreview({ matchResult, onConfirm, isSaving = false }) {
  if (!matchResult) {
    return null;
  }

  const matchedApartment = matchResult.apartment;
  const aiResult = matchResult.ai || null;
  const canConfirm = Boolean(matchedApartment?.paymentAllocationId);
  const isManualVerification = matchResult.verificationMode === "MANUAL";

  return (
    <section className="receipt-match-preview">
      <div>
        <span className="section-kicker">Eşleştirme Önizlemesi</span>
        <h4>{matchResult.status || "Eşleştirme Durumu"}</h4>
        <p>{matchResult.message || "Eşleştirme sonucu henüz oluşturulmadı."}</p>
      </div>

      {isManualVerification && (
        <div className="receipt-manual-info">
          <strong>Manuel doğrulama</strong>
          <span>
            AI sonucu zorunlu değildir. Dosya, daire ve kayıtlı sakin yönetici
            tarafından kontrol edilmiştir; Backend ilişkiyi tekrar doğrular.
          </span>
        </div>
      )}

      <div className="receipt-ai-result-card">
        <div>
          <span className="section-kicker">AI Okunan Bilgiler</span>
          <h4>
            {aiResult?.message ||
              "Backend AI bilgisi göndermedi. Eşleşme manuel bilgilerle yapılmış olabilir."}
          </h4>
        </div>

        <div className="receipt-match-grid">
          <div>
            <span>Sağlayıcı</span>
            <strong>{aiResult?.provider || "-"}</strong>
          </div>

          <div>
            <span>Model</span>
            <strong>{aiResult?.modelName || "-"}</strong>
          </div>

          <div>
            <span>Okunan Tutar</span>
            <strong>{formatAmount(aiResult?.amount)} TL</strong>
          </div>

          <div>
            <span>Güven Oranı</span>
            <strong>{formatConfidence(aiResult?.confidence)}</strong>
          </div>

          <div>
            <span>Ödeyen</span>
            <strong>{aiResult?.payerName || "-"}</strong>
          </div>

          <div>
            <span>Okunan Daire No</span>
            <strong>{aiResult?.apartmentNumber || "-"}</strong>
          </div>

          <div className="full-width">
            <span>Okunan Açıklama</span>
            <strong>{aiResult?.description || "-"}</strong>
          </div>
        </div>
      </div>

      {matchedApartment && (
        <div className="receipt-match-grid">
          <div>
            <span>Eşleşen Daire</span>
            <strong>{matchedApartment.label || "-"}</strong>
          </div>

          <div>
            <span>Kayıtlı Sakin</span>
            <strong>{matchedApartment.residentName || "-"}</strong>
          </div>

          <div>
            <span>Sakin Tipi</span>
            <strong>{matchedApartment.residentRole || "-"}</strong>
          </div>

          <div>
            <span>Beklenen Tutar</span>
            <strong>{matchedApartment.expectedAmountText || "-"}</strong>
          </div>

          <div className="full-width">
            <span>Ödeme Başlığı</span>
            <strong>{matchedApartment.paymentTitle || "-"}</strong>
          </div>
        </div>
      )}

      {canConfirm && (
        <div className="form-actions">
          <button
            type="button"
            className="dashboard-action-button"
            onClick={onConfirm}
            disabled={isSaving}
          >
            {isSaving ? "Onaylanıyor..." : "Eşleştir ve Onayla"}
          </button>
        </div>
      )}
    </section>
  );
}

export default ReceiptMatchPreview;
