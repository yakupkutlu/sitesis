import { useManagerScope } from "../../hooks/useManagerScope";
import { Navigate, useLocation } from "react-router-dom";



function ManagerScopeGate({ children }) {
  const location = useLocation();

  const {
    assignments,
    activeAssignmentId,
    requiresSelection,
    isLoading,
    errorMessage,
  } = useManagerScope();

  if (isLoading) {
    return (
      <div className="manager-scope-gate-screen">
        <p>Yönetici çalışma alanı kontrol ediliyor...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="manager-scope-gate-screen error">
        <h2>Çalışma alanı alınamadı</h2>
        <p>{errorMessage}</p>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="manager-scope-gate-screen">
        <h2>Yetki alanı bulunamadı</h2>
        <p>
          Hesabınıza henüz bir site, apartman veya blok yetkisi atanmamış.
          Süper Admin ile iletişime geçin.
        </p>
      </div>
    );
  }

  if (requiresSelection || !activeAssignmentId) {
    return (
      <Navigate
        to="/manager/select-scope"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  return children;
}

export default ManagerScopeGate;
