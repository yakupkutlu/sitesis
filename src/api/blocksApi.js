import { apiRequest } from "./client";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

export async function getBlocks(params = {}) {
  const searchParams = new URLSearchParams();

  if (params.siteId) searchParams.set("siteId", params.siteId);
  if (params.search) searchParams.set("search", params.search);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const queryString = searchParams.toString();

  return apiRequest(`/blocks${queryString ? `?${queryString}` : ""}`);
}

export async function createBlock(payload) {
  return apiRequest("/blocks", {
    method: "POST",
    body: payload,
  });
}

export async function updateBlock(blockId, payload) {
  return apiRequest(`/blocks/${blockId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function uploadBlockImage(blockId, imageFile) {
  const formData = new FormData();
  formData.append("image", imageFile);

  return apiRequest(`/blocks/${blockId}/image`, {
    method: "PATCH",
    body: formData,
  });
}

export function getBlockImageUrl(blockId) {
  return `${API_BASE_URL}/blocks/${blockId}/image`;
}
