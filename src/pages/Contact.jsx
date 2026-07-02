import {
  Clock3,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Send,
} from "lucide-react";

const contactItems = [
  {
    icon: Phone,
    title: "Telefon",
    text: "+90 555 000 00 00",
  },
  {
    icon: Mail,
    title: "E-posta",
    text: "info@konutyonetim.com",
  },
  {
    icon: MapPin,
    title: "Adres",
    text: "Türkiye / İstanbul",
  },
  {
    icon: Clock3,
    title: "Çalışma Saatleri",
    text: "Pazartesi - Cuma / 09:00 - 18:00",
  },
];

function Contact() {
  function handleSubmit(event) {
    event.preventDefault();

    alert("Mesajınız alınmıştır. En kısa sürede sizinle iletişime geçilecektir.");
  }

  return (
    <section className="contact-page">
      <div className="container page-hero contact-hero">
        <span className="badge">İletişim</span>

        <h1>Bizimle iletişime geçin.</h1>

        <p>
          Sorularınız, destek talepleriniz ve sistemle ilgili iletişim
          ihtiyaçlarınız için aşağıdaki formu kullanabilirsiniz.
        </p>
      </div>

      <div className="container contact-layout">
        <div className="contact-info">
          <div className="contact-intro-card">
            <MessageSquareText size={34} />

            <h2>Size nasıl yardımcı olabiliriz?</h2>

            <p>
              Apartman, site veya rezidans yönetiminiz için dijital çözüm
              arıyorsanız bizimle iletişime geçebilirsiniz.
            </p>
          </div>

          <div className="contact-info-grid">
            {contactItems.map((item) => {
              const Icon = item.icon;

              return (
                <article className="contact-info-card" key={item.title}>
                  <div className="contact-icon">
                    <Icon size={24} />
                  </div>

                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-header">
            <span className="section-kicker">Mesaj Gönder</span>

            <h2>Talebinizi bize iletin</h2>

            <p>
              Formu doldurduktan sonra ekibimiz sizinle en kısa sürede iletişime
              geçecektir.
            </p>
          </div>

          <label>
            Ad Soyad
            <input
              type="text"
              name="fullName"
              placeholder="Adınızı ve soyadınızı girin"
              required
            />
          </label>

          <label>
            E-posta
            <input
              type="email"
              name="email"
              placeholder="ornek@mail.com"
              required
            />
          </label>

          <label>
            Telefon
            <input type="tel" name="phone" placeholder="+90 5xx xxx xx xx" />
          </label>

          <label>
            Mesajınız
            <textarea
              name="message"
              rows="5"
              placeholder="Mesajınızı kısa ve açık şekilde yazın"
              required
            />
          </label>

          <button type="submit">
            <Send size={18} />
            Mesaj Gönder
          </button>
        </form>
      </div>
    </section>
  );
}

export default Contact;