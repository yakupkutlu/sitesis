import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { accessTokenCookieName } from "../src/config/cookie.js";
import { env } from "../src/config/env.js";
import prisma from "../src/db/prisma.js";

const testManagerEmail = "scope-test-manager@example.com";
const scopedPaymentTitle = "Scope Test Scoped Payment";
const outsidePaymentTitle = "Scope Test Outside Payment";

let testManagerId = "";

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
      email: testManagerEmail,
    },
  });

  await prisma.site.deleteMany({
    where: {
      name: {
        in: ["Scope Test Site A", "Scope Test Site B"],
      },
    },
  });
}

describe("Manager Scope", () => {
  beforeAll(async () => {
    await cleanupTestData();

    const manager = await prisma.user.create({
      data: {
        fullName: "Scope Test Manager",
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

    testManagerId = manager.id;

    const scopedSite = await prisma.site.create({
      data: {
        name: "Scope Test Site A",
        address: "Test Address A",
      },
      select: {
        id: true,
      },
    });

    const outsideSite = await prisma.site.create({
      data: {
        name: "Scope Test Site B",
        address: "Test Address B",
      },
      select: {
        id: true,
      },
    });

    const scopedBlock = await prisma.block.create({
      data: {
        name: "A Block",
        siteId: scopedSite.id,
      },
      select: {
        id: true,
      },
    });

    const outsideBlock = await prisma.block.create({
      data: {
        name: "B Block",
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
        managerId: testManagerId,
        scopeType: "SITE",
        siteId: scopedSite.id,
      },
    });

    await prisma.paymentBatch.create({
      data: {
        title: scopedPaymentTitle,
        description: "Manager should see this payment.",
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
        description: "Manager should not see this payment.",
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

  it("MANAGER should only see payment batches inside assigned scope", async () => {
    const token = jwt.sign(
      {
        userId: testManagerId,
        role: "MANAGER",
      },
      env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    const response = await request(app)
      .get("/api/payment-batches")
      .set("Cookie", [`${accessTokenCookieName}=${token}`]);

    expect(response.status).toBe(200);

    const titles = response.body.data.map((paymentBatch: { title: string }) => {
      return paymentBatch.title;
    });

    expect(titles).toContain(scopedPaymentTitle);
    expect(titles).not.toContain(outsidePaymentTitle);
  });
});
