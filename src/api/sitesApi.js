import { apiRequest } from "./client";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

export async function getSites(params = {}) {
  const searchParams = new URLSearchParams();

  if (params.search) searchParams.set("search", params.search);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const queryString = searchParams.toString();

  return apiRequest(`/sites${queryString ? `?${queryString}` : ""}`);
}

export async function createSiteWithStructure(payload) {
  return apiRequest("/sites/with-structure", {
    method: "POST",
    body: payload,
  });
}

export async function createSite(payload) {
  return apiRequest("/sites", {
    method: "POST",
    body: payload,
  });
}

export async function updateSite(siteId, payload) {
  return apiRequest(`/sites/${siteId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function uploadSiteImage(siteId, imageFile) {
  const formData = new FormData();
  formData.append("image", imageFile);

  return apiRequest(`/sites/${siteId}/image`, {
    method: "PATCH",
    body: formData,
  });
}

export function getSiteImageUrl(siteId) {
  return `${API_BASE_URL}/sites/${siteId}/image`;
}
