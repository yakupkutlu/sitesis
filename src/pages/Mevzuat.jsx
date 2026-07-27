import {
  BookOpenText,
  Building2,
  CalendarDays,
  FileText,
  Landmark,
  Scale,
  ShieldCheck,
} from "lucide-react";

const lawSections = [
  {
    number: "01",
    title: "Genel Hükümler",
    description:
      "Kat mülkiyeti, kat irtifakı, bağımsız bölüm, eklenti, ortak yer ve arsa payı gibi temel kavramların çerçevesi açıklanır.",
    topics: [
      "Kat mülkiyeti ve kat irtifakı",
      "Temel tanımlar",
      "Ortak yerler",
      "Bağımsız bölüm ve arsa payı bağlantısı",
    ],
  },
  {
    number: "02",
    title: "Kat Mülkiyetinin ve Kat İrtifakının Kurulması",
    description:
      "Kat mülkiyeti ile kat irtifakının kurulması, tapu siciline tescil ve gerekli belgelerle ilgili esaslar ele alınır.",
    topics: [
      "Resmî senet ve tescil",
      "Kat mülkiyeti kütüğü",
      "Gerekli belgeler",
      "Sözleşme ve yönetim planı",
    ],
  },
  {
    number: "03",
    title: "Kat Maliklerinin Hakları",
    description:
      "Kat maliklerinin bağımsız bölümler, eklentiler ve ortak alanlar üzerindeki yararlanma hakları açıklanır.",
    topics: [
      "Bağımsız bölüm üzerindeki haklar",
      "Ortak yerlerden yararlanma",
      "Eklentilerin kullanımı",
    ],
  },
  {
    number: "04",
    title: "Kat Maliklerinin Borçları",
    description:
      "Bağımsız bölümün kullanımı, ortak giderlere katılım, bakım, koruma ve komşuluk düzenine ilişkin yükümlülükler özetlenir.",
    topics: [
      "Genel kurallara uyma",
      "Ortak giderlere katılma",
      "Bakım ve onarım yükümlülükleri",
      "Zarar vermeme sorumluluğu",
    ],
  },
  {
    number: "05",
    title: "Ana Gayrimenkulün Yönetimi",
    description:
      "Kat malikleri kurulu, yönetici, işletme projesi, toplantı ve karar süreçlerinin genel yapısı açıklanır.",
    topics: [
      "Kat malikleri kurulu",
      "Toplantı ve karar düzeni",
      "Yönetici ve görevleri",
      "İşletme projesi ve denetim",
    ],
  },
  {
    number: "06",
    title: "Yenilikler ve İlaveler",
    description:
      "Ana gayrimenkulde yapılacak faydalı, zorunlu veya önemli değişikliklerle ilgili genel esaslar ele alınır.",
    topics: [
      "Faydalı yenilikler",
      "Zorunlu bakım çalışmaları",
      "Ortak alan değişiklikleri",
    ],
  },
  {
    number: "07",
    title: "Kat Mülkiyetinin Sona Ermesi",
    description:
      "Kat mülkiyeti kaydının sona ermesi ve yapının kullanılamaz hâle gelmesi gibi durumlara ilişkin çerçeve sunulur.",
    topics: [
      "Kayıtla sona erme",
      "Ana yapının harap olması",
      "Bildirim ve tescil işlemleri",
    ],
  },
  {
    number: "08",
    title: "Toplu Yapılar ve Diğer Hükümler",
    description:
      "Birden fazla yapıdan oluşan yerleşimlerde yönetim, ortak alanlar ve temsil düzenine ilişkin genel başlıklar yer alır.",
    topics: [
      "Toplu yapı yönetimi",
      "Ortak sosyal ve teknik alanlar",
      "Temsil ve yönetim planı",
    ],
  },
];

