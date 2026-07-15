import { useContext } from "react";

import ManagerScopeContext from "../context/managerScopeContext";

export function useManagerScope() {
  const context = useContext(ManagerScopeContext);

  if (!context) {
    throw new Error(
      "useManagerScope ManagerScopeProvider içinde kullanılmalıdır."
    );
  }

  return context;
}