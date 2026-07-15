import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Layers3,
  LogOut,
  MapPin,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useManagerScope } from "../../hooks/useManagerScope";

function getAssignmentLabel(assignment) {
  if (assignment.scopeType === "SITE") {
    return assignment.site?.name ?? "Site yetkisi";
  }

  const siteName = assignment.block?.site?.name;
  const blockName = assignment.block?.name;

  if (siteName && blockName) {
    return `${siteName} / ${blockName}`;
  }

  return blockName ?? "Blok / Apartman yetkisi";
}

function getAssignmentAddress(assignment) {
  if (assignment.scopeType === "SITE") {
    return assignment.site?.address ?? "Adres bilgisi bulunmuyor";
  }

  return (
    assignment.block?.site?.address ??
    "Adres bilgisi bulunmuyor"
  );
}

function ManagerScopeSelectPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const {
    assignments,
    activeAssignmentId,
    selectManagerScope,
    isLoading,
    errorMessage,
  } = useManagerScope();

  const [selectingId, setSelectingId] = useState("");

  async function handleSelect(assignmentId) {
    try {
      setSelectingId(assignmentId);

      await selectManagerScope(assignmentId);

      const targetPath =
        typeof location.state?.from === "string" &&
        location.state.from.startsWith("/manager/") &&
        location.state.from !== "/manager/select-scope"
          ? location.state.from
          : "/manager/dashboard";

      navigate(targetPath, {
        replace: true,
      });
    } finally {
      setSelectingId("");
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login", {
      replace: true,
    });
  }

  return (
    <main className="manager-scope-select-page">
      <section className="manager-scope-select-shell">
        <div className="manager-scope-select-header">
          <div className="manager-scope-brand">
            <span>
              <Building2 size={25} />
            </span>

            <div>
              <strong>Konut Yönetim</strong>
              <small>Yönetici çalışma alanı</small>
            </div>
          </div>

          <button
            type="button"
            className="manager-scope-logout"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            Çıkış Yap
          </button>
        </div>

        <div className="manager-scope-select-intro">
          <span className="section-kicker">Hoş geldiniz</span>
          <h1>Çalışmak istediğiniz alanı seçin</h1>
          <p>
            {user?.fullName ?? "Yönetici"}, birden fazla yetki alanınız
            bulunuyor. Seçtiğiniz site veya bloğa ait daireler, sakinler,
            ödemeler, dekontlar ve talepler gösterilecektir.
          </p>
        </div>

        {errorMessage && (
          <div className="login-error-message">
            <p>{errorMessage}</p>
          </div>
        )}

        {assignments.length === 0 ? (
          <div className="manager-scope-empty">
            <Building2 size={42} />
            <h2>Yetki alanı bulunamadı</h2>
            <p>
              Hesabınıza henüz site, apartman veya blok atanmamış.
            </p>
          </div>
        ) : (
          <div className="manager-scope-option-grid">
            {assignments.map((assignment) => {
              const isActive =
                assignment.id === activeAssignmentId;
              const isSelecting =
                assignment.id === selectingId;
              const Icon =
                assignment.scopeType === "SITE"
                  ? Building2
                  : Layers3;

              return (
                <article
                  className={`manager-scope-option-card ${
                    isActive ? "active" : ""
                  }`}
                  key={assignment.id}
                >
                  <div className="manager-scope-option-top">
                    <span className="manager-scope-option-icon">
                      <Icon size={25} />
                    </span>

                    <span className="manager-scope-type">
                      {assignment.scopeType === "SITE"
                        ? "Site Yetkisi"
                        : "Blok / Apartman Yetkisi"}
                    </span>
                  </div>

                  <h2>{getAssignmentLabel(assignment)}</h2>

                  <p>
                    <MapPin size={16} />
                    {getAssignmentAddress(assignment)}
                  </p>

                  <button
                    type="button"
                    className="dashboard-action-button"
                    onClick={() => handleSelect(assignment.id)}
                    disabled={isLoading || Boolean(selectingId)}
                  >
                    {isActive ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <ArrowRight size={18} />
                    )}

                    {isSelecting
                      ? "Seçiliyor..."
                      : isActive
                        ? "Bu Alanda Devam Et"
                        : "Bu Alanı Seç"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default ManagerScopeSelectPage;
