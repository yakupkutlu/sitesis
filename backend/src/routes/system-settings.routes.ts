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

const systemSettingSelect = {
  id: true,
  appName: true,
  logoUrl: true,
  contactEmail: true,
  contactPhone: true,
  address: true,
  websiteUrl: true,
  supportEmail: true,
  supportPhone: true,
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

const updateSystemSettingSchema = z
  .object({
    appName: z.string().trim().min(2).optional(),
    logoUrl: z.string().trim().url().nullable().optional(),
    contactEmail: z.string().trim().email().nullable().optional(),
    contactPhone: z.string().trim().nullable().optional(),
    address: z.string().trim().nullable().optional(),
    websiteUrl: z.string().trim().url().nullable().optional(),
    supportEmail: z.string().trim().email().nullable().optional(),
    supportPhone: z.string().trim().nullable().optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "En az bir alan gönderilmelidir.",
  });

function normalizeNullableText(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value.length === 0) {
    return null;
  }

  return value;
}

async function getCurrentSystemSetting() {
  const setting = await prisma.systemSetting.findFirst({
    select: systemSettingSelect,
    orderBy: {
      createdAt: "desc",
    },
  });

  return setting;
}

router.get(
  "/",
  asyncHandler(async (_request: Request, response: Response) => {
    const setting = await getCurrentSystemSetting();

    response.status(200).json({
      success: true,
      data:
        setting ??
        {
          appName: "Sitesis",
          logoUrl: null,
          contactEmail: null,
          contactPhone: null,
          address: null,
          websiteUrl: null,
          supportEmail: null,
          supportPhone: null,
        },
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

    const validationResult = updateSystemSettingSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen sistem ayarları geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const targetSetting = await getCurrentSystemSetting();

    const {
      appName,
      logoUrl,
      contactEmail,
      contactPhone,
      address,
      websiteUrl,
      supportEmail,
      supportPhone,
    } = validationResult.data;

    const updateData = {
      ...(appName !== undefined ? { appName } : {}),
      ...(logoUrl !== undefined ? { logoUrl: normalizeNullableText(logoUrl) } : {}),
      ...(contactEmail !== undefined
        ? { contactEmail: normalizeNullableText(contactEmail) }
        : {}),
      ...(contactPhone !== undefined
        ? { contactPhone: normalizeNullableText(contactPhone) }
        : {}),
      ...(address !== undefined ? { address: normalizeNullableText(address) } : {}),
      ...(websiteUrl !== undefined
        ? { websiteUrl: normalizeNullableText(websiteUrl) }
        : {}),
      ...(supportEmail !== undefined
        ? { supportEmail: normalizeNullableText(supportEmail) }
        : {}),
      ...(supportPhone !== undefined
        ? { supportPhone: normalizeNullableText(supportPhone) }
        : {}),
      updatedByUserId: authenticatedRequest.user.id,
    };

    const setting = targetSetting
      ? await prisma.systemSetting.update({
          where: {
            id: targetSetting.id,
          },
          data: updateData,
          select: systemSettingSelect,
        })
      : await prisma.systemSetting.create({
          data: {
            appName: appName ?? "Sitesis",
            logoUrl: normalizeNullableText(logoUrl),
            contactEmail: normalizeNullableText(contactEmail),
            contactPhone: normalizeNullableText(contactPhone),
            address: normalizeNullableText(address),
            websiteUrl: normalizeNullableText(websiteUrl),
            supportEmail: normalizeNullableText(supportEmail),
            supportPhone: normalizeNullableText(supportPhone),
            createdByUserId: authenticatedRequest.user.id,
            updatedByUserId: authenticatedRequest.user.id,
          },
          select: systemSettingSelect,
        });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: targetSetting ? "UPDATE_SYSTEM_SETTING" : "CREATE_SYSTEM_SETTING",
      entityType: "SystemSetting",
      entityId: setting.id,
      metadata: {
        previous: targetSetting
          ? {
              appName: targetSetting.appName,
              logoUrl: targetSetting.logoUrl,
              contactEmail: targetSetting.contactEmail,
              contactPhone: targetSetting.contactPhone,
              address: targetSetting.address,
              websiteUrl: targetSetting.websiteUrl,
              supportEmail: targetSetting.supportEmail,
              supportPhone: targetSetting.supportPhone,
            }
          : null,
        current: {
          appName: setting.appName,
          logoUrl: setting.logoUrl,
          contactEmail: setting.contactEmail,
          contactPhone: setting.contactPhone,
          address: setting.address,
          websiteUrl: setting.websiteUrl,
          supportEmail: setting.supportEmail,
          supportPhone: setting.supportPhone,
        },
      },
    });

    response.status(200).json({
      success: true,
      message: "Sistem ayarları başarıyla güncellendi.",
      data: setting,
    });
  })
);

export default router;

