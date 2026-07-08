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

export async function getRequests(params = {}) {
  return apiRequest(`/requests${buildQueryString(params)}`);
}

export async function createRequest(payload) {
  const formData = new FormData();

  formData.append("title", payload.title);
  formData.append("description", payload.description);
  formData.append("type", payload.type);

  if (payload.apartmentId) {
    formData.append("apartmentId", payload.apartmentId);
  }

  if (payload.sendSms !== undefined) {
    formData.append("sendSms", String(payload.sendSms));
  }

  if (payload.sendEmail !== undefined) {
    formData.append("sendEmail", String(payload.sendEmail));
  }

  if (payload.attachment) {
    formData.append("attachment", payload.attachment);
  }

  return apiRequest("/requests", {
    method: "POST",
    body: formData,
  });
}

export async function updateRequest(requestId, payload) {
  return apiRequest(`/requests/${requestId}`, {
    method: "PATCH",
    body: payload,
  });
}
