import { apiRequest } from "./client";

export async function getSmsSettings() {
  return apiRequest("/sms-settings");
}

export async function createSmsSetting(payload) {
  return apiRequest("/sms-settings", {
    method: "POST",
    body: payload,
  });
}

export async function updateSmsSetting(smsSettingId, payload) {
  return apiRequest(`/sms-settings/${smsSettingId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteSmsSetting(smsSettingId) {
  return apiRequest(`/sms-settings/${smsSettingId}`, {
    method: "DELETE",
  });
}
