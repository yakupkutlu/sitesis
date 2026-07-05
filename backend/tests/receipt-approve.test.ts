import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { accessTokenCookieName } from "../src/config/cookie.js";
import { csrfCookieName } from "../src/config/csrf.js";
import { env } from "../src/config/env.js";
import prisma from "../src/db/prisma.js";

const testSuperAdminEmail = "receipt-approve-test-admin@example.com";
const testSiteName = "Receipt Approve Test Site";
const testPaymentBatchTitle = "Receipt Approve Test Payment";
const testReceiptFileName = "approve-test-receipt.pdf";

let testSuperAdminId = "";
let paymentAllocationId = "";
let paymentReceiptId = "";

async function cleanupTestData() {
  const receipts = await prisma.paymentReceipt.findMany({
    where: {
      OR: [
        {
          originalFileName: testReceiptFileName,
        },
        {
          paymentAllocation: {
            paymentBatch: {
              title: testPaymentBatchTitle,
            },
          },
        },
      ],
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

describe("Payment Receipt Approve", () => {
  beforeAll(async () => {
    await cleanupTestData();

    const superAdmin = await prisma.user.create({
      data: {
        fullName: "Receipt Approve Test Admin",
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
        description: "Receipt approve test payment.",
        totalAmountKurus: 18000,
        scopeType: "SITE",
        dueDate: new Date("2030-01-01"),
        siteId: site.id,
        allocations: {
          create: [
            {
              apartmentId: apartment.id,
              amountKurus: 18000,
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

    paymentAllocationId = allocation.id;

    const receipt = await prisma.paymentReceipt.create({
      data: {
        paymentAllocationId,
        uploadedByUserId: testSuperAdminId,
        originalFileName: testReceiptFileName,
        storedFileName: "approve-test-stored-receipt.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        note: "Receipt approve test note",
      },
      select: {
        id: true,
      },
    });

    paymentReceiptId = receipt.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("PATCH /api/payment-receipts/:receiptId/approve should approve receipt and mark allocation as PAID", async () => {
    const auth = await buildAuthenticatedRequest();

    const response = await request(app)
      .patch(`/api/payment-receipts/${paymentReceiptId}/approve`)
      .set("x-csrf-token", auth.csrfToken)
      .set("Cookie", auth.cookies)
      .send({
        reviewNote: "Dekont onay test notu",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.receipt.status).toBe("APPROVED");
    expect(response.body.data.paymentAllocation.status).toBe("PAID");

    const updatedReceipt = await prisma.paymentReceipt.findUnique({
      where: {
        id: paymentReceiptId,
      },
      select: {
        status: true,
        reviewedByUserId: true,
        reviewedAt: true,
      },
    });

    const updatedAllocation = await prisma.paymentAllocation.findUnique({
      where: {
        id: paymentAllocationId,
      },
      select: {
        status: true,
        paidAt: true,
      },
    });

    expect(updatedReceipt?.status).toBe("APPROVED");
    expect(updatedReceipt?.reviewedByUserId).toBe(testSuperAdminId);
    expect(updatedReceipt?.reviewedAt).not.toBeNull();

    expect(updatedAllocation?.status).toBe("PAID");
    expect(updatedAllocation?.paidAt).not.toBeNull();
  });
});
