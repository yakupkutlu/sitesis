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

const smsSettingSelect = {
  id: true,
  provider: true,
  status: true,
  expiresAt: true,
  senderName: true,
  fromPhone: true,
  apiKeyEncrypted: true,
  apiSecretEncrypted: true,
  usernameEncrypted: true,
  passwordEncrypted: true,
  accountSidEncrypted: true,
  authTokenEncrypted: true,
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

const createSmsSettingSchema = z.object({
  provider: z.enum(["ILETIMERKEZI", "NETGSM", "TWILIO"]),
  status: z.enum(["ACTIVE", "PASSIVE"]).optional().default("PASSIVE"),
  expiresAt: z.coerce.date().nullable().optional(),
  senderName: z.string().trim().optional(),
  apiKey: z.string().trim().optional(),
  apiSecret: z.string().trim().optional(),
  username: z.string().trim().optional(),
  password: z.string().trim().optional(),
  accountSid: z.string().trim().optional(),
  authToken: z.string().trim().optional(),
  fromPhone: z.string().trim().optional(),
});

const updateSmsSettingSchema = z
  .object({
    provider: z.enum(["ILETIMERKEZI", "NETGSM", "TWILIO"]).optional(),
    status: z.enum(["ACTIVE", "PASSIVE"]).optional(),
    expiresAt: z.coerce.date().nullable().optional(),
    senderName: z.string().trim().nullable().optional(),
    apiKey: z.string().trim().nullable().optional(),
    apiSecret: z.string().trim().nullable().optional(),
    username: z.string().trim().nullable().optional(),
    password: z.string().trim().nullable().optional(),
    accountSid: z.string().trim().nullable().optional(),
    authToken: z.string().trim().nullable().optional(),
    fromPhone: z.string().trim().nullable().optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "En az bir alan gönderilmelidir.",
  });

const smsSettingParamsSchema = z.object({
  smsSettingId: z.string().uuid(),
});

function hideSmsSecrets(setting: {
  apiKeyEncrypted: string | null;
  apiSecretEncrypted: string | null;
  usernameEncrypted: string | null;
  passwordEncrypted: string | null;
  accountSidEncrypted: string | null;
  authTokenEncrypted: string | null;
}) {
  return {
    hasApiKey: Boolean(setting.apiKeyEncrypted),
    hasApiSecret: Boolean(setting.apiSecretEncrypted),
    hasUsername: Boolean(setting.usernameEncrypted),
    hasPassword: Boolean(setting.passwordEncrypted),
    hasAccountSid: Boolean(setting.accountSidEncrypted),
    hasAuthToken: Boolean(setting.authTokenEncrypted),
  };
}

function serializeSmsSetting<T extends {
  apiKeyEncrypted: string | null;
  apiSecretEncrypted: string | null;
  usernameEncrypted: string | null;
  passwordEncrypted: string | null;
  accountSidEncrypted: string | null;
  authTokenEncrypted: string | null;
}>(setting: T) {
  const {
    apiKeyEncrypted,
    apiSecretEncrypted,
    usernameEncrypted,
    passwordEncrypted,
    accountSidEncrypted,
    authTokenEncrypted,
    ...safeSetting
  } = setting;

  return {
    ...safeSetting,
    secrets: hideSmsSecrets({
      apiKeyEncrypted,
      apiSecretEncrypted,
      usernameEncrypted,
      passwordEncrypted,
      accountSidEncrypted,
      authTokenEncrypted,
    }),
  };
}

function encryptOptionalSecret(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null || value.length === 0) return null;
  return encryptText(value);
}

function serializeOptionalDate(value: unknown) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

