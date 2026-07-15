import { apiRequest } from "./client";

export async function getAiSettings() {
  return apiRequest("/ai-settings");
}

export async function createAiSetting(payload) {
  return apiRequest("/ai-settings", {
    method: "POST",
    body: payload,
  });
}

export async function updateAiSetting(aiSettingId, payload) {
  return apiRequest(`/ai-settings/${aiSettingId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteAiSetting(aiSettingId) {
  return apiRequest(`/ai-settings/${aiSettingId}`, {
    method: "DELETE",
  });
}

export async function testAiSettingConnection(payload) {
  return apiRequest("/ai-settings/test", {
    method: "POST",
    body: payload,
  });
}

export async function reorderAiSettings(orderedIds) {
  return apiRequest("/ai-settings/reorder", {
    method: "PATCH",
    body: {
      orderedIds,
    },
  });
}
