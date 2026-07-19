import "dotenv/config";
import process from "node:process";
import { z } from "zod";

const booleanStringSchema = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const redisUrlSchema = z
  .string()
  .url("REDIS_URL geçerli bir URL olmalıdır.")
  .refine(
    (value) => {
      try {
        return ["redis:", "rediss:"].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    },
    {
      message: "REDIS_URL redis:// veya rediss:// ile başlamalıdır.",
    }
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: redisUrlSchema.default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET en az 32 karakter olmalidir."),
  JWT_EXPIRES_IN: z.string().min(1).default("1d"),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  CONFIG_ENCRYPTION_KEY: z
    .string()
    .min(32, "CONFIG_ENCRYPTION_KEY en az 32 karakter olmalidir."),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  TRUST_PROXY: booleanStringSchema,
  POSTGRES_DB: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  INSTALL_TOKEN: z.string().min(16, "INSTALL_TOKEN en az 16 karakter olmalidir."),
});

const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
  console.error(
    "Ortam degiskenleri hatali:",
    envResult.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const env = envResult.data;
