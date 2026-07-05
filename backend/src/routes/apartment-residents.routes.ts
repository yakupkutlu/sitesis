import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import { type Prisma } from "../generated/prisma/client.js";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";
import { createAuditLog } from "../services/audit-log.service.js";
import { getManagerScope, hasManagerScope } from "../services/manager-scope.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

router.use(requireAuth);

const apartmentResidentInclude = {
  apartment: {
    select: {
      id: true,
      number: true,
      floor: true,
      block: {
        select: {
          id: true,
          name: true,
          site: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
        },
      },
    },
  },
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
    },
  },
} as const;

const createApartmentResidentSchema = z.object({
  apartmentId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(["OWNER", "TENANT"]),
});

const updateApartmentResidentSchema = z
  .object({
    apartmentId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    type: z.enum(["OWNER", "TENANT"]).optional(),
  })
  .strict()
  .refine(
    (data) => {
      return Object.values(data).some((value) => value !== undefined);
    },
    {
      message: "En az bir alan gönderilmelidir.",
    }
  );

function getRequiredParam(request: Request, paramName: string) {
  const paramValue = request.params[paramName];

  if (typeof paramValue !== "string" || paramValue.trim().length === 0) {
    throw new HttpError(400, "Daire sakini id bilgisi zorunludur.");
  }

  return paramValue;
}

async function getManagerApartmentResidentFilter(managerId: string) {
  const managerScope = await getManagerScope(managerId);

  if (!hasManagerScope(managerScope)) {
    throw new HttpError(403, "Bu yöneticiye atanmış bir site veya blok bulunamadı.");
  }

  const filter: Prisma.ApartmentResidentWhereInput = {
    OR: [
      {
        apartment: {
          blockId: {
            in: managerScope.blockIds,
          },
        },
      },
      {
        apartment: {
          block: {
            siteId: {
              in: managerScope.siteIds,
            },
          },
        },
      },
    ],
  };

  return filter;
}

async function ensureApartmentExists(apartmentId: string) {
  const apartment = await prisma.apartment.findUnique({
    where: {
      id: apartmentId,
    },
    select: {
      id: true,
    },
  });

  if (!apartment) {
    throw new HttpError(404, "Daire bulunamadı.");
  }
}

async function ensureResidentUserCanBeAssigned(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (!user) {
    throw new HttpError(404, "Kullanıcı bulunamadı.");
  }

  if (user.role !== "RESIDENT") {
    throw new HttpError(400, "Sadece RESIDENT rolündeki kullanıcılar daireye atanabilir.");
  }

  if (user.status !== "ACTIVE") {
    throw new HttpError(400, "Pasif kullanıcı daireye atanamaz.");
  }
}

