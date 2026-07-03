import process from "node:process";
import express, { type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { z } from "zod";

import prisma from "../db/prisma.js";

import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.middleware.js";

const router = express.Router();

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

router.post("/login", async (request: Request, response: Response) => {
  const validationResult = loginSchema.safeParse(request.body);

  if (!validationResult.success) {
    response.status(400).json({
      success: false,
      message: "E-posta veya şifre hatalı.",
    });
    return;
  }

  const { email, password } = validationResult.data;
  const normalizedEmail = email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!user) {
    response.status(401).json({
      success: false,
      message: "E-posta veya şifre hatalı.",
    });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    response.status(401).json({
      success: false,
      message: "E-posta veya şifre hatalı.",
    });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    response.status(500).json({
      success: false,
      message: "JWT ayarı bulunamadı.",
    });
    return;
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
});

router.get("/me", requireAuth, (request: AuthenticatedRequest, response: Response) => {
  response.status(200).json({
    success: true,
    data: {
      user: request.user,
    },
  });
});

router.post("/logout", (_request: Request, response: Response) => {
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