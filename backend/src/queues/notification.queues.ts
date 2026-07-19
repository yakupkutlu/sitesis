import { Queue } from "bullmq";

import { notificationQueueConnection } from "../config/redis.js";

export const EMAIL_NOTIFICATION_QUEUE_NAME = "notification-email";
export const SMS_NOTIFICATION_QUEUE_NAME = "notification-sms";

export type NotificationJobData = {
  notificationLogId: string;
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
  // Birden fazla backend/worker çalışsa bile kanal başına yalnızca
  // bir bildirim aynı anda sağlayıcıya gönderilir.
  await Promise.all([
    emailNotificationQueue.setGlobalConcurrency(1),
    smsNotificationQueue.setGlobalConcurrency(1),
  ]);
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
    emailNotificationQueue.close(),
    smsNotificationQueue.close(),
  ]);
}
