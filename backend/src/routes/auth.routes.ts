import express, { type Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { z } from "zod";

import {
  accessTokenCookieName,
  accessTokenCookieOptions,
  clearAccessTokenCookieOptions,
} from "../config/cookie.js";
import { env } from "../config/env.js";
import prisma from "../db/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { loginLimiter } from "../middlewares/rate-limit.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  loginLimiter,
  asyncHandler(async (request, response) => {
    const validationResult = loginSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(400, "E-posta veya şifre hatalı.");
    }

    const { email, password } = validationResult.data;
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      throw new HttpError(401, "E-posta veya şifre hatalı.");
    }

    if (user.status !== "ACTIVE") {
      throw new HttpError(403, "Bu kullanıcı hesabı aktif değildir.");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new HttpError(401, "E-posta veya şifre hatalı.");
    }

    const jwtExpiresIn = env.JWT_EXPIRES_IN as SignOptions["expiresIn"];

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      env.JWT_SECRET,
      {
        expiresIn: jwtExpiresIn,
      }
    );

    response.cookie(accessTokenCookieName, token, accessTokenCookieOptions);

    response.status(200).json({
      success: true,
      message: "Giriş başarılı.",
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  })
);

router.get("/me", requireAuth, (request: AuthenticatedRequest, response: Response) => {
  response.status(200).json({
    success: true,
    data: {
      user: request.user,
    },
  });
});

router.post("/logout", (_request, response) => {
  response.clearCookie(accessTokenCookieName, clearAccessTokenCookieOptions);

  response.status(200).json({
    success: true,
    message: "Çıkış başarılı.",
  });
});

export default router;