import { z } from "zod";

const INTERNATIONAL_PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

export function normalizeInternationalPhone(value: string) {
  const compactValue = value.trim().replace(/[\s()-]/g, "");

  return compactValue.startsWith("00")
    ? `+${compactValue.slice(2)}`
    : compactValue;
}

export const internationalPhoneSchema = z
  .string()
  .trim()
  .transform(normalizeInternationalPhone)
  .refine(
    (value) => INTERNATIONAL_PHONE_PATTERN.test(value),
    {
      message:
        "Telefon numarası + ülke kodu ile uluslararası formatta ve 8-15 rakam olmalıdır.",
    }
  );

export const optionalInternationalPhoneSchema = z
  .union([
    internationalPhoneSchema,
    z.literal("").transform(() => undefined),
  ])
  .optional();

export const nullableInternationalPhoneSchema = z
  .union([
    internationalPhoneSchema,
    z.literal("").transform(() => null),
    z.null(),
  ])
  .optional();
