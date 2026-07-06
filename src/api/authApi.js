import { apiRequest, clearCachedCsrfToken } from "./client";

export async function loginUser({ email, password }) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: {
      email,
      password,
    },
  });
}

export async function getCurrentUser() {
  return apiRequest("/auth/me");
}

export async function logoutUser() {
  const result = await apiRequest("/auth/logout", {
    method: "POST",
  });

  clearCachedCsrfToken();

  return result;
}

export async function requestPasswordReset({ email }) {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: {
      email,
    },
  });
}
