import { apiRequest } from "./client";

export async function getSystemSecuritySettings() {
  return apiRequest("/system-security-settings");
}

export async function updateSystemSecuritySettings(payload) {
  return apiRequest("/system-security-settings", {
    method: "PATCH",
    body: payload,
  });
}
