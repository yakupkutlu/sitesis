const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

let csrfToken = null;

export async function getCsrfToken(forceRefresh = false) {
  if (csrfToken && !forceRefresh) {
    return csrfToken;
  }

  const response = await fetch(`${API_BASE_URL}/csrf-token`, {
    method: "GET",
    credentials: "include",
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.data?.csrfToken) {
    throw new Error(result?.message ?? "CSRF token alınamadı.");
  }

  csrfToken = result.data.csrfToken;
  return csrfToken;
}

export async function apiRequest(path, options = {}) {
  const method = options.method ?? "GET";
  const upperMethod = method.toUpperCase();

  const headers = {
    ...(options.headers ?? {}),
  };

  const isFormData = options.body instanceof FormData;

  if (!isFormData && options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (["POST", "PATCH", "DELETE"].includes(upperMethod)) {
    headers["x-csrf-token"] = await getCsrfToken();
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: upperMethod,
    credentials: "include",
    headers,
    body: isFormData
      ? options.body
      : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message = result?.message ?? "İstek başarısız oldu.";
    const error = new Error(message);
    error.status = response.status;
    error.details = result;
    throw error;
  }

  return result;
}

export function clearCachedCsrfToken() {
  csrfToken = null;
}
