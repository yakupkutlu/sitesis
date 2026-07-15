import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getMyManagerAssignments,
  selectMyManagerAssignment,
} from "../api/managerAssignmentsApi";
import { useAuth } from "./AuthContext";
import ManagerScopeContext from "./managerScopeContext";


function getAssignmentLabel(assignment) {
  if (!assignment) {
    return "Çalışma alanı seçilmedi";
  }

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

export function ManagerScopeProvider({ children }) {
  const { user } = useAuth();

  const [assignments, setAssignments] = useState([]);
  const [activeAssignmentId, setActiveAssignmentId] = useState(null);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [requiresSelection, setRequiresSelection] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const clearManagerScope = useCallback(() => {
    setAssignments([]);
    setActiveAssignmentId(null);
    setActiveAssignment(null);
    setRequiresSelection(false);
    setErrorMessage("");
  }, []);

  const refreshManagerScope = useCallback(async () => {
    if (user?.role !== "MANAGER") {
      clearManagerScope();
      return null;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");

      const result = await getMyManagerAssignments();
      const data = result?.data ?? result ?? {};

      const nextAssignments = Array.isArray(data.assignments)
        ? data.assignments
        : [];

      setAssignments(nextAssignments);
      setActiveAssignmentId(data.activeAssignmentId ?? null);
      setActiveAssignment(data.activeAssignment ?? null);
      setRequiresSelection(Boolean(data.requiresSelection));

      return data;
    } catch (error) {
      setErrorMessage(
        error?.message ?? "Yönetici çalışma alanları alınamadı."
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [clearManagerScope, user?.role]);

  const selectManagerScope = useCallback(async (assignmentId) => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const result = await selectMyManagerAssignment(assignmentId);
      const data = result?.data ?? result ?? {};

      setActiveAssignmentId(data.activeAssignmentId ?? assignmentId);
      setActiveAssignment(data.activeAssignment ?? null);
      setRequiresSelection(false);

      return data;
    } catch (error) {
      setErrorMessage(
        error?.message ?? "Çalışma alanı seçilemedi."
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

useEffect(() => {
  let isCancelled = false;

  const timeoutId = window.setTimeout(() => {
    if (isCancelled) {
      return;
    }

    if (user?.role === "MANAGER") {
      refreshManagerScope().catch(() => {});
      return;
    }

    clearManagerScope();
  }, 0);

  return () => {
    isCancelled = true;
    window.clearTimeout(timeoutId);
  };
}, [
  clearManagerScope,
  refreshManagerScope,
  user?.id,
  user?.role,
]);

  const value = useMemo(
    () => ({
      assignments,
      activeAssignmentId,
      activeAssignment,
      activeAssignmentLabel: getAssignmentLabel(activeAssignment),
      requiresSelection,
      isLoading,
      errorMessage,
      refreshManagerScope,
      selectManagerScope,
    }),
    [
      activeAssignment,
      activeAssignmentId,
      assignments,
      errorMessage,
      isLoading,
      refreshManagerScope,
      requiresSelection,
      selectManagerScope,
    ]
  );

  return (
    <ManagerScopeContext.Provider value={value}>
      {children}
    </ManagerScopeContext.Provider>
  );
}

