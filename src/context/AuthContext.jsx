import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getCurrentUser, logoutUser } from "../api/authApi";

const AuthContext = createContext(null);

const roleHomePaths = {
  SUPER_ADMIN: "/super-admin/dashboard",
  MANAGER: "/manager/dashboard",
  RESIDENT: "/resident/dashboard",
};

function readStoredUser() {
  const rawUserInfo =
    localStorage.getItem("userInfo") ?? sessionStorage.getItem("userInfo");

  if (!rawUserInfo) {
    return null;
  }

  try {
    return JSON.parse(rawUserInfo);
  } catch {
    return null;
  }
}

function clearStoredUser() {
  localStorage.removeItem("authToken");
  sessionStorage.removeItem("authToken");

  localStorage.removeItem("userRole");
  sessionStorage.removeItem("userRole");

  localStorage.removeItem("userInfo");
  sessionStorage.removeItem("userInfo");
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const result = await getCurrentUser();
      const currentUser = result?.data?.user ?? result?.data ?? result?.user ?? null;

      if (currentUser) {
        setUser(currentUser);
        return currentUser;
      }

      setUser(null);
      clearStoredUser();
      return null;
    } catch {
      setUser(null);
      clearStoredUser();
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      clearStoredUser();
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      setIsLoading(true);
      const currentUser = await refreshUser();

      if (isMounted) {
        setUser(currentUser);
        setIsLoading(false);
      }
    }

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [refreshUser]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      roleHomePath: user?.role ? roleHomePaths[user.role] : "/login",
      refreshUser,
      setUser,
      logout,
    }),
    [isLoading, logout, refreshUser, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth AuthProvider icinde kullanilmalidir.");
  }

  return context;
}
