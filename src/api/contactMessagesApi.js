const API_BASE_URL = "http://localhost:5000/api";

let csrfToken = null;

async function getCsrfToken() {
  if (csrfToken) {
    return csrfToken;
  }

  const response = await fetch(`${API_BASE_URL}/csrf-token`, {
    method: "GET",
    credentials: "include",
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.data?.csrfToken) {
    throw new Error(result?.message ?? "CSRF token alınamadı.");
  }

  csrfToken = result.data.csrfToken;
  return csrfToken;
}

async function contactRequest(path, options = {}) {
  const token = await getCsrfToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": token,
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message ?? "İstek başarısız oldu.");
  }

  return result;
}

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
  return contactRequest("/contact-messages", {
    method: "POST",
    body: payload,
  });
}

export async function getContactMessages(params = {}) {
  return contactRequest(`/contact-messages${buildQueryString(params)}`);
}

export async function updateContactMessage(contactMessageId, payload) {
  return contactRequest(`/contact-messages/${contactMessageId}`, {
    method: "PATCH",
    body: payload,
  });
}
