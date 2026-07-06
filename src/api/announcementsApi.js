import { apiRequest } from "./client";

export async function getAnnouncements(params = {}) {
  const searchParams = new URLSearchParams();

  if (params.search) searchParams.set("search", params.search);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.status) searchParams.set("status", params.status);
  if (params.targetType) searchParams.set("targetType", params.targetType);

  const queryString = searchParams.toString();

  return apiRequest(`/announcements${queryString ? `?${queryString}` : ""}`);
}

export async function createAnnouncement(payload) {
  return apiRequest("/announcements", {
    method: "POST",
    body: payload,
  });
}

export async function updateAnnouncement(announcementId, payload) {
  return apiRequest(`/announcements/${announcementId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function archiveAnnouncement(announcementId) {
  return apiRequest(`/announcements/${announcementId}/archive`, {
    method: "PATCH",
  });
}
