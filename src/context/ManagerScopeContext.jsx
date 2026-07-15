import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getMyManagerAssignments,
  selectMyManagerAssignment,
} from "../api/managerAssignmentsApi";
import { useAuth } from "../hooks/useAuth";
import ManagerScopeContext from "./manager-scope-context-core";

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
  const [loadedManagerUserId, setLoadedManagerUserId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const requestVersionRef = useRef(0);

  const clearManagerScope = useCallback(() => {
    requestVersionRef.current += 1;
    setAssignments([]);
    setActiveAssignmentId(null);
    setActiveAssignment(null);
    setRequiresSelection(false);
    setLoadedManagerUserId(null);
    setErrorMessage("");
  }, []);

  const refreshManagerScope = useCallback(async () => {
    if (user?.role !== "MANAGER" || user?.requiresModeSelection) {
      clearManagerScope();
      return null;
    }

    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;

    try {
      setIsLoading(true);
      setErrorMessage("");

      const result = await getMyManagerAssignments();
      const data = result?.data ?? result ?? {};

      if (requestVersionRef.current !== requestVersion) {
        return null;
      }

      const nextAssignments = Array.isArray(data.assignments)
        ? data.assignments
        : [];

      setAssignments(nextAssignments);
      setActiveAssignmentId(data.activeAssignmentId ?? null);
      setActiveAssignment(data.activeAssignment ?? null);
      setRequiresSelection(Boolean(data.requiresSelection));

      return data;
    } catch (error) {
      if (requestVersionRef.current === requestVersion) {
        setErrorMessage(
          error?.message ?? "Yönetici çalışma alanları alınamadı."
        );
      }

      throw error;
    } finally {
      if (requestVersionRef.current === requestVersion) {
        setLoadedManagerUserId(user?.id ?? null);
        setIsLoading(false);
      }
    }
  }, [
    clearManagerScope,
    user?.id,
    user?.requiresModeSelection,
    user?.role,
  ]);

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
      setErrorMessage(error?.message ?? "Çalışma alanı seçilemedi.");
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

      if (user?.role === "MANAGER" && !user?.requiresModeSelection) {
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
    user?.requiresModeSelection,
    user?.role,
  ]);

  const scopeIsLoading =
    user?.role === "MANAGER" &&
    !user?.requiresModeSelection &&
    loadedManagerUserId !== user.id
      ? true
      : isLoading;

  const value = useMemo(
    () => ({
      assignments,
      activeAssignmentId,
      activeAssignment,
      activeAssignmentLabel: getAssignmentLabel(activeAssignment),
      requiresSelection,
      isLoading: scopeIsLoading,
      errorMessage,
      refreshManagerScope,
      selectManagerScope,
    }),
    [
      activeAssignment,
      activeAssignmentId,
      assignments,
      errorMessage,
      refreshManagerScope,
      requiresSelection,
      scopeIsLoading,
      selectManagerScope,
    ]
  );

  return (
    <ManagerScopeContext.Provider value={value}>
      {children}
    </ManagerScopeContext.Provider>
  );
}
