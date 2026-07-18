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

async function sendViaNetgsm(params: {
  username: string;
  password: string;
  senderName: string;
  toPhone: string;
  message: string;
}): Promise<SendSmsResult> {
  const url = new URL("https://api.netgsm.com.tr/sms/send/get");
  url.searchParams.set("usercode", params.username);
  url.searchParams.set("password", params.password);
  url.searchParams.set("gsmno", params.toPhone);
  url.searchParams.set("message", params.message);
  url.searchParams.set("msgheader", params.senderName);

  const response = await fetch(url.toString(), { method: "GET" });
  const resultText = (await response.text()).trim();
  const [resultCode, jobId] = resultText.split(" ");

  if (!response.ok || (resultCode !== "00" && resultCode !== "01")) {
    throw new Error(`Netgsm SMS gönderimi başarısız oldu (kod: ${resultText}).`);
  }

  return {
    provider: "NETGSM",
    providerMessageId: jobId,
  };
}

async function sendViaIletiMerkezi(params: {
  apiKey: string;
  apiHash: string;
  senderName: string;
  toPhone: string;
  message: string;
}): Promise<SendSmsResult> {
  const response = await fetch("https://api.iletimerkezi.com/v1/send-sms/json", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      request: {
        authentication: {
          key: params.apiKey,
          hash: params.apiHash,
        },
        order: {
          sender: params.senderName,
          message: {
            text: params.message,
            receipents: {
              number: [params.toPhone],
            },
          },
        },
      },
    }),
  });

  const result = await response.json().catch(() => null);
  const statusCode = result?.response?.status?.code;

  if (!response.ok || statusCode !== "200") {
    const errorMessage =
      result?.response?.status?.message ||
      "İleti Merkezi SMS gönderimi başarısız oldu.";
    throw new Error(errorMessage);
  }

  return {
    provider: "ILETIMERKEZI",
    providerMessageId: result?.response?.order?.id,
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
      senderName: true,
      fromPhone: true,
      accountSidEncrypted: true,
      authTokenEncrypted: true,
      usernameEncrypted: true,
      passwordEncrypted: true,
      apiKeyEncrypted: true,
      apiSecretEncrypted: true,
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

  if (setting.provider === "NETGSM") {
    if (!setting.usernameEncrypted || !setting.passwordEncrypted || !setting.senderName) {
      throw new Error(
        "Netgsm ayarları eksik: kullanıcı adı, şifre ve gönderici başlığı zorunludur."
      );
    }

    return sendViaNetgsm({
      username: decryptText(setting.usernameEncrypted),
      password: decryptText(setting.passwordEncrypted),
      senderName: setting.senderName,
      toPhone: params.toPhone,
      message: params.message,
    });
  }

  if (setting.provider === "ILETIMERKEZI") {
    if (!setting.apiKeyEncrypted || !setting.apiSecretEncrypted || !setting.senderName) {
      throw new Error(
        "İleti Merkezi ayarları eksik: API key, API secret ve gönderici başlığı zorunludur."
      );
    }

    return sendViaIletiMerkezi({
      apiKey: decryptText(setting.apiKeyEncrypted),
      apiHash: decryptText(setting.apiSecretEncrypted),
      senderName: setting.senderName,
      toPhone: params.toPhone,
      message: params.message,
    });
  }

  throw new Error("Bu SMS sağlayıcısı için gönderim henüz desteklenmiyor.");
}
