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

export async function getNotificationLogs(params = {}) {
  return apiRequest(`/notification-logs${buildQueryString(params)}`);
}

export async function getNotificationUsageSummary() {
  return apiRequest("/notification-logs/usage-summary");
}
