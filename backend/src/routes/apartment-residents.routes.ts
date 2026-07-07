import express, { type Request, type Response } from "express";
import bcrypt from "bcryptjs";
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
import { buildPaginationMeta, getPaginationParams } from "../utils/pagination.js";
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
      message: "En az bir alan gأ¶nderilmelidir.",
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
    throw new HttpError(403, "Bu yأ¶neticiye atanmؤ±إں bir site veya blok bulunamadؤ±.");
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
    throw new HttpError(404, "Daire bulunamadؤ±.");
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
    throw new HttpError(404, "Kullanؤ±cؤ± bulunamadؤ±.");
  }

  if (user.role !== "RESIDENT") {
    throw new HttpError(400, "Sadece RESIDENT rolأ¼ndeki kullanؤ±cؤ±lar daireye atanabilir.");
  }

  if (user.status !== "ACTIVE") {
    throw new HttpError(400, "Pasif kullanؤ±cؤ± daireye atanamaz.");
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
    throw new HttpError(409, "Bu kullanؤ±cؤ± zaten bu daireye aynؤ± rol ile atanmؤ±إں.");
  }
}


async function ensureApartmentResidentTypeAvailable(params: {
  apartmentId: string;
  type: "OWNER" | "TENANT";
  ignoreId?: string;
}) {
  const existingApartmentResident = await prisma.apartmentResident.findFirst({
    where: {
      apartmentId: params.apartmentId,
      ...(params.ignoreId ? { id: { not: params.ignoreId } } : {}),
    },
    select: {
      id: true,
      type: true,
    },
  });

  if (existingApartmentResident) {
    throw new HttpError(
      409,
      "Bu dairede zaten sakin kaydı bulunmaktadır. Yeni kiracı veya ev sahibi eklenemez."
    );
  }
}

router.get(
  "/",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadؤ±.");
    }

    const paginationParams = getPaginationParams(request.query);

    if (!paginationParams.success) {
      throw new HttpError(400, "Sayfalama bilgileri geأ§ersiz.", paginationParams.errors);
    }

    const searchCondition: Prisma.ApartmentResidentWhereInput = paginationParams.search
      ? {
          OR: [
            {
              user: {
                fullName: {
                  contains: paginationParams.search,
                  mode: "insensitive",
                },
              },
            },
            {
              user: {
                email: {
                  contains: paginationParams.search,
                  mode: "insensitive",
                },
              },
            },
            {
              apartment: {
                number: {
                  contains: paginationParams.search,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {};

    let whereCondition: Prisma.ApartmentResidentWhereInput = searchCondition;

    if (authenticatedRequest.user.role === "MANAGER") {
      const managerFilter = await getManagerApartmentResidentFilter(
        authenticatedRequest.user.id
      );

      whereCondition = {
        AND: [searchCondition, managerFilter],
      };
    }

    const [apartmentResidents, totalCount] = await Promise.all([
      prisma.apartmentResident.findMany({
        where: whereCondition,
        include: apartmentResidentInclude,
        orderBy: {
          createdAt: "desc",
        },
        skip: paginationParams.skip,
        take: paginationParams.limit,
      }),
      prisma.apartmentResident.count({
        where: whereCondition,
      }),
    ]);

    response.status(200).json({
      success: true,
      data: apartmentResidents,
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
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadؤ±.");
    }

    const validationResult = createApartmentResidentSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gأ¶nderilen daire sakini bilgileri geأ§ersiz.",
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

    await ensureApartmentResidentTypeAvailable({
      apartmentId,
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
      message: "Kullanؤ±cؤ± daireye baإںarؤ±yla atandؤ±.",
      data: apartmentResident,
    });
  })
);

router.patch(
  "/:apartmentResidentId",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadؤ±.");
    }

    const apartmentResidentId = getRequiredParam(request, "apartmentResidentId");

    const validationResult = updateApartmentResidentSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gأ¶nderilen daire sakini gأ¼ncelleme bilgileri geأ§ersiz.",
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

    if (authenticatedRequest.user.role === "MANAGER") {
      await ensureApartmentIsInsideUserScope({
        userId: authenticatedRequest.user.id,
        userRole: authenticatedRequest.user.role,
        apartmentId: targetApartmentResident.apartmentId,
      });
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

    await ensureApartmentResidentTypeAvailable({
      apartmentId: nextApartmentId,
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
      message: "Daire sakini kaydؤ± baإںarؤ±yla gأ¼ncellendi.",
      data: updatedApartmentResident,
    });
  })
);

router.delete(
  "/:apartmentResidentId",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadؤ±.");
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

    if (authenticatedRequest.user.role === "MANAGER") {
      await ensureApartmentIsInsideUserScope({
        userId: authenticatedRequest.user.id,
        userRole: authenticatedRequest.user.role,
        apartmentId: targetApartmentResident.apartmentId,
      });
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
      message: "Daire sakini kaydؤ± baإںarؤ±yla kaldؤ±rؤ±ldؤ±.",
    });
  })
);


const createResidentAndAssignSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().optional(),
  password: z.string().min(8),
  apartmentId: z.string().uuid(),
  type: z.enum(["OWNER", "TENANT"]),
});

async function ensureApartmentIsInsideUserScope(params: {
  userId: string;
  userRole: "SUPER_ADMIN" | "MANAGER" | "RESIDENT";
  apartmentId: string;
}) {
  const apartment = await prisma.apartment.findUnique({
    where: {
      id: params.apartmentId,
    },
    select: {
      id: true,
      blockId: true,
      block: {
        select: {
          siteId: true,
        },
      },
    },
  });

  if (!apartment) {
    throw new HttpError(404, "Daire bulunamadı.");
  }

  if (params.userRole === "SUPER_ADMIN") {
    return apartment;
  }

  const managerScope = await getManagerScope(params.userId);

  if (!hasManagerScope(managerScope)) {
    throw new HttpError(403, "Bu yöneticiye atanmış bir site veya blok bulunamadı.");
  }

  const canAccessApartment =
    managerScope.blockIds.includes(apartment.blockId) ||
    managerScope.siteIds.includes(apartment.block.siteId);

  if (!canAccessApartment) {
    throw new HttpError(403, "Bu daireye sakin ekleme yetkiniz yok.");
  }

  return apartment;
}

router.post(
  "/create-resident",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const validationResult = createResidentAndAssignSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen sakin bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { fullName, email, phone, password, apartmentId, type } =
      validationResult.data;

    await ensureApartmentIsInsideUserScope({
      userId: authenticatedRequest.user.id,
      userRole: authenticatedRequest.user.role,
      apartmentId,
    });

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

    await ensureApartmentResidentTypeAvailable({
      apartmentId,
      type,
    });

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          fullName,
          email: normalizedEmail,
          phone: phone && phone.length > 0 ? phone : null,
          passwordHash,
          role: "RESIDENT",
          status: "ACTIVE",
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

      const apartmentResident = await transaction.apartmentResident.create({
        data: {
          apartmentId,
          userId: user.id,
          type,
        },
        include: apartmentResidentInclude,
      });

      return {
        user,
        apartmentResident,
      };
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "CREATE_RESIDENT_AND_ASSIGN_APARTMENT",
      entityType: "ApartmentResident",
      entityId: result.apartmentResident.id,
      metadata: {
        createdResidentEmail: result.user.email,
        apartmentId,
        type,
      },
    });

    response.status(201).json({
      success: true,
      message: "Sakin başarıyla oluşturuldu ve daireye bağlandı.",
      data: result.apartmentResident,
    });
  })
);

export default router;








