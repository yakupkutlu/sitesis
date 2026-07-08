import prisma from "../db/prisma.js";
import { type Prisma } from "../generated/prisma/client.js";
import { sendEmailWithActiveSmtp } from "./email-sender.service.js";

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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Bilinmeyen hata oluştu.";
}

export async function createNotificationLog(input: CreateNotificationLogInput) {

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

export async function queueEmailNotification(input: {
  recipientUserId?: string;
  recipientEmail: string;
  subject: string;
  message: string;
  sourceType?: NotificationSourceType;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  createdByUserId?: string;
}) {
  const activeEmailSetting = await prisma.emailSetting.findFirst({
    where: {
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      provider: true,
    },
  });

  if (!activeEmailSetting) {
    return createNotificationLog({
      channel: "EMAIL",
      status: "SKIPPED",
      sourceType: input.sourceType ?? "SYSTEM",
      recipientUserId: input.recipientUserId,
      recipientEmail: input.recipientEmail,
      subject: input.subject,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
      errorMessage: "Aktif e-posta ayarı bulunamadı.",
      metadata: input.metadata,
      createdByUserId: input.createdByUserId,
    });
  }

  if (activeEmailSetting.provider !== "SMTP") {
    return createNotificationLog({
      channel: "EMAIL",
      status: "SKIPPED",
      sourceType: input.sourceType ?? "SYSTEM",
      recipientUserId: input.recipientUserId,
      recipientEmail: input.recipientEmail,
      subject: input.subject,
      message: input.message,
      provider: activeEmailSetting.provider,
      entityType: input.entityType,
      entityId: input.entityId,
      errorMessage: "Bu e-posta sağlayıcısı için gerçek gönderim henüz aktif değildir.",
      metadata: input.metadata,
      createdByUserId: input.createdByUserId,
    });
  }

  try {
    const result = await sendEmailWithActiveSmtp({
      to: input.recipientEmail,
      subject: input.subject,
      message: input.message,
    });

    return createNotificationLog({
      channel: "EMAIL",
      status: "SENT",
      sourceType: input.sourceType ?? "SYSTEM",
      recipientUserId: input.recipientUserId,
      recipientEmail: input.recipientEmail,
      subject: input.subject,
      message: input.message,
      provider: result.provider,
      providerMessageId: result.providerMessageId,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      createdByUserId: input.createdByUserId,
    });
  } catch (error) {
    return createNotificationLog({
      channel: "EMAIL",
      status: "FAILED",
      sourceType: input.sourceType ?? "SYSTEM",
      recipientUserId: input.recipientUserId,
      recipientEmail: input.recipientEmail,
      subject: input.subject,
      message: input.message,
      provider: activeEmailSetting.provider,
      entityType: input.entityType,
      entityId: input.entityId,
      errorMessage: getErrorMessage(error),
      metadata: input.metadata,
      createdByUserId: input.createdByUserId,
    });
  }
}

export async function queueSmsNotification(input: {
  recipientUserId?: string;
  recipientPhone: string;
  message: string;
  sourceType?: NotificationSourceType;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  createdByUserId?: string;
}) {
  const activeSmsSetting = await prisma.smsSetting.findFirst({
    where: {
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      provider: true,
    },
  });

  if (!activeSmsSetting) {
    return createNotificationLog({
      channel: "SMS",
      status: "SKIPPED",
      sourceType: input.sourceType ?? "SYSTEM",
      recipientUserId: input.recipientUserId,
      recipientPhone: input.recipientPhone,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
      errorMessage: "Aktif SMS ayarı bulunamadı.",
      metadata: input.metadata,
      createdByUserId: input.createdByUserId,
    });
  }

  return createNotificationLog({
    channel: "SMS",
    status: "PENDING",
    sourceType: input.sourceType ?? "SYSTEM",
    recipientUserId: input.recipientUserId,
    recipientPhone: input.recipientPhone,
    message: input.message,
    provider: activeSmsSetting.provider,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
    createdByUserId: input.createdByUserId,
  });
}


