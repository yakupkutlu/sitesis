import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getCurrentUser,
  logoutUser,
  selectAccountMode as selectAccountModeRequest,
} from "../api/authApi";
import AuthContext from "./auth-context-core";

const modeHomePaths = {
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

function getPreferredStorage() {
  if (localStorage.getItem("userInfo")) {
    return localStorage;
  }

  return sessionStorage;
}

function persistStoredUser(user) {
  if (!user) {
    return;
  }

  const storage = getPreferredStorage();
  const accountMode = user.accountMode ?? user.role;

  localStorage.removeItem("userRole");
  sessionStorage.removeItem("userRole");
  localStorage.removeItem("accountMode");
  sessionStorage.removeItem("accountMode");
  localStorage.removeItem("userInfo");
  sessionStorage.removeItem("userInfo");

  storage.setItem("userRole", accountMode);
  storage.setItem("accountMode", accountMode);
  storage.setItem("userInfo", JSON.stringify(user));
}

function clearStoredUser() {
  localStorage.removeItem("authToken");
  sessionStorage.removeItem("authToken");
  localStorage.removeItem("userRole");
  sessionStorage.removeItem("userRole");
  localStorage.removeItem("accountMode");
  sessionStorage.removeItem("accountMode");
  localStorage.removeItem("userInfo");
  sessionStorage.removeItem("userInfo");
}

function getUserHomePath(user) {
  if (!user) {
    return "/login";
  }

  if (user.requiresModeSelection) {
    return "/select-account-mode";
  }

  const accountMode = user.accountMode ?? user.role;
  return modeHomePaths[accountMode] ?? "/login";
}

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => readStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  const setUser = useCallback((nextUser) => {
    setUserState(nextUser);

    if (nextUser) {
      persistStoredUser(nextUser);
    } else {
      clearStoredUser();
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const result = await getCurrentUser();
      const currentUser =
        result?.data?.user ?? result?.data ?? result?.user ?? null;

      if (currentUser) {
        setUser(currentUser);
        return currentUser;
      }

      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    }
  }, [setUser]);

  const selectMode = useCallback(
    async (mode) => {
      const result = await selectAccountModeRequest(mode);
      const nextUser =
        result?.data?.user ?? result?.data ?? result?.user ?? null;

      if (!nextUser) {
        throw new Error("Seçilen hesap modu doğrulanamadı.");
      }

      setUser(nextUser);
      return nextUser;
    },
    [setUser]
  );

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
    }
  }, [setUser]);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      setIsLoading(true);
      const currentUser = await refreshUser();

      if (isMounted) {
        setUserState(currentUser);
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
      accountMode: user?.accountMode ?? user?.role ?? null,
      primaryRole: user?.primaryRole ?? user?.role ?? null,
      availableModes: Array.isArray(user?.availableModes)
        ? user.availableModes
        : [],
      canSwitchAccountMode: Boolean(user?.canSwitchAccountMode),
      requiresModeSelection: Boolean(user?.requiresModeSelection),
      roleHomePath: getUserHomePath(user),
      refreshUser,
      selectMode,
      setUser,
      logout,
    }),
    [isLoading, logout, refreshUser, selectMode, setUser, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
