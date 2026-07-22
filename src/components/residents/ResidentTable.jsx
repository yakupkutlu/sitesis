import { Fragment, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Eye,
  Power,
  Trash2,
} from "lucide-react";

function getStatusClass(status) {
  if (status === "Aktif") {
    return "active";
  }

  if (status === "Onay Bekliyor") {
    return "pending";
  }

  return "passive";
}

function getPaymentClass(status) {
  if (status === "Ödendi") {
    return "paid";
  }

  if (status === "Gecikmiş") {
    return "late";
  }

  if (status === "Kısmi Ödeme" || status === "Kısmi Ödendi") {
    return "partial";
  }

  return "waiting";
}

function ResidentActions({
  resident,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
  isSaving,
  showAccountAction = true,
  showApartmentActions = true,
}) {
  const canEdit = typeof onEdit === "function";
  const canToggleStatus = typeof onToggleStatus === "function";
  const canDelete = typeof onDelete === "function";
  const requiresPassiveBeforeDelete =
    resident.accountRole === "RESIDENT" && resident.status !== "Pasif";

  return (
    <div className="table-actions">
      <button
        type="button"
        onClick={() => onView(resident)}
        disabled={isSaving}
        aria-label={`${resident.name} detayını görüntüle`}
      >
        <Eye size={16} />
      </button>

      {showApartmentActions && canEdit && (
        <button
          type="button"
          onClick={() => onEdit(resident)}
          disabled={isSaving}
          aria-label={`${resident.name} daire bağlantısını düzenle`}
        >
          <Edit size={16} />
        </button>
      )}

      {showAccountAction &&
        canToggleStatus &&
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

      {showApartmentActions && canDelete && (
        <button
          type="button"
          className="danger-table-button"
          onClick={() => onDelete(resident)}
          title={
            requiresPassiveBeforeDelete
              ? "Önce sakin hesabını pasif yapın."
              : "Yalnızca bu daire bağlantısını kaldır"
          }
          aria-label={`${resident.name} daire bağlantısını kaldır`}
          disabled={isSaving || requiresPassiveBeforeDelete}
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

function ResidentRow({
  resident,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
  isSaving,
  isChild = false,
  showAccountAction = true,
  showApartmentActions = true,
}) {
  const statusClass = getStatusClass(resident.status);
  const paymentClass = getPaymentClass(resident.paymentStatus);

  return (
    <tr className={isChild ? "multi-apartment-child-row" : undefined}>
      <td>
        <div
          className={`resident-main-cell ${
            isChild ? "multi-apartment-child-indent" : ""
          }`}
        >
          <strong>{isChild ? "Daire bağlantısı" : resident.name}</strong>
          <span>{isChild ? resident.site : resident.note || "Not bulunmuyor"}</span>
        </div>
      </td>

      <td>
        <span className="resident-role-badge">{resident.role}</span>
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
        <ResidentActions
          resident={resident}
          onView={onView}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          isSaving={isSaving}
          showAccountAction={showAccountAction}
          showApartmentActions={showApartmentActions}
        />
      </td>
    </tr>
  );
}

function ResidentTable({
  residents,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
  isSaving = false,
}) {
  const safeResidents = residents || [];
  const [expandedOwnerIds, setExpandedOwnerIds] = useState([]);

  function toggleOwner(ownerId) {
    setExpandedOwnerIds((currentIds) =>
      currentIds.includes(ownerId)
        ? currentIds.filter((id) => id !== ownerId)
        : [...currentIds, ownerId]
    );
  }

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
            {safeResidents.length > 0 ? (
              safeResidents.map((resident) => {
                if (!resident.isMultiApartmentOwner) {
                  return (
                    <ResidentRow
                      key={resident.id}
                      resident={resident}
                      onView={onView}
                      onEdit={onEdit}
                      onToggleStatus={onToggleStatus}
                      onDelete={onDelete}
                      isSaving={isSaving}
                    />
                  );
                }

                const isExpanded = expandedOwnerIds.includes(resident.id);
                const statusClass = getStatusClass(resident.status);
                const paymentClass = getPaymentClass(
                  resident.paymentStatus
                );

                return (
                  <Fragment key={resident.id}>
                    <tr className="multi-apartment-summary-row">
                      <td>
                        <div className="resident-main-cell">
                          <strong>{resident.name}</strong>
                          <span>{resident.apartmentCount} daire bağlantısı</span>
                        </div>
                      </td>

                      <td>
                        <span className="resident-role-badge">
                          {resident.role}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="multi-apartment-toggle"
                          onClick={() => toggleOwner(resident.id)}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? (
                            <ChevronDown size={17} />
                          ) : (
                            <ChevronRight size={17} />
                          )}

                          <span>
                            <strong>{resident.apartmentCount} Daire</strong>
                            <small>
                              {resident.site} / {resident.block}
                            </small>
                          </span>
                        </button>
                      </td>

                      <td>{resident.phone}</td>
                      <td>{resident.email}</td>
                      <td>{resident.totalDebt}</td>

                      <td>
                        <strong>{resident.remainingDebt}</strong>
                      </td>

                      <td>
                        <span
                          className={`resident-status-badge ${statusClass}`}
                        >
                          {resident.status}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`resident-payment-badge ${paymentClass}`}
                        >
                          {resident.paymentStatus}
                        </span>
                      </td>

                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            onClick={() => onView(resident)}
                            aria-label={`${resident.name} toplam detayını görüntüle`}
                            disabled={isSaving}
                          >
                            <Eye size={16} />
                          </button>

                          {resident.accountRole === "RESIDENT" && (
                            <button
                              type="button"
                              onClick={() => onToggleStatus(resident)}
                              title="Bu işlem kullanıcı hesabının tamamını etkiler."
                              aria-label={`${resident.name} hesap durumunu değiştir`}
                              disabled={isSaving}
                            >
                              <Power size={16} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleOwner(resident.id)}
                            aria-label={`${resident.name} dairelerini ${
                              isExpanded ? "kapat" : "aç"
                            }`}
                            disabled={isSaving}
                          >
                            {isExpanded ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded &&
                      resident.apartmentRows.map((apartmentRow) => (
                        <ResidentRow
                          key={apartmentRow.id}
                          resident={apartmentRow}
                          onView={onView}
                          onEdit={onEdit}
                          onToggleStatus={onToggleStatus}
                          onDelete={onDelete}
                          isSaving={isSaving}
                          isChild
                          showAccountAction={false}
                        />
                      ))}
                  </Fragment>
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
