import express, { type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";

import prisma from "../db/prisma.js";

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

export default router;