import { createHash } from "node:crypto";

import prisma from "../db/prisma.js";
import { type Prisma } from "../generated/prisma/client.js";
import { type NotificationDispatchJobData } from "../queues/notification.queues.js";
import {
  createNotificationLog,
  queueEmailNotification,
  queueSmsNotification,
} from "./notification.service.js";

type AnnouncementTargetType = "ALL" | "SITE" | "BLOCK" | "APARTMENT";

type NotificationDispatchSummary = {
  recipientCount: number;
  emailNotificationCount: number;
  smsNotificationCount: number;
  skippedNotificationCount: number;
};

function createEmptySummary(): NotificationDispatchSummary {
  return {
    recipientCount: 0,
    emailNotificationCount: 0,
    smsNotificationCount: 0,
    skippedNotificationCount: 0,
  };
}

function buildStableNotificationLogId(parts: string[]) {
  const hash = createHash("sha256")
    .update(parts.join(""))
    .digest("hex");

  // NotificationLog id alanı UUID biçiminde kalır ve retry sırasında sabittir.
  return (
    `${hash.slice(0, 8)}-${hash.slice(8, 12)}-` +
    `5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-` +
    hash.slice(20, 32)
  );
}

function formatKurusAsTry(amountKurus: number) {
  return (amountKurus / 100).toFixed(2);
}

