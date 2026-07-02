import { Link } from "react-router-dom";
import { ArrowLeft, Home, SearchX } from "lucide-react";

function NotFound() {
  return (
    <section className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-icon">
          <SearchX size={36} />
        </div>

        <span className="badge">404</span>

        <h1>Aradığınız sayfa bulunamadı.</h1>

        <p>
          Girdiğiniz bağlantı hatalı olabilir veya bu sayfa artık mevcut
          olmayabilir. Ana sayfaya dönerek devam edebilirsiniz.
        </p>

        <div className="not-found-actions">
          <Link to="/" className="primary-button">
            <Home size={18} />
            Ana Sayfaya Dön
          </Link>

          <Link to="/contact" className="secondary-button">
            <ArrowLeft size={18} />
            Destek Al
          </Link>
        </div>
      </div>
    </section>
  );
}

export default NotFound;