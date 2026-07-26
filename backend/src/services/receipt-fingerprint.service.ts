import { createHash } from "node:crypto";
import fs from "node:fs/promises";

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .toLocaleUpperCase("tr-TR")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeIban(value: string | null | undefined) {
  const normalized = String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return normalized || null;
}

function hasTimePart(value: string | null | undefined) {
  return /\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(String(value ?? ""));
}

export async function calculateReceiptFileHash(filePath: string) {
  const fileBuffer = await fs.readFile(filePath);
  return sha256(fileBuffer);
}

/**
 * Dekonttaki işlem tarihini Türkiye saati (UTC+03:00) olarak yorumlar.
 * Tarih okunmuş fakat saat yoksa, yanlış eşleşmeyi önlemek için null döner.
 */
export function parseReceiptTransactionAt(
  value: string | null | undefined,
): Date | null {
  if (!value || !hasTimePart(value)) {
    return null;
  }

  const trimmed = value.trim();

  const timezoneAwareIsoMatch =
    /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);

  if (timezoneAwareIsoMatch) {
    const isoDate = new Date(trimmed);

    if (Number.isFinite(isoDate.getTime())) {
      return isoDate;
    }
  }

  const dayFirstMatch = trimmed.match(
    /(\d{1,2})[./-](\d{1,2})[./-](\d{4})\D+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );

  if (dayFirstMatch) {
    const [, day, month, year, hour, minute, second = "0"] = dayFirstMatch;

    return new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour) - 3,
        Number(minute),
        Number(second),
      ),
    );
  }

  const yearFirstMatch = trimmed.match(
    /(\d{4})[./-](\d{1,2})[./-](\d{1,2})\D+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );

  if (yearFirstMatch) {
    const [, year, month, day, hour, minute, second = "0"] = yearFirstMatch;

    return new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour) - 3,
        Number(minute),
        Number(second),
      ),
    );
  }

  return null;
}

export function buildReceiptTransactionFingerprint(input: {
  paymentDate?: string | null;
  transactionAt?: Date | null;
  amountKurus?: number | null;
  recipientIban?: string | null;
  transactionReference?: string | null;
}) {
  const amountKurus = Number(input.amountKurus);
  const recipientIban = normalizeIban(input.recipientIban);
  const transactionReference = normalizeText(input.transactionReference);
  const transactionDateText = normalizeText(input.paymentDate);

  const transactionDateKey =
    input.transactionAt && Number.isFinite(input.transactionAt.getTime())
      ? input.transactionAt.toISOString()
      : transactionDateText;

  const hasReliableDateTime =
    Boolean(input.transactionAt) || hasTimePart(input.paymentDate);

  if (
    !Number.isFinite(amountKurus) ||
    amountKurus <= 0 ||
    !recipientIban ||
    !transactionDateKey ||
    (!transactionReference && !hasReliableDateTime)
  ) {
    return null;
  }

  return sha256(
    [
      transactionDateKey,
      String(Math.round(amountKurus)),
      recipientIban,
      transactionReference || "-",
    ].join("|"),
  );
}
