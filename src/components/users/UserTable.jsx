import { Edit, Eye, Power, Trash2 } from "lucide-react";

function getUserStatusClass(status) {
  if (status === "Aktif") {
    return "active";
  }

  if (status === "Onay Bekliyor") {
    return "pending";
  }

  return "passive";
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
                const statusClass = getUserStatusClass(user.status);

                return (
                  <tr key={user.id}>
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
                      <div className="table-actions">
                        <button
                          type="button"
                          onClick={() => onView(user)}
                          aria-label={`${user.name || "Kullanıcı"} detayını görüntüle`}
                          disabled={isSaving}
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => onEdit(user)}
                          aria-label={`${user.name || "Kullanıcı"} düzenle`}
                          disabled={isSaving}
                        >
                          <Edit size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleStatus(user)}
                          aria-label={`${user.name || "Kullanıcı"} durum değiştir`}
                          disabled={isSaving}
                        >
                          <Power size={16} />
                        </button>

                        <button
                          type="button"
                          className="danger-table-button"
                          onClick={() => onDelete(user)}
                          aria-label={`${user.name || "Kullanıcı"} daire bağlantısını kaldır`}
                          disabled={isSaving}
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
