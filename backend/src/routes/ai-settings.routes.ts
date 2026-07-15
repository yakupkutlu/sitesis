import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";
import { createAuditLog } from "../services/audit-log.service.js";
import {
  AiProviderRequestError,
  createAiProviderHttpError,
  createAiTimeoutError,
  markAiSettingFailure,
  markAiSettingSuccess,
} from "../services/ai-setting-health.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { decryptText, encryptText } from "../utils/crypto.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();
const MAX_AI_SETTINGS = 50;

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

const aiSettingSelect = {
  id: true,
  provider: true,
  status: true,
  priority: true,
  expiresAt: true,
  name: true,
  modelName: true,
  baseUrl: true,
  apiKeyEncrypted: true,
  consecutiveFailureCount: true,
  cooldownUntil: true,
  lastSuccessAt: true,
  lastFailureAt: true,
  lastFailureCode: true,
  lastFailureMessage: true,
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
    expiresAt: z.coerce.date().nullable().optional(),
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
    expiresAt: z.coerce.date().nullable().optional(),
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

const testAiSettingSchema = z
  .object({
    aiSettingId: z.string().uuid().optional(),
    provider: z.enum(["OPENAI", "GEMINI", "CUSTOM"]).optional(),
    modelName: z.string().trim().nullable().optional(),
    baseUrl: z.string().trim().url().nullable().optional(),
    apiKey: z.string().trim().nullable().optional(),
  })
  .strict()
  .refine((data) => Boolean(data.aiSettingId || data.provider), {
    message: "Test için aiSettingId veya provider gönderilmelidir.",
  });

const reorderAiSettingsSchema = z
  .object({
    orderedIds: z
      .array(z.string().uuid())
      .min(1)
      .max(MAX_AI_SETTINGS)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Aynı AI ayarı birden fazla gönderilemez.",
      }),
  })
  .strict();

function encryptOptionalSecret(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null || value.length === 0) return null;
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

function formatOptionalDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

async function normalizeAiPriorities() {
  const settings = await prisma.aiSetting.findMany({
    select: {
      id: true,
    },
    orderBy: [
      {
        priority: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  });

  if (settings.length === 0) {
    return;
  }

  await prisma.$transaction(
    settings.map((setting, index) =>
      prisma.aiSetting.update({
        where: {
          id: setting.id,
        },
        data: {
          priority: index + 1,
        },
      })
    )
  );
}

function getDefaultModel(provider: "OPENAI" | "GEMINI" | "CUSTOM") {
  if (provider === "GEMINI") return "gemini-2.5-flash";
  if (provider === "OPENAI") return "gpt-4o-mini";
  return "custom-model";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Bilinmeyen hata oluştu.";
}

function toHttpError(error: unknown) {
  if (!(error instanceof AiProviderRequestError)) {
    return new HttpError(
      502,
      "AI sağlayıcısına bağlanılamadı. Ağ ve sağlayıcı ayarlarını kontrol edin."
    );
  }

  if (
    error.code === "AUTH_ERROR" ||
    error.code === "MODEL_OR_ENDPOINT_NOT_FOUND" ||
    error.code === "REQUEST_REJECTED"
  ) {
    return new HttpError(400, error.message);
  }

  if (error.code === "RATE_LIMIT_OR_QUOTA") {
    return new HttpError(429, error.message);
  }

  if (error.code === "TIMEOUT") {
    return new HttpError(504, error.message);
  }

  return new HttpError(502, error.message);
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 12_000
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw createAiTimeoutError("AI sağlayıcısı");
    }

    if (error instanceof AiProviderRequestError) {
      throw error;
    }

    throw new AiProviderRequestError({
      message:
        error instanceof Error
          ? error.message
          : "AI sağlayıcısına bağlanılamadı.",
      code: "NETWORK_ERROR",
    });
  } finally {
    clearTimeout(timeout);
  }
}

