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

const emailSettingSelect = {
  id: true,
  provider: true,
  status: true,
  fromEmail: true,
  fromName: true,
  smtpHost: true,
  smtpPort: true,
  smtpSecure: true,
  smtpUsernameEncrypted: true,
  smtpPasswordEncrypted: true,
  sendgridApiKeyEncrypted: true,
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

const createEmailSettingSchema = z
  .object({
    provider: z.enum(["SMTP", "SENDGRID"]),
    status: z.enum(["ACTIVE", "PASSIVE"]).optional().default("PASSIVE"),
    fromEmail: z.string().trim().email(),
    fromName: z.string().trim().optional(),

    smtpHost: z.string().trim().optional(),
    smtpPort: z.number().int().positive().optional(),
    smtpSecure: z.boolean().optional().default(false),
    smtpUsername: z.string().trim().optional(),
    smtpPassword: z.string().trim().optional(),

    sendgridApiKey: z.string().trim().optional(),
  })
  .superRefine((data, context) => {
    if (data.provider === "SMTP") {
      if (!data.smtpHost) {
        context.addIssue({
          code: "custom",
          path: ["smtpHost"],
          message: "SMTP sağlayıcısı için smtpHost zorunludur.",
        });
      }

      if (!data.smtpPort) {
        context.addIssue({
          code: "custom",
          path: ["smtpPort"],
          message: "SMTP sağlayıcısı için smtpPort zorunludur.",
        });
      }

      if (!data.smtpUsername) {
        context.addIssue({
          code: "custom",
          path: ["smtpUsername"],
          message: "SMTP sağlayıcısı için smtpUsername zorunludur.",
        });
      }

      if (!data.smtpPassword) {
        context.addIssue({
          code: "custom",
          path: ["smtpPassword"],
          message: "SMTP sağlayıcısı için smtpPassword zorunludur.",
        });
      }
    }

    if (data.provider === "SENDGRID" && !data.sendgridApiKey) {
      context.addIssue({
        code: "custom",
        path: ["sendgridApiKey"],
        message: "SendGrid sağlayıcısı için API key zorunludur.",
      });
    }
  });

const updateEmailSettingSchema = z
  .object({
    provider: z.enum(["SMTP", "SENDGRID"]).optional(),
    status: z.enum(["ACTIVE", "PASSIVE"]).optional(),
    fromEmail: z.string().trim().email().optional(),
    fromName: z.string().trim().nullable().optional(),

    smtpHost: z.string().trim().nullable().optional(),
    smtpPort: z.number().int().positive().nullable().optional(),
    smtpSecure: z.boolean().optional(),
    smtpUsername: z.string().trim().nullable().optional(),
    smtpPassword: z.string().trim().nullable().optional(),

    sendgridApiKey: z.string().trim().nullable().optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "En az bir alan gönderilmelidir.",
  });

const emailSettingParamsSchema = z.object({
  emailSettingId: z.string().uuid(),
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

function hideEmailSecrets(setting: {
  smtpUsernameEncrypted: string | null;
  smtpPasswordEncrypted: string | null;
  sendgridApiKeyEncrypted: string | null;
}) {
  return {
    hasSmtpUsername: Boolean(setting.smtpUsernameEncrypted),
    hasSmtpPassword: Boolean(setting.smtpPasswordEncrypted),
    hasSendgridApiKey: Boolean(setting.sendgridApiKeyEncrypted),
  };
}

function serializeEmailSetting<T extends {
  smtpUsernameEncrypted: string | null;
  smtpPasswordEncrypted: string | null;
  sendgridApiKeyEncrypted: string | null;
}>(setting: T) {
  const {
    smtpUsernameEncrypted,
    smtpPasswordEncrypted,
    sendgridApiKeyEncrypted,
    ...safeSetting
  } = setting;

  return {
    ...safeSetting,
    secrets: hideEmailSecrets({
      smtpUsernameEncrypted,
      smtpPasswordEncrypted,
      sendgridApiKeyEncrypted,
    }),
  };
}

router.get(
  "/",
  asyncHandler(async (_request: Request, response: Response) => {
    const settings = await prisma.emailSetting.findMany({
      select: emailSettingSelect,
      orderBy: {
        createdAt: "desc",
      },
    });

    response.status(200).json({
      success: true,
      data: settings.map(serializeEmailSetting),
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

    const validationResult = createEmailSettingSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen e-posta ayarları geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const {
      provider,
      status,
      fromEmail,
      fromName,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUsername,
      smtpPassword,
      sendgridApiKey,
    } = validationResult.data;

    const setting = await prisma.emailSetting.create({
      data: {
        provider,
        status,
        fromEmail,
        fromName,
        smtpHost,
        smtpPort,
        smtpSecure,
        smtpUsernameEncrypted: encryptOptionalSecret(smtpUsername),
        smtpPasswordEncrypted: encryptOptionalSecret(smtpPassword),
        sendgridApiKeyEncrypted: encryptOptionalSecret(sendgridApiKey),
        createdByUserId: authenticatedRequest.user.id,
        updatedByUserId: authenticatedRequest.user.id,
      },
      select: emailSettingSelect,
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "CREATE_EMAIL_SETTING",
      entityType: "EmailSetting",
      entityId: setting.id,
      metadata: {
        provider: setting.provider,
        status: setting.status,
        fromEmail: setting.fromEmail,
        hasSecrets: hideEmailSecrets(setting),
      },
    });

    response.status(201).json({
      success: true,
      message: "E-posta ayarları başarıyla oluşturuldu.",
      data: serializeEmailSetting(setting),
    });
  })
);

router.patch(
  "/:emailSettingId",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const paramsResult = emailSettingParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throw new HttpError(400, "E-posta ayarı bilgisi geçersiz.");
    }

    const validationResult = updateEmailSettingSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen e-posta ayarı güncelleme bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { emailSettingId } = paramsResult.data;

    const targetSetting = await prisma.emailSetting.findUnique({
      where: {
        id: emailSettingId,
      },
      select: emailSettingSelect,
    });

    if (!targetSetting) {
      throw new HttpError(404, "E-posta ayarı bulunamadı.");
    }

    const {
      provider,
      status,
      fromEmail,
      fromName,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUsername,
      smtpPassword,
      sendgridApiKey,
    } = validationResult.data;

    const setting = await prisma.emailSetting.update({
      where: {
        id: emailSettingId,
      },
      data: {
        ...(provider !== undefined ? { provider } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(fromEmail !== undefined ? { fromEmail } : {}),
        ...(fromName !== undefined ? { fromName: fromName || null } : {}),
        ...(smtpHost !== undefined ? { smtpHost: smtpHost || null } : {}),
        ...(smtpPort !== undefined ? { smtpPort } : {}),
        ...(smtpSecure !== undefined ? { smtpSecure } : {}),
        ...(smtpUsername !== undefined
          ? { smtpUsernameEncrypted: encryptOptionalSecret(smtpUsername) }
          : {}),
        ...(smtpPassword !== undefined
          ? { smtpPasswordEncrypted: encryptOptionalSecret(smtpPassword) }
          : {}),
        ...(sendgridApiKey !== undefined
          ? { sendgridApiKeyEncrypted: encryptOptionalSecret(sendgridApiKey) }
          : {}),
        updatedByUserId: authenticatedRequest.user.id,
      },
      select: emailSettingSelect,
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "UPDATE_EMAIL_SETTING",
      entityType: "EmailSetting",
      entityId: setting.id,
      metadata: {
        previous: {
          provider: targetSetting.provider,
          status: targetSetting.status,
          fromEmail: targetSetting.fromEmail,
          smtpHost: targetSetting.smtpHost,
          smtpPort: targetSetting.smtpPort,
          smtpSecure: targetSetting.smtpSecure,
          hasSecrets: hideEmailSecrets(targetSetting),
        },
        current: {
          provider: setting.provider,
          status: setting.status,
          fromEmail: setting.fromEmail,
          smtpHost: setting.smtpHost,
          smtpPort: setting.smtpPort,
          smtpSecure: setting.smtpSecure,
          hasSecrets: hideEmailSecrets(setting),
        },
      },
    });

    response.status(200).json({
      success: true,
      message: "E-posta ayarları başarıyla güncellendi.",
      data: serializeEmailSetting(setting),
    });
  })
);

export default router;