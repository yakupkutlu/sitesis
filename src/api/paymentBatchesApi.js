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

export async function getPaymentBatches(params = {}) {
  return apiRequest(`/payment-batches${buildQueryString(params)}`);
}

export async function createPaymentBatch(payload) {
  return apiRequest("/payment-batches", {
    method: "POST",
    body: payload,
  });
}

export async function updatePaymentBatch(paymentBatchId, payload) {
  return apiRequest(`/payment-batches/${paymentBatchId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function cancelPaymentBatch(paymentBatchId) {
  return apiRequest(`/payment-batches/${paymentBatchId}/cancel`, {
    method: "PATCH",
  });
}
