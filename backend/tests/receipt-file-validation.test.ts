import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { accessTokenCookieName } from "../src/config/cookie.js";
import { csrfCookieName } from "../src/config/csrf.js";
import { env } from "../src/config/env.js";
import prisma from "../src/db/prisma.js";

const testSuperAdminEmail = "receipt-file-type-test-admin@example.com";

let testSuperAdminId = "";

describe("Payment Receipt File Validation", () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: testSuperAdminEmail,
      },
    });

    const user = await prisma.user.create({
      data: {
        fullName: "Receipt File Type Test Admin",
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

    testSuperAdminId = user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: testSuperAdminEmail,
      },
    });
  });

  it("POST /api/payment-receipts should reject unsupported file types", async () => {
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

    const response = await request(app)
      .post("/api/payment-receipts")
      .set("x-csrf-token", csrfToken)
      .set("Cookie", [
        `${csrfCookieName}=${csrfToken}`,
        `${accessTokenCookieName}=${accessToken}`,
      ])
      .field("paymentAllocationId", "00000000-0000-0000-0000-000000000000")
      .attach("receipt", Buffer.from("not a valid receipt file"), {
        filename: "receipt.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
