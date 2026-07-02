import express, { type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";

import prisma from "../db/prisma.js";

const router = express.Router();

const createUserSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().optional(),
  password: z.string().min(8),
  role: z.enum(["SUPER_ADMIN", "MANAGER", "RESIDENT"]),
});

router.get("/", async (_request: Request, response: Response) => {
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  response.status(200).json({
    success: true,
    data: users,
  });
});

router.post("/", async (request: Request, response: Response) => {
  const validationResult = createUserSchema.safeParse(request.body);

  if (!validationResult.success) {
    response.status(400).json({
      success: false,
      message: "Gönderilen kullanıcı bilgileri geçersiz.",
      errors: validationResult.error.flatten().fieldErrors,
    });
    return;
  }

  const { fullName, email, phone, password, role } = validationResult.data;

  const normalizedEmail = email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    response.status(409).json({
      success: false,
      message: "Bu e-posta adresi zaten kullanılıyor.",
    });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      fullName,
      email: normalizedEmail,
      phone,
      passwordHash,
      role,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  response.status(201).json({
    success: true,
    message: "Kullanıcı başarıyla oluşturuldu.",
    data: user,
  });
});

export default router;