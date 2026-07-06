import "dotenv/config";
import process from "node:process";
import { z } from "zod";

const booleanStringSchema = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET en az 32 karakter olmalidir."),
  JWT_EXPIRES_IN: z.string().min(1).default("1d"),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  CONFIG_ENCRYPTION_KEY: z
    .string()
    .min(32, "CONFIG_ENCRYPTION_KEY en az 32 karakter olmalidir."),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  TRUST_PROXY: booleanStringSchema,
});

const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
  console.error("Ortam degiskenleri hatali:", envResult.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = envResult.data;
