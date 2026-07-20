import { Edit, Eye, Power, Trash2 } from "lucide-react";

function ResidentTable({
  residents,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
  isSaving = false,
}) {
  const canEdit = typeof onEdit === "function";
  const canToggleStatus = typeof onToggleStatus === "function";
  const canDelete = typeof onDelete === "function";

  return (
    <section className="residents-table-card">
      <div className="residents-table-wrapper">
        <table className="residents-table">
          <thead>
            <tr>
              <th>Ad Soyad</th>
              <th>Rol</th>
              <th>Daire</th>
              <th>Telefon</th>
              <th>E-posta</th>
              <th>Toplam Borç</th>
              <th>Kalan</th>
              <th>Durum</th>
              <th>Ödeme</th>
              <th>İşlem</th>
            </tr>
          </thead>

          <tbody>
            {residents.length > 0 ? (
              residents.map((resident) => {
                const statusClass =
                  resident.status === "Aktif"
                    ? "active"
                    : resident.status === "Onay Bekliyor"
                    ? "pending"
                    : "passive";

                const requiresPassiveBeforeDelete =
                  resident.accountRole === "RESIDENT" &&
                  resident.status !== "Pasif";

                const paymentClass =
                  resident.paymentStatus === "Ödendi"
                    ? "paid"
                    : resident.paymentStatus === "Gecikmiş"
                    ? "late"
                    : resident.paymentStatus === "Kısmi Ödeme"
                    ? "partial"
                    : "waiting";

                return (
                  <tr key={resident.id}>
                    <td>
                      <div className="resident-main-cell">
                        <strong>{resident.name}</strong>
                        <span>{resident.note || "Not bulunmuyor"}</span>
                      </div>
                    </td>

                    <td>
                      <span className="resident-role-badge">
                        {resident.role}
                      </span>
                    </td>

                    <td>
                      <div className="resident-apartment-cell">
                        <strong>{resident.block}</strong>
                        <span>{resident.apartment}</span>
                      </div>
                    </td>

                    <td>{resident.phone}</td>
                    <td>{resident.email}</td>
                    <td>{resident.totalDebt}</td>

                    <td>
                      <strong>{resident.remainingDebt}</strong>
                    </td>

                    <td>
                      <span className={`resident-status-badge ${statusClass}`}>
                        {resident.status}
                      </span>
                    </td>

                    <td>
                      <span className={`resident-payment-badge ${paymentClass}`}>
                        {resident.paymentStatus}
                      </span>
                    </td>

                    <td>
                      <div className="table-actions">
                        <button type="button" onClick={() => onView(resident)} disabled={isSaving}>
                          <Eye size={16} />
                        </button>

                        {canEdit && (
                          <button type="button" onClick={() => onEdit(resident)} disabled={isSaving}>
                            <Edit size={16} />
                          </button>
                        )}

                        {canToggleStatus &&
                          resident.accountRole === "RESIDENT" && (
                            <button
                              type="button"
                              onClick={() => onToggleStatus(resident)}
                              title={
                                resident.status === "Aktif"
                                  ? "Sakin hesabını pasif yap"
                                  : "Sakin hesabını aktifleştir"
                              }
                              aria-label={`${resident.name} hesap durumunu değiştir`}
                              disabled={isSaving}
                            >
                              <Power size={16} />
                            </button>
                          )}

                        {canDelete && (
                          <button
                            type="button"
                            className="danger-table-button"
                            onClick={() => onDelete(resident)}
                            title={
                              requiresPassiveBeforeDelete
                                ? "Önce sakin hesabını pasif yapın."
                                : "Daire bağlantısını kaldır"
                            }
                            aria-label={`${resident.name} daire bağlantısını kaldır`}
                            disabled={isSaving || requiresPassiveBeforeDelete}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" className="empty-table-message">
                  Arama kriterlerine uygun sakin bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default ResidentTable;
