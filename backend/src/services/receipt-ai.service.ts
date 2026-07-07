import fs from "node:fs/promises";

import prisma from "../db/prisma.js";
import { decryptText } from "../utils/crypto.js";

type ReceiptAiAnalyzeInput = {
  filePath: string;
  mimeType: string;
  originalFileName: string;
};

export type ReceiptAiAnalyzeResult = {
  payerName: string | null;
  amount: number | null;
  amountKurus: number | null;
  apartmentNumber: string | null;
  description: string | null;
  paymentDate: string | null;
  confidence: number;
  provider: string | null;
  modelName: string | null;
};

const emptyAiResult: ReceiptAiAnalyzeResult = {
  payerName: null,
  amount: null,
  amountKurus: null,
  apartmentNumber: null,
  description: null,
  paymentDate: null,
  confidence: 0,
  provider: null,
  modelName: null,
};

function buildReceiptPrompt() {
  return `
Sen banka dekontu okuyan bir sistemsin.

Görev:
Dekont görselinden veya belgesinden ödeme bilgilerini çıkar.

Sadece JSON döndür.
Açıklama yazma.
Markdown kullanma.

JSON formatı:
{
  "payerName": string | null,
  "amount": number | null,
  "apartmentNumber": string | null,
  "description": string | null,
  "paymentDate": string | null,
  "confidence": number
}

Kurallar:
- amount TL cinsinden sayı olmalı. Örnek: 1250.50
- apartmentNumber dekont açıklamasında daire no varsa çıkar.
- bilgi yoksa null yaz.
- TCKN, TC kimlik no, IBAN, banka hesap numarası, telefon numarası veya özel kimlik numarası döndürme.
- Açıklama içinde hassas bilgi varsa "[HASSAS BİLGİ GİZLENDİ]" yaz.
- confidence 0 ile 1 arasında olmalı.
`;
}


function maskSensitiveReceiptText(value: string | null) {
  if (!value) {
    return null;
  }

  return value
    // TCKN / 11 haneli kimlik numarası
    .replace(/\b\d{11}\b/g, "[TCKN GİZLENDİ]")
    // IBAN
    .replace(/\bTR\d{2}[\s\d]{10,}\b/gi, "[IBAN GİZLENDİ]")
    // Uzun banka / referans / işlem numaraları
    .replace(/\b\d{12,}\b/g, "[NUMARA GİZLENDİ]")
    // Türkiye telefon numarası benzeri değerler
    .replace(/\b0?5\d{9}\b/g, "[TELEFON GİZLENDİ]")
    .trim();
}
function normalizeAiJson(rawText: string) {
  const cleanedText = rawText
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  const parsed = JSON.parse(cleanedText) as Partial<ReceiptAiAnalyzeResult>;

  const amount =
    typeof parsed.amount === "number" && Number.isFinite(parsed.amount)
      ? parsed.amount
      : null;

  return {
    payerName:
      typeof parsed.payerName === "string" && parsed.payerName.trim().length > 0
        ? maskSensitiveReceiptText(parsed.payerName.trim())
        : null,
    amount,
    amountKurus: amount !== null ? Math.round(amount * 100) : null,
    apartmentNumber:
      typeof parsed.apartmentNumber === "string" &&
      parsed.apartmentNumber.trim().length > 0
        ? parsed.apartmentNumber.trim()
        : null,
    description:
      typeof parsed.description === "string" && parsed.description.trim().length > 0
        ? maskSensitiveReceiptText(parsed.description.trim())
        : null,
    paymentDate:
      typeof parsed.paymentDate === "string" && parsed.paymentDate.trim().length > 0
        ? parsed.paymentDate.trim()
        : null,
    confidence:
      typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0,
  };
}

