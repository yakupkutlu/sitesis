import prisma from "../db/prisma.js";

export type AiFailureCode =
  | "AUTH_ERROR"
  | "MODEL_OR_ENDPOINT_NOT_FOUND"
  | "RATE_LIMIT_OR_QUOTA"
  | "REQUEST_REJECTED"
  | "SERVICE_UNAVAILABLE"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "INVALID_RESPONSE"
  | "UNKNOWN";

export class AiProviderRequestError extends Error {
  readonly code: AiFailureCode;
  readonly httpStatus: number | null;
  readonly retryAfterSeconds: number | null;

  constructor(params: {
    message: string;
    code: AiFailureCode;
    httpStatus?: number | null;
    retryAfterSeconds?: number | null;
  }) {
    super(params.message);
    this.name = "AiProviderRequestError";
    this.code = params.code;
    this.httpStatus = params.httpStatus ?? null;
    this.retryAfterSeconds = params.retryAfterSeconds ?? null;
  }
}

function parseRetryAfterSeconds(value: string | null) {
  if (!value) {
    return null;
  }

  const numericValue = Number(value);

  if (Number.isFinite(numericValue) && numericValue > 0) {
    return Math.ceil(numericValue);
  }

  const retryDate = new Date(value);

  if (Number.isNaN(retryDate.getTime())) {
    return null;
  }

  const seconds = Math.ceil((retryDate.getTime() - Date.now()) / 1000);

  return seconds > 0 ? seconds : null;
}

export function createAiProviderHttpError(params: {
  provider: string;
  status: number;
  retryAfterHeader?: string | null;
}) {
  const retryAfterSeconds = parseRetryAfterSeconds(
    params.retryAfterHeader ?? null
  );

  if (params.status === 401 || params.status === 403) {
    return new AiProviderRequestError({
      message: `${params.provider} API anahtarı geçersiz veya yetkisiz.`,
      code: "AUTH_ERROR",
      httpStatus: params.status,
    });
  }

  if (params.status === 404) {
    return new AiProviderRequestError({
      message: `${params.provider} modeli veya API endpointi bulunamadı.`,
      code: "MODEL_OR_ENDPOINT_NOT_FOUND",
      httpStatus: params.status,
    });
  }

  if (params.status === 429) {
    return new AiProviderRequestError({
      message: `${params.provider} kotası dolmuş veya istek sınırı aşılmış.`,
      code: "RATE_LIMIT_OR_QUOTA",
      httpStatus: params.status,
      retryAfterSeconds,
    });
  }

  if (params.status >= 500) {
    return new AiProviderRequestError({
      message: `${params.provider} servisi geçici olarak yanıt veremiyor.`,
      code: "SERVICE_UNAVAILABLE",
      httpStatus: params.status,
    });
  }

  return new AiProviderRequestError({
    message: `${params.provider} isteği reddedildi. HTTP ${params.status}.`,
    code: "REQUEST_REJECTED",
    httpStatus: params.status,
  });
}

export function createAiTimeoutError(provider: string) {
  return new AiProviderRequestError({
    message: `${provider} isteği zaman aşımına uğradı.`,
    code: "TIMEOUT",
    httpStatus: 504,
  });
}

function normalizeFailure(error: unknown): AiProviderRequestError {
  if (error instanceof AiProviderRequestError) {
    return error;
  }

  if (error instanceof SyntaxError) {
    return new AiProviderRequestError({
      message: "AI sağlayıcısının cevabı geçerli formatta değil.",
      code: "INVALID_RESPONSE",
    });
  }

  if (error instanceof Error) {
    return new AiProviderRequestError({
      message: error.message || "AI sağlayıcısına bağlanılamadı.",
      code: "NETWORK_ERROR",
    });
  }

  return new AiProviderRequestError({
    message: "Bilinmeyen AI sağlayıcı hatası oluştu.",
    code: "UNKNOWN",
  });
}

function getCooldownUntil(error: AiProviderRequestError) {
  const now = Date.now();

  if (error.code === "RATE_LIMIT_OR_QUOTA") {
    const defaultSeconds = 24 * 60 * 60;
    const requestedSeconds = error.retryAfterSeconds ?? defaultSeconds;
    const boundedSeconds = Math.min(
      Math.max(requestedSeconds, 60),
      30 * 24 * 60 * 60
    );

    return new Date(now + boundedSeconds * 1000);
  }

  if (
    error.code === "SERVICE_UNAVAILABLE" ||
    error.code === "TIMEOUT" ||
    error.code === "NETWORK_ERROR"
  ) {
    return new Date(now + 10 * 60 * 1000);
  }

  if (
    error.code === "REQUEST_REJECTED" ||
    error.code === "INVALID_RESPONSE" ||
    error.code === "UNKNOWN"
  ) {
    return new Date(now + 30 * 60 * 1000);
  }

  return null;
}

function shouldDeactivate(error: AiProviderRequestError) {
  return (
    error.code === "AUTH_ERROR" ||
    error.code === "MODEL_OR_ENDPOINT_NOT_FOUND"
  );
}

function sanitizeFailureMessage(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 500);
}

export async function markAiSettingSuccess(aiSettingId: string) {
  try {
    await prisma.aiSetting.update({
      where: {
        id: aiSettingId,
      },
      data: {
        consecutiveFailureCount: 0,
        cooldownUntil: null,
        lastSuccessAt: new Date(),
      },
    });
  } catch (error) {
    console.error("AI ayarı başarı bilgisi güncellenemedi:", {
      aiSettingId,
      error,
    });
  }
}

export async function markAiSettingFailure(
  aiSettingId: string,
  error: unknown
) {
  const normalizedError = normalizeFailure(error);

  try {
    await prisma.aiSetting.update({
      where: {
        id: aiSettingId,
      },
      data: {
        consecutiveFailureCount: {
          increment: 1,
        },
        cooldownUntil: getCooldownUntil(normalizedError),
        lastFailureAt: new Date(),
        lastFailureCode: normalizedError.code,
        lastFailureMessage: sanitizeFailureMessage(normalizedError.message),
        ...(shouldDeactivate(normalizedError)
          ? {
              status: "PASSIVE",
            }
          : {}),
      },
    });
  } catch (healthUpdateError) {
    console.error("AI ayarı hata bilgisi güncellenemedi:", {
      aiSettingId,
      error: healthUpdateError,
    });
  }

  return normalizedError;
}
