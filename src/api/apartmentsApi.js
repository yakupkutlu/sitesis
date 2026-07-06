import { apiRequest } from "./client";

export async function getApartments(params = {}) {
  const searchParams = new URLSearchParams();

  if (params.blockId) searchParams.set("blockId", params.blockId);
  if (params.search) searchParams.set("search", params.search);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const queryString = searchParams.toString();

  return apiRequest(`/apartments${queryString ? `?${queryString}` : ""}`);
}

export async function createApartment(payload) {
  return apiRequest("/apartments", {
    method: "POST",
    body: payload,
  });
}

export async function updateApartment(apartmentId, payload) {
  return apiRequest(`/apartments/${apartmentId}`, {
    method: "PATCH",
    body: payload,
  });
}
