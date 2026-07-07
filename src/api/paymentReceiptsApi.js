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

export async function analyzeManagerPaymentReceipt({
  payerName,
  bankAccount,
  amount,
  paymentOwnerType,
  manualApartmentId,
  description,
  receipt,
}) {
  const formData = new FormData();

  if (payerName) formData.append("payerName", payerName);
  if (bankAccount) formData.append("bankAccount", bankAccount);
  if (amount) formData.append("amount", amount);
  if (paymentOwnerType) formData.append("paymentOwnerType", paymentOwnerType);
  if (manualApartmentId) formData.append("manualApartmentId", manualApartmentId);
  if (description) formData.append("description", description);

  formData.append("receipt", receipt);

  return apiRequest("/payment-receipts/analyze", {
    method: "POST",
    body: formData,
  });
}

export async function managerConfirmPaymentReceipt({
  paymentAllocationId,
  payerName,
  bankAccount,
  amount,
  paymentOwnerType,
  note,
  receipt,
}) {
  const formData = new FormData();

  formData.append("paymentAllocationId", paymentAllocationId);

  if (payerName) formData.append("payerName", payerName);
  if (bankAccount) formData.append("bankAccount", bankAccount);
  if (amount) formData.append("amount", amount);
  if (paymentOwnerType) formData.append("paymentOwnerType", paymentOwnerType);
  if (note) formData.append("note", note);

  formData.append("receipt", receipt);

  return apiRequest("/payment-receipts/manager-confirm", {
    method: "POST",
    body: formData,
  });
}
