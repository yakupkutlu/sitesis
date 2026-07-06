import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { accessTokenCookieName } from "../src/config/cookie.js";
import { env } from "../src/config/env.js";
import prisma from "../src/db/prisma.js";

const testResidentEmail = "dashboard-resident-summary-resident@example.com";
const testManagerEmail = "dashboard-resident-summary-manager@example.com";

const residentSiteName = "Dashboard Resident Summary Site";
const outsideSiteName = "Dashboard Resident Summary Outside Site";

const residentPaymentTitle = "Dashboard Resident Summary Payment";
const outsidePaymentTitle = "Dashboard Resident Summary Outside Payment";

let testResidentId = "";
let testManagerId = "";

async function cleanupTestData() {
  await prisma.notificationLog.deleteMany({
    where: {
      recipientEmail: testResidentEmail,
    },
  });

  await prisma.paymentBatch.deleteMany({
    where: {
      title: {
        in: [residentPaymentTitle, outsidePaymentTitle],
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        in: [testResidentEmail, testManagerEmail],
      },
    },
  });

  await prisma.site.deleteMany({
    where: {
      name: {
        in: [residentSiteName, outsideSiteName],
      },
    },
  });
}

function buildCookie(userId: string, role: "RESIDENT" | "MANAGER") {
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

describe("Resident Dashboard Summary", () => {
  beforeAll(async () => {
    await cleanupTestData();

    const resident = await prisma.user.create({
      data: {
        fullName: "Dashboard Resident Summary Resident",
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

    const manager = await prisma.user.create({
      data: {
        fullName: "Dashboard Resident Summary Manager",
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

    testResidentId = resident.id;
    testManagerId = manager.id;

    const residentSite = await prisma.site.create({
      data: {
        name: residentSiteName,
        address: "Resident Address",
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

    const residentBlock = await prisma.block.create({
      data: {
        name: "Resident Block",
        siteId: residentSite.id,
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

    const residentApartment = await prisma.apartment.create({
      data: {
        number: "1",
        blockId: residentBlock.id,
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

    await prisma.apartmentResident.create({
      data: {
        apartmentId: residentApartment.id,
        userId: testResidentId,
        type: "TENANT",
      },
    });

    await prisma.paymentBatch.create({
      data: {
        title: residentPaymentTitle,
        description: "Resident dashboard should count this payment.",
        totalAmountKurus: 12345,
        scopeType: "APARTMENTS",
        dueDate: new Date("2030-01-01"),
        allocations: {
          create: [
            {
              apartmentId: residentApartment.id,
              amountKurus: 12345,
              status: "PENDING",
            },
          ],
        },
      },
    });

    await prisma.paymentBatch.create({
      data: {
        title: outsidePaymentTitle,
        description: "Resident dashboard should not count this payment.",
        totalAmountKurus: 99999,
        scopeType: "APARTMENTS",
        dueDate: new Date("2030-01-01"),
        allocations: {
          create: [
            {
              apartmentId: outsideApartment.id,
              amountKurus: 99999,
              status: "PENDING",
            },
          ],
        },
      },
    });

    await prisma.notificationLog.create({
      data: {
        channel: "EMAIL",
        status: "SENT",
        sourceType: "MANUAL",
        recipientUserId: testResidentId,
        recipientEmail: testResidentEmail,
        subject: "Resident Dashboard Test",
        message: "Resident dashboard notification test.",
      },
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("RESIDENT should access own dashboard summary only", async () => {
    const response = await request(app)
      .get("/api/dashboard-summary/resident")
      .set("Cookie", buildCookie(testResidentId, "RESIDENT"));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.apartmentsCount).toBe(1);
    expect(response.body.data.paymentBatchesCount).toBe(1);
    expect(response.body.data.paymentAllocationsCount).toBe(1);
    expect(response.body.data.pendingAllocationsCount).toBe(1);
    expect(response.body.data.paidAllocationsCount).toBe(0);
    expect(response.body.data.overdueAllocationsCount).toBe(0);
    expect(response.body.data.totalDebtKurus).toBe(12345);
    expect(response.body.data.paidTotalKurus).toBe(0);
    expect(response.body.data.remainingDebtKurus).toBe(12345);
    expect(response.body.data.notificationLogsCount).toBe(1);
    expect(response.body.data.sentNotificationsCount).toBe(1);
  });

  it("MANAGER should not access resident dashboard summary", async () => {
    const response = await request(app)
      .get("/api/dashboard-summary/resident")
      .set("Cookie", buildCookie(testManagerId, "MANAGER"));

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("Unauthenticated user should not access resident dashboard summary", async () => {
    const response = await request(app).get("/api/dashboard-summary/resident");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
