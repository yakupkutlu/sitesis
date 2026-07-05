import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { accessTokenCookieName } from "../src/config/cookie.js";
import { env } from "../src/config/env.js";
import prisma from "../src/db/prisma.js";

const testManagerEmail = "notification-log-permission-manager@example.com";
const testResidentEmail = "notification-log-permission-resident@example.com";

let testManagerId = "";
let testResidentId = "";

async function cleanupTestData() {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [testManagerEmail, testResidentEmail],
      },
    },
  });
}

function buildToken(params: { userId: string; role: "MANAGER" | "RESIDENT" }) {
  return jwt.sign(
    {
      userId: params.userId,
      role: params.role,
    },
    env.JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );
}

describe("Notification Logs Permissions", () => {
  beforeAll(async () => {
    await cleanupTestData();

    const manager = await prisma.user.create({
      data: {
        fullName: "Notification Log Permission Manager",
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

    const resident = await prisma.user.create({
      data: {
        fullName: "Notification Log Permission Resident",
        email: testResidentEmail,
        phone: null,
        passwordHash: "test-password-hash",
        role: "RESIDENT",
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    testManagerId = manager.id;
    testResidentId = resident.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("MANAGER should not access notification logs", async () => {
    const token = buildToken({
      userId: testManagerId,
      role: "MANAGER",
    });

    const response = await request(app)
      .get("/api/notification-logs")
      .set("Cookie", [`${accessTokenCookieName}=${token}`]);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("RESIDENT should not access notification logs", async () => {
    const token = buildToken({
      userId: testResidentId,
      role: "RESIDENT",
    });

    const response = await request(app)
      .get("/api/notification-logs")
      .set("Cookie", [`${accessTokenCookieName}=${token}`]);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});
