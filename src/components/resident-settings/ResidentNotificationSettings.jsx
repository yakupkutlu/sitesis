import { Bell, Mail, MessageSquareText } from "lucide-react";

const notificationOptions = [
  {
    name: "smsEnabled",
    title: "SMS Bilgilendirme",
    description: "Aidat ve talep durumlarında SMS almak istiyorum.",
    icon: MessageSquareText,
  },
  {
    name: "emailEnabled",
    title: "E-posta Bilgilendirme",
    description: "Duyuru ve ödeme süreçlerinde e-posta almak istiyorum.",
    icon: Mail,
  },
  {
    name: "requestStatusNotify",
    title: "Talep Durumu Bildirimi",
    description: "Talebimin durumu değişince bilgilendirme almak istiyorum.",
    icon: Bell,
  },
];

function ResidentNotificationSettings({ notificationData, onToggleChange }) {
  return (
    <section className="resident-settings-card">
      <div className="resident-settings-card-header">
        <div>
          <span className="section-kicker">Bildirimler</span>

          <h3>Bildirim Tercihleri</h3>

          <p>
            Aidat, duyuru, dekont ve talep süreçlerinde nasıl bilgilendirilmek
            istediğinizi seçebilirsiniz.
          </p>
        </div>

        <div className="resident-settings-card-icon">
          <Bell size={22} />
        </div>
      </div>

      <div className="resident-settings-toggle-list">
        {notificationOptions.map((option) => {
          const Icon = option.icon;

          return (
            <label key={option.name}>
              <div>
                <Icon size={19} />

                <div>
                  <span>{option.title}</span>
                  <small>{option.description}</small>
                </div>
              </div>

              <input
                type="checkbox"
                name={option.name}
                checked={Boolean(notificationData[option.name])}
                onChange={onToggleChange}
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}

export default ResidentNotificationSettings;