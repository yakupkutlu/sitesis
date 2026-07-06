import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { accessTokenCookieName } from "../src/config/cookie.js";
import { csrfCookieName } from "../src/config/csrf.js";
import { env } from "../src/config/env.js";
import prisma from "../src/db/prisma.js";

const testSuperAdminEmail = "system-settings-test-admin@example.com";
const testManagerEmail = "system-settings-test-manager@example.com";
const testAppName = "Sitesis Test App";

let testSuperAdminId = "";
let testManagerId = "";

let originalSetting:
  | {
      id: string;
      appName: string;
      logoUrl: string | null;
      contactEmail: string | null;
      contactPhone: string | null;
      address: string | null;
      websiteUrl: string | null;
      supportEmail: string | null;
      supportPhone: string | null;
      createdByUserId: string | null;
      updatedByUserId: string | null;
    }
  | null = null;

let createdSystemSettingId = "";

async function getCurrentSystemSettingForTest() {
  return prisma.systemSetting.findFirst({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      appName: true,
      logoUrl: true,
      contactEmail: true,
      contactPhone: true,
      address: true,
      websiteUrl: true,
      supportEmail: true,
      supportPhone: true,
      createdByUserId: true,
      updatedByUserId: true,
    },
  });
}

async function cleanupTestUsers() {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [testSuperAdminEmail, testManagerEmail],
      },
    },
  });
}

async function cleanupSystemSettingChanges() {
  const currentSetting = await getCurrentSystemSettingForTest();

  if (!currentSetting) {
    return;
  }

  await prisma.auditLog.deleteMany({
    where: {
      entityType: "SystemSetting",
      entityId: currentSetting.id,
    },
  });

  if (originalSetting) {
    await prisma.systemSetting.update({
      where: {
        id: originalSetting.id,
      },
      data: {
        appName: originalSetting.appName,
        logoUrl: originalSetting.logoUrl,
        contactEmail: originalSetting.contactEmail,
        contactPhone: originalSetting.contactPhone,
        address: originalSetting.address,
        websiteUrl: originalSetting.websiteUrl,
        supportEmail: originalSetting.supportEmail,
        supportPhone: originalSetting.supportPhone,
        createdByUserId: originalSetting.createdByUserId,
        updatedByUserId: originalSetting.updatedByUserId,
      },
    });
    return;
  }

  if (createdSystemSettingId) {
    await prisma.systemSetting.deleteMany({
      where: {
        id: createdSystemSettingId,
      },
    });
  }
}

async function buildAuthenticatedRequest(userId: string, role: "SUPER_ADMIN" | "MANAGER") {
  const csrfResponse = await request(app).get("/api/csrf-token");
  const csrfToken = csrfResponse.body.data.csrfToken;

  const accessToken = jwt.sign(
    {
      userId,
      role,
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

describe("System Settings", () => {
  beforeAll(async () => {
    originalSetting = await getCurrentSystemSettingForTest();

    await cleanupTestUsers();

    const superAdmin = await prisma.user.create({
      data: {
        fullName: "System Settings Test Admin",
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

    const manager = await prisma.user.create({
      data: {
        fullName: "System Settings Test Manager",
        email: testManagerEmail,
        phone: null,
        passwordHash: "test-password-hash",
        role: "MANAGER",
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    testSuperAdminId = superAdmin.id;
    testManagerId = manager.id;
  });

  afterAll(async () => {
    await cleanupSystemSettingChanges();
    await cleanupTestUsers();
  });

  it("GET /api/system-settings should return public system settings", async () => {
    const response = await request(app).get("/api/system-settings");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.appName).toBeDefined();
  });

  it("PATCH /api/system-settings should update settings as SUPER_ADMIN", async () => {
    const auth = await buildAuthenticatedRequest(testSuperAdminId, "SUPER_ADMIN");

    const response = await request(app)
      .patch("/api/system-settings")
      .set("x-csrf-token", auth.csrfToken)
      .set("Cookie", auth.cookies)
      .send({
        appName: testAppName,
        contactEmail: "contact@sitesis.test",
        contactPhone: "+905551112233",
        address: "Test Address",
        websiteUrl: "https://sitesis.test",
        supportEmail: "support@sitesis.test",
        supportPhone: "+905554445566",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.appName).toBe(testAppName);
    expect(response.body.data.contactEmail).toBe("contact@sitesis.test");
    expect(response.body.data.websiteUrl).toBe("https://sitesis.test");

    createdSystemSettingId = response.body.data.id;
  });

  it("MANAGER should not update system settings", async () => {
    const auth = await buildAuthenticatedRequest(testManagerId, "MANAGER");

    const response = await request(app)
      .patch("/api/system-settings")
      .set("x-csrf-token", auth.csrfToken)
      .set("Cookie", auth.cookies)
      .send({
        appName: "Manager Cannot Update",
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});
