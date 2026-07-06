import { apiRequest } from "./client";

export async function getSystemSettings() {
  return apiRequest("/system-settings");
}

export async function updateSystemSettings(payload) {
  return apiRequest("/system-settings", {
    method: "PATCH",
    body: payload,
  });
}
