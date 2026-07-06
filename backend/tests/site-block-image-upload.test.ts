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

const testSuperAdminEmail = "site-block-image-test-admin@example.com";
const testSiteName = "Site Block Image Test Site";
const testBlockName = "Site Block Image Test Block";

let testSuperAdminId = "";
let testSiteId = "";
let testBlockId = "";

async function deleteImageFile(imageUrl?: string | null) {
  if (!imageUrl || !imageUrl.startsWith("/uploads/site-block-images/")) {
    return;
  }

  try {
    await fs.unlink(
      path.join(
        process.cwd(),
        "uploads",
        "site-block-images",
        path.basename(imageUrl)
      )
    );
  } catch {
    // Test temizliği sırasında dosya yoksa hata vermeyelim.
  }
}

async function cleanupTestData() {
  const sites = await prisma.site.findMany({
    where: {
      name: testSiteName,
    },
    select: {
      id: true,
      imageUrl: true,
      blocks: {
        select: {
          imageUrl: true,
        },
      },
    },
  });

  for (const site of sites) {
    await deleteImageFile(site.imageUrl);

    for (const block of site.blocks) {
      await deleteImageFile(block.imageUrl);
    }
  }

  await prisma.site.deleteMany({
    where: {
      name: testSiteName,
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: testSuperAdminEmail,
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

function buildValidPngBuffer() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47,
    0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d,
  ]);
}

describe("Site and Block Image Upload", () => {
  beforeAll(async () => {
    await cleanupTestData();

    const superAdmin = await prisma.user.create({
      data: {
        fullName: "Site Block Image Test Admin",
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

    testSiteId = site.id;

    const block = await prisma.block.create({
      data: {
        name: testBlockName,
        siteId: testSiteId,
      },
      select: {
        id: true,
      },
    });

    testBlockId = block.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("PATCH /api/sites/:siteId/image should upload valid site image", async () => {
    const auth = await buildAuthenticatedRequest();

    const response = await request(app)
      .patch(`/api/sites/${testSiteId}/image`)
      .set("x-csrf-token", auth.csrfToken)
      .set("Cookie", auth.cookies)
      .attach("image", buildValidPngBuffer(), {
        filename: "site-image.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.imageUrl).toContain("/uploads/site-block-images/");

    const site = await prisma.site.findUnique({
      where: {
        id: testSiteId,
      },
      select: {
        imageUrl: true,
      },
    });

    expect(site?.imageUrl).toContain("/uploads/site-block-images/");
  });

  it("PATCH /api/blocks/:blockId/image should upload valid block image", async () => {
    const auth = await buildAuthenticatedRequest();

    const response = await request(app)
      .patch(`/api/blocks/${testBlockId}/image`)
      .set("x-csrf-token", auth.csrfToken)
      .set("Cookie", auth.cookies)
      .attach("image", buildValidPngBuffer(), {
        filename: "block-image.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.imageUrl).toContain("/uploads/site-block-images/");

    const block = await prisma.block.findUnique({
      where: {
        id: testBlockId,
      },
      select: {
        imageUrl: true,
      },
    });

    expect(block?.imageUrl).toContain("/uploads/site-block-images/");
  });

  it("PATCH /api/sites/:siteId/image should reject fake png image", async () => {
    const auth = await buildAuthenticatedRequest();

    const response = await request(app)
      .patch(`/api/sites/${testSiteId}/image`)
      .set("x-csrf-token", auth.csrfToken)
      .set("Cookie", auth.cookies)
      .attach("image", Buffer.from("this is not a real png"), {
        filename: "fake-site-image.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
