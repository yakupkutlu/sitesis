import {
  UnrecoverableError,
  Worker,
  type Job,
} from "bullmq";

import { notificationWorkerConnection } from "../config/redis.js";
import prisma from "../db/prisma.js";
import {
  EMAIL_NOTIFICATION_QUEUE_NAME,
  SMS_NOTIFICATION_QUEUE_NAME,
  type NotificationJobData,
} from "../queues/notification.queues.js";
import { sendEmailWithActiveSmtp } from "../services/email-sender.service.js";
import { sendSmsWithActiveProvider } from "../services/sms-sender.service.js";

const workers: Worker<NotificationJobData>[] = [];

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Bilinmeyen gönderim hatası oluştu.";
}

function getValidSettingWhere() {
  return {
    status: "ACTIVE" as const,
    OR: [
      {
        expiresAt: null,
      },
      {
        expiresAt: {
          gte: new Date(),
        },
      },
    ],
  };
}

async function getNotificationLog(
  job: Job<NotificationJobData>,
  expectedChannel: "EMAIL" | "SMS"
) {
  const notificationLog = await prisma.notificationLog.findUnique({
    where: {
      id: job.data.notificationLogId,
    },
  });

  if (!notificationLog) {
    throw new UnrecoverableError(
      `NotificationLog bulunamadı: ${job.data.notificationLogId}`
    );
  }

  if (notificationLog.channel !== expectedChannel) {
    throw new UnrecoverableError(
      `Bildirim kanalı uyuşmuyor. Beklenen: ${expectedChannel}`
    );
  }

  return notificationLog;
}

async function markSkipped(params: {
  notificationLogId: string;
  provider?: string;
  reason: string;
}) {
  return prisma.notificationLog.update({
    where: {
      id: params.notificationLogId,
    },
    data: {
      status: "SKIPPED",
      provider: params.provider,
      providerMessageId: null,
      errorMessage: params.reason,
      sentAt: null,
    },
  });
}

async function markSent(params: {
  notificationLogId: string;
  provider: string;
  providerMessageId?: string;
}) {
  return prisma.notificationLog.update({
    where: {
      id: params.notificationLogId,
    },
    data: {
      status: "SENT",
      provider: params.provider,
      providerMessageId: params.providerMessageId,
      errorMessage: null,
      sentAt: new Date(),
    },
  });
}

async function recordAttemptFailure(params: {
  job: Job<NotificationJobData>;
  notificationLogId: string;
  provider?: string;
  error: unknown;
}) {
  const configuredAttempts = Math.max(
    1,
    Number(params.job.opts.attempts ?? 1)
  );

  const currentAttempt = params.job.attemptsMade + 1;
  const isFinalAttempt = currentAttempt >= configuredAttempts;
  const errorMessage = getErrorMessage(params.error);

  await prisma.notificationLog.update({
    where: {
      id: params.notificationLogId,
    },
    data: {
      status: isFinalAttempt ? "FAILED" : "PENDING",
      provider: params.provider,
      providerMessageId: null,
      errorMessage: isFinalAttempt
        ? errorMessage
        : `${errorMessage} Yeniden denenecek (${currentAttempt}/${configuredAttempts}).`,
      sentAt: null,
    },
  });

  // BullMQ'nun yeniden deneme/backoff işlemini çalıştırması için hata fırlatılır.
  throw params.error instanceof Error
    ? params.error
    : new Error(errorMessage);
}

