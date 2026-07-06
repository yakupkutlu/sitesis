import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const { user, isLoading, isAuthenticated, roleHomePath } = useAuth();

  if (isLoading) {
    return <div className="page-loading">Yükleniyor...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles?.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleHomePath} replace />;
  }

  return children;
}

export default ProtectedRoute;
