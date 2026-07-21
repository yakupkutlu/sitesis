import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Home,
  LogOut,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";

function buildApartmentLabel(item) {
  const apartment = item?.apartment;

  if (!apartment) {
    return "Daire bilgisi bulunamadı";
  }

  return `${apartment.block.site.name} / ${apartment.block.name} / Daire ${apartment.number}`;
}

function SelectApartmentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    accountMode,
    residentApartments,
    selectedApartmentId,
    selectApartment,
    canSwitchAccountMode,
    logout,
    roleHomePath,
  } = useAuth();

  const [selectingApartmentId, setSelectingApartmentId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const apartmentOptions = useMemo(
    () => (Array.isArray(residentApartments) ? residentApartments : []),
    [residentApartments]
  );

  useEffect(() => {
    if (accountMode !== "RESIDENT") {
      navigate(roleHomePath, { replace: true });
      return;
    }

    if (apartmentOptions.length <= 1) {
      navigate("/resident/dashboard", { replace: true });
    }
  }, [accountMode, apartmentOptions.length, navigate, roleHomePath]);

  async function handleSelect(apartmentId) {
    if (selectingApartmentId) {
      return;
    }

    if (apartmentId === selectedApartmentId) {
      navigate(location.state?.from ?? "/resident/dashboard", {
        replace: true,
      });
      return;
    }

    try {
      setSelectingApartmentId(apartmentId);
      setErrorMessage("");

      await selectApartment(apartmentId);

      const returnPath =
        typeof location.state?.from === "string" &&
        location.state.from.startsWith("/resident")
          ? location.state.from
          : "/resident/dashboard";

      navigate(returnPath, { replace: true });
    } catch (error) {
      setErrorMessage(error?.message ?? "Daire seçilemedi.");
    } finally {
      setSelectingApartmentId("");
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="account-mode-page">
      <section className="account-mode-shell">
        <header className="account-mode-header">
          <div className="account-mode-brand">
            <span>
              <Building2 size={25} />
            </span>

            <div>
              <strong>Konut Yönetim</strong>
              <small>Güvenli aktif daire seçimi</small>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {canSwitchAccountMode && (
              <button
                type="button"
                className="account-mode-logout"
                onClick={() =>
                  navigate("/select-account-mode", { replace: true })
                }
              >
                <Home size={17} />
                Mod Seçimine Dön
              </button>
            )}

            <button
              type="button"
              className="account-mode-logout"
              onClick={handleLogout}
            >
              <LogOut size={17} />
              Çıkış Yap
            </button>
          </div>
        </header>

        <div className="account-mode-intro">
          <span className="section-kicker">Aktif daire seçimi</span>
          <h1>Hangi daire ile devam etmek istiyorsunuz?</h1>
          <p>
            {user?.fullName ?? "Kullanıcı"}, görüntülemek istediğiniz daireyi
            seçin. Panelde yalnızca seçilen dairenin bilgileri kullanılacaktır.
          </p>
        </div>

        {errorMessage && (
          <div className="login-error-message">
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="account-mode-grid">
          {apartmentOptions.map((item) => {
            const apartment = item.apartment;
            const isSelected = apartment.id === selectedApartmentId;
            const isSelecting = selectingApartmentId === apartment.id;

            return (
              <article className="account-mode-card" key={item.residentLinkId}>
                <div className="account-mode-card-top">
                  <span className="account-mode-icon">
                    <MapPin size={28} />
                  </span>

                  <span className="account-mode-badge">
                    {item.residentType === "OWNER"
                      ? "Ev Sahibi"
                      : "Kiracı"}
                  </span>
                </div>

                <h2>{apartment.block.site.name}</h2>
                <p>
                  {apartment.block.name} / Daire {apartment.number}
                  {apartment.floor !== null
                    ? ` / Kat ${apartment.floor}`
                    : ""}
                </p>

                <button
                  type="button"
                  onClick={() => handleSelect(apartment.id)}
                  disabled={Boolean(selectingApartmentId)}
                >
                  {isSelecting
                    ? "Daire açılıyor..."
                    : isSelected
                      ? "Bu Daireyle Devam Et"
                      : "Bu Daireyi Seç"}
                  {!isSelecting && <ArrowRight size={18} />}
                </button>

                <small style={{ marginTop: "12px", display: "block" }}>
                  {buildApartmentLabel(item)}
                </small>
              </article>
            );
          })}
        </div>

        <div className="account-mode-security-note">
          <ShieldCheck size={20} />
          <p>
            Daire seçiminiz sunucuda doğrulanır. Hesabınıza bağlı olmayan bir
            dairenin bilgilerine erişemezsiniz.
          </p>
        </div>
      </section>
    </main>
  );
}

export default SelectApartmentPage;
