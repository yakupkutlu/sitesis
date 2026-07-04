import express, { type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";

import prisma from "../db/prisma.js";
import {requireAuth,requireRole,type AuthenticatedRequest,} from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { createAuditLog } from "../services/audit-log.service.js";
const router = express.Router();

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

const createUserSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().optional(),
  password: z.string().min(8),
  role: z.enum(["SUPER_ADMIN", "MANAGER", "RESIDENT"]),
});

router.get(
  "/",
  asyncHandler(async (_request: Request, response: Response) => {
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
  })
);

router.post(
  "/",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const validationResult = createUserSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen kullanıcı bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
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
      throw new HttpError(409, "Bu e-posta adresi zaten kullanılıyor.");
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
    
      await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "CREATE_USER",
      entityType: "User",
      entityId: user.id,
      metadata: {
        createdUserEmail: user.email,
        createdUserRole: user.role,
      },
    });

    response.status(201).json({
      success: true,
      message: "Kullanıcı başarıyla oluşturuldu.",
      data: user,
    });
  })
);

export default router;