function isUnsafeIpv4(address: string) {
  const parts = address.split(".").map(Number);

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }

  const a = parts[0] ?? -1;
  const b = parts[1] ?? -1;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isUnsafeIpv6(address: string) {
  const normalized = address.toLowerCase();

  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return true;
  }

  if (normalized.startsWith("::ffff:")) {
    const mappedIpv4 = normalized.replace("::ffff:", "");
    return isUnsafeIpv4(mappedIpv4);
  }

  return false;
}

function isUnsafeIpAddress(address: string) {
  const version = isIP(address);

  if (version === 4) return isUnsafeIpv4(address);
  if (version === 6) return isUnsafeIpv6(address);

  return true;
}

async function assertSafeCustomUrl(value: string) {
  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new HttpError(
      400,
      "CUSTOM sağlayıcı için yalnızca HTTPS adresi kullanılabilir."
    );
  }

  const hostname = url.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new HttpError(
      400,
      "Localhost veya yerel ağ adresleri CUSTOM sağlayıcı olarak kullanılamaz."
    );
  }

  if (isIP(hostname) && isUnsafeIpAddress(hostname)) {
    throw new HttpError(
      400,
      "Özel, yerel veya loopback IP adresleri kullanılamaz."
    );
  }

  const resolvedAddresses = await lookup(hostname, {
    all: true,
    verbatim: true,
  });

  if (
    resolvedAddresses.length === 0 ||
    resolvedAddresses.some((item) => isUnsafeIpAddress(item.address))
  ) {
    throw new HttpError(
      400,
      "CUSTOM sağlayıcı adresi güvenli bir genel IP adresine çözülmelidir."
    );
  }

  return url.toString();
}

