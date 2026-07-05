import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { accessTokenCookieName } from "../src/config/cookie.js";
import { csrfCookieName } from "../src/config/csrf.js";
import { env } from "../src/config/env.js";
import prisma from "../src/db/prisma.js";

const testSuperAdminEmail = "receipt-review-conflict-test-admin@example.com";
const testSiteName = "Receipt Review Conflict Test Site";
const testPaymentBatchTitle = "Receipt Review Conflict Test Payment";

let testSuperAdminId = "";
let approvedReceiptId = "";
let rejectedReceiptId = "";

async function cleanupTestData() {
  const receipts = await prisma.paymentReceipt.findMany({
    where: {
      paymentAllocation: {
        paymentBatch: {
          title: testPaymentBatchTitle,
        },
      },
    },
    select: {
      id: true,
    },
  });

  const receiptIds = receipts.map((receipt) => {
    return receipt.id;
  });

  if (receiptIds.length > 0) {
    await prisma.auditLog.deleteMany({
      where: {
        entityType: "PaymentReceipt",
        entityId: {
          in: receiptIds,
        },
      },
    });

    await prisma.paymentReceipt.deleteMany({
      where: {
        id: {
          in: receiptIds,
        },
      },
    });
  }

  await prisma.paymentBatch.deleteMany({
    where: {
      title: testPaymentBatchTitle,
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: testSuperAdminEmail,
    },
  });

  await prisma.site.deleteMany({
    where: {
      name: testSiteName,
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

describe("Payment Receipt Review Conflict", () => {
  beforeAll(async () => {
    await cleanupTestData();

    const superAdmin = await prisma.user.create({
      data: {
        fullName: "Receipt Review Conflict Test Admin",
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

    const site = await prisma.site.create({
      data: {
        name: testSiteName,
        address: "Test Address",
      },
      select: {
        id: true,
      },
    });

    const block = await prisma.block.create({
      data: {
        name: "A Block",
        siteId: site.id,
      },
      select: {
        id: true,
      },
    });

    const apartment = await prisma.apartment.create({
      data: {
        number: "1",
        blockId: block.id,
      },
      select: {
        id: true,
      },
    });

    const paymentBatch = await prisma.paymentBatch.create({
      data: {
        title: testPaymentBatchTitle,
        description: "Receipt review conflict test payment.",
        totalAmountKurus: 20000,
        scopeType: "SITE",
        dueDate: new Date("2030-01-01"),
        siteId: site.id,
        allocations: {
          create: [
            {
              apartmentId: apartment.id,
              amountKurus: 20000,
            },
          ],
        },
      },
      include: {
        allocations: {
          select: {
            id: true,
          },
        },
      },
    });

    const allocation = paymentBatch.allocations[0];

    if (!allocation) {
      throw new Error("Test payment allocation oluşturulamadı.");
    }

    const approvedReceipt = await prisma.paymentReceipt.create({
      data: {
        paymentAllocationId: allocation.id,
        uploadedByUserId: testSuperAdminId,
        originalFileName: "already-approved-receipt.pdf",
        storedFileName: "already-approved-receipt.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedByUserId: testSuperAdminId,
      },
      select: {
        id: true,
      },
    });

    const rejectedReceipt = await prisma.paymentReceipt.create({
      data: {
        paymentAllocationId: allocation.id,
        uploadedByUserId: testSuperAdminId,
        originalFileName: "already-rejected-receipt.pdf",
        storedFileName: "already-rejected-receipt.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedByUserId: testSuperAdminId,
      },
      select: {
        id: true,
      },
    });

    approvedReceiptId = approvedReceipt.id;
    rejectedReceiptId = rejectedReceipt.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("PATCH /api/payment-receipts/:receiptId/approve should reject already approved receipts", async () => {
    const auth = await buildAuthenticatedRequest();

    const response = await request(app)
      .patch(`/api/payment-receipts/${approvedReceiptId}/approve`)
      .set("x-csrf-token", auth.csrfToken)
      .set("Cookie", auth.cookies)
      .send({
        reviewNote: "Zaten onaylı dekont test notu",
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it("PATCH /api/payment-receipts/:receiptId/approve should reject rejected receipts", async () => {
    const auth = await buildAuthenticatedRequest();

    const response = await request(app)
      .patch(`/api/payment-receipts/${rejectedReceiptId}/approve`)
      .set("x-csrf-token", auth.csrfToken)
      .set("Cookie", auth.cookies)
      .send({
        reviewNote: "Reddedilmiş dekont test notu",
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });
});