async function processPaymentBatchDispatch(
  data: Extract<NotificationDispatchJobData, { kind: "PAYMENT_BATCH" }>
) {
  const summary = createEmptySummary();

  if (!data.sendSms && !data.sendEmail) {
    return summary;
  }

  const paymentBatch = await prisma.paymentBatch.findUnique({
    where: {
      id: data.paymentBatchId,
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      allocations: {
        where: {
          status: "PENDING",
        },
        select: {
          amountKurus: true,
          apartment: {
            select: {
              number: true,
              residents: {
                where: {
                  user: {
                    status: "ACTIVE",
                  },
                },
                select: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!paymentBatch) {
    throw new Error(`Ödeme bulunamadı: ${data.paymentBatchId}`);
  }

  const recipientMap = new Map<
    string,
    {
      id: string;
      email: string;
      phone: string | null;
      totalAmountKurus: number;
      apartmentNumbers: string[];
    }
  >();

  for (const allocation of paymentBatch.allocations) {
    for (const resident of allocation.apartment.residents) {
      const existingRecipient = recipientMap.get(resident.user.id);

      if (existingRecipient) {
        existingRecipient.totalAmountKurus += allocation.amountKurus;
        existingRecipient.apartmentNumbers.push(allocation.apartment.number);
        continue;
      }

      recipientMap.set(resident.user.id, {
        id: resident.user.id,
        email: resident.user.email,
        phone: resident.user.phone,
        totalAmountKurus: allocation.amountKurus,
        apartmentNumbers: [allocation.apartment.number],
      });
    }
  }

  const recipients = Array.from(recipientMap.values());
  summary.recipientCount = recipients.length;

  const notificationJobs: Promise<unknown>[] = [];

  for (const recipient of recipients) {
    const amountText = formatKurusAsTry(recipient.totalAmountKurus);
    const apartmentsText = recipient.apartmentNumbers.join(", ");
    const dueDateText = paymentBatch.dueDate.toISOString().slice(0, 10);

    const message =
      `Yeni ödeme oluşturuldu: ${paymentBatch.title}. ` +
      `Daire: ${apartmentsText}. ` +
      `Tutar: ${amountText} TL. ` +
      `Son ödeme tarihi: ${dueDateText}.`;

    const metadata = {
      purpose: "PAYMENT_BATCH",
      paymentBatchId: paymentBatch.id,
      apartmentNumbers: recipient.apartmentNumbers,
      totalAmountKurus: recipient.totalAmountKurus,
      dueDate: paymentBatch.dueDate.toISOString(),
    } as Prisma.InputJsonObject;

    if (data.sendEmail && recipient.email) {
      summary.emailNotificationCount += 1;

      notificationJobs.push(
        queueEmailNotification({
          notificationLogId: buildStableNotificationLogId([
            "PAYMENT_BATCH",
            paymentBatch.id,
            "EMAIL",
            recipient.id,
          ]),
          recipientUserId: recipient.id,
          recipientEmail: recipient.email,
          subject: paymentBatch.title,
          message,
          sourceType: "PAYMENT_BATCH",
          entityType: "PaymentBatch",
          entityId: paymentBatch.id,
          metadata,
          createdByUserId: data.createdByUserId,
        })
      );
    }

    if (data.sendSms && recipient.phone) {
      summary.smsNotificationCount += 1;

      notificationJobs.push(
        queueSmsNotification({
          notificationLogId: buildStableNotificationLogId([
            "PAYMENT_BATCH",
            paymentBatch.id,
            "SMS",
            recipient.id,
          ]),
          recipientUserId: recipient.id,
          recipientPhone: recipient.phone,
          message,
          sourceType: "PAYMENT_BATCH",
          entityType: "PaymentBatch",
          entityId: paymentBatch.id,
          metadata,
          createdByUserId: data.createdByUserId,
        })
      );
    }
  }

  await Promise.all(notificationJobs);
  return summary;
}

async function getAnnouncementRecipients(params: {
  targetType: AnnouncementTargetType;
  siteId: string | null;
  blockId: string | null;
  apartmentId: string | null;
}) {
  const apartmentResidentWhere: Prisma.ApartmentResidentWhereInput = {};

  if (params.targetType === "SITE" && params.siteId) {
    apartmentResidentWhere.apartment = {
      block: {
        siteId: params.siteId,
      },
    };
  }

  if (params.targetType === "BLOCK" && params.blockId) {
    apartmentResidentWhere.apartment = {
      blockId: params.blockId,
    };
  }

  if (params.targetType === "APARTMENT" && params.apartmentId) {
    apartmentResidentWhere.apartmentId = params.apartmentId;
  }

  return prisma.user.findMany({
    where: {
      status: "ACTIVE",
      apartmentResidents: {
        some: apartmentResidentWhere,
      },
    },
    select: {
      id: true,
      email: true,
      phone: true,
    },
  });
}

async function processAnnouncementDispatch(
  data: Extract<NotificationDispatchJobData, { kind: "ANNOUNCEMENT" }>
) {
  const summary = createEmptySummary();

  const announcement = await prisma.announcement.findUnique({
    where: {
      id: data.announcementId,
    },
    select: {
      id: true,
      title: true,
      content: true,
      targetType: true,
      siteId: true,
      blockId: true,
      apartmentId: true,
    },
  });

  if (!announcement) {
    throw new Error(`Duyuru bulunamadı: ${data.announcementId}`);
  }

  const metadata = {
    purpose: "ANNOUNCEMENT",
    targetType: announcement.targetType,
    ...(announcement.siteId ? { siteId: announcement.siteId } : {}),
    ...(announcement.blockId ? { blockId: announcement.blockId } : {}),
    ...(announcement.apartmentId
      ? { apartmentId: announcement.apartmentId }
      : {}),
  } as Prisma.InputJsonObject;

  if (!data.sendSms && !data.sendEmail) {
    summary.skippedNotificationCount += 1;

    await createNotificationLog({
      id: buildStableNotificationLogId([
        "ANNOUNCEMENT",
        announcement.id,
        "NO_CHANNEL",
      ]),
      channel: "EMAIL",
      status: "SKIPPED",
      sourceType: "ANNOUNCEMENT",
      subject: announcement.title,
      message: announcement.content,
      entityType: "Announcement",
      entityId: announcement.id,
      errorMessage:
        "Duyuru oluşturuldu ancak SMS/E-posta gönderimi seçilmedi.",
      metadata,
      createdByUserId: data.createdByUserId,
    });

    return summary;
  }

  const recipients = await getAnnouncementRecipients({
    targetType: announcement.targetType,
    siteId: announcement.siteId,
    blockId: announcement.blockId,
    apartmentId: announcement.apartmentId,
  });

  summary.recipientCount = recipients.length;
  const notificationJobs: Promise<unknown>[] = [];

  if (recipients.length === 0) {
    if (data.sendEmail) {
      summary.skippedNotificationCount += 1;
      notificationJobs.push(
        createNotificationLog({
          id: buildStableNotificationLogId([
            "ANNOUNCEMENT",
            announcement.id,
            "EMAIL",
            "NO_RECIPIENT",
          ]),
          channel: "EMAIL",
          status: "SKIPPED",
          sourceType: "ANNOUNCEMENT",
          subject: announcement.title,
          message: announcement.content,
          entityType: "Announcement",
          entityId: announcement.id,
          errorMessage: "Duyuru hedefinde aktif sakin bulunamadı.",
          metadata,
          createdByUserId: data.createdByUserId,
        })
      );
    }

    if (data.sendSms) {
      summary.skippedNotificationCount += 1;
      notificationJobs.push(
        createNotificationLog({
          id: buildStableNotificationLogId([
            "ANNOUNCEMENT",
            announcement.id,
            "SMS",
            "NO_RECIPIENT",
          ]),
          channel: "SMS",
          status: "SKIPPED",
          sourceType: "ANNOUNCEMENT",
          message: `${announcement.title}: ${announcement.content}`,
          entityType: "Announcement",
          entityId: announcement.id,
          errorMessage: "Duyuru hedefinde aktif sakin bulunamadı.",
          metadata,
          createdByUserId: data.createdByUserId,
        })
      );
    }

    await Promise.all(notificationJobs);
    return summary;
  }

  let emailRecipientCount = 0;
  let smsRecipientCount = 0;

  for (const recipient of recipients) {
    if (data.sendEmail && recipient.email) {
      emailRecipientCount += 1;
      summary.emailNotificationCount += 1;

      notificationJobs.push(
        queueEmailNotification({
          notificationLogId: buildStableNotificationLogId([
            "ANNOUNCEMENT",
            announcement.id,
            "EMAIL",
            recipient.id,
          ]),
          recipientUserId: recipient.id,
          recipientEmail: recipient.email,
          subject: announcement.title,
          message: announcement.content,
          sourceType: "ANNOUNCEMENT",
          entityType: "Announcement",
          entityId: announcement.id,
          metadata,
          createdByUserId: data.createdByUserId,
        })
      );
    }

    if (data.sendSms && recipient.phone) {
      smsRecipientCount += 1;
      summary.smsNotificationCount += 1;

      notificationJobs.push(
        queueSmsNotification({
          notificationLogId: buildStableNotificationLogId([
            "ANNOUNCEMENT",
            announcement.id,
            "SMS",
            recipient.id,
          ]),
          recipientUserId: recipient.id,
          recipientPhone: recipient.phone,
          message: `${announcement.title}: ${announcement.content}`,
          sourceType: "ANNOUNCEMENT",
          entityType: "Announcement",
          entityId: announcement.id,
          metadata,
          createdByUserId: data.createdByUserId,
        })
      );
    }
  }

  if (data.sendEmail && emailRecipientCount === 0) {
    summary.skippedNotificationCount += 1;
    notificationJobs.push(
      createNotificationLog({
        id: buildStableNotificationLogId([
          "ANNOUNCEMENT",
          announcement.id,
          "EMAIL",
          "NO_CONTACT",
        ]),
        channel: "EMAIL",
        status: "SKIPPED",
        sourceType: "ANNOUNCEMENT",
        subject: announcement.title,
        message: announcement.content,
        entityType: "Announcement",
        entityId: announcement.id,
        errorMessage: "Hedef sakinlerde e-posta adresi bulunamadı.",
        metadata,
        createdByUserId: data.createdByUserId,
      })
    );
  }

  if (data.sendSms && smsRecipientCount === 0) {
    summary.skippedNotificationCount += 1;
    notificationJobs.push(
      createNotificationLog({
        id: buildStableNotificationLogId([
          "ANNOUNCEMENT",
          announcement.id,
          "SMS",
          "NO_CONTACT",
        ]),
        channel: "SMS",
        status: "SKIPPED",
        sourceType: "ANNOUNCEMENT",
        message: `${announcement.title}: ${announcement.content}`,
        entityType: "Announcement",
        entityId: announcement.id,
        errorMessage: "Hedef sakinlerde telefon numarası bulunamadı.",
        metadata,
        createdByUserId: data.createdByUserId,
      })
    );
  }

  await Promise.all(notificationJobs);
  return summary;
}

export async function processNotificationDispatch(
  data: NotificationDispatchJobData
) {
  if (data.kind === "PAYMENT_BATCH") {
    return processPaymentBatchDispatch(data);
  }

  if (data.kind === "ANNOUNCEMENT") {
    return processAnnouncementDispatch(data);
  }

  const unsupportedData: never = data;
  throw new Error(`Desteklenmeyen bildirim hazırlama işi: ${unsupportedData}`);
}
