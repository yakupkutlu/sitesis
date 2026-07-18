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

export async function createContactMessage(payload) {
  return apiRequest("/contact-messages", {
    method: "POST",
    body: payload,
  });
}

export async function getContactMessages(params = {}) {
  return apiRequest(`/contact-messages${buildQueryString(params)}`);
}

export async function updateContactMessage(contactMessageId, payload) {
  return apiRequest(`/contact-messages/${contactMessageId}`, {
    method: "PATCH",
    body: payload,
  });
}
