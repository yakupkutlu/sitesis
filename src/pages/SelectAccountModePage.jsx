import { useAuth } from "../hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Home,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";



const modePaths = {
  SUPER_ADMIN: "/super-admin/dashboard",
  MANAGER: "/manager/dashboard",
  RESIDENT: "/resident/dashboard",
};

const modeDetails = {
  SUPER_ADMIN: {
    title: "Süper Admin Olarak Devam Et",
    description:
      "Sistem genelindeki siteleri, yöneticileri, kullanıcıları ve ayarları yönetin.",
    badge: "Süper Admin Modu",
    icon: ShieldCheck,
  },
  MANAGER: {
    title: "Yönetici Olarak Devam Et",
    description:
      "Yetkili olduğunuz site veya blok için sakinleri, ödemeleri ve talepleri yönetin.",
    badge: "Yönetici Modu",
    icon: UserRound,
  },
  RESIDENT: {
    title: "Sakin Olarak Devam Et",
    description:
      "Bağlı olduğunuz dairenin borçlarını, duyurularını, dekontlarını ve taleplerini görüntüleyin.",
    badge: "Sakin Modu",
    icon: Home,
  },
};

function SelectAccountModePage() {
  const navigate = useNavigate();
  const {
    user,
    availableModes,
    canSwitchAccountMode,
    roleHomePath,
    selectMode,
    logout,
  } = useAuth();

  const [selectingMode, setSelectingMode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const visibleModes = useMemo(
    () =>
      availableModes.filter(
        (mode) => mode === user?.primaryRole || mode === "RESIDENT"
      ),
    [availableModes, user?.primaryRole]
  );

  useEffect(() => {
    if (!canSwitchAccountMode || visibleModes.length < 2) {
      navigate(roleHomePath, { replace: true });
    }
  }, [canSwitchAccountMode, navigate, roleHomePath, visibleModes.length]);

  async function handleSelect(mode) {
    if (selectingMode) {
      return;
    }

    try {
      setSelectingMode(mode);
      setErrorMessage("");

      const nextUser = await selectMode(mode);
      const selectedMode = nextUser?.accountMode ?? nextUser?.role ?? mode;

      navigate(
        nextUser?.requiresApartmentSelection
          ? "/select-apartment"
          : modePaths[selectedMode] ?? "/login",
        {
          replace: true,
        }
      );
    } catch (error) {
      setErrorMessage(error?.message ?? "Hesap modu seçilemedi.");
    } finally {
      setSelectingMode("");
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
              <small>Güvenli hesap modu seçimi</small>
            </div>
          </div>

          <button
            type="button"
            className="account-mode-logout"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            Çıkış Yap
          </button>
        </header>

        <div className="account-mode-intro">
          <span className="section-kicker">Hoş geldiniz</span>
          <h1>Nasıl devam etmek istiyorsunuz?</h1>
          <p>
            {user?.fullName ?? "Kullanıcı"}, bu hesap hem yönetim hem sakin
            erişimine sahiptir. Açmak istediğiniz paneli seçin.
          </p>
        </div>

        {errorMessage && (
          <div className="login-error-message">
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="account-mode-grid">
          {visibleModes.map((mode) => {
            const details = modeDetails[mode];
            const Icon = details.icon;
            const isSelecting = selectingMode === mode;

            return (
              <article className="account-mode-card" key={mode}>
                <div className="account-mode-card-top">
                  <span className="account-mode-icon">
                    <Icon size={28} />
                  </span>
                  <span className="account-mode-badge">{details.badge}</span>
                </div>

                <h2>{details.title}</h2>
                <p>{details.description}</p>

                <button
                  type="button"
                  onClick={() => handleSelect(mode)}
                  disabled={Boolean(selectingMode)}
                >
                  {isSelecting ? "Açılıyor..." : "Bu Modla Devam Et"}
                  {!isSelecting && <ArrowRight size={18} />}
                </button>
              </article>
            );
          })}
        </div>

        <div className="account-mode-security-note">
          <ShieldCheck size={20} />
          <p>
            Seçiminiz sunucuda doğrulanır. Sakin modunda yönetim yetkileri,
            yönetim modunda ise sakin ekranları kullanılamaz.
          </p>
        </div>
      </section>
    </main>
  );
}

export default SelectAccountModePage;
