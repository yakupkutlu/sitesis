import prisma from "../db/prisma.js";
import { decryptText } from "../utils/crypto.js";

type SmsProvider = "ILETIMERKEZI" | "NETGSM" | "TWILIO";
type IysList = "BIREYSEL" | "TACIR";

type SendSmsInput = {
  to: string;
  message: string;
  isCommercial?: boolean;
  iysList?: IysList;
};

type SendSmsResult = {
  provider: SmsProvider;
  providerMessageId?: string;
  providerStatus?: string;
};

type SmsSettingForSending = {
  provider: SmsProvider;
  senderName: string | null;
  fromPhone: string | null;
  apiKeyEncrypted: string | null;
  apiSecretEncrypted: string | null;
  usernameEncrypted: string | null;
  passwordEncrypted: string | null;
  accountSidEncrypted: string | null;
  authTokenEncrypted: string | null;
};

const SMS_REQUEST_TIMEOUT_MS = 15_000;

const smsSettingSelect = {
  provider: true,
  senderName: true,
  fromPhone: true,
  apiKeyEncrypted: true,
  apiSecretEncrypted: true,
  usernameEncrypted: true,
  passwordEncrypted: true,
  accountSidEncrypted: true,
  authTokenEncrypted: true,
} as const;

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Bilinmeyen SMS gönderim hatası oluştu.";
}

function normalizeMessage(value: string) {
  const message = value.trim();

  if (!message) {
    throw new Error("SMS mesajı boş olamaz.");
  }

  return message;
}

function normalizePhoneNumber(value: string, provider: SmsProvider) {
  const compactPhone = value.trim().replace(/[\s()-]/g, "");

  if (!/^\+?\d{10,15}$/.test(compactPhone)) {
    throw new Error("Alıcı telefon numarası geçersiz.");
  }

  if (provider === "TWILIO") {
    if (compactPhone.startsWith("+")) {
      return compactPhone;
    }

    if (compactPhone.startsWith("0") && compactPhone.length === 11) {
      return `+90${compactPhone.slice(1)}`;
    }

    if (compactPhone.startsWith("90") && compactPhone.length === 12) {
      return `+${compactPhone}`;
    }

    if (compactPhone.startsWith("5") && compactPhone.length === 10) {
      return `+90${compactPhone}`;
    }

    return `+${compactPhone}`;
  }

  const digits = compactPhone.replace(/^\+/, "");

  if (digits.startsWith("0") && digits.length === 11) {
    return `90${digits.slice(1)}`;
  }

  if (digits.startsWith("5") && digits.length === 10) {
    return `90${digits}`;
  }

  return digits;
}

function decryptRequiredSecret(
  encryptedValue: string | null,
  missingMessage: string
) {
  if (!encryptedValue) {
    throw new Error(missingMessage);
  }

  const decryptedValue = decryptText(encryptedValue).trim();

  if (!decryptedValue) {
    throw new Error(missingMessage);
  }

  return decryptedValue;
}

function decryptOptionalSecret(encryptedValue: string | null) {
  if (!encryptedValue) {
    return null;
  }

  const decryptedValue = decryptText(encryptedValue).trim();
  return decryptedValue || null;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function parseJsonResponse(response: Response) {
  const body = await response.json().catch(() => null);
  return body as Record<string, unknown> | null;
}

async function getActiveSmsSetting(): Promise<SmsSettingForSending> {
  const setting = await prisma.smsSetting.findFirst({
    where: {
      status: "ACTIVE",
      OR: [
        {
          expiresAt: null,
        },
        {
          expiresAt: {
            gte: new Date(),
          },
        },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
    select: smsSettingSelect,
  });

  if (!setting) {
    throw new Error(
      "Aktif ve son kullanım tarihi geçmemiş SMS ayarı bulunamadı."
    );
  }

  return setting;
}

async function getSmsSettingById(
  smsSettingId: string
): Promise<SmsSettingForSending> {
  const setting = await prisma.smsSetting.findUnique({
    where: {
      id: smsSettingId,
    },
    select: smsSettingSelect,
  });

  if (!setting) {
    throw new Error("SMS ayarı bulunamadı.");
  }

  return setting;
}

async function sendWithIletiMerkezi(
  setting: SmsSettingForSending,
  input: SendSmsInput
): Promise<SendSmsResult> {
  if (!setting.senderName?.trim()) {
    throw new Error("İleti Merkezi gönderici başlığı eksik.");
  }

  const apiKey = decryptRequiredSecret(
    setting.apiKeyEncrypted,
    "İleti Merkezi API anahtarı eksik."
  );

  const apiHash = decryptRequiredSecret(
    setting.apiSecretEncrypted,
    "İleti Merkezi API hash bilgisi eksik."
  );

  if (input.isCommercial && !input.iysList) {
    throw new Error("Ticari SMS gönderimi için İYS liste türü zorunludur.");
  }

  const response = await fetch(
    "https://api.iletimerkezi.com/v1/send-sms/json",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        request: {
          authentication: {
            key: apiKey,
            hash: apiHash,
          },
          order: {
            sender: setting.senderName.trim(),
            iys: input.isCommercial ? "1" : "0",
            ...(input.isCommercial ? { iysList: input.iysList } : {}),
            message: {
              text: normalizeMessage(input.message),
              receipents: {
                number: [normalizePhoneNumber(input.to, "ILETIMERKEZI")],
              },
            },
          },
        },
      }),
      signal: AbortSignal.timeout(SMS_REQUEST_TIMEOUT_MS),
    }
  );

  const body = await parseJsonResponse(response);
  const responseData = body?.response as
    | Record<string, unknown>
    | undefined;
  const status = responseData?.status as
    | Record<string, unknown>
    | undefined;
  const order = responseData?.order as
    | Record<string, unknown>
    | undefined;

  const statusCode = Number(status?.code ?? response.status);
  const statusMessage = String(
    status?.message ?? "SMS gönderimi başarısız."
  );

  if (!response.ok || statusCode !== 200) {
    throw new Error(`İleti Merkezi hatası: ${statusMessage}`);
  }

  return {
    provider: "ILETIMERKEZI",
    providerMessageId: order?.id ? String(order.id) : undefined,
    providerStatus: statusMessage,
  };
}

