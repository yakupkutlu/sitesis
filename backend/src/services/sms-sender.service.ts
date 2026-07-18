import prisma from "../db/prisma.js";
import { decryptText } from "../utils/crypto.js";

type SendSmsResult = {
  provider: string;
  providerMessageId?: string;
};

async function sendViaTwilio(params: {
  accountSid: string;
  authToken: string;
  fromPhone: string;
  toPhone: string;
  message: string;
}): Promise<SendSmsResult> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${params.accountSid}/Messages.json`;
  const credentials = Buffer.from(`${params.accountSid}:${params.authToken}`).toString(
    "base64"
  );

  const body = new URLSearchParams({
    To: params.toPhone,
    From: params.fromPhone,
    Body: params.message,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage =
      result?.message || "Twilio SMS gönderimi başarısız oldu.";
    throw new Error(errorMessage);
  }

  return {
    provider: "TWILIO",
    providerMessageId: result?.sid,
  };
}

export async function sendSmsWithSetting(params: {
  smsSettingId: string;
  toPhone: string;
  message: string;
}): Promise<SendSmsResult> {
  const setting = await prisma.smsSetting.findUnique({
    where: {
      id: params.smsSettingId,
    },
    select: {
      provider: true,
      fromPhone: true,
      accountSidEncrypted: true,
      authTokenEncrypted: true,
    },
  });

  if (!setting) {
    throw new Error("SMS ayarı bulunamadı.");
  }

  if (setting.provider === "TWILIO") {
    if (!setting.accountSidEncrypted || !setting.authTokenEncrypted || !setting.fromPhone) {
      throw new Error(
        "Twilio ayarları eksik: Account SID, Auth Token ve gönderen numara zorunludur."
      );
    }

    return sendViaTwilio({
      accountSid: decryptText(setting.accountSidEncrypted),
      authToken: decryptText(setting.authTokenEncrypted),
      fromPhone: setting.fromPhone,
      toPhone: params.toPhone,
      message: params.message,
    });
  }

  throw new Error("Bu SMS sağlayıcısı için gönderim henüz desteklenmiyor.");
}
