import { Eye } from "lucide-react";

function getUserStatusClass(status) {
  if (status === "Aktif") {
    return "active";
  }

  if (status === "Onay Bekliyor") {
    return "pending";
  }

  return "passive";
}

function UserTable({ users, onView }) {
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
                      <button
                        type="button"
                        className="table-action-button"
                        onClick={() => onView(user)}
                        aria-label={`${user.name || "Kullanıcı"} detayını görüntüle`}
                      >
                        <Eye size={16} />
                        Detay
                      </button>
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