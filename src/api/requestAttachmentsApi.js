const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:5000/api";

export function getRequestAttachmentUrl(requestId) {
  if (!requestId) {
    return "";
  }

  return `${API_BASE_URL}/requests/${encodeURIComponent(requestId)}/attachment`;
}

export async function fetchRequestAttachment(requestId) {
  const response = await fetch(getRequestAttachmentUrl(requestId), {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);

    throw new Error(
      errorBody?.message ||
        `Gönderilen dosya alınamadı. HTTP ${response.status}`
    );
  }

  const blob = await response.blob();

  return {
    blob,
    contentType: response.headers.get("content-type") || blob.type || "",
  };
}
