import { apiRequest } from "./client";

export async function getUsers(params = {}) {
  const searchParams = new URLSearchParams();

  if (params.search) searchParams.set("search", params.search);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const queryString = searchParams.toString();

  return apiRequest(`/users${queryString ? `?${queryString}` : ""}`);
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
