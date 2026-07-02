import { Edit, Eye, Trash2 } from "lucide-react";

function getApartmentStatusClass(status) {
  if (status === "Dolu") {
    return "active";
  }

  if (status === "Bakımda") {
    return "pending";
  }

  return "passive";
}

function getPaymentStatusClass(paymentStatus) {
  if (paymentStatus === "Ödendi") {
    return "paid";
  }

  if (paymentStatus === "Gecikmiş") {
    return "late";
  }

  if (paymentStatus === "Bekliyor") {
    return "waiting";
  }

  return "empty";
}

function ApartmentTable({ apartments, onView, onEdit, onDelete }) {
  const safeApartments = apartments || [];

  return (
    <section className="apartments-table-card">
      <div className="apartments-table-wrapper">
        <table className="apartments-table">
          <thead>
            <tr>
              <th>Daire</th>
              <th>Blok</th>
              <th>Kat</th>
              <th>Durum</th>
              <th>Kullanım</th>
              <th>Sakin</th>
              <th>Telefon</th>
              <th>Aidat Durumu</th>
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

                    <td>{apartment.block || "-"}</td>

                    <td>{apartment.floor || "-"}</td>

                    <td>
                      <span className={`apartment-status-badge ${statusClass}`}>
                        {apartment.status || "-"}
                      </span>
                    </td>

                    <td>{apartment.usageType || "-"}</td>

                    <td>
                      <div className="apartment-resident-cell">
                        <strong>{apartment.residentName || "-"}</strong>
                        <span>{apartment.note || "Not bulunmuyor"}</span>
                      </div>
                    </td>

                    <td>{apartment.phone || "-"}</td>

                    <td>
                      <span
                        className={`apartment-payment-badge ${paymentClass}`}
                      >
                        {apartment.paymentStatus || "-"}
                      </span>
                    </td>

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

                        <button
                          type="button"
                          onClick={() => onEdit(apartment)}
                          aria-label={`${
                            apartment.apartmentNo || "Daire"
                          } düzenle`}
                        >
                          <Edit size={16} />
                        </button>

                        <button
                          type="button"
                          className="danger-table-button"
                          onClick={() => onDelete(apartment.id)}
                          aria-label={`${
                            apartment.apartmentNo || "Daire"
                          } kaydını sil`}
                        >
                          <Trash2 size={16} />
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