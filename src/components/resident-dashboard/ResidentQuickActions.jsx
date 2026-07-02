import { Bell, CreditCard, MessageSquarePlus, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";

function ResidentQuickActions() {
  const actions = [
    {
      label: "Aidatları Gör",
      path: "/resident/payments",
      icon: CreditCard,
    },
    {
      label: "Dekont Yükle",
      path: "/resident/receipts",
      icon: UploadCloud,
    },
    {
      label: "Talep Oluştur",
      path: "/resident/requests",
      icon: MessageSquarePlus,
    },
    {
      label: "Duyuruları Gör",
      path: "/resident/announcements",
      icon: Bell,
    },
  ];

  return (
    <section className="resident-dashboard-card">
      <div className="resident-card-header">
        <div>
          <span className="section-kicker">Hızlı İşlemler</span>
          <h3>Ne yapmak istiyorsunuz?</h3>
        </div>
      </div>

      <div className="resident-quick-actions">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link to={action.path} key={action.path}>
              <Icon size={19} />
              <span>{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default ResidentQuickActions;