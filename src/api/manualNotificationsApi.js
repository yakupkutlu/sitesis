import { apiRequest } from "./client";

function normalizeStringArray(values = []) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function buildManualNotificationPayload({
  channel,
  recipientUserIds = [],
  directRecipients = [],
  subject,
  message,
}) {
  const payload = {
    channel,
    recipientUserIds: [...new Set(recipientUserIds)],
    directRecipients: normalizeStringArray(directRecipients),
    message: message.trim(),
  };

  if (channel === "EMAIL") {
    payload.subject = subject?.trim() ?? "";
  }

  return payload;
}

export async function sendManualNotification(payload) {
  return apiRequest("/manual-notifications", {
    method: "POST",
    body: buildManualNotificationPayload(payload),
  });
}

export async function sendManualSms({
  recipientUserIds = [],
  directRecipients = [],
  message,
}) {
  return sendManualNotification({
    channel: "SMS",
    recipientUserIds,
    directRecipients,
    message,
  });
}

export async function sendManualEmail({
  recipientUserIds = [],
  directRecipients = [],
  subject,
  message,
}) {
  return sendManualNotification({
    channel: "EMAIL",
    recipientUserIds,
    directRecipients,
    subject,
    message,
  });
}