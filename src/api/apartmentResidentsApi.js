import { apiRequest } from "./client";

export async function getApartmentResidents(params = {}) {
  const searchParams = new URLSearchParams();

  if (params.search) searchParams.set("search", params.search);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const queryString = searchParams.toString();

  return apiRequest(`/apartment-residents${queryString ? `?${queryString}` : ""}`);
}

export async function createApartmentResident(payload) {
  return apiRequest("/apartment-residents", {
    method: "POST",
    body: payload,
  });
}

export async function updateApartmentResident(apartmentResidentId, payload) {
  return apiRequest(`/apartment-residents/${apartmentResidentId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteApartmentResident(apartmentResidentId) {
  return apiRequest(`/apartment-residents/${apartmentResidentId}`, {
    method: "DELETE",
  });
}