async function callOpenAiVision(params: {
  apiKey: string;
  modelName: string;
  fileBase64: string;
  mimeType: string;
}) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.modelName,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: buildReceiptPrompt(),
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${params.mimeType};base64,${params.fileBase64}`,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI isteği başarısız: ${response.status}`);
  }

  const result = await response.json();
  const text = result?.choices?.[0]?.message?.content;

  if (typeof text !== "string") {
    throw new Error("OpenAI cevabı okunamadı.");
  }

  return normalizeAiJson(text);
}

async function callGeminiVision(params: {
  apiKey: string;
  modelName: string;
  fileBase64: string;
  mimeType: string;
}) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${params.modelName}:generateContent?key=${params.apiKey}`,
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
                text: buildReceiptPrompt(),
              },
              {
                inline_data: {
                  mime_type: params.mimeType,
                  data: params.fileBase64,
                },
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini isteği başarısız: ${response.status}`);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof text !== "string") {
    throw new Error("Gemini cevabı okunamadı.");
  }

  return normalizeAiJson(text);
}

async function callCustomVision(params: {
  apiKey: string;
  baseUrl: string;
  modelName: string;
  fileBase64: string;
  mimeType: string;
  originalFileName: string;
}) {
  const response = await fetch(params.baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.modelName,
      prompt: buildReceiptPrompt(),
      file: {
        name: params.originalFileName,
        mimeType: params.mimeType,
        base64: params.fileBase64,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`CUSTOM AI isteği başarısız: ${response.status}`);
  }

  const result = await response.json();
  const text = typeof result === "string" ? result : result?.text ?? result?.content;

  if (typeof text !== "string") {
    return normalizeAiJson(JSON.stringify(result));
  }

  return normalizeAiJson(text);
}

export async function analyzeReceiptWithAiFallback(
  input: ReceiptAiAnalyzeInput
): Promise<ReceiptAiAnalyzeResult> {
  const isSupportedAiFile =
    input.mimeType.startsWith("image/") || input.mimeType === "application/pdf";

  if (!isSupportedAiFile) {
    return {
      ...emptyAiResult,
      description:
        "AI sadece PDF, PNG, JPG, JPEG ve WEBP dekont dosyalarını analiz edebilir.",
    };
  }

  const settings = await prisma.aiSetting.findMany({
    where: {
      status: "ACTIVE",
      apiKeyEncrypted: {
        not: null,
      },
    },
    select: {
      id: true,
      provider: true,
      modelName: true,
      baseUrl: true,
      apiKeyEncrypted: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (settings.length === 0) {
    return emptyAiResult;
  }

  const fileBuffer = await fs.readFile(input.filePath);
  const fileBase64 = fileBuffer.toString("base64");

  for (const setting of settings) {
    try {
      if (!setting.apiKeyEncrypted) {
        continue;
      }

      const apiKey = decryptText(setting.apiKeyEncrypted);
      const modelName =
        setting.modelName ||
        (setting.provider === "GEMINI" ? "gemini-2.5-flash" : "gpt-4o-mini");

      let extracted;

      if (setting.provider === "OPENAI") {
        extracted = await callOpenAiVision({
          apiKey,
          modelName,
          fileBase64,
          mimeType: input.mimeType,
        });
      } else if (setting.provider === "GEMINI") {
        extracted = await callGeminiVision({
          apiKey,
          modelName,
          fileBase64,
          mimeType: input.mimeType,
        });
      } else if (setting.provider === "CUSTOM" && setting.baseUrl) {
        extracted = await callCustomVision({
          apiKey,
          baseUrl: setting.baseUrl,
          modelName,
          fileBase64,
          mimeType: input.mimeType,
          originalFileName: input.originalFileName,
        });
      } else {
        continue;
      }

      return {
        ...extracted,
        provider: setting.provider,
        modelName,
      };
    } catch (error) {
      console.error("AI dekont analizi başarısız, sonraki sağlayıcı deneniyor:", {
        provider: setting.provider,
        modelName: setting.modelName,
        error,
      });
    }
  }

  return emptyAiResult;
}