async function testOpenAiConnection(params: {
  apiKey: string;
  modelName: string;
}) {
  const response = await fetchWithTimeout(
    `https://api.openai.com/v1/models/${encodeURIComponent(params.modelName)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
      },
    }
  );

  if (!response.ok) {
    throw createAiProviderHttpError({
      provider: "OpenAI",
      status: response.status,
      retryAfterHeader: response.headers.get("retry-after"),
    });
  }
}

async function testGeminiConnection(params: {
  apiKey: string;
  modelName: string;
}) {
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      params.modelName
    )}:generateContent?key=${encodeURIComponent(params.apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Sadece OK yaz.",
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 8,
        },
      }),
    }
  );

  if (!response.ok) {
    throw createAiProviderHttpError({
      provider: "Gemini",
      status: response.status,
      retryAfterHeader: response.headers.get("retry-after"),
    });
  }
}

async function testCustomConnection(params: {
  apiKey: string;
  baseUrl: string;
  modelName: string;
}) {
  const safeUrl = await assertSafeCustomUrl(params.baseUrl);

  const response = await fetchWithTimeout(safeUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.modelName,
      prompt: "Sadece OK yaz.",
      test: true,
    }),
  });

  if (!response.ok) {
    throw createAiProviderHttpError({
      provider: "CUSTOM AI",
      status: response.status,
      retryAfterHeader: response.headers.get("retry-after"),
    });
  }
}

router.get(
  "/",
  asyncHandler(async (_request: Request, response: Response) => {
    const settings = await prisma.aiSetting.findMany({
      select: aiSettingSelect,
      orderBy: [
        {
          priority: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

    response.status(200).json({
      success: true,
      data: settings.map(serializeAiSetting),
    });
  })
);

router.post(
  "/test",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const validationResult = testAiSettingSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "AI bağlantı testi bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const input = validationResult.data;

    const savedSetting = input.aiSettingId
      ? await prisma.aiSetting.findUnique({
          where: {
            id: input.aiSettingId,
          },
          select: aiSettingSelect,
        })
      : null;

    if (input.aiSettingId && !savedSetting) {
      throw new HttpError(404, "Test edilecek AI ayarı bulunamadı.");
    }

    const provider = input.provider ?? savedSetting?.provider;

    if (!provider) {
      throw new HttpError(400, "AI sağlayıcısı belirtilmelidir.");
    }

    const modelName =
      input.modelName?.trim() ||
      savedSetting?.modelName ||
      getDefaultModel(provider);

    const inputContainsBaseUrl = Object.prototype.hasOwnProperty.call(
      input,
      "baseUrl"
    );

    const baseUrl = inputContainsBaseUrl
      ? input.baseUrl?.trim() || null
      : savedSetting?.baseUrl ?? null;

    const enteredApiKey = input.apiKey?.trim() || null;

    const apiKey =
      enteredApiKey ||
      (savedSetting?.apiKeyEncrypted
        ? decryptText(savedSetting.apiKeyEncrypted)
        : null);

    if (!apiKey) {
      throw new HttpError(400, "Bağlantı testi için API key zorunludur.");
    }

    if (provider === "CUSTOM" && !baseUrl) {
      throw new HttpError(400, "CUSTOM sağlayıcı için baseUrl zorunludur.");
    }

    const startedAt = Date.now();
    const usesSavedSecret = Boolean(savedSetting?.id && !enteredApiKey);

    try {
      if (provider === "OPENAI") {
        await testOpenAiConnection({
          apiKey,
          modelName,
        });
      } else if (provider === "GEMINI") {
        await testGeminiConnection({
          apiKey,
          modelName,
        });
      } else {
        await testCustomConnection({
          apiKey,
          baseUrl: baseUrl as string,
          modelName,
        });
      }

      const latencyMs = Date.now() - startedAt;

      if (savedSetting?.id && usesSavedSecret) {
        await markAiSettingSuccess(savedSetting.id);
      }

      await createAuditLog({
        request,
        userId: authenticatedRequest.user.id,
        action: "TEST_AI_SETTING",
        entityType: "AiSetting",
        entityId: savedSetting?.id,
        metadata: {
          provider,
          modelName,
          success: true,
          latencyMs,
          usedSavedSecret: usesSavedSecret,
        },
      });

      response.status(200).json({
        success: true,
        message: `${provider} bağlantısı başarıyla doğrulandı.`,
        data: {
          provider,
          modelName,
          latencyMs,
        },
      });
    } catch (error) {
      const latencyMs = Date.now() - startedAt;

      if (savedSetting?.id && usesSavedSecret) {
        await markAiSettingFailure(savedSetting.id, error);
      }

      await createAuditLog({
        request,
        userId: authenticatedRequest.user.id,
        action: "TEST_AI_SETTING",
        entityType: "AiSetting",
        entityId: savedSetting?.id,
        metadata: {
          provider,
          modelName,
          success: false,
          latencyMs,
          error: getErrorMessage(error),
          usedSavedSecret: usesSavedSecret,
        },
      });

      throw toHttpError(error);
    }
  })
);

router.patch(
  "/reorder",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const userId = authenticatedRequest.user.id;

    const validationResult = reorderAiSettingsSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "AI ayar sıralaması geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { orderedIds } = validationResult.data;

    const currentSettings = await prisma.aiSetting.findMany({
      select: {
        id: true,
      },
    });

    const currentIds = new Set(currentSettings.map((setting) => setting.id));

    if (
      currentSettings.length !== orderedIds.length ||
      orderedIds.some((id) => !currentIds.has(id))
    ) {
      throw new HttpError(
        400,
        "Sıralama listesi tüm mevcut AI ayarlarını içermelidir."
      );
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.aiSetting.update({
          where: {
            id,
          },
          data: {
            priority: index + 1,
            updatedByUserId: userId,
          },
        })
      )
    );

    const settings = await prisma.aiSetting.findMany({
      select: aiSettingSelect,
      orderBy: [
        {
          priority: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "REORDER_AI_SETTINGS",
      entityType: "AiSetting",
      metadata: {
        orderedIds,
      },
    });

    response.status(200).json({
      success: true,
      message: "AI ayar sıralaması güncellendi.",
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

    const existingSettingCount = await prisma.aiSetting.count();

    if (existingSettingCount >= MAX_AI_SETTINGS) {
      throw new HttpError(
        400,
        "En fazla 10 AI sağlayıcı ayarı eklenebilir."
      );
    }

    const lastSetting = await prisma.aiSetting.findFirst({
      select: {
        priority: true,
      },
      orderBy: {
        priority: "desc",
      },
    });

    const {
      provider,
      status,
      expiresAt,
      name,
      modelName,
      baseUrl,
      apiKey,
    } = validationResult.data;

    if (provider === "CUSTOM" && baseUrl) {
      await assertSafeCustomUrl(baseUrl);
    }

    const setting = await prisma.aiSetting.create({
      data: {
        provider,
        status,
        priority: (lastSetting?.priority ?? 0) + 1,
        expiresAt: expiresAt ?? null,
        name: name || null,
        modelName: modelName || null,
        baseUrl: provider === "CUSTOM" ? baseUrl || null : null,
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
        priority: setting.priority,
        expiresAt: formatOptionalDate(setting.expiresAt),
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

    const {
      provider,
      status,
      expiresAt,
      name,
      modelName,
      baseUrl,
      apiKey,
    } = validationResult.data;

    const nextProvider = provider ?? targetSetting.provider;
    const nextStatus = status ?? targetSetting.status;
    const nextBaseUrl =
      baseUrl === undefined ? targetSetting.baseUrl : baseUrl || null;

    const nextHasApiKey =
      apiKey === undefined
        ? Boolean(targetSetting.apiKeyEncrypted)
        : Boolean(apiKey);

    if (nextStatus === "ACTIVE" && !nextHasApiKey) {
      throw new HttpError(400, "Aktif AI ayarı için API key zorunludur.");
    }

    if (nextProvider === "CUSTOM" && !nextBaseUrl) {
      throw new HttpError(400, "CUSTOM sağlayıcı için baseUrl zorunludur.");
    }

    if (nextProvider === "CUSTOM" && nextBaseUrl) {
      await assertSafeCustomUrl(nextBaseUrl);
    }

    const shouldResetHealth =
      provider !== undefined ||
      modelName !== undefined ||
      baseUrl !== undefined ||
      apiKey !== undefined ||
      status === "ACTIVE";

    const setting = await prisma.aiSetting.update({
      where: {
        id: aiSettingId,
      },
      data: {
        ...(provider !== undefined ? { provider } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(expiresAt !== undefined ? { expiresAt } : {}),
        ...(name !== undefined ? { name: name || null } : {}),
        ...(modelName !== undefined
          ? { modelName: modelName || null }
          : {}),
        ...(provider !== undefined || baseUrl !== undefined
          ? {
              baseUrl:
                nextProvider === "CUSTOM" ? nextBaseUrl : null,
            }
          : {}),
        ...(apiKey !== undefined
          ? { apiKeyEncrypted: encryptOptionalSecret(apiKey) }
          : {}),
        ...(shouldResetHealth
          ? {
              consecutiveFailureCount: 0,
              cooldownUntil: null,
              lastSuccessAt: null,
              lastFailureAt: null,
              lastFailureCode: null,
              lastFailureMessage: null,
            }
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
          priority: targetSetting.priority,
          expiresAt: formatOptionalDate(targetSetting.expiresAt),
          name: targetSetting.name,
          modelName: targetSetting.modelName,
          baseUrl: targetSetting.baseUrl,
          hasSecrets: hideAiSecrets(targetSetting),
        },
        current: {
          provider: setting.provider,
          status: setting.status,
          priority: setting.priority,
          expiresAt: formatOptionalDate(setting.expiresAt),
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

router.delete(
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

    await prisma.aiSetting.delete({
      where: {
        id: aiSettingId,
      },
    });

    await normalizeAiPriorities();

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "DELETE_AI_SETTING",
      entityType: "AiSetting",
      entityId: aiSettingId,
      metadata: {
        provider: targetSetting.provider,
        status: targetSetting.status,
        priority: targetSetting.priority,
        expiresAt: formatOptionalDate(targetSetting.expiresAt),
        name: targetSetting.name,
        modelName: targetSetting.modelName,
        baseUrl: targetSetting.baseUrl,
        hasSecrets: hideAiSecrets(targetSetting),
      },
    });

    const settings = await prisma.aiSetting.findMany({
      select: aiSettingSelect,
      orderBy: [
        {
          priority: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

    response.status(200).json({
      success: true,
      message: "AI ayarı başarıyla silindi.",
      data: settings.map(serializeAiSetting),
    });
  })
);

export default router;
