import "dotenv/config";
import process from "node:process";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET en az 32 karakter olmalıdır."),
  JWT_EXPIRES_IN: z.string().min(1).default("1d"),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  CONFIG_ENCRYPTION_KEY: z.string().min(32, "CONFIG_ENCRYPTION_KEY en az 32 karakter olmalıdır."),
});

const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
  console.error("Ortam değişkenleri hatalı:", envResult.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = envResult.data;