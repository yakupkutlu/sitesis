import { afterAll, beforeAll, describe, expect, it } from "vitest";

import prisma from "../src/db/prisma.js";
import { queueEmailNotification } from "../src/services/notification.service.js";

const testRecipientEmail = "email-queue-skipped-recipient@example.com";
const testSubject = "Email Queue Skipped Test Subject";

let activeEmailSettingIds: string[] = [];

async function cleanupTestData() {
  await prisma.notificationLog.deleteMany({
    where: {
      OR: [
        {
          recipientEmail: testRecipientEmail,
        },
        {
          subject: testSubject,
        },
      ],
    },
  });
}

describe("Email Notification Queue", () => {
  beforeAll(async () => {
    await cleanupTestData();

    const activeEmailSettings = await prisma.emailSetting.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    activeEmailSettingIds = activeEmailSettings.map((setting) => {
      return setting.id;
    });

    if (activeEmailSettingIds.length > 0) {
      await prisma.emailSetting.updateMany({
        where: {
          id: {
            in: activeEmailSettingIds,
          },
        },
        data: {
          status: "PASSIVE",
        },
      });
    }
  });

  afterAll(async () => {
    await cleanupTestData();

    if (activeEmailSettingIds.length > 0) {
      await prisma.emailSetting.updateMany({
        where: {
          id: {
            in: activeEmailSettingIds,
          },
        },
        data: {
          status: "ACTIVE",
        },
      });
    }
  });

  it("queueEmailNotification should create SKIPPED log when there is no active email setting", async () => {
    const notificationLog = await queueEmailNotification({
      recipientEmail: testRecipientEmail,
      subject: testSubject,
      message: "Email queue skipped test message",
      sourceType: "SYSTEM",
      entityType: "TestEntity",
      entityId: "email-queue-skipped-test",
    });

    expect(notificationLog.channel).toBe("EMAIL");
    expect(notificationLog.status).toBe("SKIPPED");
    expect(notificationLog.recipientEmail).toBe(testRecipientEmail);
    expect(notificationLog.subject).toBe(testSubject);
    expect(notificationLog.errorMessage).toBe("Aktif e-posta ayarı bulunamadı.");
    expect(notificationLog.sentAt).toBeNull();
  });
});
