import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  FileCheck2,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

const heroTrustItems = [
  "Rol bazlı erişim",
  "Güvenli ödeme takibi",
  "Kolay kullanım",
];

const mainFeatures = [
  {
    icon: ReceiptText,
    title: "Aidat ve Ödeme Takibi",
    text: "Borçlar, tahsilatlar ve ödeme geçmişi tek ekrandan takip edilir.",
  },
  {
    icon: FileCheck2,
    title: "Banka Dekont Upload",
    text: "Havale/EFT dekontları sisteme yüklenir ve ödeme kaydına çevrilir.",
  },
  {
    icon: Bell,
    title: "SMS ve E-posta Bildirimi",
    text: "Aidat, ödeme, duyuru ve talep süreçlerinde sakinler bilgilendirilir.",
  },
  {
    icon: ShieldCheck,
    title: "Rol Bazlı Güvenlik",
    text: "Süper admin, yönetici ve sakin ekranları ayrı yetkilerle çalışır.",
  },
];

const stats = [
  {
    value: "3",
    label: "Kullanıcı Rolü",
  },
  {
    value: "9+",
    label: "Yönetim Modülü",
  },
  {
    value: "24/7",
    label: "Online Takip",
  },
];

const dashboardStats = [
  {
    label: "Toplam Daire",
    value: "128",
    colorClass: "blue",
  },
  {
    label: "Tahsilat",
    value: "₺84.500",
    colorClass: "green",
  },
  {
    label: "Açık Talep",
    value: "24",
    colorClass: "orange",
  },
  {
    label: "Bekleyen Dekont",
    value: "12",
    colorClass: "purple",
  },
];

const dashboardTimeline = [
  {
    icon: FileCheck2,
    text: "Banka dekontu eşleşme için hazır",
  },
  {
    icon: MessageSquareText,
    text: "Yeni arıza talebi oluşturuldu",
  },
  {
    icon: Users,
    text: "Yeni sakin kaydı eklendi",
  },
];

const processSteps = [
  {
    number: "01",
    title: "Site veya apartman oluşturulur",
    text: "Bloklar, daireler ve yönetici bilgileri sisteme eklenir.",
  },
  {
    number: "02",
    title: "Aidat ve duyurular yönetilir",
    text: "Ödeme, duyuru ve talep süreçleri tek panelden takip edilir.",
  },
  {
    number: "03",
    title: "Sakinler kolayca takip eder",
    text: "Sakinler borçlarını, duyuruları ve taleplerini görüntüler.",
  },
];

function Home() {
  return (
    <section className="home-page">
      <div className="home-hero-bg">
        <div className="container new-hero">
          <div className="new-hero-text">
            <span className="badge hero-badge">
              <Sparkles size={16} />
              Modern Konut Yönetim Platformu
            </span>

            <h1>
              Apartman ve site yönetimini daha kolay, güvenli ve düzenli hale
              getirin.
            </h1>

            <p>
              Aidat, ödeme, duyuru, talep, daire yönetimi, banka dekontu,
              SMS/e-posta ve raporlama işlemlerini tek modern panel üzerinden
              yönetin.
            </p>

            <div className="hero-actions">
              <Link to="/login" className="primary-button hero-main-btn">
                Giriş Yap
                <ArrowRight size={18} />
              </Link>

              <Link to="/features" className="secondary-button">
                Özellikleri İncele
              </Link>
            </div>

            <div className="hero-trust">
              {heroTrustItems.map((item) => (
                <div key={item}>
                  <CheckCircle2 size={18} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="new-hero-visual">
            <div className="floating-card floating-card-top">
              <Bell size={20} />

              <div>
                <strong>Yeni duyuru</strong>
                <span>Site sakinlerine gönderildi</span>
              </div>
            </div>

            <div className="main-dashboard-card">
              <div className="dashboard-top">
                <div>
                  <span>Yönetici Paneli</span>
                  <h3>Genel Durum</h3>
                </div>

                <div className="status-pill">Aktif</div>
              </div>

              <div className="dashboard-stat-grid">
                {dashboardStats.map((item) => (
                  <div
                    className={`dash-stat ${item.colorClass}`}
                    key={item.label}
                  >
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>

              <div className="dashboard-progress">
                <div className="progress-head">
                  <span>Aylık ödeme durumu</span>
                  <strong>76%</strong>
                </div>

                <div className="progress-bar">
                  <span />
                </div>
              </div>

              <div className="dashboard-timeline">
                {dashboardTimeline.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.text}>
                      <Icon size={18} />
                      <p>{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="floating-card floating-card-bottom">
              <ShieldCheck size={20} />

              <div>
                <strong>Güvenli erişim</strong>
                <span>Rol bazlı panel yapısı</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container stats-row">
        {stats.map((item) => (
          <div className="stat-box" key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="container section">
        <div className="section-title center-title">
          <span>Temel Özellikler</span>

          <h2>Yönetim sürecini sadeleştiren güçlü modüller</h2>

          <p>
            Günlük apartman ve site yönetim işlemleri sade, hızlı ve anlaşılır
            ekranlarla yönetilir.
          </p>
        </div>

        <div className="features-grid">
          {mainFeatures.map((feature) => {
            const Icon = feature.icon;

            return (
              <article className="feature-card" key={feature.title}>
                <Icon />
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            );
          })}
        </div>
      </div>

      <div className="container home-process">
        <div className="process-text">
          <span className="section-kicker">Nasıl Çalışır?</span>

          <h2>Yönetici ve sakinler için sade bir kullanım akışı.</h2>

          <p>
            Sistem, karmaşık yönetim işlemlerini basit adımlara böler. Yönetici
            işlemleri oluşturur, sakinler kendi bilgilerini takip eder.
          </p>
        </div>

        <div className="process-steps">
          {processSteps.map((step) => (
            <div key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="container home-cta">
        <div>
          <Building2 size={38} />

          <h2>Konut yönetimini dijitalleştirmeye hazır mısınız?</h2>

          <p>
            Modern, güvenli ve kullanıcı dostu bir sistemle yönetim süreçlerini
            daha düzenli hale getirin.
          </p>
        </div>

        <Link to="/login" className="primary-button">
          Panele Giriş Yap
        </Link>
      </div>
    </section>
  );
}

export default Home;