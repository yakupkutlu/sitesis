import { randomUUID } from "node:crypto";

import prisma from "../db/prisma.js";
import { type Prisma } from "../generated/prisma/client.js";
import {
  createNotificationLog,
  queueEmailNotification,
  queueSmsNotification,
} from "./notification.service.js";

type ManualNotificationChannel = "SMS" | "EMAIL";
type NotificationStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";
type RecipientSource = "USER" | "DIRECT";

type SendManualNotificationBatchInput = {
  channel: ManualNotificationChannel;
  recipientUserIds?: string[];
  directRecipients?: string[];
  subject?: string;
  message: string;
  createdByUserId: string;
};

type ResolvedRecipient = {
  userId?: string;
  contact: string;
  source: RecipientSource;
};

type NotificationResult = {
  id?: string;
  recipientUserId?: string;
  recipient: string;
  status: NotificationStatus;
  errorMessage?: string;
};

const MAX_RECIPIENT_COUNT = 100;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhoneForComparison(value: string) {
  return value.trim().replace(/[^\d+]/g, "").replace(/^00/, "+");
}

function getRecipientKey(channel: ManualNotificationChannel, contact: string) {
  return channel === "EMAIL"
    ? normalizeEmail(contact)
    : normalizePhoneForComparison(contact);
}

function deduplicateRecipients(
  channel: ManualNotificationChannel,
  recipients: ResolvedRecipient[]
) {
  const uniqueRecipients = new Map<string, ResolvedRecipient>();

  for (const recipient of recipients) {
    const key = getRecipientKey(channel, recipient.contact);

    if (key && !uniqueRecipients.has(key)) {
      uniqueRecipients.set(key, recipient);
    }
  }

  return [...uniqueRecipients.values()];
}

function buildBatchMetadata(params: {
  batchId: string;
  sequence: number;
  totalRecipients: number;
  source: RecipientSource;
}): Prisma.InputJsonValue {
  return {
    batchId: params.batchId,
    sequence: params.sequence,
    totalRecipients: params.totalRecipients,
    recipientSource: params.source,
  };
}

async function resolveUserRecipients(params: {
  channel: ManualNotificationChannel;
  recipientUserIds: string[];
}) {
  if (params.recipientUserIds.length === 0) {
    return {
      recipients: [] as ResolvedRecipient[],
      missingContactUserIds: [] as string[],
      unresolvedUserIds: [] as string[],
    };
  }

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: params.recipientUserIds,
      },
      status: "ACTIVE",
      role: {
        in: ["MANAGER", "RESIDENT"],
      },
    },
    select: {
      id: true,
      email: true,
      phone: true,
    },
  });

  const foundUserIds = new Set(users.map((user) => user.id));
  const unresolvedUserIds = params.recipientUserIds.filter(
    (userId) => !foundUserIds.has(userId)
  );

  const recipients: ResolvedRecipient[] = [];
  const missingContactUserIds: string[] = [];

  for (const user of users) {
    const contact =
      params.channel === "EMAIL" ? user.email?.trim() : user.phone?.trim();

    if (!contact) {
      missingContactUserIds.push(user.id);
      continue;
    }

    recipients.push({
      userId: user.id,
      contact,
      source: "USER",
    });
  }

  return {
    recipients,
    missingContactUserIds,
    unresolvedUserIds,
  };
}

async function createMissingContactLogs(params: {
  channel: ManualNotificationChannel;
  userIds: string[];
  subject?: string;
  message: string;
  batchId: string;
  createdByUserId: string;
  totalRecipients: number;
}) {
  const results: NotificationResult[] = [];
  const missingField = params.channel === "EMAIL" ? "e-posta" : "telefon";

  for (const [index, userId] of params.userIds.entries()) {
    const log = await createNotificationLog({
      channel: params.channel,
      status: "SKIPPED",
      sourceType: "MANUAL",
      recipientUserId: userId,
      ...(params.channel === "EMAIL" ? { subject: params.subject } : {}),
      message: params.message,
      entityType: "ManualNotificationBatch",
      entityId: params.batchId,
      errorMessage: `Kullanıcının ${missingField} bilgisi bulunamadı.`,
      metadata: buildBatchMetadata({
        batchId: params.batchId,
        sequence: index + 1,
        totalRecipients: params.totalRecipients,
        source: "USER",
      }),
      createdByUserId: params.createdByUserId,
    });

    results.push({
      id: log.id,
      recipientUserId: userId,
      recipient: "-",
      status: log.status,
      errorMessage: log.errorMessage ?? undefined,
    });
  }

  return results;
}

