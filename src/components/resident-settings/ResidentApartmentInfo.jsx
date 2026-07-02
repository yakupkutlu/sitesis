import { Building2, Home, MapPin, UserRound } from "lucide-react";

function ResidentApartmentInfo({ apartmentInfo }) {
  const items = [
    {
      label: "Site",
      value: apartmentInfo.siteName,
      icon: Building2,
    },
    {
      label: "Daire",
      value: apartmentInfo.apartment,
      icon: Home,
    },
    {
      label: "Adres",
      value: apartmentInfo.address,
      icon: MapPin,
    },
    {
      label: "Kayıt Tipi",
      value: apartmentInfo.residentType,
      icon: UserRound,
    },
  ];

  return (
    <section className="resident-settings-card">
      <div className="resident-settings-card-header">
        <div>
          <span className="section-kicker">Daire Bilgileri</span>

          <h3>Bağlı Olduğunuz Daire</h3>

          <p>
            Bu bilgiler yönetim tarafından tanımlanır. Değişiklik için yönetici
            ile iletişime geçebilirsiniz.
          </p>
        </div>
      </div>

      <div className="resident-apartment-info-grid">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label}>
              <Icon size={20} />

              <span>{item.label}</span>

              <strong>{item.value || "Tanımlanmamış"}</strong>
            </div>
          );
        })}
      </div>

      <div className="resident-apartment-note">
        <strong>Bilgilendirme</strong>

        <p>
          Daire, blok veya kayıt tipi bilgileri güvenlik nedeniyle sakin
          tarafından doğrudan değiştirilemez.
        </p>
      </div>
    </section>
  );
}

export default ResidentApartmentInfo;