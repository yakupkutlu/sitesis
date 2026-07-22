import { apiRequest } from "./client";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

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


export async function downloadResidentExcelTemplate() {
  const response = await fetch(
    `${API_BASE_URL}/apartment-residents/import/template`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    }
  );

  if (!response.ok) {
    const result = await response.json().catch(() => null);

    throw new Error(
      result?.message ?? "Sakin Excel şablonu indirilemedi."
    );
  }

  const templateBlob = await response.blob();
  const objectUrl = URL.createObjectURL(templateBlob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = "sitesis-sakin-toplu-yukleme-sablonu.xlsx";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(objectUrl);
}

export async function previewResidentExcelImport(file) {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest("/apartment-residents/import/preview", {
    method: "POST",
    body: formData,
  });
}

export async function validateResidentExcelImport(rows) {
  return apiRequest("/apartment-residents/import/validate", {
    method: "POST",
    body: { rows },
  });
}

export async function commitResidentExcelImport(rows) {
  return apiRequest("/apartment-residents/import/commit", {
    method: "POST",
    body: { rows },
  });
}
