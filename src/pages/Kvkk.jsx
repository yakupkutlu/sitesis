import {
  Building2,
  Database,
  FileCheck2,
  FileText,
  KeyRound,
  Mail,
  Scale,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

const dataCategories = [
  {
    icon: UserCheck,
    title: "Kimlik ve İletişim Bilgileri",
    text: "Ad, soyad, e-posta adresi, telefon numarası ve kullanıcı hesabıyla ilişkili temel bilgiler.",
  },
  {
    icon: Building2,
    title: "Site ve Daire Bilgileri",
    text: "Kullanıcının bağlı olduğu site, blok, daire, sakinlik türü ve yönetim kapsamı bilgileri.",
  },
  {
    icon: FileCheck2,
    title: "Finansal İşlem Kayıtları",
    text: "Aidat, ödeme, tahsilat, bakiye, banka dekontu ve ödeme durumu kayıtları.",
  },
  {
    icon: Database,
    title: "Talep ve İletişim Kayıtları",
    text: "Duyuru, sakin talebi, iletişim formu, bildirim ve destek süreçlerinde oluşan kayıtlar.",
  },
  {
    icon: KeyRound,
    title: "İşlem Güvenliği Bilgileri",
    text: "Oturum, yetkilendirme, güvenlik, denetim ve sistem hareketlerine ilişkin teknik kayıtlar.",
  },
];

const purposes = [
  "Kullanıcı hesabının oluşturulması ve güvenli şekilde yönetilmesi",
  "Site, blok, daire ve sakin ilişkilerinin yürütülmesi",
  "Aidat, ödeme, dekont ve muhasebe süreçlerinin takip edilmesi",
  "Duyuru, talep, SMS ve e-posta bildirimlerinin yürütülmesi",
  "Yetkisiz erişimin önlenmesi ve sistem güvenliğinin sağlanması",
  "Hukuki yükümlülüklerin yerine getirilmesi ve uyuşmazlıkların yönetilmesi",
];

const rights = [
  "Kişisel verilerinizin işlenip işlenmediğini öğrenme",
  "İşlenmişse buna ilişkin bilgi talep etme",
  "İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme",
  "Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme",
  "Eksik veya yanlış işlenen verilerin düzeltilmesini isteme",
  "Kanundaki şartlar oluştuğunda silinmesini veya yok edilmesini isteme",
  "Düzeltme, silme veya yok etme işlemlerinin aktarılan kişilere bildirilmesini isteme",
  "Münhasıran otomatik sistemler ile analiz sonucu aleyhe bir sonuca itiraz etme",
  "Kanuna aykırı işleme nedeniyle zarara uğranması hâlinde tazminat talep etme",
];

function Kvkk() {
  return (
    <main className="kvkk-page">
      <section className="kvkk-hero">
        <div className="container kvkk-hero-content">
          <span className="badge kvkk-badge">
            <ShieldCheck size={17} />
            Kişisel Verilerin Korunması
          </span>

          <h1>KVKK Aydınlatma Metni</h1>

          <p>
            Bu metin, Konut Yönetim Sistemi kapsamında işlenen kişisel
            veriler hakkında kullanıcıları genel olarak bilgilendirmek
            amacıyla hazırlanmıştır.
          </p>
        </div>
      </section>

      <section className="container kvkk-content">
        <aside className="kvkk-production-warning">
          <Scale size={23} />

          <div>
            <strong>Yayına alınmadan önce tamamlanmalıdır</strong>
            <p>
              Gerçek veri sorumlusunun ticari unvanı, adresi, iletişim
              bilgileri ve VERBİS durumu bu bölüme eklenmelidir. Bu
              bilgiler belirlenmeden metin kesin hukukî metin olarak
              kullanılmamalıdır.
            </p>
          </div>
        </aside>

        <section className="kvkk-intro-card">
          <div className="kvkk-intro-icon">
            <FileText size={28} />
          </div>

          <div>
            <span className="section-kicker">6698 Sayılı Kanun</span>
            <h2>Aydınlatmanın kapsamı</h2>
            <p>
              Kişisel verilerin elde edilmesi sırasında veri sorumlusu;
              kimliğini, verilerin hangi amaçla işlendiğini, kimlere ve
              hangi amaçla aktarılabileceğini, veri toplama yöntemini,
              hukukî sebebini ve ilgili kişinin haklarını açıklamalıdır.
            </p>
          </div>
        </section>

        <div className="kvkk-section-heading">
          <span className="section-kicker">Veri Kategorileri</span>
          <h2>Hangi bilgiler işlenebilir?</h2>
          <p>
            İşlenen veri kapsamı, kullanıcının rolüne ve sistemde
            kullandığı modüllere göre değişebilir.
          </p>
        </div>

        <div className="kvkk-data-grid">
          {dataCategories.map((item) => {
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

        <div className="kvkk-two-column">
          <section className="kvkk-detail-card">
            <div className="kvkk-card-title">
              <FileCheck2 size={22} />
              <h2>İşleme amaçları</h2>
            </div>

            <ul>
              {purposes.map((purpose) => (
                <li key={purpose}>{purpose}</li>
              ))}
            </ul>
          </section>

          <section className="kvkk-detail-card">
            <div className="kvkk-card-title">
              <Scale size={22} />
              <h2>Hukukî sebepler</h2>
            </div>

            <p>
              Kişisel veriler; sözleşmenin kurulması veya ifası, hukukî
              yükümlülüklerin yerine getirilmesi, bir hakkın tesisi,
              kullanılması veya korunması ve veri sorumlusunun meşru
              menfaatleri gibi Kanunda belirtilen hukukî sebeplere
              dayanılarak işlenebilir.
            </p>

            <p>
              Açık rıza yalnızca Kanun gereğince gerekli olan işlemlerde
              ayrıca ve özgür iradeyle alınır; aydınlatma metni açık rıza
              metni yerine kullanılmaz.
            </p>
          </section>

          <section className="kvkk-detail-card">
            <div className="kvkk-card-title">
              <Users size={22} />
              <h2>Verilerin aktarılması</h2>
            </div>

            <p>
              Veriler; yetkili kamu kurumları, hukukî ve malî
              danışmanlar, barındırma ve bilgi teknolojisi hizmet
              sağlayıcıları ile SMS veya e-posta hizmet sağlayıcılarına,
              yalnızca hizmetin gerektirdiği ölçüde aktarılabilir.
            </p>

            <p>
              Yurt dışına veri aktarımı söz konusu olduğunda Kanunun
              9. maddesi ve yürürlükteki ilgili düzenlemelere uygun
              yöntemler uygulanır.
            </p>
          </section>

          <section className="kvkk-detail-card">
            <div className="kvkk-card-title">
              <Database size={22} />
              <h2>Toplama yöntemi</h2>
            </div>

            <p>
              Veriler; kullanıcı formları, yönetici işlemleri, dosya ve
              dekont yüklemeleri, iletişim kanalları, sistem günlükleri
              ve hizmetin kullanımı sırasında otomatik veya kısmen
              otomatik yöntemlerle toplanabilir.
            </p>
          </section>
        </div>

        <section className="kvkk-rights-card">
          <div className="kvkk-rights-header">
            <ShieldCheck size={25} />

            <div>
              <span className="section-kicker">Kanunun 11. Maddesi</span>
              <h2>İlgili kişinin hakları</h2>
            </div>
          </div>

          <div className="kvkk-rights-grid">
            {rights.map((right, index) => (
              <div key={right}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{right}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="kvkk-application-card">
          <Mail size={25} />

          <div>
            <h2>Başvuru yöntemi</h2>
            <p>
              KVKK kapsamındaki talepler, kimlik doğrulamaya elverişli
              bilgi ve belgelerle birlikte veri sorumlusunun ilan
              edeceği resmî başvuru kanallarından iletilebilir.
              Yayın öncesinde yetkili e-posta, KEP veya posta adresi bu
              alana eklenmelidir.
            </p>
          </div>

          <Link to="/contact" className="primary-button">
            İletişim Sayfası
          </Link>
        </section>

        <p className="kvkk-update-note">
          Son güncelleme: 26.07.2026
        </p>
      </section>
    </main>
  );
}

export default Kvkk;