async function processEmailNotification(job: Job<NotificationJobData>) {
  const notificationLog = await getNotificationLog(job, "EMAIL");

  // Worker yeniden başlarken tamamlanmış bir job tekrar görülürse
  // aynı bildirimi ikinci kez göndermemeye çalışır.
  if (
    notificationLog.status === "SENT" ||
    notificationLog.status === "SKIPPED"
  ) {
    return {
      notificationLogId: notificationLog.id,
      status: notificationLog.status,
    };
  }

  if (!notificationLog.recipientEmail) {
    await markSkipped({
      notificationLogId: notificationLog.id,
      reason: "Alıcı e-posta adresi bulunamadı.",
    });

    return {
      notificationLogId: notificationLog.id,
      status: "SKIPPED",
    };
  }

  const activeEmailSetting = await prisma.emailSetting.findFirst({
    where: getValidSettingWhere(),
    orderBy: {
      createdAt: "desc",
    },
    select: {
      provider: true,
    },
  });

  if (!activeEmailSetting) {
    await markSkipped({
      notificationLogId: notificationLog.id,
      reason:
        "Aktif ve son kullanım tarihi geçmemiş e-posta ayarı bulunamadı.",
    });

    return {
      notificationLogId: notificationLog.id,
      status: "SKIPPED",
    };
  }

  if (activeEmailSetting.provider !== "SMTP") {
    await markSkipped({
      notificationLogId: notificationLog.id,
      provider: activeEmailSetting.provider,
      reason:
        "Bu e-posta sağlayıcısı için gerçek gönderim henüz aktif değildir.",
    });

    return {
      notificationLogId: notificationLog.id,
      status: "SKIPPED",
    };
  }

  try {
    const result = await sendEmailWithActiveSmtp({
      to: notificationLog.recipientEmail,
      subject: notificationLog.subject ?? "",
      message: notificationLog.message,
    });

    await markSent({
      notificationLogId: notificationLog.id,
      provider: result.provider,
      providerMessageId: result.providerMessageId,
    });

    return {
      notificationLogId: notificationLog.id,
      status: "SENT",
    };
  } catch (error) {
    return recordAttemptFailure({
      job,
      notificationLogId: notificationLog.id,
      provider: activeEmailSetting.provider,
      error,
    });
  }
}

async function processSmsNotification(job: Job<NotificationJobData>) {
  const notificationLog = await getNotificationLog(job, "SMS");

  if (
    notificationLog.status === "SENT" ||
    notificationLog.status === "SKIPPED"
  ) {
    return {
      notificationLogId: notificationLog.id,
      status: notificationLog.status,
    };
  }

  if (!notificationLog.recipientPhone) {
    await markSkipped({
      notificationLogId: notificationLog.id,
      reason: "Alıcı telefon numarası bulunamadı.",
    });

    return {
      notificationLogId: notificationLog.id,
      status: "SKIPPED",
    };
  }

  const activeSmsSetting = await prisma.smsSetting.findFirst({
    where: getValidSettingWhere(),
    orderBy: {
      createdAt: "desc",
    },
    select: {
      provider: true,
    },
  });

  if (!activeSmsSetting) {
    await markSkipped({
      notificationLogId: notificationLog.id,
      reason:
        "Aktif ve son kullanım tarihi geçmemiş SMS ayarı bulunamadı.",
    });

    return {
      notificationLogId: notificationLog.id,
      status: "SKIPPED",
    };
  }

  try {
    const result = await sendSmsWithActiveProvider({
      to: notificationLog.recipientPhone,
      message: notificationLog.message,
    });

    await markSent({
      notificationLogId: notificationLog.id,
      provider: result.provider,
      providerMessageId: result.providerMessageId,
    });

    return {
      notificationLogId: notificationLog.id,
      status: "SENT",
    };
  } catch (error) {
    return recordAttemptFailure({
      job,
      notificationLogId: notificationLog.id,
      provider: activeSmsSetting.provider,
      error,
    });
  }
}

function registerWorkerLogging(
  worker: Worker<NotificationJobData>,
  label: string
) {
  worker.on("completed", (job) => {
    console.log(
      `[${label}] Bildirim tamamlandı. Job: ${job.id ?? "bilinmiyor"}`
    );
  });

  worker.on("failed", (job, error) => {
    console.error(
      `[${label}] Bildirim denemesi başarısız. Job: ${
        job?.id ?? "bilinmiyor"
      }`,
      error.message
    );
  });

  worker.on("error", (error) => {
    console.error(`[${label}] Worker hatası:`, error);
  });
}

export function startNotificationWorkers() {
  if (workers.length > 0) {
    return workers;
  }

  const emailWorker = new Worker<NotificationJobData>(
    EMAIL_NOTIFICATION_QUEUE_NAME,
    processEmailNotification,
    {
      connection: notificationWorkerConnection,
      concurrency: 1,
    }
  );

  const smsWorker = new Worker<NotificationJobData>(
    SMS_NOTIFICATION_QUEUE_NAME,
    processSmsNotification,
    {
      connection: notificationWorkerConnection,
      concurrency: 1,
    }
  );

  registerWorkerLogging(emailWorker, "EMAIL");
  registerWorkerLogging(smsWorker, "SMS");

  workers.push(emailWorker, smsWorker);

  return workers;
}

export async function closeNotificationWorkers() {
  const activeWorkers = workers.splice(0, workers.length);

  await Promise.allSettled(
    activeWorkers.map((worker) => worker.close())
  );
}
