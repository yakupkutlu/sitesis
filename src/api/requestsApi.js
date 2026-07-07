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

export async function getRequests(params = {}) {
  return apiRequest(`/requests${buildQueryString(params)}`);
}

export async function updateRequest(requestId, payload) {
  return apiRequest(`/requests/${requestId}`, {
    method: "PATCH",
    body: payload,
  });
}
