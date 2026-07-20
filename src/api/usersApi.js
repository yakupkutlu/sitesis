import { apiRequest } from "./client";

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : "";
}

export async function getUsers(params = {}) {
  return apiRequest(`/users${buildQueryString(params)}`);
}

export async function createUser(payload) {
  return apiRequest("/users", {
    method: "POST",
    body: payload,
  });
}

export async function updateUser(userId, payload) {
  return apiRequest(`/users/${userId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deactivateUser(userId) {
  return apiRequest(`/users/${userId}/deactivate`, {
    method: "PATCH",
  });
}

export async function updateLinkedResidentStatus(
  apartmentResidentId,
  status
) {
  return apiRequest(
    `/apartment-residents/${apartmentResidentId}/resident-status`,
    {
      method: "PATCH",
      body: { status },
    }
  );
}
