import rateLimit from "express-rate-limit";

import { env } from "../config/env.js";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === "production" ? 5 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin.",
  },
});