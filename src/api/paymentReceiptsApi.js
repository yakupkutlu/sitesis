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

export async function getPaymentReceipts(params = {}) {
  return apiRequest(`/payment-receipts${buildQueryString(params)}`);
}

export async function approvePaymentReceipt(receiptId, payload = {}) {
  return apiRequest(`/payment-receipts/${receiptId}/approve`, {
    method: "PATCH",
    body: payload,
  });
}

export async function rejectPaymentReceipt(receiptId, payload = {}) {
  return apiRequest(`/payment-receipts/${receiptId}/reject`, {
    method: "PATCH",
    body: payload,
  });
}

export function getPaymentReceiptDownloadUrl(receiptId) {
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  return `${baseUrl}/payment-receipts/${receiptId}/download`;
}

export async function uploadPaymentReceipt({ paymentAllocationId, note, receipt }) {
  const formData = new FormData();

  formData.append("paymentAllocationId", paymentAllocationId);

  if (note) {
    formData.append("note", note);
  }

  formData.append("receipt", receipt);

  return apiRequest("/payment-receipts", {
    method: "POST",
    body: formData,
  });
}
