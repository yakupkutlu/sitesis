import process from "node:process";
import express, { type Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { z } from "zod";

import prisma from "../db/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
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

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new HttpError(401, "E-posta veya şifre hatalı.");
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new HttpError(500, "JWT ayarı bulunamadı.");
    }

    const jwtExpiresIn = (process.env.JWT_EXPIRES_IN || "1d") as SignOptions["expiresIn"];

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      jwtSecret,
      {
        expiresIn: jwtExpiresIn,
      }
    );

    response.cookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

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
  response.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  response.status(200).json({
    success: true,
    message: "Çıkış başarılı.",
  });
});

export default router;