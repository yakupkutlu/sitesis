import { Building2, Home, Layers3, UserRound } from "lucide-react";

function ResidentApartmentInfo({ apartmentInfo }) {
  const items = [
    {
      label: "Site",
      value: apartmentInfo?.siteName,
      icon: Building2,
    },
    {
      label: "Blok / Apartman",
      value: apartmentInfo?.blockName,
      icon: Layers3,
    },
    {
      label: "Daire",
      value: apartmentInfo
        ? `Daire ${apartmentInfo.apartmentNumber}${
            apartmentInfo.floor !== null
              ? ` / Kat ${apartmentInfo.floor}`
              : ""
          }`
        : null,
      icon: Home,
    },
    {
      label: "Kayıt Tipi",
      value: apartmentInfo?.residentType,
      icon: UserRound,
    },
  ];

  return (
    <section className="resident-settings-card">
      <div className="resident-settings-card-header">
        <div>
          <span className="section-kicker">Aktif Daire</span>

          <h3>Aktif Daire Bilgileri</h3>

          <p>
            Bu bilgiler üst bardan seçtiğiniz aktif daireye göre otomatik
            olarak değişir.
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
          Profil, şifre ve görünüm ayarları kullanıcı hesabına aittir ve tüm
          dairelerde aynıdır. Yalnızca bu daire bilgileri aktif seçime göre
          değişir.
        </p>
      </div>
    </section>
  );
}

export default ResidentApartmentInfo;
