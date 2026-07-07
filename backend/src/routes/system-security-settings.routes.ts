import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";
import { createAuditLog } from "../services/audit-log.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

const systemSecuritySettingSelect = {
  id: true,
  sessionDurationMinutes: true,
  minPasswordLength: true,
  loginAttemptLimit: true,
  lockDurationMinutes: true,
  requireStrongPassword: true,
  enableTwoFactor: true,
  allowPublicRegister: true,
  logSecurityEvents: true,
  createdAt: true,
  updatedAt: true,
  createdByUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  },
  updatedByUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  },
} as const;

const updateSystemSecuritySettingSchema = z
  .object({
    sessionDurationMinutes: z.number().int().min(5).max(1440).optional(),
    minPasswordLength: z.number().int().min(6).max(64).optional(),
    loginAttemptLimit: z.number().int().min(1).max(50).optional(),
    lockDurationMinutes: z.number().int().min(1).max(1440).optional(),
    requireStrongPassword: z.boolean().optional(),
    enableTwoFactor: z.boolean().optional(),
    allowPublicRegister: z.boolean().optional(),
    logSecurityEvents: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "En az bir alan gönderilmelidir.",
  });

async function getCurrentSystemSecuritySetting() {
  return prisma.systemSecuritySetting.findFirst({
    select: systemSecuritySettingSelect,
    orderBy: {
      createdAt: "desc",
    },
  });
}

const defaultSecuritySetting = {
  sessionDurationMinutes: 60,
  minPasswordLength: 8,
  loginAttemptLimit: 5,
  lockDurationMinutes: 15,
  requireStrongPassword: true,
  enableTwoFactor: false,
  allowPublicRegister: false,
  logSecurityEvents: true,
};

router.get(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (_request: Request, response: Response) => {
    const setting = await getCurrentSystemSecuritySetting();

    response.status(200).json({
      success: true,
      data: setting ?? defaultSecuritySetting,
    });
  })
);

router.patch(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const validationResult = updateSystemSecuritySettingSchema.safeParse(
      request.body
    );

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen güvenlik ayarları geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const targetSetting = await getCurrentSystemSecuritySetting();

    const setting = targetSetting
      ? await prisma.systemSecuritySetting.update({
          where: {
            id: targetSetting.id,
          },
          data: {
            ...validationResult.data,
            updatedByUserId: authenticatedRequest.user.id,
          },
          select: systemSecuritySettingSelect,
        })
      : await prisma.systemSecuritySetting.create({
          data: {
            ...defaultSecuritySetting,
            ...validationResult.data,
            createdByUserId: authenticatedRequest.user.id,
            updatedByUserId: authenticatedRequest.user.id,
          },
          select: systemSecuritySettingSelect,
        });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: targetSetting
        ? "UPDATE_SYSTEM_SECURITY_SETTING"
        : "CREATE_SYSTEM_SECURITY_SETTING",
      entityType: "SystemSecuritySetting",
      entityId: setting.id,
      metadata: {
        previous: targetSetting,
        current: setting,
      },
    });

    response.status(200).json({
      success: true,
      message: "Güvenlik ayarları başarıyla güncellendi.",
      data: setting,
    });
  })
);

export default router;

