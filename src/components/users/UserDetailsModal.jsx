import { X } from "lucide-react";

function UserDetailsModal({ user, onClose }) {
  if (!user) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <section className="details-modal">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Kullanıcı Detayı</span>

            <h3>{user.name || "Kullanıcı Detayı"}</h3>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Kullanıcı detay penceresini kapat"
          >
            <X size={20} />
          </button>
        </div>

        <div className="details-list user-details-list">
          <div>
            <span>Rol</span>
            <strong>{user.role || "-"}</strong>
          </div>

          <div>
            <span>Durum</span>
            <strong>{user.status || "-"}</strong>
          </div>

          <div>
            <span>E-posta</span>
            <strong>{user.email || "-"}</strong>
          </div>

          <div>
            <span>Telefon</span>
            <strong>{user.phone || "-"}</strong>
          </div>

          <div>
            <span>Site</span>
            <strong>{user.site || "-"}</strong>
          </div>

          <div>
            <span>Blok / Apartman</span>
            <strong>{user.block || "-"}</strong>
          </div>

          <div>
            <span>Daire</span>
            <strong>{user.apartment || "-"}</strong>
          </div>

          <div>
            <span>Ekleyen Yönetici</span>
            <strong>{user.createdByManager || "-"}</strong>
          </div>

          <div>
            <span>Kayıt Tarihi</span>
            <strong>{user.createdAt || "-"}</strong>
          </div>

          <div>
            <span>Son Ödeme Durumu</span>
            <strong>{user.paymentStatus || "-"}</strong>
          </div>
        </div>

        {user.owner && (
          <div className="details-description">
            <span>Ev Sahibi Bilgileri</span>

            <div className="user-payment-detail-grid">
              <div>
                <span>Ad Soyad</span>
                <strong>{user.owner.name}</strong>
              </div>

              <div>
                <span>Hesap Durumu</span>
                <strong>{user.owner.status}</strong>
              </div>

              <div>
                <span>E-posta</span>
                <strong>{user.owner.email}</strong>
              </div>

              <div>
                <span>Telefon</span>
                <strong>{user.owner.phone}</strong>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default UserDetailsModal;