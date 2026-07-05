import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { accessTokenCookieName } from "../src/config/cookie.js";
import { env } from "../src/config/env.js";
import prisma from "../src/db/prisma.js";

const testResidentEmail = "role-test-resident@example.com";

let testResidentId = "";

describe("Role Permissions", () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: testResidentEmail,
      },
    });

    const user = await prisma.user.create({
      data: {
        fullName: "Role Test Resident",
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

    testResidentId = user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: testResidentEmail,
      },
    });
  });

  it("RESIDENT should not access SUPER_ADMIN routes", async () => {
    const token = jwt.sign(
      {
        userId: testResidentId,
        role: "RESIDENT",
      },
      env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    const response = await request(app)
      .get("/api/sms-settings")
      .set("Cookie", [`${accessTokenCookieName}=${token}`]);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});
