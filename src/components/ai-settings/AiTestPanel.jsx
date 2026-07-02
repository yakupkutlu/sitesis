import { FlaskConical, WandSparkles } from "lucide-react";

function AiTestPanel({ testText, testResult, onTestTextChange, onRunTest }) {
  return (
    <section className="ai-settings-card">
      <div className="ai-card-header">
        <div className="ai-card-title">
          <div className="ai-card-icon">
            <FlaskConical size={23} />
          </div>

          <div>
            <span className="section-kicker">Dekont Test Paneli</span>
            <h3>AI Dekont Okuma Testi</h3>
          </div>
        </div>
      </div>

      <p className="ai-card-description">
        Dekont içeriğinden çıkarılacak ödeme bilgilerini kontrol etmek için kullanılır.
     </p>

      <div className="ai-test-grid">
        <label className="ai-test-input">
          Örnek Dekont Metni
          <textarea
            rows="9"
            placeholder="Örn: Ahmet Yılmaz tarafından 1250 TL ödeme yapılmıştır. Açıklama: A Blok Daire 5 Haziran aidatı..."
            value={testText}
            onChange={(event) => onTestTextChange(event.target.value)}
          ></textarea>
        </label>

        <div className="ai-test-result">
          <div className="ai-test-result-header">
            <span>Örnek AI Çıktısı</span>

            <button
              type="button"
              className="dashboard-action-button"
              onClick={onRunTest}
            >
              <WandSparkles size={17} />
              Test Et
            </button>
          </div>

          {testResult ? (
            <div className="ai-result-list">
              <div>
                <span>Ad Soyad</span>
                <strong>{testResult.fullName}</strong>
              </div>

              <div>
                <span>Daire</span>
                <strong>{testResult.apartment}</strong>
              </div>

              <div>
                <span>Tutar</span>
                <strong>{testResult.amount}</strong>
              </div>

              <div>
                <span>Açıklama</span>
                <strong>{testResult.description}</strong>
              </div>

              <div>
                <span>Ödeme Tipi</span>
                <strong>{testResult.paymentOwnerType}</strong>
              </div>

              <div>
                <span>Eşleşme Durumu</span>
                <strong>{testResult.matchStatus}</strong>
              </div>
            </div>
          ) : (
            <div className="ai-empty-result">
              Dekont metni girip “Test Et” butonuna basınca örnek sonuç burada
              görünecektir.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default AiTestPanel;