import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { accessTokenCookieName } from "../src/config/cookie.js";
import { env } from "../src/config/env.js";
import prisma from "../src/db/prisma.js";

const noScopeManagerEmail = "dashboard-manager-summary-no-scope@example.com";
const scopedManagerEmail = "dashboard-manager-summary-scoped@example.com";
const testSuperAdminEmail = "dashboard-manager-summary-admin@example.com";

const scopedSiteName = "Dashboard Manager Summary Scoped Site";
const outsideSiteName = "Dashboard Manager Summary Outside Site";

const scopedPaymentTitle = "Dashboard Manager Summary Scoped Payment";
const outsidePaymentTitle = "Dashboard Manager Summary Outside Payment";

let noScopeManagerId = "";
let scopedManagerId = "";
let testSuperAdminId = "";

async function cleanupTestData() {
  await prisma.paymentBatch.deleteMany({
    where: {
      title: {
        in: [scopedPaymentTitle, outsidePaymentTitle],
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        in: [noScopeManagerEmail, scopedManagerEmail, testSuperAdminEmail],
      },
    },
  });

  await prisma.site.deleteMany({
    where: {
      name: {
        in: [scopedSiteName, outsideSiteName],
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

describe("Manager Dashboard Summary", () => {
  beforeAll(async () => {
    await cleanupTestData();

    const noScopeManager = await prisma.user.create({
      data: {
        fullName: "Dashboard Manager No Scope",
        email: noScopeManagerEmail,
        phone: null,
        passwordHash: "test-password-hash",
        role: "MANAGER",
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    const scopedManager = await prisma.user.create({
      data: {
        fullName: "Dashboard Manager Scoped",
        email: scopedManagerEmail,
        phone: null,
        passwordHash: "test-password-hash",
        role: "MANAGER",
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    const superAdmin = await prisma.user.create({
      data: {
        fullName: "Dashboard Manager Summary Admin",
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

    noScopeManagerId = noScopeManager.id;
    scopedManagerId = scopedManager.id;
    testSuperAdminId = superAdmin.id;

    const scopedSite = await prisma.site.create({
      data: {
        name: scopedSiteName,
        address: "Scoped Address",
      },
      select: {
        id: true,
      },
    });

    const outsideSite = await prisma.site.create({
      data: {
        name: outsideSiteName,
        address: "Outside Address",
      },
      select: {
        id: true,
      },
    });

    const scopedBlock = await prisma.block.create({
      data: {
        name: "Scoped Block",
        siteId: scopedSite.id,
      },
      select: {
        id: true,
      },
    });

    const outsideBlock = await prisma.block.create({
      data: {
        name: "Outside Block",
        siteId: outsideSite.id,
      },
      select: {
        id: true,
      },
    });

    const scopedApartment = await prisma.apartment.create({
      data: {
        number: "1",
        blockId: scopedBlock.id,
      },
      select: {
        id: true,
      },
    });

    const outsideApartment = await prisma.apartment.create({
      data: {
        number: "1",
        blockId: outsideBlock.id,
      },
      select: {
        id: true,
      },
    });

    await prisma.managerAssignment.create({
      data: {
        managerId: scopedManagerId,
        scopeType: "SITE",
        siteId: scopedSite.id,
      },
    });

    await prisma.paymentBatch.create({
      data: {
        title: scopedPaymentTitle,
        description: "Manager dashboard should count this payment.",
        totalAmountKurus: 10000,
        scopeType: "SITE",
        dueDate: new Date("2030-01-01"),
        siteId: scopedSite.id,
        allocations: {
          create: [
            {
              apartmentId: scopedApartment.id,
              amountKurus: 10000,
            },
          ],
        },
      },
    });

    await prisma.paymentBatch.create({
      data: {
        title: outsidePaymentTitle,
        description: "Manager dashboard should not count this payment.",
        totalAmountKurus: 20000,
        scopeType: "SITE",
        dueDate: new Date("2030-01-01"),
        siteId: outsideSite.id,
        allocations: {
          create: [
            {
              apartmentId: outsideApartment.id,
              amountKurus: 20000,
            },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("MANAGER with assigned scope should access manager dashboard summary", async () => {
    const response = await request(app)
      .get("/api/dashboard-summary/manager")
      .set("Cookie", buildCookie(scopedManagerId, "MANAGER"));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.assignedSitesCount).toBe(1);
    expect(response.body.data.assignedBlocksCount).toBe(1);
    expect(response.body.data.apartmentsCount).toBe(1);
    expect(response.body.data.paymentBatchesCount).toBe(1);
    expect(response.body.data.paymentAllocationsCount).toBe(1);
    expect(response.body.data.pendingAllocationsCount).toBe(1);
    expect(response.body.data.paidAllocationsCount).toBe(0);
    expect(response.body.data.overdueAllocationsCount).toBe(0);
  });

  it("MANAGER without assigned scope should not access manager dashboard summary", async () => {
    const response = await request(app)
      .get("/api/dashboard-summary/manager")
      .set("Cookie", buildCookie(noScopeManagerId, "MANAGER"));

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("SUPER_ADMIN should not access manager dashboard summary endpoint", async () => {
    const response = await request(app)
      .get("/api/dashboard-summary/manager")
      .set("Cookie", buildCookie(testSuperAdminId, "SUPER_ADMIN"));

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("Unauthenticated user should not access manager dashboard summary", async () => {
    const response = await request(app).get("/api/dashboard-summary/manager");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
