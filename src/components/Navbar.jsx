import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Building2, Menu, X } from "lucide-react";

const navItems = [
  { label: "Ana Sayfa", path: "/" },
  { label: "Özellikler", path: "/features" },
  { label: "Mevzuat", path: "/mevzuat" },
  { label: "Hakkımızda", path: "/about" },
  { label: "İletişim", path: "/contact" },
];

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  function toggleMenu() {
    setIsMenuOpen((currentValue) => !currentValue);
  }

  return (
    <header className="navbar">
      <div className="container navbar-content">
        <Link to="/" className="logo" onClick={closeMenu}>
          <span className="logo-icon">
            <Building2 size={24} />
          </span>

          <span>Konut Yönetim</span>
        </Link>

        <nav className={`nav-links ${isMenuOpen ? "open" : ""}`}>
          {navItems.map((item) => (
            <NavLink to={item.path} key={item.path} onClick={closeMenu}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Link
          to="/login"
          className="login-button desktop-login"
          onClick={closeMenu}
        >
          Giriş Yap
        </Link>

        <button
          type="button"
          className="mobile-menu-button"
          onClick={toggleMenu}
          aria-label={isMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="mobile-login-area">
          <Link to="/login" className="login-button" onClick={closeMenu}>
            Giriş Yap
          </Link>
        </div>
      )}
    </header>
  );
}

export default Navbar;