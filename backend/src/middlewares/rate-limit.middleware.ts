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

export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === "production" ? 3 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: "Çok fazla şifre sıfırlama talebi gönderildi. Lütfen daha sonra tekrar deneyin.",
  },
});

export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === "production" ? 5 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Çok fazla şifre yenileme denemesi yapıldı. Lütfen daha sonra tekrar deneyin.",
  },
});

export const smsTestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === "production" ? 10 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: "Çok fazla test SMS denemesi yapıldı. Lütfen daha sonra tekrar deneyin.",
  },
});

export const installLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === "production" ? 5 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Çok fazla kurulum denemesi yapıldı. Lütfen daha sonra tekrar deneyin.",
  },
});

