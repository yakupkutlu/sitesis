import express, { type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";

import prisma from "../db/prisma.js";
import {requireAuth,requireRole,type AuthenticatedRequest,} from "../middlewares/auth.middleware.js";
import { createAuditLog } from "../services/audit-log.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { type Prisma } from "../generated/prisma/client.js";
import { buildPaginationMeta, getPaginationParams } from "../utils/pagination.js";
const router = express.Router();

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

const userSelectFields = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

const createUserSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().optional(),
  password: z.string().min(8),
  role: z.enum(["SUPER_ADMIN", "MANAGER", "RESIDENT"]),
});

const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(2).optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().nullable().optional(),
    password: z.string().min(8).optional(),
    role: z.enum(["SUPER_ADMIN", "MANAGER", "RESIDENT"]).optional(),
    status: z.enum(["ACTIVE", "PASSIVE"]).optional(),
  })
  .strict()
  .refine(
    (data) => {
      return Object.values(data).some((value) => value !== undefined);
    },
    {
      message: "En az bir alan gönderilmelidir.",
    });

    function getRequiredParam(request: Request, paramName: string) {
  const paramValue = request.params[paramName];

  if (typeof paramValue !== "string" || paramValue.trim().length === 0) {
    throw new HttpError(400, "Kullanıcı id bilgisi zorunludur.");
  }

  return paramValue;
} 

async function ensureCanModifySuperAdmin(
  targetUser: {
    id: string;
    role: "SUPER_ADMIN" | "MANAGER" | "RESIDENT";
    status: "ACTIVE" | "PASSIVE";
  },
  nextRole?: "SUPER_ADMIN" | "MANAGER" | "RESIDENT",
  nextStatus?: "ACTIVE" | "PASSIVE"
) {
  const willRemoveActiveSuperAdmin =
    targetUser.role === "SUPER_ADMIN" &&
    targetUser.status === "ACTIVE" &&
    ((nextRole !== undefined && nextRole !== "SUPER_ADMIN") || nextStatus === "PASSIVE");

  if (!willRemoveActiveSuperAdmin) {
    return;
  }

  const activeSuperAdminCount = await prisma.user.count({
    where: {
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  if (activeSuperAdminCount <= 1) {
    throw new HttpError(400, "Son aktif süper admin pasif yapılamaz veya rolü değiştirilemez.");
  }
}

router.get(
  "/",
  asyncHandler(async (request: Request, response: Response) => {
    const paginationParams = getPaginationParams(request.query);

    if (!paginationParams.success) {
      throw new HttpError(400, "Sayfalama bilgileri geçersiz.", paginationParams.errors);
    }

    const whereCondition: Prisma.UserWhereInput = paginationParams.search
      ? {
          OR: [
            {
              fullName: {
                contains: paginationParams.search,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: paginationParams.search,
                mode: "insensitive",
              },
            },
            {
              phone: {
                contains: paginationParams.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {};

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereCondition,
        orderBy: {
          createdAt: "desc",
        },
        skip: paginationParams.skip,
        take: paginationParams.limit,
        select: userSelectFields,
      }),
      prisma.user.count({
        where: whereCondition,
      }),
    ]);

    response.status(200).json({
      success: true,
      data: users,
      pagination: buildPaginationMeta({
        page: paginationParams.page,
        limit: paginationParams.limit,
        totalCount,
      }),
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
      select: userSelectFields,
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

router.patch(
  "/:userId",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const validationResult = updateUserSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen kullanıcı güncelleme bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const userId = getRequiredParam(request, "userId");
    const targetUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
      },
    });

    if (!targetUser) {
      throw new HttpError(404, "Kullanıcı bulunamadı.");
    }

    const updateData: {
      fullName?: string;
      email?: string;
      phone?: string | null;
      passwordHash?: string;
      role?: "SUPER_ADMIN" | "MANAGER" | "RESIDENT";
      status?: "ACTIVE" | "PASSIVE";
    } = {};

    const { fullName, email, phone, password, role, status } = validationResult.data;

    if (fullName !== undefined) {
      updateData.fullName = fullName;
    }

    if (email !== undefined) {
      const normalizedEmail = email.toLowerCase();

      if (normalizedEmail !== targetUser.email) {
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
      }

      updateData.email = normalizedEmail;
    }

    if (phone !== undefined) {
      updateData.phone = phone && phone.length > 0 ? phone : null;
    }

    if (password !== undefined) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    if (role !== undefined) {
      updateData.role = role;
    }

    if (status !== undefined) {
      updateData.status = status;
    }

    if (
      targetUser.id === authenticatedRequest.user.id &&
      (updateData.status === "PASSIVE" ||
        (updateData.role !== undefined && updateData.role !== "SUPER_ADMIN"))
    ) {
      throw new HttpError(
        400,
        "Kendi süper admin hesabınızı pasif yapamaz veya rolünü düşüremezsiniz."
      );
    }

    await ensureCanModifySuperAdmin(targetUser, updateData.role, updateData.status);

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: updateData,
      select: userSelectFields,
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "UPDATE_USER",
      entityType: "User",
      entityId: updatedUser.id,
      metadata: {
        previous: {
          fullName: targetUser.fullName,
          email: targetUser.email,
          phone: targetUser.phone,
          role: targetUser.role,
          status: targetUser.status,
        },
        current: {
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          phone: updatedUser.phone,
          role: updatedUser.role,
          status: updatedUser.status,
        },
        passwordChanged: password !== undefined,
      },
    });

    response.status(200).json({
      success: true,
      message: "Kullanıcı başarıyla güncellendi.",
      data: updatedUser,
    });
  })
);

router.patch(
  "/:userId/deactivate",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const userId = getRequiredParam(request, "userId");
    const targetUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!targetUser) {
      throw new HttpError(404, "Kullanıcı bulunamadı.");
    }

    if (targetUser.id === authenticatedRequest.user.id) {
      throw new HttpError(400, "Kendi hesabınızı pasif yapamazsınız.");
    }

    if (targetUser.status === "PASSIVE") {
      throw new HttpError(409, "Kullanıcı zaten pasif durumda.");
    }

    await ensureCanModifySuperAdmin(targetUser, undefined, "PASSIVE");

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        status: "PASSIVE",
      },
      select: userSelectFields,
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "DEACTIVATE_USER",
      entityType: "User",
      entityId: updatedUser.id,
      metadata: {
        deactivatedUserEmail: updatedUser.email,
        deactivatedUserRole: updatedUser.role,
      },
    });

    const successMessage =
      updatedUser.role === "MANAGER"
        ? "Yönetici hesabı pasif yapıldı. Yönetim paneli erişimi kapatıldı."
        : updatedUser.role === "SUPER_ADMIN"
          ? "Süper admin hesabı pasif yapıldı."
          : "Sakin hesabı başarıyla pasif yapıldı.";

    response.status(200).json({
      success: true,
      message: successMessage,
      data: {
        user: updatedUser,
        accountRole: updatedUser.role,
        accessDisabled: true,
      },
    });
  })
);

export default router;
