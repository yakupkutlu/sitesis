import { apiRequest } from "./client";

export async function getEmailSettings() {
  return apiRequest("/email-settings");
}

export async function createEmailSetting(payload) {
  return apiRequest("/email-settings", {
    method: "POST",
    body: payload,
  });
}

export async function updateEmailSetting(emailSettingId, payload) {
  return apiRequest(`/email-settings/${emailSettingId}`, {
    method: "PATCH",
    body: payload,
  });
}