async function sendWithNetgsm(
  setting: SmsSettingForSending,
  input: SendSmsInput
): Promise<SendSmsResult> {
  if (!setting.senderName?.trim()) {
    throw new Error("Netgsm gönderici başlığı eksik.");
  }

  const username = decryptRequiredSecret(
    setting.usernameEncrypted,
    "Netgsm kullanıcı adı eksik."
  );

  const password = decryptRequiredSecret(
    setting.passwordEncrypted,
    "Netgsm şifresi eksik."
  );

  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<mainbody>
  <header>
    <company dil="TR">Netgsm</company>
    <usercode>${escapeXml(username)}</usercode>
    <password>${escapeXml(password)}</password>
    <type>1:n</type>
    <msgheader>${escapeXml(setting.senderName.trim())}</msgheader>
  </header>
  <body>
    <msg>${escapeXml(normalizeMessage(input.message))}</msg>
    <no>${escapeXml(normalizePhoneNumber(input.to, "NETGSM"))}</no>
  </body>
</mainbody>`;

  const response = await fetch(
    "https://api.netgsm.com.tr/sms/send/xml",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/xml; charset=UTF-8",
      },
      body: xmlBody,
      signal: AbortSignal.timeout(SMS_REQUEST_TIMEOUT_MS),
    }
  );

  const responseText = (await response.text()).trim();
  const [resultCode, providerMessageId] = responseText.split(/\s+/);

  if (!response.ok || resultCode !== "00") {
    throw new Error(
      `Netgsm hatası: ${responseText || `HTTP ${response.status}`}`
    );
  }

  return {
    provider: "NETGSM",
    providerMessageId,
    providerStatus: resultCode,
  };
}

async function sendWithTwilio(
  setting: SmsSettingForSending,
  input: SendSmsInput
): Promise<SendSmsResult> {
  if (!setting.fromPhone?.trim()) {
    throw new Error("Twilio gönderen telefon numarası eksik.");
  }

  const accountSid = decryptRequiredSecret(
    setting.accountSidEncrypted,
    "Twilio Account SID eksik."
  );

  const authToken = decryptOptionalSecret(
    setting.authTokenEncrypted
  );

  const apiKeySid = decryptOptionalSecret(
    setting.apiKeyEncrypted
  );

  const apiKeySecret = decryptOptionalSecret(
    setting.apiSecretEncrypted
  );

  const authUsername =
    apiKeySid && apiKeySecret ? apiKeySid : accountSid;

  const authPassword =
    apiKeySid && apiKeySecret ? apiKeySecret : authToken;

  if (!authPassword) {
    throw new Error(
      "Twilio Auth Token veya API Key Secret eksik."
    );
  }

  const requestBody = new URLSearchParams({
    To: normalizePhoneNumber(input.to, "TWILIO"),
    From: normalizePhoneNumber(setting.fromPhone, "TWILIO"),
    Body: normalizeMessage(input.message),
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
      accountSid
    )}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${authUsername}:${authPassword}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: requestBody,
      signal: AbortSignal.timeout(SMS_REQUEST_TIMEOUT_MS),
    }
  );

  const body = await parseJsonResponse(response);

  if (!response.ok) {
    const providerError =
      typeof body?.message === "string"
        ? body.message
        : `HTTP ${response.status}`;

    throw new Error(`Twilio hatası: ${providerError}`);
  }

  return {
    provider: "TWILIO",
    providerMessageId:
      typeof body?.sid === "string" ? body.sid : undefined,
    providerStatus:
      typeof body?.status === "string" ? body.status : undefined,
  };
}

async function sendWithSetting(
  setting: SmsSettingForSending,
  input: SendSmsInput
): Promise<SendSmsResult> {
  if (setting.provider === "ILETIMERKEZI") {
    return sendWithIletiMerkezi(setting, input);
  }

  if (setting.provider === "NETGSM") {
    return sendWithNetgsm(setting, input);
  }

  if (setting.provider === "TWILIO") {
    return sendWithTwilio(setting, input);
  }

  const unsupportedProvider: never = setting.provider;
  throw new Error(
    `Desteklenmeyen SMS sağlayıcısı: ${unsupportedProvider}`
  );
}

export async function sendSmsWithSetting(params: {
  smsSettingId: string;
  toPhone: string;
  message: string;
}): Promise<SendSmsResult> {
  const setting = await getSmsSettingById(params.smsSettingId);

  try {
    return await sendWithSetting(setting, {
      to: params.toPhone,
      message: params.message,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function sendSmsWithActiveProvider(
  input: SendSmsInput
): Promise<SendSmsResult> {
  const setting = await getActiveSmsSetting();

  try {
    return await sendWithSetting(setting, input);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}