import prisma from "../db/prisma.js";
import { type Prisma } from "../generated/prisma/client.js";
import {
  addEmailNotificationJob,
  addSmsNotificationJob,
} from "../queues/notification.queues.js";

type NotificationChannel = "SMS" | "EMAIL";
type NotificationStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";
type NotificationSourceType =
  | "MANUAL"
  | "PAYMENT_BATCH"
  | "ANNOUNCEMENT"
  | "RESIDENT_REQUEST"
  | "SYSTEM";

type CreateNotificationLogInput = {
  channel: NotificationChannel;
  status?: NotificationStatus;
  sourceType?: NotificationSourceType;

  recipientUserId?: string;
  recipientEmail?: string;
  recipientPhone?: string;

  subject?: string;
  message: string;

  provider?: string;
  providerMessageId?: string;

  entityType?: string;
  entityId?: string;

  errorMessage?: string;
  metadata?: Prisma.InputJsonValue;

  createdByUserId?: string;
};

type QueueEmailNotificationInput = {
  recipientUserId?: string;
  recipientEmail: string;
  subject: string;
  message: string;
  sourceType?: NotificationSourceType;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  createdByUserId?: string;
};

type QueueSmsNotificationInput = {
  recipientUserId?: string;
  recipientPhone: string;
  message: string;
  sourceType?: NotificationSourceType;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  createdByUserId?: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Bilinmeyen kuyruk hatası oluştu.";
}

export async function createNotificationLog(input: CreateNotificationLogInput) {
  const hasRecipient = Boolean(
    input.recipientUserId ||
      input.recipientEmail ||
      input.recipientPhone
  );

  // Duyuru hedefinde kullanıcı bulunmaması gibi genel SKIPPED kayıtlarında
  // alıcı olmayabilir. Gönderilecek diğer kayıtlar mutlaka alıcı içermelidir.
  if (!hasRecipient && input.status !== "SKIPPED") {
    throw new Error("En az bir alıcı bilgisi gönderilmelidir.");
  }

  return prisma.notificationLog.create({
    data: {
      channel: input.channel,
      status: input.status ?? "PENDING",
      sourceType: input.sourceType ?? "SYSTEM",

      recipientUserId: input.recipientUserId,
      recipientEmail: input.recipientEmail,
      recipientPhone: input.recipientPhone,

      subject: input.subject,
      message: input.message,

      provider: input.provider,
      providerMessageId: input.providerMessageId,

      entityType: input.entityType,
      entityId: input.entityId,

      errorMessage: input.errorMessage,
      metadata: input.metadata,

      createdByUserId: input.createdByUserId,
      sentAt: input.status === "SENT" ? new Date() : null,
    },
  });
}

async function markQueueFailure(
  notificationLogId: string,
  error: unknown
) {
  return prisma.notificationLog.update({
    where: {
      id: notificationLogId,
    },
    data: {
      status: "FAILED",
      errorMessage: `Bildirim kuyruğa eklenemedi: ${getErrorMessage(error)}`,
      sentAt: null,
    },
  });
}

export async function queueEmailNotification(
  input: QueueEmailNotificationInput
) {
  const notificationLog = await createNotificationLog({
    channel: "EMAIL",
    status: "PENDING",
    sourceType: input.sourceType ?? "SYSTEM",
    recipientUserId: input.recipientUserId,
    recipientEmail: input.recipientEmail,
    subject: input.subject,
    message: input.message,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
    createdByUserId: input.createdByUserId,
  });

  try {
    await addEmailNotificationJob(notificationLog.id);
    return notificationLog;
  } catch (error) {
    return markQueueFailure(notificationLog.id, error);
  }
}

export async function queueSmsNotification(
  input: QueueSmsNotificationInput
) {
  const notificationLog = await createNotificationLog({
    channel: "SMS",
    status: "PENDING",
    sourceType: input.sourceType ?? "SYSTEM",
    recipientUserId: input.recipientUserId,
    recipientPhone: input.recipientPhone,
    message: input.message,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
    createdByUserId: input.createdByUserId,
  });

  try {
    await addSmsNotificationJob(notificationLog.id);
    return notificationLog;
  } catch (error) {
    return markQueueFailure(notificationLog.id, error);
  }
}
