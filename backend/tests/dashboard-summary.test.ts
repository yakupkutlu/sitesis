import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { accessTokenCookieName } from "../src/config/cookie.js";
import { env } from "../src/config/env.js";
import prisma from "../src/db/prisma.js";

const testSuperAdminEmail = "dashboard-summary-super-admin@example.com";
const testManagerEmail = "dashboard-summary-manager@example.com";

let testSuperAdminId = "";
let testManagerId = "";

async function cleanupTestData() {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [testSuperAdminEmail, testManagerEmail],
      },
    },
  });
}

function buildCookie(userId: string, role: "SUPER_ADMIN" | "MANAGER") {
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

  return [`${accessTokenCookieName}=${accessToken}`];
}

describe("Dashboard Summary", () => {
  beforeAll(async () => {
    await cleanupTestData();

    const superAdmin = await prisma.user.create({
      data: {
        fullName: "Dashboard Summary Super Admin",
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
        fullName: "Dashboard Summary Manager",
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

  it("GET /api/dashboard-summary/super-admin should return summary for SUPER_ADMIN", async () => {
    const response = await request(app)
      .get("/api/dashboard-summary/super-admin")
      .set("Cookie", buildCookie(testSuperAdminId, "SUPER_ADMIN"));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.sitesCount).toBeTypeOf("number");
    expect(response.body.data.blocksCount).toBeTypeOf("number");
    expect(response.body.data.apartmentsCount).toBeTypeOf("number");
    expect(response.body.data.usersCount).toBeTypeOf("number");
    expect(response.body.data.superAdminsCount).toBeTypeOf("number");
    expect(response.body.data.managersCount).toBeTypeOf("number");
    expect(response.body.data.residentsCount).toBeTypeOf("number");
    expect(response.body.data.paymentBatchesCount).toBeTypeOf("number");
    expect(response.body.data.paymentAllocationsCount).toBeTypeOf("number");
    expect(response.body.data.pendingAllocationsCount).toBeTypeOf("number");
    expect(response.body.data.paidAllocationsCount).toBeTypeOf("number");
    expect(response.body.data.overdueAllocationsCount).toBeTypeOf("number");
    expect(response.body.data.residentRequestsCount).toBeTypeOf("number");
    expect(response.body.data.openRequestsCount).toBeTypeOf("number");
    expect(response.body.data.notificationLogsCount).toBeTypeOf("number");
    expect(response.body.data.pendingNotificationsCount).toBeTypeOf("number");
    expect(response.body.data.sentNotificationsCount).toBeTypeOf("number");
    expect(response.body.data.failedNotificationsCount).toBeTypeOf("number");
  });

  it("MANAGER should not access SUPER_ADMIN dashboard summary", async () => {
    const response = await request(app)
      .get("/api/dashboard-summary/super-admin")
      .set("Cookie", buildCookie(testManagerId, "MANAGER"));

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("Unauthenticated user should not access dashboard summary", async () => {
    const response = await request(app).get("/api/dashboard-summary/super-admin");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
