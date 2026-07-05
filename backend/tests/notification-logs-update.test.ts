import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { accessTokenCookieName } from "../src/config/cookie.js";
import { csrfCookieName } from "../src/config/csrf.js";
import { env } from "../src/config/env.js";
import prisma from "../src/db/prisma.js";

const testSuperAdminEmail = "notification-log-update-test-admin@example.com";
const testRecipientEmail = "notification-log-update-recipient@example.com";
const testSubject = "Notification Log Update Test Subject";

let testSuperAdminId = "";
let notificationLogId = "";

async function cleanupTestData() {
  const notificationLogs = await prisma.notificationLog.findMany({
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
    select: {
      id: true,
    },
  });

  const notificationLogIds = notificationLogs.map((notificationLog) => {
    return notificationLog.id;
  });

  if (notificationLogIds.length > 0) {
    await prisma.auditLog.deleteMany({
      where: {
        entityType: "NotificationLog",
        entityId: {
          in: notificationLogIds,
        },
      },
    });

    await prisma.notificationLog.deleteMany({
      where: {
        id: {
          in: notificationLogIds,
        },
      },
    });
  }

  await prisma.user.deleteMany({
    where: {
      email: testSuperAdminEmail,
    },
  });
}

async function buildAuthenticatedRequest() {
  const csrfResponse = await request(app).get("/api/csrf-token");
  const csrfToken = csrfResponse.body.data.csrfToken;

  const accessToken = jwt.sign(
    {
      userId: testSuperAdminId,
      role: "SUPER_ADMIN",
    },
    env.JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );

  return {
    csrfToken,
    cookies: [
      `${csrfCookieName}=${csrfToken}`,
      `${accessTokenCookieName}=${accessToken}`,
    ],
  };
}

describe("Notification Log Update", () => {
  beforeAll(async () => {
    await cleanupTestData();

    const superAdmin = await prisma.user.create({
      data: {
        fullName: "Notification Log Update Test Admin",
        email: testSuperAdminEmail,
        phone: null,
        passwordHash: "test-password-hash",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    testSuperAdminId = superAdmin.id;

    const notificationLog = await prisma.notificationLog.create({
      data: {
        channel: "EMAIL",
        status: "PENDING",
        sourceType: "MANUAL",
        recipientEmail: testRecipientEmail,
        subject: testSubject,
        message: "Notification log update test message",
        provider: "TEST_PROVIDER",
        createdByUserId: testSuperAdminId,
      },
      select: {
        id: true,
      },
    });

    notificationLogId = notificationLog.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("PATCH /api/notification-logs/:notificationLogId should update notification log", async () => {
    const auth = await buildAuthenticatedRequest();
    const sentAt = new Date("2030-01-01T00:00:00.000Z").toISOString();

    const response = await request(app)
      .patch(`/api/notification-logs/${notificationLogId}`)
      .set("x-csrf-token", auth.csrfToken)
      .set("Cookie", auth.cookies)
      .send({
        status: "SENT",
        providerMessageId: "test-provider-message-id",
        errorMessage: null,
        sentAt,
        metadata: {
          delivered: true,
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("SENT");
    expect(response.body.data.providerMessageId).toBe("test-provider-message-id");
    expect(response.body.data.errorMessage).toBeNull();
    expect(response.body.data.sentAt).not.toBeNull();

    const updatedNotificationLog = await prisma.notificationLog.findUnique({
      where: {
        id: notificationLogId,
      },
      select: {
        status: true,
        providerMessageId: true,
        errorMessage: true,
        sentAt: true,
      },
    });

    expect(updatedNotificationLog?.status).toBe("SENT");
    expect(updatedNotificationLog?.providerMessageId).toBe("test-provider-message-id");
    expect(updatedNotificationLog?.errorMessage).toBeNull();
    expect(updatedNotificationLog?.sentAt).not.toBeNull();
  });
});