async function sendToRecipient(params: {
  channel: ManualNotificationChannel;
  recipient: ResolvedRecipient;
  subject?: string;
  message: string;
  batchId: string;
  sequence: number;
  totalRecipients: number;
  createdByUserId: string;
}): Promise<NotificationResult> {
  const metadata = buildBatchMetadata({
    batchId: params.batchId,
    sequence: params.sequence,
    totalRecipients: params.totalRecipients,
    source: params.recipient.source,
  });

  const commonInput = {
    recipientUserId: params.recipient.userId,
    sourceType: "MANUAL" as const,
    entityType: "ManualNotificationBatch",
    entityId: params.batchId,
    message: params.message,
    metadata,
    createdByUserId: params.createdByUserId,
  };

  const log =
    params.channel === "EMAIL"
      ? await queueEmailNotification({
          ...commonInput,
          recipientEmail: params.recipient.contact,
          subject: params.subject ?? "",
        })
      : await queueSmsNotification({
          ...commonInput,
          recipientPhone: params.recipient.contact,
        });

  return {
    id: log.id,
    recipientUserId: params.recipient.userId,
    recipient: params.recipient.contact,
    status: log.status,
    errorMessage: log.errorMessage ?? undefined,
  };
}

function buildSummary(results: NotificationResult[]) {
  return results.reduce(
    (summary, result) => {
      summary.total += 1;

      if (result.status === "SENT") summary.sent += 1;
      if (result.status === "FAILED") summary.failed += 1;
      if (result.status === "SKIPPED") summary.skipped += 1;
      if (result.status === "PENDING") summary.pending += 1;

      return summary;
    },
    {
      total: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      pending: 0,
    }
  );
}

export async function sendManualNotificationBatch(
  input: SendManualNotificationBatchInput
) {
  const message = input.message.trim();
  const subject = input.subject?.trim();

  if (!message) {
    throw new Error("Mesaj içeriği zorunludur.");
  }

  const recipientUserIds = [...new Set(input.recipientUserIds ?? [])];
  const directRecipients = (input.directRecipients ?? [])
    .map((recipient) => recipient.trim())
    .filter(Boolean);

  const resolvedUsers = await resolveUserRecipients({
    channel: input.channel,
    recipientUserIds,
  });

  const recipients = deduplicateRecipients(input.channel, [
    ...resolvedUsers.recipients,
    ...directRecipients.map((contact) => ({
      contact,
      source: "DIRECT" as const,
    })),
  ]);

  const totalAttemptCount =
    recipients.length + resolvedUsers.missingContactUserIds.length;

  if (totalAttemptCount === 0) {
    throw new Error("Gönderilecek geçerli alıcı bulunamadı.");
  }

  if (totalAttemptCount > MAX_RECIPIENT_COUNT) {
    throw new Error(
      `Tek seferde en fazla ${MAX_RECIPIENT_COUNT} alıcıya gönderim yapılabilir.`
    );
  }

  if (input.channel === "EMAIL" && !subject) {
    throw new Error("E-posta konusu zorunludur.");
  }

  const batchId = randomUUID();
  const results: NotificationResult[] = [];

  const missingContactResults = await createMissingContactLogs({
    channel: input.channel,
    userIds: resolvedUsers.missingContactUserIds,
    subject,
    message,
    batchId,
    createdByUserId: input.createdByUserId,
    totalRecipients: totalAttemptCount,
  });

  results.push(...missingContactResults);

  // Bilerek Promise.all kullanılmıyor. Gönderimler sağlayıcıya sırayla iletilir.
  for (const [index, recipient] of recipients.entries()) {
    try {
      const result = await sendToRecipient({
        channel: input.channel,
        recipient,
        subject,
        message,
        batchId,
        sequence: missingContactResults.length + index + 1,
        totalRecipients: totalAttemptCount,
        createdByUserId: input.createdByUserId,
      });

      results.push(result);
    } catch (error) {
      results.push({
        recipientUserId: recipient.userId,
        recipient: recipient.contact,
        status: "FAILED",
        errorMessage:
          error instanceof Error ? error.message : "Bilinmeyen hata oluştu.",
      });
    }
  }

  return {
    batchId,
    channel: input.channel,
    summary: buildSummary(results),
    unresolvedUserIds: resolvedUsers.unresolvedUserIds,
    results,
  };
}