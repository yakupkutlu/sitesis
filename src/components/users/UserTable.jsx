import { Fragment, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Eye,
  Power,
  Trash2,
} from "lucide-react";

function getUserStatusClass(status) {
  if (status === "Aktif") {
    return "active";
  }

  if (status === "Onay Bekliyor") {
    return "pending";
  }

  return "passive";
}

function UserActions({
  user,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
  isSaving,
  showAccountAction = true,
  showApartmentActions = true,
}) {
  const requiresPassiveBeforeDelete =
    user.accountRole === "RESIDENT" && user.status !== "Pasif";

  return (
    <div className="table-actions">
      <button
        type="button"
        onClick={() => onView(user)}
        aria-label={`${user.name || "Kullanıcı"} detayını görüntüle`}
        disabled={isSaving}
      >
        <Eye size={16} />
      </button>

      {showApartmentActions && (
        <button
          type="button"
          onClick={() => onEdit(user)}
          aria-label={`${user.name || "Kullanıcı"} daire bağlantısını düzenle`}
          disabled={isSaving}
        >
          <Edit size={16} />
        </button>
      )}

      {showAccountAction && (
        <button
          type="button"
          onClick={() => onToggleStatus(user)}
          aria-label={`${user.name || "Kullanıcı"} hesap durumunu değiştir`}
          title={
            user.status === "Aktif"
              ? "Kullanıcı hesabını pasif yap"
              : "Kullanıcı hesabını aktifleştir"
          }
          disabled={isSaving}
        >
          <Power size={16} />
        </button>
      )}

      {showApartmentActions && (
        <button
          type="button"
          className="danger-table-button"
          onClick={() => onDelete(user)}
          aria-label={`${user.name || "Kullanıcı"} daire bağlantısını kaldır`}
          title={
            requiresPassiveBeforeDelete
              ? "Önce sakin hesabını pasif yapın."
              : "Yalnızca bu daire bağlantısını kaldır"
          }
          disabled={isSaving || requiresPassiveBeforeDelete}
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

function UserRow({
  user,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
  isSaving,
  isChild = false,
  showAccountAction = true,
  showApartmentActions = true,
}) {
  const statusClass = getUserStatusClass(user.status);

  return (
    <tr className={isChild ? "multi-apartment-child-row" : undefined}>
      <td>
        <div
          className={`table-user-main ${
            isChild ? "multi-apartment-child-indent" : ""
          }`}
        >
          <strong>{isChild ? "Daire bağlantısı" : user.name || "-"}</strong>
          <span>{isChild ? user.site || "-" : user.email || "-"}</span>
          <span>{isChild ? user.createdAt || "-" : user.phone || "-"}</span>
        </div>
      </td>

      <td>
        <span className="table-role-badge">{user.role || "-"}</span>
      </td>

      <td>
        <div className="table-location">
          <strong>{user.site || "-"}</strong>
          <span>
            {user.block || "-"} / {user.apartment || "-"}
          </span>
        </div>
      </td>

      <td>{user.createdByManager || "-"}</td>
      <td>{user.totalDebt || "-"}</td>
      <td>{user.paidAmount || "-"}</td>

      <td>
        <strong>{user.remainingDebt || "-"}</strong>
      </td>

      <td>
        <span className={`table-status-badge ${statusClass}`}>
          {user.status || "-"}
        </span>
      </td>

      <td>
        <span className="table-payment-status">
          {user.paymentStatus || "-"}
        </span>
      </td>

      <td>
        <UserActions
          user={user}
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

function UserTable({
  users,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
  isSaving = false,
}) {
  const safeUsers = users || [];
  const [expandedOwnerIds, setExpandedOwnerIds] = useState([]);

  function toggleOwner(ownerId) {
    setExpandedOwnerIds((currentIds) =>
      currentIds.includes(ownerId)
        ? currentIds.filter((id) => id !== ownerId)
        : [...currentIds, ownerId]
    );
  }

  return (
    <section className="users-table-card">
      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>Ad Soyad</th>
              <th>Rol</th>
              <th>Site / Daire</th>
              <th>Ekleyen Yönetici</th>
              <th>Toplam Borç</th>
              <th>Ödenen</th>
              <th>Kalan</th>
              <th>Kullanıcı Durumu</th>
              <th>Ödeme Durumu</th>
              <th>İşlem</th>
            </tr>
          </thead>

          <tbody>
            {safeUsers.length > 0 ? (
              safeUsers.map((user) => {
                if (!user.isMultiApartmentOwner) {
                  return (
                    <UserRow
                      key={user.id}
                      user={user}
                      onView={onView}
                      onEdit={onEdit}
                      onToggleStatus={onToggleStatus}
                      onDelete={onDelete}
                      isSaving={isSaving}
                    />
                  );
                }

                const isExpanded = expandedOwnerIds.includes(user.id);
                const statusClass = getUserStatusClass(user.status);

                return (
                  <Fragment key={user.id}>
                    <tr className="multi-apartment-summary-row">
                      <td>
                        <div className="table-user-main">
                          <strong>{user.name || "-"}</strong>
                          <span>{user.email || "-"}</span>
                          <span>{user.phone || "-"}</span>
                        </div>
                      </td>

                      <td>
                        <span className="table-role-badge">
                          {user.role || "-"}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="multi-apartment-toggle"
                          onClick={() => toggleOwner(user.id)}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? (
                            <ChevronDown size={17} />
                          ) : (
                            <ChevronRight size={17} />
                          )}

                          <span>
                            <strong>{user.apartmentCount} Daire</strong>
                            <small>
                              {user.site} / {user.block}
                            </small>
                          </span>
                        </button>
                      </td>

                      <td>{user.createdByManager || "-"}</td>
                      <td>{user.totalDebt || "-"}</td>
                      <td>{user.paidAmount || "-"}</td>

                      <td>
                        <strong>{user.remainingDebt || "-"}</strong>
                      </td>

                      <td>
                        <span
                          className={`table-status-badge ${statusClass}`}
                        >
                          {user.status || "-"}
                        </span>
                      </td>

                      <td>
                        <span className="table-payment-status">
                          {user.paymentStatus || "-"}
                        </span>
                      </td>

                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            onClick={() => onView(user)}
                            aria-label={`${user.name} toplam detayını görüntüle`}
                            disabled={isSaving}
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => onToggleStatus(user)}
                            aria-label={`${user.name} hesap durumunu değiştir`}
                            title="Bu işlem kullanıcı hesabının tamamını etkiler."
                            disabled={isSaving}
                          >
                            <Power size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleOwner(user.id)}
                            aria-label={`${user.name} dairelerini ${
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
                      user.apartmentRows.map((apartmentRow) => (
                        <UserRow
                          key={apartmentRow.id}
                          user={apartmentRow}
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
                  Arama kriterlerine uygun kullanıcı bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default UserTable;
