function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer-content">
        <p>© {currentYear} Konut Yönetim Sistemi. Tüm hakları saklıdır.</p>
        <p>Apartman, site ve rezidans yönetimi için modern çözüm.</p>
      </div>
    </footer>
  );
}

export default Footer;