import { useAuth } from "../../hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";



function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const {
    user,
    isLoading,
    isAuthenticated,
    roleHomePath,
    requiresModeSelection,
    requiresPasswordChange,
  } = useAuth();

  if (isLoading) {
    return <div className="page-loading">Yükleniyor...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (
    requiresPasswordChange &&
    location.pathname !== "/change-password-required"
  ) {
    return (
      <Navigate
        to="/change-password-required"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (
    requiresModeSelection &&
    location.pathname !== "/select-account-mode"
  ) {
    return (
      <Navigate
        to="/select-account-mode"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  const accountMode = user?.accountMode ?? user?.role;

  if (allowedRoles?.length > 0 && !allowedRoles.includes(accountMode)) {
    return <Navigate to={roleHomePath} replace />;
  }

  return children;
}

export default ProtectedRoute;
