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
import { encryptText } from "../utils/crypto.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

const aiSettingSelect = {
  id: true,
  provider: true,
  status: true,
  name: true,
  modelName: true,
  baseUrl: true,
  apiKeyEncrypted: true,
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

const createAiSettingSchema = z
  .object({
    provider: z.enum(["OPENAI", "GEMINI", "CUSTOM"]),
    status: z.enum(["ACTIVE", "PASSIVE"]).optional().default("PASSIVE"),
    name: z.string().trim().nullable().optional(),
    modelName: z.string().trim().nullable().optional(),
    baseUrl: z.string().trim().url().nullable().optional(),
    apiKey: z.string().trim().nullable().optional(),
  })
  .superRefine((data, context) => {
    if (data.status === "ACTIVE" && !data.apiKey) {
      context.addIssue({
        code: "custom",
        path: ["apiKey"],
        message: "Aktif AI ayarı için API key zorunludur.",
      });
    }

    if (data.provider === "CUSTOM" && !data.baseUrl) {
      context.addIssue({
        code: "custom",
        path: ["baseUrl"],
        message: "CUSTOM sağlayıcı için baseUrl zorunludur.",
      });
    }
  });

const updateAiSettingSchema = z
  .object({
    provider: z.enum(["OPENAI", "GEMINI", "CUSTOM"]).optional(),
    status: z.enum(["ACTIVE", "PASSIVE"]).optional(),
    name: z.string().trim().nullable().optional(),
    modelName: z.string().trim().nullable().optional(),
    baseUrl: z.string().trim().url().nullable().optional(),
    apiKey: z.string().trim().nullable().optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "En az bir alan gönderilmelidir.",
  });

const aiSettingParamsSchema = z.object({
  aiSettingId: z.string().uuid(),
});

function encryptOptionalSecret(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value.length === 0) {
    return null;
  }

  return encryptText(value);
}

function hideAiSecrets(setting: { apiKeyEncrypted: string | null }) {
  return {
    hasApiKey: Boolean(setting.apiKeyEncrypted),
  };
}

function serializeAiSetting<T extends { apiKeyEncrypted: string | null }>(
  setting: T
) {
  const { apiKeyEncrypted, ...safeSetting } = setting;

  return {
    ...safeSetting,
    secrets: hideAiSecrets({
      apiKeyEncrypted,
    }),
  };
}

router.get(
  "/",
  asyncHandler(async (_request: Request, response: Response) => {
    const settings = await prisma.aiSetting.findMany({
      select: aiSettingSelect,
      orderBy: {
        createdAt: "desc",
      },
    });

    response.status(200).json({
      success: true,
      data: settings.map(serializeAiSetting),
    });
  })
);

router.post(
  "/",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const validationResult = createAiSettingSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen AI ayarları geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { provider, status, name, modelName, baseUrl, apiKey } =
      validationResult.data;

    const setting = await prisma.aiSetting.create({
      data: {
          provider,
          status,
          name: name || null,
          modelName: modelName || null,
          baseUrl: baseUrl || null,
          apiKeyEncrypted: encryptOptionalSecret(apiKey),
          createdByUserId: authenticatedRequest.user.id,
          updatedByUserId: authenticatedRequest.user.id,
      },
      select: aiSettingSelect,
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "CREATE_AI_SETTING",
      entityType: "AiSetting",
      entityId: setting.id,
      metadata: {
        provider: setting.provider,
        status: setting.status,
        name: setting.name,
        modelName: setting.modelName,
        baseUrl: setting.baseUrl,
        hasSecrets: hideAiSecrets(setting),
      },
    });

    response.status(201).json({
      success: true,
      message: "AI ayarları başarıyla oluşturuldu.",
      data: serializeAiSetting(setting),
    });
  })
);

router.patch(
  "/:aiSettingId",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const paramsResult = aiSettingParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throw new HttpError(400, "AI ayarı bilgisi geçersiz.");
    }

    const validationResult = updateAiSettingSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen AI ayarı güncelleme bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { aiSettingId } = paramsResult.data;

    const targetSetting = await prisma.aiSetting.findUnique({
      where: {
        id: aiSettingId,
      },
      select: aiSettingSelect,
    });

    if (!targetSetting) {
      throw new HttpError(404, "AI ayarı bulunamadı.");
    }

const { provider, status, name, modelName, baseUrl, apiKey } =validationResult.data;
    if (
      status === "ACTIVE" &&
      !targetSetting.apiKeyEncrypted &&
      (apiKey === undefined || apiKey === null || apiKey.length === 0)
    ) {
      throw new HttpError(400, "Aktif AI ayarı için API key zorunludur.");
    }

    const nextProvider = provider ?? targetSetting.provider;
    const nextBaseUrl = baseUrl === undefined ? targetSetting.baseUrl : baseUrl;

    if (nextProvider === "CUSTOM" && (!nextBaseUrl || nextBaseUrl.length === 0)) {
      throw new HttpError(400, "CUSTOM sağlayıcı için baseUrl zorunludur.");
    }

    const setting = await prisma.aiSetting.update({
      where: {
        id: aiSettingId,
      },
      data: {
        ...(provider !== undefined ? { provider } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(name !== undefined ? { name: name || null } : {}),
        ...(modelName !== undefined ? { modelName: modelName || null } : {}),
        ...(baseUrl !== undefined ? { baseUrl: baseUrl || null } : {}),
        ...(apiKey !== undefined
          ? { apiKeyEncrypted: encryptOptionalSecret(apiKey) }
          : {}),
        updatedByUserId: authenticatedRequest.user.id,
      },
      select: aiSettingSelect,
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "UPDATE_AI_SETTING",
      entityType: "AiSetting",
      entityId: setting.id,
      metadata: {
        previous: {
          provider: targetSetting.provider,
          status: targetSetting.status,
          name: targetSetting.name,
          modelName: targetSetting.modelName,
          baseUrl: targetSetting.baseUrl,
          hasSecrets: hideAiSecrets(targetSetting),
        },
        current: {
          provider: setting.provider,
          status: setting.status,
          name: setting.name,
          modelName: setting.modelName,
          baseUrl: setting.baseUrl,
          hasSecrets: hideAiSecrets(setting),
        },
      },
    });

    response.status(200).json({
      success: true,
      message: "AI ayarları başarıyla güncellendi.",
      data: serializeAiSetting(setting),
    });
  })
);

export default router;

