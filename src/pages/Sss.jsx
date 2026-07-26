import { useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  KeyRound,
  Mail,
  MessageSquareText,
  ReceiptText,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";

const faqGroups = [
  {
    id: "account",
    label: "Hesap ve Giriş",
    icon: KeyRound,
    items: [
      {
        question: "Sisteme nasıl giriş yapabilirim?",
        answer:
          "Giriş sayfasında kayıtlı e-posta adresinizi ve şifrenizi kullanabilirsiniz. Sistem, hesabınızdaki role göre sizi Süper Admin, Yönetici veya Sakin paneline yönlendirir.",
      },
      {
        question: "Şifremi unuttum, ne yapmalıyım?",
        answer:
          "Giriş sayfasındaki “Şifremi unuttum” bağlantısını kullanın. E-posta adresiniz sistemde kayıtlıysa güvenli bir şifre sıfırlama bağlantısı gönderilir.",
      },
      {
        question: "Birden fazla daireye bağlıysam ne olur?",
        answer:
          "Hesabınız birden fazla daireyle ilişkiliyse giriş sonrasında kullanmak istediğiniz daireyi seçebilirsiniz. Seçilen daireye ait borç, ödeme ve diğer bilgiler gösterilir.",
      },
    ],
  },
  {
    id: "payments",
    label: "Aidat ve Ödemeler",
    icon: WalletCards,
    items: [
      {
        question: "Aidat borcumu nereden görebilirim?",
        answer:
          "Sakin panelindeki “Aidat ve Ödemeler” bölümünden toplam borç, ödenen tutar, kalan tutar, fazla ödeme bakiyesi ve ödeme kayıtlarını görüntüleyebilirsiniz.",
      },
      {
        question: "Fazla ödeme bakiyesi nasıl kullanılır?",
        answer:
          "Onaylanan fazla ödeme bakiyesi, sistemde tanımlanan kurallara göre mevcut veya sonraki uygun borçlara otomatik olarak uygulanabilir. Kullanılan ve kalan bakiye panelde güncel olarak gösterilir.",
      },
      {
        question: "Ödeme durumum neden hemen değişmedi?",
        answer:
          "Banka dekontuyla yapılan ödemeler yönetici onayından geçebilir. Dekont onaylandığında veya ödeme kaydı sisteme işlendiğinde durum güncellenir.",
      },
    ],
  },
  {
    id: "receipts",
    label: "Dekont İşlemleri",
    icon: ReceiptText,
    items: [
      {
        question: "Hangi dekont dosyalarını yükleyebilirim?",
        answer:
          "Sistem yalnızca izin verilen güvenli dosya türlerini kabul eder. Desteklenen türler ve boyut sınırı, yükleme ekranında gösterilir.",
      },
      {
        question: "Dekontum neden bekliyor?",
        answer:
          "Yüklenen dekont, yönetici incelemesi veya ödeme kaydıyla eşleştirme bekliyor olabilir. İnceleme tamamlandığında durum “Onaylandı” veya “Reddedildi” olarak güncellenir.",
      },
      {
        question: "Yanlış dekont yükledim, ne yapmalıyım?",
        answer:
          "Dekont henüz onaylanmadıysa yöneticiyle iletişime geçerek yanlış kaydın incelenmesini isteyin. Güvenlik ve denetim nedeniyle onaylanan kayıtlar doğrudan değiştirilemeyebilir.",
      },
    ],
  },
  {
    id: "announcements",
    label: "Duyuru ve Bildirimler",
    icon: Bell,
    items: [
      {
        question: "Duyuruları nereden görebilirim?",
        answer:
          "Paneldeki “Duyurular” bölümünde size, dairenize, bloğunuza veya sitenize gönderilen duyuruları görebilirsiniz.",
      },
      {
        question: "SMS veya e-posta bildirimi neden gelmedi?",
        answer:
          "Telefon veya e-posta bilginiz eksik olabilir, bildirim sağlayıcısı geçici olarak kullanılamıyor olabilir ya da duyuru yalnızca panel içi yayınlanmış olabilir. Profil bilgilerinizi kontrol edin.",
      },
      {
        question: "Bildirim tercihlerimi değiştirebilir miyim?",
        answer:
          "Rolünüze ve sistem ayarlarına bağlı olarak bildirim tercihleri Ayarlar bölümünden yönetilebilir. Zorunlu hizmet ve güvenlik bildirimleri kapatılamayabilir.",
      },
    ],
  },
  {
    id: "requests",
    label: "Talep ve İletişim",
    icon: MessageSquareText,
    items: [
      {
        question: "Yeni bir talep nasıl oluşturabilirim?",
        answer:
          "Sakin panelindeki “Talepler” bölümünden konu, açıklama ve varsa ilgili dosyayı ekleyerek yeni talep oluşturabilirsiniz.",
      },
      {
        question: "Talebimin durumunu nasıl takip ederim?",
        answer:
          "Talep listesinde “Yeni”, “İnceleniyor”, “Çözüldü” veya “Reddedildi” gibi güncel durumları ve yönetici açıklamalarını görebilirsiniz.",
      },
      {
        question: "Genel iletişim için nereye yazabilirim?",
        answer:
          "Site dışı genel sorular için İletişim sayfasındaki formu kullanabilirsiniz. Site veya daireyle ilgili işlemler için panel içindeki Talep modülünü kullanmanız daha uygundur.",
      },
    ],
  },
  {
    id: "security",
    label: "Güvenlik ve Gizlilik",
    icon: ShieldCheck,
    items: [
      {
        question: "Bilgilerimi kimler görebilir?",
        answer:
          "Bilgiler yalnızca rol ve yetki kapsamına göre erişime açılır. Sakinler kendi ilişkili kayıtlarını, yöneticiler yalnızca yetkili oldukları alanları, Süper Admin ise sistem yönetimi kapsamındaki kayıtları görebilir.",
      },
      {
        question: "Kişisel verilerim nasıl korunur?",
        answer:
          "Erişim kontrolü, güvenli oturum, yetkilendirme, denetim kayıtları ve dosya doğrulama gibi teknik önlemler kullanılır. Ayrıntılı bilgi için KVKK Aydınlatma Metni sayfasını inceleyebilirsiniz.",
      },
      {
        question: "Şüpheli bir işlem görürsem ne yapmalıyım?",
        answer:
          "Hemen şifrenizi değiştirin ve yöneticiniz veya sistem sorumlusu ile iletişime geçin. Hesap bilgilerinizi ve şifrenizi hiç kimseyle paylaşmayın.",
      },
    ],
  },
];

function normalizeText(value) {
  return String(value ?? "").toLocaleLowerCase("tr-TR").trim();
}

function Sss() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");
  const [openItem, setOpenItem] = useState("account-0");

  const filteredGroups = useMemo(() => {
    const query = normalizeText(searchTerm);

    return faqGroups
      .filter((group) => activeGroup === "all" || group.id === activeGroup)
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (!query) return true;

          return normalizeText(
            `${group.label} ${item.question} ${item.answer}`
          ).includes(query);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [activeGroup, searchTerm]);

  function toggleItem(itemKey) {
    setOpenItem((current) => (current === itemKey ? null : itemKey));
  }

  return (
    <main className="faq-page">
      <section className="faq-hero">
        <div className="container faq-hero-content">
          <span className="badge faq-badge">
            <CircleHelp size={17} />
            Yardım Merkezi
          </span>

          <h1>Sık Sorulan Sorular</h1>

          <p>
            Konut Yönetim Sistemi, hesap işlemleri, aidat, dekont,
            duyuru, talep ve güvenlik konularındaki yaygın soruların
            cevaplarını burada bulabilirsiniz.
          </p>

          <label className="faq-search">
            <Search size={20} />

            <input
              type="search"
              value={searchTerm}
              placeholder="Bir soru veya konu arayın..."
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="container faq-content">
        <nav className="faq-category-list" aria-label="SSS kategorileri">
          <button
            type="button"
            className={activeGroup === "all" ? "active" : ""}
            onClick={() => setActiveGroup("all")}
          >
            <CircleHelp size={17} />
            Tümü
          </button>

          {faqGroups.map((group) => {
            const Icon = group.icon;

            return (
              <button
                type="button"
                key={group.id}
                className={activeGroup === group.id ? "active" : ""}
                onClick={() => setActiveGroup(group.id)}
              >
                <Icon size={17} />
                {group.label}
              </button>
            );
          })}
        </nav>

        {filteredGroups.length === 0 ? (
          <div className="faq-empty-state">
            <Search size={30} />
            <h2>Sonuç bulunamadı</h2>
            <p>
              Farklı bir kelimeyle arama yapın veya tüm kategorileri
              görüntüleyin.
            </p>
          </div>
        ) : (
          <div className="faq-groups">
            {filteredGroups.map((group) => {
              const GroupIcon = group.icon;

              return (
                <section className="faq-group" key={group.id}>
                  <div className="faq-group-header">
                    <span>
                      <GroupIcon size={21} />
                    </span>

                    <div>
                      <h2>{group.label}</h2>
                      <p>{group.items.length} soru</p>
                    </div>
                  </div>

                  <div className="faq-accordion">
                    {group.items.map((item, index) => {
                      const itemKey = `${group.id}-${index}`;
                      const isOpen = openItem === itemKey;

                      return (
                        <article
                          className={`faq-item ${isOpen ? "open" : ""}`}
                          key={item.question}
                        >
                          <button
                            type="button"
                            className="faq-question"
                            onClick={() => toggleItem(itemKey)}
                            aria-expanded={isOpen}
                          >
                            <span>{item.question}</span>
                            <ChevronDown size={20} />
                          </button>

                          {isOpen && (
                            <div className="faq-answer">
                              <p>{item.answer}</p>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <section className="faq-support-card">
          <Mail size={26} />

          <div>
            <h2>Aradığınız cevabı bulamadınız mı?</h2>
            <p>
              Genel sorularınız için iletişim sayfasını, site veya
              dairenizle ilgili işlemler için paneldeki Talep bölümünü
              kullanabilirsiniz.
            </p>
          </div>

          <Link to="/contact" className="primary-button">
            İletişime Geç
          </Link>
        </section>
      </section>
    </main>
  );
}

export default Sss;