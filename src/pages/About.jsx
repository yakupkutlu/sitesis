import {
  Building2,
  CheckCircle2,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";

const aboutCards = [
  {
    icon: LayoutDashboard,
    title: "Kolay Yönetim",
    text: "Aidat, ödeme, duyuru, talep, daire ve sakin işlemleri tek yerden sade bir şekilde yönetilir.",
  },
  {
    icon: ShieldCheck,
    title: "Güvenli Kullanım",
    text: "Kullanıcılar yalnızca kendi yetkilerine uygun alanları görür ve işlemler kontrollü şekilde yürütülür.",
  },
  {
    icon: Users,
    title: "Kullanıcı Dostu Deneyim",
    text: "Yönetici ve sakin ekranları anlaşılır, düzenli ve hızlı işlem yapılabilecek şekilde hazırlanır.",
  },
];

const missionItems = [
  "Aidat ve ödeme takibini kolaylaştırmak",
  "Daire sahibi ve kiracı bilgilerini düzenli tutmak",
  "Banka dekontu ve ödeme süreçlerini hızlandırmak",
  "Duyuru ve talepleri tek merkezden yönetmek",
];

function About() {
  return (
    <section className="about-page">
      <div className="container page-hero about-hero">
        <div>
          <span className="badge">Hakkımızda</span>

          <h1>Konut yönetimini daha düzenli, hızlı ve güvenli hale getiriyoruz.</h1>

          <p>
            Konut Yönetim Platformu; apartman, site ve rezidans yönetimlerinde
            günlük işleri sadeleştirmek, yöneticilerin iş yükünü azaltmak ve
            sakinlerin bilgilere kolayca ulaşmasını sağlamak için tasarlanmıştır.
          </p>
        </div>

        <div className="about-summary-card">
          <Building2 size={34} />

          <h3>Tek yerden yönetim</h3>

          <p>
            Site, apartman, blok ve daire süreçlerini daha düzenli takip etmeye
            yardımcı olan modern bir yönetim deneyimi.
          </p>
        </div>
      </div>

      <div className="container about-grid">
        {aboutCards.map((card) => {
          const Icon = card.icon;

          return (
            <article className="about-card" key={card.title}>
              <Icon size={28} />

              <h3>{card.title}</h3>

              <p>{card.text}</p>
            </article>
          );
        })}
      </div>

      <div className="container about-mission">
        <div>
          <span className="section-kicker">Amacımız</span>

          <h2>Gerçek yönetim ihtiyaçlarına uygun dijital çözüm sunmak.</h2>

          <p>
            Amacımız; apartman ve site yönetimindeki günlük süreçleri daha
            kontrollü, takip edilebilir ve güvenilir hale getirmektir.
          </p>
        </div>

        <div className="mission-list">
          {missionItems.map((item) => (
            <div key={item}>
              <CheckCircle2 size={20} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default About;