import { useState } from "react";
import {
  Clock3,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Send,
} from "lucide-react";

import { createContactMessage } from "../api/contactMessagesApi";

const initialFormData = {
  fullName: "",
  email: "",
  phone: "",
  message: "",
};

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
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.fullName.trim()) {
      setErrorMessage("Ad soyad zorunludur.");
      setSuccessMessage("");
      return;
    }

    if (!formData.email.trim()) {
      setErrorMessage("E-posta zorunludur.");
      setSuccessMessage("");
      return;
    }

    if (!formData.message.trim()) {
      setErrorMessage("Mesaj zorunludur.");
      setSuccessMessage("");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await createContactMessage({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        message: formData.message.trim(),
      });

      setSuccessMessage(
        result?.message ??
          "Mesajınız alınmıştır. En kısa sürede sizinle iletişime geçilecektir."
      );
      setFormData(initialFormData);
    } catch (error) {
      setErrorMessage(
        error?.message ??
          "Mesajınız gönderilemedi. Lütfen bilgileri kontrol edip tekrar deneyin."
      );
    } finally {
      setIsSubmitting(false);
    }
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

          {errorMessage && (
            <div className="login-error-message">
              <p>{errorMessage}</p>
            </div>
          )}

          {successMessage && (
            <div className="login-success-message">
              <p>{successMessage}</p>
            </div>
          )}

          <label>
            Ad Soyad
            <input
              type="text"
              name="fullName"
              placeholder="Adınızı ve soyadınızı girin"
              value={formData.fullName}
              onChange={handleInputChange}
              disabled={isSubmitting}
              required
            />
          </label>

          <label>
            E-posta
            <input
              type="email"
              name="email"
              placeholder="ornek@mail.com"
              value={formData.email}
              onChange={handleInputChange}
              disabled={isSubmitting}
              required
            />
          </label>

          <label>
            Telefon
            <input
              type="tel"
              name="phone"
              placeholder="+90 5xx xxx xx xx"
              value={formData.phone}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </label>

          <label>
            Mesajınız
            <textarea
              name="message"
              rows="5"
              placeholder="Mesajınızı kısa ve açık şekilde yazın"
              value={formData.message}
              onChange={handleInputChange}
              disabled={isSubmitting}
              required
            />
          </label>

          <button type="submit" disabled={isSubmitting}>
            <Send size={18} />
            {isSubmitting ? "Gönderiliyor..." : "Mesaj Gönder"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default Contact;
