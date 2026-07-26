import { apiRequest } from "./client";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

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

export function getAccountingSummary(params = {}) {
  return apiRequest(
    `/accounting/summary${buildQueryString(params)}`
  );
}

export function getAccountingIncome(params = {}) {
  return apiRequest(
    `/accounting/income${buildQueryString(params)}`
  );
}

export function getAccountingExpenses(params = {}) {
  return apiRequest(
    `/accounting/expenses${buildQueryString(params)}`
  );
}

export function getAccountingExpense(expenseId) {
  return apiRequest(
    `/accounting/expenses/${expenseId}`
  );
}

export function createAccountingExpense(payload) {
  const formData = new FormData();

  formData.append("title", payload.title);
  formData.append("category", payload.category);
  formData.append(
    "amountKurus",
    String(payload.amountKurus)
  );
  formData.append("expenseDate", payload.expenseDate);
  formData.append("siteId", payload.siteId);

  if (payload.description) {
    formData.append(
      "description",
      payload.description
    );
  }

  if (payload.blockId) {
    formData.append(
      "blockId",
      payload.blockId
    );
  }

  if (payload.vendorName) {
    formData.append(
      "vendorName",
      payload.vendorName
    );
  }

  if (payload.invoiceNumber) {
    formData.append(
      "invoiceNumber",
      payload.invoiceNumber
    );
  }

  for (const documentFile of payload.documents ?? []) {
    formData.append(
      "documents",
      documentFile
    );
  }

  return apiRequest("/accounting/expenses", {
    method: "POST",
    body: formData,
  });
}

export function addAccountingExpenseDocuments(
  expenseId,
  documents
) {
  const formData = new FormData();

  for (const documentFile of documents ?? []) {
    formData.append(
      "documents",
      documentFile
    );
  }

  return apiRequest(
    `/accounting/expenses/${expenseId}/documents`,
    {
      method: "POST",
      body: formData,
    }
  );
}

export function updateAccountingExpense(
  expenseId,
  payload
) {
  return apiRequest(
    `/accounting/expenses/${expenseId}`,
    {
      method: "PATCH",
      body: payload,
    }
  );
}

export function distributeAccountingExpense(
  expenseId,
  payload
) {
  return apiRequest(
    `/accounting/expenses/${expenseId}/distribute`,
    {
      method: "POST",
      body: payload,
    }
  );
}

export function cancelAccountingExpense(
  expenseId,
  reason
) {
  return apiRequest(
    `/accounting/expenses/${expenseId}/cancel`,
    {
      method: "PATCH",
      body: {
        reason,
      },
    }
  );
}

export async function downloadAccountingExpenseDocument({
  expenseId,
  documentId,
  fileName,
}) {
  const response = await fetch(
    `${API_BASE_URL}/accounting/expenses/${expenseId}/documents/${documentId}/download`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  if (!response.ok) {
    const result = await response
      .json()
      .catch(() => null);

    throw new Error(
      result?.message ??
        "Gider belgesi indirilemedi."
    );
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = fileName || "gider-belgesi";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(objectUrl);
}

export function getResidentAccountingExpenses(
  params = {}
) {
  return apiRequest(
    `/accounting/resident/expenses${buildQueryString(
      params
    )}`
  );
}

export function getResidentAccountingExpense(
  expenseId
) {
  return apiRequest(
    `/accounting/resident/expenses/${expenseId}`
  );
}

export function getResidentAccountingExpenseDocumentViewUrl({
  expenseId,
  documentId,
}) {
  return (
    `${API_BASE_URL}/accounting/resident/expenses/${expenseId}` +
    `/documents/${documentId}/view`
  );
}

export async function getResidentAccountingExpenseDocumentBlob({
  expenseId,
  documentId,
}) {
  const response = await fetch(
    getResidentAccountingExpenseDocumentViewUrl({
      expenseId,
      documentId,
    }),
    {
      method: "GET",
      credentials: "include",
    }
  );

  if (!response.ok) {
    const result = await response
      .json()
      .catch(() => null);

    throw new Error(
      result?.message ??
        "Gider belgesi görüntülenemedi."
    );
  }

  return response.blob();
}