async function ensureApartmentResidentUnique(params: {
  apartmentId: string;
  userId: string;
  type: "OWNER" | "TENANT";
  ignoreId?: string;
}) {
  const existingApartmentResident = await prisma.apartmentResident.findUnique({
    where: {
      apartmentId_userId_type: {
        apartmentId: params.apartmentId,
        userId: params.userId,
        type: params.type,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingApartmentResident && existingApartmentResident.id !== params.ignoreId) {
    throw new HttpError(409, "Bu kullanıcı zaten bu daireye aynı rol ile atanmış.");
  }
}

router.get(
  "/",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    let whereCondition: Prisma.ApartmentResidentWhereInput | undefined;

    if (authenticatedRequest.user.role === "MANAGER") {
      whereCondition = await getManagerApartmentResidentFilter(authenticatedRequest.user.id);
    }

    const apartmentResidents = await prisma.apartmentResident.findMany({
      where: whereCondition,
      include: apartmentResidentInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    response.status(200).json({
      success: true,
      data: apartmentResidents,
    });
  })
);

router.post(
  "/",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const validationResult = createApartmentResidentSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen daire sakini bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { apartmentId, userId, type } = validationResult.data;

    await ensureApartmentExists(apartmentId);
    await ensureResidentUserCanBeAssigned(userId);
    await ensureApartmentResidentUnique({
      apartmentId,
      userId,
      type,
    });

    const apartmentResident = await prisma.apartmentResident.create({
      data: {
        apartmentId,
        userId,
        type,
      },
      include: apartmentResidentInclude,
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "ASSIGN_APARTMENT_RESIDENT",
      entityType: "ApartmentResident",
      entityId: apartmentResident.id,
      metadata: {
        apartmentId: apartmentResident.apartmentId,
        userId: apartmentResident.userId,
        type: apartmentResident.type,
      },
    });

    response.status(201).json({
      success: true,
      message: "Kullanıcı daireye başarıyla atandı.",
      data: apartmentResident,
    });
  })
);

router.patch(
  "/:apartmentResidentId",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const apartmentResidentId = getRequiredParam(request, "apartmentResidentId");

    const validationResult = updateApartmentResidentSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen daire sakini güncelleme bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const targetApartmentResident = await prisma.apartmentResident.findUnique({
      where: {
        id: apartmentResidentId,
      },
      select: {
        id: true,
        apartmentId: true,
        userId: true,
        type: true,
      },
    });

    if (!targetApartmentResident) {
      throw new HttpError(404, "Daire sakini kaydı bulunamadı.");
    }

    const { apartmentId, userId, type } = validationResult.data;

    const nextApartmentId = apartmentId ?? targetApartmentResident.apartmentId;
    const nextUserId = userId ?? targetApartmentResident.userId;
    const nextType = type ?? targetApartmentResident.type;

    if (apartmentId !== undefined && apartmentId !== targetApartmentResident.apartmentId) {
      await ensureApartmentExists(apartmentId);
    }

    if (userId !== undefined && userId !== targetApartmentResident.userId) {
      await ensureResidentUserCanBeAssigned(userId);
    }

    await ensureApartmentResidentUnique({
      apartmentId: nextApartmentId,
      userId: nextUserId,
      type: nextType,
      ignoreId: targetApartmentResident.id,
    });

    const updateData: {
      apartmentId?: string;
      userId?: string;
      type?: "OWNER" | "TENANT";
    } = {};

    if (apartmentId !== undefined) {
      updateData.apartmentId = apartmentId;
    }

    if (userId !== undefined) {
      updateData.userId = userId;
    }

    if (type !== undefined) {
      updateData.type = type;
    }

    const updatedApartmentResident = await prisma.apartmentResident.update({
      where: {
        id: apartmentResidentId,
      },
      data: updateData,
      include: apartmentResidentInclude,
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "UPDATE_APARTMENT_RESIDENT",
      entityType: "ApartmentResident",
      entityId: updatedApartmentResident.id,
      metadata: {
        previous: {
          apartmentId: targetApartmentResident.apartmentId,
          userId: targetApartmentResident.userId,
          type: targetApartmentResident.type,
        },
        current: {
          apartmentId: updatedApartmentResident.apartmentId,
          userId: updatedApartmentResident.userId,
          type: updatedApartmentResident.type,
        },
      },
    });

    response.status(200).json({
      success: true,
      message: "Daire sakini kaydı başarıyla güncellendi.",
      data: updatedApartmentResident,
    });
  })
);

router.delete(
  "/:apartmentResidentId",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const apartmentResidentId = getRequiredParam(request, "apartmentResidentId");

    const targetApartmentResident = await prisma.apartmentResident.findUnique({
      where: {
        id: apartmentResidentId,
      },
      select: {
        id: true,
        apartmentId: true,
        userId: true,
        type: true,
      },
    });

    if (!targetApartmentResident) {
      throw new HttpError(404, "Daire sakini kaydı bulunamadı.");
    }

    await prisma.apartmentResident.delete({
      where: {
        id: apartmentResidentId,
      },
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "REMOVE_APARTMENT_RESIDENT",
      entityType: "ApartmentResident",
      entityId: targetApartmentResident.id,
      metadata: {
        apartmentId: targetApartmentResident.apartmentId,
        userId: targetApartmentResident.userId,
        type: targetApartmentResident.type,
      },
    });

    response.status(200).json({
      success: true,
      message: "Daire sakini kaydı başarıyla kaldırıldı.",
    });
  })
);

export default router;