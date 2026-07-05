import { afterAll, beforeAll, describe, expect, it } from "vitest";

import prisma from "../src/db/prisma.js";
import { queueSmsNotification } from "../src/services/notification.service.js";

const testRecipientPhone = "+905551112233";
const testEntityId = "sms-queue-skipped-test";

let activeSmsSettingIds: string[] = [];

async function cleanupTestData() {
  await prisma.notificationLog.deleteMany({
    where: {
      OR: [
        {
          recipientPhone: testRecipientPhone,
        },
        {
          entityId: testEntityId,
        },
      ],
    },
  });
}

describe("SMS Notification Queue", () => {
  beforeAll(async () => {
    await cleanupTestData();

    const activeSmsSettings = await prisma.smsSetting.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    activeSmsSettingIds = activeSmsSettings.map((setting) => {
      return setting.id;
    });

    if (activeSmsSettingIds.length > 0) {
      await prisma.smsSetting.updateMany({
        where: {
          id: {
            in: activeSmsSettingIds,
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

    if (activeSmsSettingIds.length > 0) {
      await prisma.smsSetting.updateMany({
        where: {
          id: {
            in: activeSmsSettingIds,
          },
        },
        data: {
          status: "ACTIVE",
        },
      });
    }
  });

  it("queueSmsNotification should create SKIPPED log when there is no active SMS setting", async () => {
    const notificationLog = await queueSmsNotification({
      recipientPhone: testRecipientPhone,
      message: "SMS queue skipped test message",
      sourceType: "SYSTEM",
      entityType: "TestEntity",
      entityId: testEntityId,
    });

    expect(notificationLog.channel).toBe("SMS");
    expect(notificationLog.status).toBe("SKIPPED");
    expect(notificationLog.recipientPhone).toBe(testRecipientPhone);
    expect(notificationLog.errorMessage).toBe("Aktif SMS ayarı bulunamadı.");
    expect(notificationLog.sentAt).toBeNull();
  });
});