const quickTopics = [
  {
    icon: Building2,
    title: "Bağımsız Bölüm",
    text: "Daire, dükkân, ofis veya benzeri, başlı başına kullanılmaya elverişli bölümleri ifade eder.",
  },
  {
    icon: Landmark,
    title: "Ortak Yer",
    text: "Binanın korunması, ortak kullanımı veya yararlanılması için ayrılan alanları kapsar.",
  },
  {
    icon: Scale,
    title: "Yönetim Planı",
    text: "Ana gayrimenkulün yönetim biçimini ve kullanım esaslarını düzenleyen temel belgedir.",
  },
];

function Mevzuat() {
  return (
    <main className="legislation-page">
      <section className="legislation-hero">
        <div className="container legislation-hero-content">
          <span className="badge legislation-badge">
            <Scale size={17} />
            Yasal Bilgilendirme
          </span>

          <h1>Mevzuat</h1>

          <p>
            Apartman, site ve toplu yapı yönetiminde temel alınan 634
            Sayılı Kat Mülkiyeti Kanunu hakkında sade ve düzenli bir
            bilgilendirme alanı.
          </p>
        </div>
      </section>

      <section className="container legislation-content">
        <div className="legislation-law-header">
          <div className="legislation-law-title">
            <div className="legislation-law-icon">
              <BookOpenText size={28} />
            </div>

            <div>
              <span className="section-kicker">Temel Kanun</span>
              <h2>634 Sayılı Kat Mülkiyeti Kanunu</h2>
              <p>
                Kat mülkiyeti, ortak alanlar, kat maliklerinin hak ve
                yükümlülükleri ile yönetim süreçlerinin temel çerçevesini
                düzenler.
              </p>
            </div>
          </div>

          <div className="legislation-meta-grid">
            <article>
              <FileText size={20} />
              <span>Kanun Numarası</span>
              <strong>634</strong>
            </article>

            <article>
              <CalendarDays size={20} />
              <span>Kabul Tarihi</span>
              <strong>23.06.1965</strong>
            </article>

            <article>
              <Landmark size={20} />
              <span>Resmî Gazete</span>
              <strong>02.07.1965 / 12038</strong>
            </article>
          </div>
        </div>

        <aside className="legislation-notice">
          <ShieldCheck size={22} />

          <div>
            <strong>Bilgilendirme notu</strong>
            <p>
              Bu sayfa genel bilgilendirme amacıyla hazırlanmıştır ve
              hukuki danışmanlık niteliği taşımaz. Uygulama öncesinde
              güncel resmî mevzuat metni kontrol edilmelidir.
            </p>
          </div>
        </aside>

        <div className="legislation-quick-grid">
          {quickTopics.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.title}>
                <Icon size={22} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>

        <div className="legislation-section-heading">
          <span className="section-kicker">Kanun Yapısı</span>
          <h2>Bölümler ve temel konular</h2>
          <p>
            Uzun mevzuat metni, okunması ve bulunması kolay başlıklar
            altında düzenlenmiştir.
          </p>
        </div>

        <div className="legislation-sections">
          {lawSections.map((section) => (
            <article className="legislation-section-card" key={section.number}>
              <div className="legislation-section-number">
                {section.number}
              </div>

              <div className="legislation-section-body">
                <h3>{section.title}</h3>
                <p>{section.description}</p>

                <ul>
                  {section.topics.map((topic) => (
                    <li key={topic}>{topic}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>

        <div className="legislation-source-card">
          <BookOpenText size={24} />

          <div>
            <h2>Güncel metin kontrolü</h2>
            <p>
              Kanunlarda zaman içinde değişiklik yapılabilir. Resmî işlem
              veya hukuki değerlendirme öncesinde Türkiye Cumhuriyeti
              Mevzuat Bilgi Sistemi üzerinden güncel metin
              doğrulanmalıdır.
            </p>
          </div>

          <a
              href="https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=634&MevzuatTur=1&MevzuatTertip=5"
              target="_blank"
              rel="noopener noreferrer"
              className="primary-button"
            >
            Resmî Kaynağa Git
          </a>
        </div>
      </section>
    </main>
  );
}

export default Mevzuat;