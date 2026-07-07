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

export async function getApartmentResidents(params = {}) {
  return apiRequest(`/apartment-residents${buildQueryString(params)}`);
}

export async function createResidentAndAssignApartment(payload) {
  return apiRequest("/apartment-residents/create-resident", {
    method: "POST",
    body: payload,
  });
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

export async function updateResidentPassword(apartmentResidentId, payload) {
  return apiRequest(`/apartment-residents/${apartmentResidentId}/resident-password`, {
    method: "PATCH",
    body: payload,
  });
}
