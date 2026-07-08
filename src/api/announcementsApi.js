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

export async function getAnnouncements(params = {}) {
  return apiRequest(`/announcements${buildQueryString(params)}`);
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
export async function markAnnouncementAsRead(announcementId) {
  return apiRequest(`/announcements/${announcementId}/read`, {
    method: "PATCH",
  });
}