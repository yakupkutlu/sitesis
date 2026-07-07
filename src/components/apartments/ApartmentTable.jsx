import { Eye } from "lucide-react";

function getApartmentStatusClass(status) {
  if (status === "Dolu") {
    return "active";
  }

  return "passive";
}

function getPaymentStatusClass(paymentStatus) {
  if (paymentStatus === "Yok") {
    return "empty";
  }

  return "waiting";
}

function ApartmentTable({ apartments, onView }) {
  const safeApartments = apartments || [];

  return (
    <section className="apartments-table-card">
      <div className="apartments-table-wrapper">
        <table className="apartments-table">
          <thead>
            <tr>
              <th>Daire</th>
              <th>Site</th>
              <th>Blok</th>
              <th>Kat</th>
              <th>Durum</th>
              <th>Sakin Bilgisi</th>
              <th>Ödeme Kaydı</th>
              <th>Açıklama</th>
              <th>İşlem</th>
            </tr>
          </thead>

          <tbody>
            {safeApartments.length > 0 ? (
              safeApartments.map((apartment) => {
                const statusClass = getApartmentStatusClass(apartment.status);
                const paymentClass = getPaymentStatusClass(
                  apartment.paymentStatus
                );

                return (
                  <tr key={apartment.id}>
                    <td>
                      <strong>{apartment.apartmentNo || "-"}</strong>
                    </td>

                    <td>{apartment.site || "-"}</td>

                    <td>{apartment.block || "-"}</td>

                    <td>{apartment.floor || "-"}</td>

                    <td>
                      <span className={`apartment-status-badge ${statusClass}`}>
                        {apartment.status || "-"}
                      </span>
                    </td>

                    <td>
                      <div className="apartment-resident-cell">
                        <strong>{apartment.residentName || "-"}</strong>
                        <span>{apartment.usageType || "-"}</span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`apartment-payment-badge ${paymentClass}`}
                      >
                        {apartment.paymentStatus || "-"}
                      </span>
                    </td>

                    <td>{apartment.note || "-"}</td>

                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          onClick={() => onView(apartment)}
                          aria-label={`${
                            apartment.apartmentNo || "Daire"
                          } detayını görüntüle`}
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" className="empty-table-message">
                  Arama kriterlerine uygun daire bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default ApartmentTable;