router.get(
  "/",
  asyncHandler(async (_request: Request, response: Response) => {
    const settings = await prisma.smsSetting.findMany({
      select: smsSettingSelect,
      orderBy: {
        createdAt: "desc",
      },
    });

    response.status(200).json({
      success: true,
      data: settings.map(serializeSmsSetting),
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

    const validationResult = createSmsSettingSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen SMS ayarları geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const {
      provider,
      status,
      expiresAt,
      senderName,
      apiKey,
      apiSecret,
      username,
      password,
      accountSid,
      authToken,
      fromPhone,
    } = validationResult.data;

    const setting = await prisma.smsSetting.create({
      data: {
        provider,
        status,
        expiresAt: expiresAt ?? null,
        senderName,
        fromPhone,
        apiKeyEncrypted: encryptOptionalSecret(apiKey),
        apiSecretEncrypted: encryptOptionalSecret(apiSecret),
        usernameEncrypted: encryptOptionalSecret(username),
        passwordEncrypted: encryptOptionalSecret(password),
        accountSidEncrypted: encryptOptionalSecret(accountSid),
        authTokenEncrypted: encryptOptionalSecret(authToken),
        createdByUserId: authenticatedRequest.user.id,
        updatedByUserId: authenticatedRequest.user.id,
      },
      select: smsSettingSelect,
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "CREATE_SMS_SETTING",
      entityType: "SmsSetting",
      entityId: setting.id,
      metadata: {
        provider: setting.provider,
        status: setting.status,
        expiresAt: serializeOptionalDate(setting.expiresAt),
        hasSecrets: hideSmsSecrets(setting),
      },
    });

    response.status(201).json({
      success: true,
      message: "SMS ayarları başarıyla oluşturuldu.",
      data: serializeSmsSetting(setting),
    });
  })
);

router.patch(
  "/:smsSettingId",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const paramsResult = smsSettingParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throw new HttpError(400, "SMS ayarı bilgisi geçersiz.");
    }

    const validationResult = updateSmsSettingSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen SMS ayarı güncelleme bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { smsSettingId } = paramsResult.data;

    const targetSetting = await prisma.smsSetting.findUnique({
      where: {
        id: smsSettingId,
      },
      select: smsSettingSelect,
    });

    if (!targetSetting) {
      throw new HttpError(404, "SMS ayarı bulunamadı.");
    }

    const {
      provider,
      status,
      expiresAt,
      senderName,
      apiKey,
      apiSecret,
      username,
      password,
      accountSid,
      authToken,
      fromPhone,
    } = validationResult.data;

    const setting = await prisma.smsSetting.update({
      where: {
        id: smsSettingId,
      },
      data: {
        ...(provider !== undefined ? { provider } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(expiresAt !== undefined ? { expiresAt } : {}),
        ...(senderName !== undefined ? { senderName: senderName || null } : {}),
        ...(fromPhone !== undefined ? { fromPhone: fromPhone || null } : {}),
        ...(apiKey !== undefined
          ? { apiKeyEncrypted: encryptOptionalSecret(apiKey) }
          : {}),
        ...(apiSecret !== undefined
          ? { apiSecretEncrypted: encryptOptionalSecret(apiSecret) }
          : {}),
        ...(username !== undefined
          ? { usernameEncrypted: encryptOptionalSecret(username) }
          : {}),
        ...(password !== undefined
          ? { passwordEncrypted: encryptOptionalSecret(password) }
          : {}),
        ...(accountSid !== undefined
          ? { accountSidEncrypted: encryptOptionalSecret(accountSid) }
          : {}),
        ...(authToken !== undefined
          ? { authTokenEncrypted: encryptOptionalSecret(authToken) }
          : {}),
        updatedByUserId: authenticatedRequest.user.id,
      },
      select: smsSettingSelect,
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "UPDATE_SMS_SETTING",
      entityType: "SmsSetting",
      entityId: setting.id,
      metadata: {
        previous: {
          provider: targetSetting.provider,
          status: targetSetting.status,
          expiresAt: serializeOptionalDate(targetSetting.expiresAt),
          senderName: targetSetting.senderName,
          fromPhone: targetSetting.fromPhone,
          hasSecrets: hideSmsSecrets(targetSetting),
        },
        current: {
          provider: setting.provider,
          status: setting.status,
          expiresAt: serializeOptionalDate(setting.expiresAt),
          senderName: setting.senderName,
          fromPhone: setting.fromPhone,
          hasSecrets: hideSmsSecrets(setting),
        },
      },
    });

    response.status(200).json({
      success: true,
      message: "SMS ayarları başarıyla güncellendi.",
      data: serializeSmsSetting(setting),
    });
  })
);


router.delete(
  "/:smsSettingId",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const paramsResult = smsSettingParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throw new HttpError(400, "SMS ayarı bilgisi geçersiz.");
    }

    const { smsSettingId } = paramsResult.data;

    const targetSetting = await prisma.smsSetting.findUnique({
      where: {
        id: smsSettingId,
      },
      select: smsSettingSelect,
    });

    if (!targetSetting) {
      throw new HttpError(404, "SMS ayarı bulunamadı.");
    }

    await prisma.smsSetting.delete({
      where: {
        id: smsSettingId,
      },
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "DELETE_SMS_SETTING",
      entityType: "SmsSetting",
      entityId: smsSettingId,
      metadata: {
        provider: targetSetting.provider,
        status: targetSetting.status,
        expiresAt: serializeOptionalDate(targetSetting.expiresAt),
        senderName: targetSetting.senderName,
        fromPhone: targetSetting.fromPhone,
        hasSecrets: hideSmsSecrets(targetSetting),
      },
    });

    response.status(200).json({
      success: true,
      message: "SMS ayarı başarıyla silindi.",
    });
  })
);

export default router;
