import {
  BookOpenText,
  Download,
  ExternalLink,
  FileText,
} from "lucide-react";

const catalogPath = "/KonutSis_Kullanim_Katalogu.pdf";

function KullanimKatalogu() {
  return (
    <main className="catalog-page">
      <section className="catalog-hero">
        <div className="container catalog-hero-content">
          <div>
            <span className="badge catalog-badge">
              <BookOpenText size={17} />
              Dijital Kullanım Rehberi
            </span>

            <h1>Sitesis Kullanım Kataloğu</h1>

            <p>
              Sisteme girişten ödeme ve gider yönetimine; dekont
              yüklemeden fazla ödeme kullanımına kadar Sitesis
              özelliklerini tek bir rehberde inceleyin.
            </p>
          </div>

          <div className="catalog-actions">
            <a
              href={catalogPath}
              target="_blank"
              rel="noreferrer"
              className="catalog-external-button"
            >
              <ExternalLink size={18} />
              PDF'yi Aç
            </a>

            <a
              href={catalogPath}
              download="Sitesis_Kullanim_Katalogu.pdf"
              className="catalog-download-button"
            >
              <Download size={18} />
              PDF'yi İndir
            </a>
          </div>
        </div>
      </section>

      <section className="container catalog-viewer-section">
        <div className="catalog-info-strip">
          <div>
            <FileText size={20} />
            <span>
              Katalog doğrudan proje içindeki PDF dosyasından
              görüntülenmektedir.
            </span>
          </div>

          <a href={catalogPath} target="_blank" rel="noreferrer">
            Yeni sekmede aç
            <ExternalLink size={16} />
          </a>
        </div>

        <div className="catalog-viewer-shell">
          <iframe
            src={catalogPath}
            title="Sitesis Kullanım Kataloğu"
            className="publuuflip"
          />
        </div>
      </section>
    </main>
  );
}

export default KullanimKatalogu;