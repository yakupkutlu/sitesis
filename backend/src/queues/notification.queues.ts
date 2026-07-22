import { Queue } from "bullmq";

import { notificationQueueConnection } from "../config/redis.js";

export const NOTIFICATION_DISPATCH_QUEUE_NAME = "notification-dispatch";
export const EMAIL_NOTIFICATION_QUEUE_NAME = "notification-email";
export const SMS_NOTIFICATION_QUEUE_NAME = "notification-sms";

export type NotificationJobData = {
  notificationLogId: string;
};

export type NotificationDispatchJobData =
  | {
      kind: "PAYMENT_BATCH";
      paymentBatchId: string;
      sendSms: boolean;
      sendEmail: boolean;
      createdByUserId: string;
    }
  | {
      kind: "ANNOUNCEMENT";
      announcementId: string;
      sendSms: boolean;
      sendEmail: boolean;
      createdByUserId: string;
    };

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 3_000,
  },
  removeOnComplete: {
    age: 24 * 60 * 60,
    count: 2_000,
  },
  removeOnFail: {
    age: 7 * 24 * 60 * 60,
    count: 5_000,
  },
};

export const notificationDispatchQueue =
  new Queue<NotificationDispatchJobData>(
    NOTIFICATION_DISPATCH_QUEUE_NAME,
    {
      connection: notificationQueueConnection,
      defaultJobOptions,
    }
  );

export const emailNotificationQueue = new Queue<NotificationJobData>(
  EMAIL_NOTIFICATION_QUEUE_NAME,
  {
    connection: notificationQueueConnection,
    defaultJobOptions,
  }
);

export const smsNotificationQueue = new Queue<NotificationJobData>(
  SMS_NOTIFICATION_QUEUE_NAME,
  {
    connection: notificationQueueConnection,
    defaultJobOptions,
  }
);

export async function initializeNotificationQueues() {
  // Hazırlama işi arka planda alıcıları bulur ve kanal kuyruklarına dağıtır.
  // SMS ve e-posta kanalları kendi içinde sırayla gönderilir.
  await Promise.all([
    notificationDispatchQueue.setGlobalConcurrency(1),
    emailNotificationQueue.setGlobalConcurrency(1),
    smsNotificationQueue.setGlobalConcurrency(1),
  ]);
}

export async function addNotificationDispatchJob(
  data: NotificationDispatchJobData
) {
  const entityId =
    data.kind === "PAYMENT_BATCH"
      ? data.paymentBatchId
      : data.announcementId;

  const jobId = `${data.kind.toLowerCase().replaceAll("_", "-")}-${entityId}`;

  return notificationDispatchQueue.add(
    "prepare-notifications",
    data,
    {
      jobId,
    }
  );
}

export async function addEmailNotificationJob(notificationLogId: string) {
  return emailNotificationQueue.add(
    "send-email",
    {
      notificationLogId,
    },
    {
      jobId: notificationLogId,
    }
  );
}

export async function addSmsNotificationJob(notificationLogId: string) {
  return smsNotificationQueue.add(
    "send-sms",
    {
      notificationLogId,
    },
    {
      jobId: notificationLogId,
    }
  );
}

export async function closeNotificationQueues() {
  await Promise.allSettled([
    notificationDispatchQueue.close(),
    emailNotificationQueue.close(),
    smsNotificationQueue.close(),
  ]);
}
