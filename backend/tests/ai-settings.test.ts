import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { accessTokenCookieName } from "../src/config/cookie.js";
import { csrfCookieName } from "../src/config/csrf.js";
import { env } from "../src/config/env.js";
import prisma from "../src/db/prisma.js";

const testSuperAdminEmail = "ai-settings-test-admin@example.com";
const testManagerEmail = "ai-settings-test-manager@example.com";
const testAiSettingName = "AI Settings Test";

let testSuperAdminId = "";
let testManagerId = "";
let aiSettingId = "";

async function cleanupTestData() {
  const aiSettings = await prisma.aiSetting.findMany({
    where: {
      name: testAiSettingName,
    },
    select: {
      id: true,
    },
  });

  const aiSettingIds = aiSettings.map((setting) => {
    return setting.id;
  });

  if (aiSettingIds.length > 0) {
    await prisma.auditLog.deleteMany({
      where: {
        entityType: "AiSetting",
        entityId: {
          in: aiSettingIds,
        },
      },
    });

    await prisma.aiSetting.deleteMany({
      where: {
        id: {
          in: aiSettingIds,
        },
      },
    });
  }

  await prisma.user.deleteMany({
    where: {
      email: {
        in: [testSuperAdminEmail, testManagerEmail],
      },
    },
  });
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

describe("AI Settings", () => {
  beforeAll(async () => {
    await cleanupTestData();

    const superAdmin = await prisma.user.create({
      data: {
        fullName: "AI Settings Test Admin",
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
        fullName: "AI Settings Test Manager",
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
    await cleanupTestData();
  });

  it("POST /api/ai-settings should create AI setting without exposing API key", async () => {
    const auth = await buildAuthenticatedRequest(testSuperAdminId, "SUPER_ADMIN");

    const response = await request(app)
      .post("/api/ai-settings")
      .set("x-csrf-token", auth.csrfToken)
      .set("Cookie", auth.cookies)
      .send({
        provider: "OPENAI",
        status: "ACTIVE",
        name: testAiSettingName,
        modelName: "gpt-test-model",
        apiKey: "test-secret-api-key",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.provider).toBe("OPENAI");
    expect(response.body.data.status).toBe("ACTIVE");
    expect(response.body.data.name).toBe(testAiSettingName);
    expect(response.body.data.secrets.hasApiKey).toBe(true);
    expect(response.body.data.apiKey).toBeUndefined();
    expect(response.body.data.apiKeyEncrypted).toBeUndefined();

    aiSettingId = response.body.data.id;

    const settingInDatabase = await prisma.aiSetting.findUnique({
      where: {
        id: aiSettingId,
      },
      select: {
        apiKeyEncrypted: true,
      },
    });

    expect(settingInDatabase?.apiKeyEncrypted).toBeDefined();
    expect(settingInDatabase?.apiKeyEncrypted).not.toBe("test-secret-api-key");
  });

  it("GET /api/ai-settings should list AI settings without exposing encrypted API key", async () => {
    const auth = await buildAuthenticatedRequest(testSuperAdminId, "SUPER_ADMIN");

    const response = await request(app)
      .get("/api/ai-settings")
      .set("Cookie", auth.cookies);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const setting = response.body.data.find((item: { id: string }) => {
      return item.id === aiSettingId;
    });

    expect(setting).toBeDefined();
    expect(setting.secrets.hasApiKey).toBe(true);
    expect(setting.apiKey).toBeUndefined();
    expect(setting.apiKeyEncrypted).toBeUndefined();
  });

  it("PATCH /api/ai-settings/:aiSettingId should update AI setting", async () => {
    const auth = await buildAuthenticatedRequest(testSuperAdminId, "SUPER_ADMIN");

    const response = await request(app)
      .patch(`/api/ai-settings/${aiSettingId}`)
      .set("x-csrf-token", auth.csrfToken)
      .set("Cookie", auth.cookies)
      .send({
        status: "PASSIVE",
        modelName: "updated-test-model",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("PASSIVE");
    expect(response.body.data.modelName).toBe("updated-test-model");
    expect(response.body.data.apiKeyEncrypted).toBeUndefined();
  });

  it("MANAGER should not access AI settings", async () => {
    const auth = await buildAuthenticatedRequest(testManagerId, "MANAGER");

    const response = await request(app)
      .get("/api/ai-settings")
      .set("Cookie", auth.cookies);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});
