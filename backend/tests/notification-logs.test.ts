import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { accessTokenCookieName } from "../src/config/cookie.js";
import { csrfCookieName } from "../src/config/csrf.js";
import { env } from "../src/config/env.js";
import prisma from "../src/db/prisma.js";

const testSuperAdminEmail = "notification-log-test-admin@example.com";
const testRecipientEmail = "notification-log-recipient@example.com";
const testSubject = "Notification Log Test Subject";

let testSuperAdminId = "";

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

describe("Notification Logs", () => {
  beforeAll(async () => {
    await cleanupTestData();

    const superAdmin = await prisma.user.create({
      data: {
        fullName: "Notification Log Test Admin",
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
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("POST /api/notification-logs should create notification log as SUPER_ADMIN", async () => {
    const auth = await buildAuthenticatedRequest();

    const response = await request(app)
      .post("/api/notification-logs")
      .set("x-csrf-token", auth.csrfToken)
      .set("Cookie", auth.cookies)
      .send({
        channel: "EMAIL",
        status: "PENDING",
        sourceType: "MANUAL",
        recipientEmail: testRecipientEmail,
        subject: testSubject,
        message: "Notification log test message",
        provider: "TEST_PROVIDER",
        entityType: "TestEntity",
        entityId: "test-entity-id",
        metadata: {
          test: true,
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.channel).toBe("EMAIL");
    expect(response.body.data.status).toBe("PENDING");
    expect(response.body.data.sourceType).toBe("MANUAL");
    expect(response.body.data.recipientEmail).toBe(testRecipientEmail);
    expect(response.body.data.subject).toBe(testSubject);
    expect(response.body.data.createdByUserId).toBe(testSuperAdminId);
    expect(response.body.data.sentAt).toBeNull();
  });

  it("GET /api/notification-logs should filter notification logs", async () => {
    const auth = await buildAuthenticatedRequest();

    const response = await request(app)
      .get("/api/notification-logs")
      .query({
        channel: "EMAIL",
        status: "PENDING",
        search: testRecipientEmail,
      })
      .set("Cookie", auth.cookies);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const emails = response.body.data.map(
      (notificationLog: { recipientEmail: string | null }) => {
        return notificationLog.recipientEmail;
      }
    );

    expect(emails).toContain(testRecipientEmail);
  });
});
