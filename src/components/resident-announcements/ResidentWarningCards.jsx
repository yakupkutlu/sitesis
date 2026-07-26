import { TriangleAlert } from "lucide-react";



function formatMoneyFromKurus(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(Number(value) / 100);
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("tr-TR");
}

function ResidentWarningCards({ warnings = [] }) {
  if (warnings.length === 0) {
    return (
      <section className="resident-warning-empty-card">
        <TriangleAlert size={38} strokeWidth={2.2} />
        <div>
          <h3>Uyarı bulunmuyor</h3>
          <p>Ödeme ve dekont işlemlerinizle ilgili güncel uyarı yok.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="resident-warning-cards">
      {warnings.map((warning) => {
        const differenceAmount = formatMoneyFromKurus(
          warning.differenceAmountKurus,
        );

        return (
          <article
            className={`resident-warning-card tone-${warning.tone}`}
            key={warning.id}
          >
            <div className="resident-warning-card-icon">
              <TriangleAlert size={38} strokeWidth={2.4} />
            </div>

            <div className="resident-warning-card-content">
              <div className="resident-warning-card-heading">
                <div>
                  <span className="section-kicker">Uyarı</span>
                  <h3>{warning.title}</h3>
                </div>

                <time dateTime={warning.date}>
                  {formatDate(warning.date)}
                </time>
              </div>

              <p>{warning.description}</p>

              <div className="resident-warning-meta">
                <span>
                  <strong>Ödeme:</strong> {warning.paymentTitle || "-"}
                </span>

                <span>
                  <strong>Daire:</strong> {warning.apartmentLabel || "-"}
                </span>

                {differenceAmount && Number(warning.differenceAmountKurus) > 0 && (
                  <span>
                    <strong>
                      {warning.kind === "OVERPAYMENT"
                        ? "Fazla Tutar:"
                        : "Eksik Tutar:"}
                    </strong>{" "}
                    {differenceAmount}
                  </span>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export default ResidentWarningCards;
