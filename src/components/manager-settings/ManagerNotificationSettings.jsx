import { Bell, Mail, MessageSquare, Save } from "lucide-react";

const notificationOptions = [
  {
    name: "smsEnabled",
    title: "SMS Bildirimleri",
    description: "Sakinlere SMS ile bilgilendirme gönderimi.",
    icon: MessageSquare,
  },
  {
    name: "emailEnabled",
    title: "E-posta Bildirimleri",
    description: "Sakinlere e-posta ile bilgilendirme gönderimi.",
    icon: Mail,
  },
  {
    name: "requestStatusNotify",
    title: "Talep Durumu Bildirimi",
    description: "Talep güncellendiğinde sakine bilgi gönderimi.",
    icon: Bell,
  },
];

function ManagerNotificationSettings({
  notificationData,
  onNotificationChange,
  onSaveNotifications,
}) {
  return (
    <section className="manager-settings-card">
      <div className="manager-settings-card-header">
        <div>
          <span className="section-kicker">Bildirimler</span>

          <h3>Bildirim Tercihleri</h3>

          <p>
            Duyuru, ödeme ve talep işlemlerinde hangi bilgilendirmelerin aktif
            olacağını belirleyebilirsiniz.
          </p>
        </div>

        <div className="manager-settings-card-icon">
          <Bell size={22} />
        </div>
      </div>

      <form className="manager-settings-form" onSubmit={onSaveNotifications}>
        <div className="manager-settings-toggle-list">
          {notificationOptions.map((option) => {
            const Icon = option.icon;

            return (
              <label key={option.name}>
                <div>
                  <Icon size={18} />

                  <div>
                    <span>{option.title}</span>
                    <small>{option.description}</small>
                  </div>
                </div>

                <input
                  type="checkbox"
                  name={option.name}
                  checked={Boolean(notificationData[option.name])}
                  onChange={onNotificationChange}
                />
              </label>
            );
          })}
        </div>

        <div className="form-actions">
          <button type="submit" className="dashboard-action-button">
            <Save size={18} />
            Bildirimleri Kaydet
          </button>
        </div>
      </form>
    </section>
  );
}

export default ManagerNotificationSettings;