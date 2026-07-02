import { Building2, Home, ShieldCheck } from "lucide-react";

function ManagerAreaSettings({ areaData }) {
  const areaItems = [
    {
      label: "Yönetim Tipi",
      value: areaData.managementType,
      icon: Building2,
    },
    {
      label: "Alan Adı",
      value: areaData.areaName,
      icon: Home,
    },
    {
      label: "Blok Sayısı",
      value: areaData.blockCount,
    },
    {
      label: "Daire Sayısı",
      value: areaData.apartmentCount,
    },
  ];

  return (
    <section className="manager-settings-card">
      <div className="manager-settings-card-header">
        <div>
          <span className="section-kicker">Yetki Alanı</span>

          <h3>Yönetim Alanı</h3>

          <p>
            Sorumlu olduğunuz site, blok ve daire kapsamı bu alanda
            görüntülenir.
          </p>
        </div>

        <div className="manager-settings-card-icon">
          <ShieldCheck size={22} />
        </div>
      </div>

      <div className="manager-area-info-grid">
        {areaItems.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label}>
              {Icon && <Icon size={18} />}

              <span>{item.label}</span>

              <strong>{item.value || "Tanımlanmamış"}</strong>
            </div>
          );
        })}
      </div>

      <div className="manager-area-note">
        <strong>Yetki Notu</strong>

        <p>
          Bu bilgiler yönetici tarafından değiştirilemez. Yetki kapsamı Süper
          Admin tarafından belirlenir.
        </p>
      </div>
    </section>
  );
}

export default ManagerAreaSettings;