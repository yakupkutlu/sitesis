import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { accessTokenCookieName } from "../src/config/cookie.js";
import { csrfCookieName } from "../src/config/csrf.js";
import { env } from "../src/config/env.js";
import prisma from "../src/db/prisma.js";

const testSuperAdminEmail = "receipt-valid-upload-test-admin@example.com";
const testSiteName = "Receipt Valid Upload Test Site";
const testPaymentBatchTitle = "Receipt Valid Upload Test Payment";
const testReceiptFileName = "valid-receipt.pdf";

let testSuperAdminId = "";
let paymentAllocationId = "";

async function deleteReceiptFiles(storedFileNames: string[]) {
  await Promise.all(
    storedFileNames.map(async (storedFileName) => {
      try {
        await fs.unlink(
          path.join(process.cwd(), "uploads", "receipts", storedFileName)
        );
      } catch {
        // Test temizliği sırasında dosya yoksa hata vermeyelim.
      }
    })
  );
}

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
      storedFileName: true,
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

    await deleteReceiptFiles(
      receipts.map((receipt) => {
        return receipt.storedFileName;
      })
    );

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

async function buildAuthenticatedUploadRequest() {
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

describe("Payment Receipt Valid Upload", () => {
  beforeAll(async () => {
    await cleanupTestData();

    const superAdmin = await prisma.user.create({
      data: {
        fullName: "Receipt Valid Upload Test Admin",
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
        description: "Valid receipt upload test payment.",
        totalAmountKurus: 15000,
        scopeType: "SITE",
        dueDate: new Date("2030-01-01"),
        siteId: site.id,
        allocations: {
          create: [
            {
              apartmentId: apartment.id,
              amountKurus: 15000,
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
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("POST /api/payment-receipts should upload a valid pdf receipt as PENDING", async () => {
    const auth = await buildAuthenticatedUploadRequest();

    const validPdfBuffer = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    );

    const response = await request(app)
      .post("/api/payment-receipts")
      .set("x-csrf-token", auth.csrfToken)
      .set("Cookie", auth.cookies)
      .field("paymentAllocationId", paymentAllocationId)
      .field("note", "Valid receipt upload test note")
      .attach("receipt", validPdfBuffer, {
        filename: testReceiptFileName,
        contentType: "application/pdf",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.paymentAllocationId).toBe(paymentAllocationId);
    expect(response.body.data.originalFileName).toBe(testReceiptFileName);
    expect(response.body.data.mimeType).toBe("application/pdf");
    expect(response.body.data.status).toBe("PENDING");

    const receiptInDatabase = await prisma.paymentReceipt.findUnique({
      where: {
        id: response.body.data.id,
      },
      select: {
        id: true,
        status: true,
        paymentAllocationId: true,
      },
    });

    expect(receiptInDatabase).not.toBeNull();
    expect(receiptInDatabase?.status).toBe("PENDING");
    expect(receiptInDatabase?.paymentAllocationId).toBe(paymentAllocationId);
  });
});
