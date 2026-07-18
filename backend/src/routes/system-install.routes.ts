import crypto from "node:crypto";
import { exec } from "node:child_process";
import { promisify } from "node:util";

import express, { type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { env } from "../config/env.js";
import prisma from "../db/prisma.js";
import { installLimiter } from "../middlewares/rate-limit.middleware.js";
import { createAuditLog } from "../services/audit-log.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const execAsync = promisify(exec);
const router = express.Router();

const SUPER_ADMIN_EMAIL = "superadmin@gmail.com";
const SUPER_ADMIN_PASSWORD = "Admin12345";
const SUPER_ADMIN_FULL_NAME = "Super Admin";

const installSchema = z.object({
  token: z.string().min(1),
  dbName: z.string().min(1),
  dbUser: z.string().min(1),
  dbPassword: z.string().min(1),
});

function safeCompare(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
}

router.post(
  "/install",
  installLimiter,
  asyncHandler(async (request: Request, response: Response) => {
    const validationResult = installSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(400, "Gönderilen kurulum bilgileri geçersiz.");
    }

    const { token, dbName, dbUser, dbPassword } = validationResult.data;

    if (!safeCompare(token, env.INSTALL_TOKEN)) {
      throw new HttpError(404, "Sayfa bulunamadı.");
    }

    const dbCredentialsValid =
      safeCompare(dbName, env.POSTGRES_DB) &&
      safeCompare(dbUser, env.POSTGRES_USER) &&
      safeCompare(dbPassword, env.POSTGRES_PASSWORD);

    if (!dbCredentialsValid) {
      throw new HttpError(401, "Veritabanı bilgileri hatalı.");
    }

    try {
      await execAsync("npm run prisma:migrate:deploy", {
        cwd: process.cwd(),
      });
    } catch (error) {
      console.error("Kurulum sırasında migration hatası:", error);
      throw new HttpError(500, "Veritabanı şeması oluşturulurken hata oluştu.");
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email: SUPER_ADMIN_EMAIL,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (existingUser && existingUser.role !== "SUPER_ADMIN") {
      throw new HttpError(
        400,
        "Bu e-posta ile farklı bir rolde kullanıcı zaten mevcut. İşlem durduruldu."
      );
    }

    const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);

    if (existingUser) {
      await prisma.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          passwordHash,
          status: "ACTIVE",
          mustChangePassword: true,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          fullName: SUPER_ADMIN_FULL_NAME,
          email: SUPER_ADMIN_EMAIL,
          phone: null,
          passwordHash,
          role: "SUPER_ADMIN",
          status: "ACTIVE",
          mustChangePassword: true,
        },
      });
    }

    await createAuditLog({
      request,
      action: "SYSTEM_INSTALL_TRIGGERED",
      entityType: "System",
      metadata: {
        superAdminEmail: SUPER_ADMIN_EMAIL,
      },
    });

    response.status(200).json({
      success: true,
      message:
        "Kurulum tamamlandı. Süper admin hesabıyla giriş yapıp şifrenizi değiştirin.",
    });
  })
);

export default router;
