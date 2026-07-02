import {
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  FileCheck2,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";

const features = [
  {
    icon: ReceiptText,
    title: "Aidat ve Ödeme Takibi",
    text: "Aidat borçları, ödeme durumları ve geçmiş tahsilatlar düzenli şekilde takip edilir.",
  },
  {
    icon: Building2,
    title: "Site, Blok ve Daire Yönetimi",
    text: "Tek apartman veya site içindeki birden fazla blok yapısı kolayca yönetilebilir.",
  },
  {
    icon: Users,
    title: "Daire Sahibi ve Kiracı Yönetimi",
    text: "Her daire için ev sahibi ve kiracı bilgileri ayrı tutulur.",
  },
  {
    icon: FileCheck2,
    title: "Banka Dekont Upload",
    text: "Havale veya EFT sonrası yüklenen dekontlar ödeme kaydına dönüştürülür.",
  },
  {
    icon: BrainCircuit,
    title: "AI Destekli Dekont Okuma",
    text: "Dekonttan ad soyad, tutar, açıklama ve daire bilgisi okunarak eşleştirme önerilir.",
  },
  {
    icon: Bell,
    title: "SMS ve E-posta Bildirimleri",
    text: "Aidat, ödeme, duyuru ve talep işlemlerinde sakinlere bilgilendirme gönderilebilir.",
  },
  {
    icon: MessageSquareText,
    title: "Duyuru ve Talep Sistemi",
    text: "Yönetim duyuru yayınlayabilir, sakinler arıza veya istek talebi oluşturabilir.",
  },
  {
    icon: BarChart3,
    title: "Raporlama",
    text: "Borç, tahsilat, dekont, talep ve bildirim kullanımı raporlanabilir.",
  },
  {
    icon: ShieldCheck,
    title: "Rol Bazlı Güvenli Erişim",
    text: "Süper admin, yönetici ve sakin rolleri farklı yetkilerle çalışır.",
  },
];

function Features() {
  return (
    <section className="features-page">
      <div className="container page-hero">
        <span className="badge">Özellikler</span>

        <h1>Konut yönetimini kolaylaştıran tüm modüller tek sistemde.</h1>

        <p>
          Apartman, site ve rezidans yönetimindeki günlük işlemleri daha hızlı,
          güvenli ve düzenli hale getirmek için tasarlanmış modern özellikler.
        </p>
      </div>

      <div className="container features-detail-grid">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <article className="feature-detail-card" key={feature.title}>
              <div className="feature-detail-icon">
                <Icon size={26} />
              </div>

              <h3>{feature.title}</h3>

              <p>{feature.text}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default Features;