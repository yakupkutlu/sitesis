import {
  BookOpenText,
  CircleHelp,
  FileText,
  Mail,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

const legalLinks = [
  {
    label: "KVKK Aydınlatma Metni",
    path: "/kvkk",
    icon: ShieldCheck,
  },
  {
    label: "Mevzuat",
    path: "/mevzuat",
    icon: Scale,
  },
  {
    label: "SSS - Sık Sorulan Sorular",
    path: "/sss",
    icon: CircleHelp,
  },
  {
    label: "Kullanım Kataloğu",
    path: "/kullanim-katalogu",
    icon: BookOpenText,
  },
];

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="public-footer">
      <div className="container public-footer-grid">
        <section
          className="public-footer-column public-footer-links"
          aria-labelledby="footer-information-title"
        >
          <span className="public-footer-kicker">Bilgilendirme</span>

          <h2 id="footer-information-title">
            Yasal ve yardımcı içerikler
          </h2>

          <nav aria-label="Alt bilgi bağlantıları">
            {legalLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link to={item.path} key={item.path}>
                  <Icon size={17} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </section>

        <div
          className="public-footer-column public-footer-empty-column"
          aria-hidden="true"
        />

        <section
          className="public-footer-column public-footer-contact"
          aria-labelledby="footer-contact-title"
        >
          <span className="public-footer-kicker">Destek</span>

          <h2 id="footer-contact-title">İletişim Bilgileri</h2>

          <div className="public-footer-contact-card">
            <Mail size={19} />

            <div>
              <strong>Bizimle iletişime geçin</strong>
              <p>
                E-posta, telefon ve adres bilgilerine iletişim
                sayfasından ulaşabilirsiniz.
              </p>
            </div>
          </div>

          <Link to="/contact" className="public-footer-contact-link">
            <FileText size={17} />
            İletişim Sayfasına Git
          </Link>
        </section>
      </div>

      <div className="public-footer-bottom">
        <div className="container public-footer-bottom-content">
          <p>
            © {currentYear} Konut Yönetim Sistemi. Tüm hakları
            saklıdır.
          </p>

          <p>
            Apartman, site ve rezidans yönetimi için modern çözüm.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;