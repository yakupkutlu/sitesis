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
      paymentAllocations: {
        where: {
          status: {
            not: "CANCELLED",
          },
        },
        select: {
          id: true,
          amountKurus: true,
          status: true,
        },
      },
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

type UserRoleValue = "SUPER_ADMIN" | "MANAGER" | "RESIDENT";

type ResidentLinkableUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRoleValue;
  status: "ACTIVE" | "PASSIVE";
};

async function ensureUserCanBeLinkedAsResident(params: {
  userId: string;
  actorRole: UserRoleValue;
  ignoreApartmentResidentId?: string;
}): Promise<ResidentLinkableUser> {
  const user = await prisma.user.findUnique({
    where: {
      id: params.userId,
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

  if (!user) {
    throw new HttpError(404, "Kullanıcı bulunamadı.");
  }

  if (user.status !== "ACTIVE") {
    throw new HttpError(
      400,
      "Pasif kullanıcı hesabı daireye sakin olarak bağlanamaz."
    );
  }

  if (user.role === "SUPER_ADMIN" && params.actorRole !== "SUPER_ADMIN") {
    throw new HttpError(
      403,
      "Süper admin hesabını sakin olarak yalnızca süper admin bağlayabilir."
    );
  }

  const existingResidentLink = await prisma.apartmentResident.findFirst({
    where: {
      userId: user.id,
      ...(params.ignoreApartmentResidentId
        ? {
            id: {
              not: params.ignoreApartmentResidentId,
            },
          }
        : {}),
    },
    select: {
      id: true,
      apartmentId: true,
    },
  });

  if (existingResidentLink) {
    throw new HttpError(
      409,
      "Bu kullanıcı hesabı zaten bir daireye sakin olarak bağlı. Aynı hesap ikinci kez bağlanamaz."
    );
  }

  return user;
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
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const paginationParams = getPaginationParams(request.query);

    if (!paginationParams.success) {
      throw new HttpError(400, "Sayfalama bilgileri geçersiz.", paginationParams.errors);
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
    await ensureUserCanBeLinkedAsResident({
      userId,
      actorRole: authenticatedRequest.user.role,
    });
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
      message: "Kullanıcı daireye başarıyla atandı.",
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
        user: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!targetApartmentResident) {
      throw new HttpError(404, "Daire sakini kaydı bulunamadı.");
    }

    if (
      authenticatedRequest.user.role === "MANAGER" &&
      targetApartmentResident.user.role === "SUPER_ADMIN"
    ) {
      throw new HttpError(
        403,
        "Süper admin hesabının sakin bağlantısını yalnızca süper admin güncelleyebilir."
      );
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
      await ensureUserCanBeLinkedAsResident({
        userId,
        actorRole: authenticatedRequest.user.role,
        ignoreApartmentResidentId: targetApartmentResident.id,
      });
    }

    if (
      authenticatedRequest.user.role === "MANAGER" &&
      nextApartmentId !== targetApartmentResident.apartmentId
    ) {
      await ensureApartmentIsInsideUserScope({
        userId: authenticatedRequest.user.id,
        userRole: authenticatedRequest.user.role,
        apartmentId: nextApartmentId,
      });
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
      message: "Daire sakini kaydı başarıyla güncellendi.",
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
        user: {
          select: {
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!targetApartmentResident) {
      throw new HttpError(404, "Daire sakini kaydı bulunamadı.");
    }

    const targetUserRole = targetApartmentResident.user.role;
    const protectedAdministrativeAccount =
      targetUserRole === "MANAGER" || targetUserRole === "SUPER_ADMIN";

    if (
      authenticatedRequest.user.role === "MANAGER" &&
      targetUserRole === "SUPER_ADMIN"
    ) {
      throw new HttpError(
        403,
        "Süper admin hesabının sakin bağlantısını yalnızca süper admin kaldırabilir."
      );
    }

    if (authenticatedRequest.user.role === "MANAGER") {
      await ensureApartmentIsInsideUserScope({
        userId: authenticatedRequest.user.id,
        userRole: authenticatedRequest.user.role,
        apartmentId: targetApartmentResident.apartmentId,
      });
    }

    const deleteResult = await prisma.$transaction(async (transaction) => {
      await transaction.apartmentResident.delete({
        where: {
          id: apartmentResidentId,
        },
      });

      const remainingApartmentResidentCount =
        await transaction.apartmentResident.count({
          where: {
            userId: targetApartmentResident.userId,
          },
        });

      let userDeactivated = false;

      /*
       * Yönetici ve süper admin hesapları yalnızca sakinlik bağlantısını kaybeder.
       * Yönetim hesabının durumu ve rolü kesinlikle değiştirilmez.
       */
      if (
        remainingApartmentResidentCount === 0 &&
        targetUserRole === "RESIDENT"
      ) {
        await transaction.user.update({
          where: {
            id: targetApartmentResident.userId,
          },
          data: {
            status: "PASSIVE",
          },
        });

        userDeactivated = true;
      }

      return {
        remainingApartmentResidentCount,
        userDeactivated,
      };
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "REMOVE_APARTMENT_RESIDENT",
      entityType: "ApartmentResident",
      entityId: targetApartmentResident.id,
      metadata: {
        apartmentId: targetApartmentResident.apartmentId,
        linkedUserId: targetApartmentResident.userId,
        linkedUserEmail: targetApartmentResident.user.email,
        linkedUserRole: targetUserRole,
        type: targetApartmentResident.type,
        protectedAdministrativeAccount,
        userDeactivated: deleteResult.userDeactivated,
        remainingApartmentResidentCount:
          deleteResult.remainingApartmentResidentCount,
      },
    });

    const successMessage = deleteResult.userDeactivated
      ? "Daire sakini bağlantısı kaldırıldı ve sakin hesabı pasif yapıldı."
      : targetUserRole === "MANAGER"
        ? "Sakin bağlantısı kaldırıldı. Yönetici hesabı aktif bırakıldı."
        : targetUserRole === "SUPER_ADMIN"
          ? "Sakin bağlantısı kaldırıldı. Süper admin hesabı aktif bırakıldı."
          : "Daire sakini bağlantısı başarıyla kaldırıldı.";

    response.status(200).json({
      success: true,
      message: successMessage,
      data: {
        residentLinkRemoved: true,
        userDeactivated: deleteResult.userDeactivated,
        protectedAdministrativeAccount,
        accountRole: targetUserRole,
        remainingApartmentResidentCount:
          deleteResult.remainingApartmentResidentCount,
      },
    });
  })
);


const createResidentAndAssignSchema = z
  .object({
    fullName: z.string().trim().min(2).optional(),
    email: z.string().trim().email(),
    phone: z.string().trim().optional(),
    password: z.string().min(8).optional(),
    apartmentId: z.string().uuid(),
    type: z.enum(["OWNER", "TENANT"]),
  })
  .strict();

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

    const validationResult = createResidentAndAssignSchema.safeParse(
      request.body
    );

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

    await ensureApartmentResidentTypeAvailable({
      apartmentId,
      type,
    });

    const normalizedEmail = email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
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

    if (existingUser) {
      const linkableUser = await ensureUserCanBeLinkedAsResident({
        userId: existingUser.id,
        actorRole: authenticatedRequest.user.role,
      });

      const apartmentResident = await prisma.apartmentResident.create({
        data: {
          apartmentId,
          userId: linkableUser.id,
          type,
        },
        include: apartmentResidentInclude,
      });

      const auditAction =
        linkableUser.role === "SUPER_ADMIN"
          ? "LINK_SUPER_ADMIN_AS_RESIDENT"
          : linkableUser.role === "MANAGER"
            ? "LINK_MANAGER_AS_RESIDENT"
            : "LINK_EXISTING_RESIDENT_TO_APARTMENT";

      await createAuditLog({
        request,
        userId: authenticatedRequest.user.id,
        action: auditAction,
        entityType: "ApartmentResident",
        entityId: apartmentResident.id,
        metadata: {
          linkedUserId: linkableUser.id,
          linkedUserEmail: linkableUser.email,
          preservedUserRole: linkableUser.role,
          apartmentId,
          type,
          profileChanged: false,
          passwordChanged: false,
        },
      });

      response.status(201).json({
        success: true,
        message:
          linkableUser.role === "RESIDENT"
            ? "Mevcut sakin hesabı daireye başarıyla bağlandı."
            : `${
                linkableUser.role === "MANAGER"
                  ? "Yönetici"
                  : "Süper admin"
              } hesabı, rolü ve giriş bilgileri değiştirilmeden sakin olarak bağlandı.`,
        data: apartmentResident,
      });

      return;
    }

    if (!fullName) {
      throw new HttpError(
        400,
        "Yeni sakin hesabı için ad soyad zorunludur."
      );
    }

    if (!password) {
      throw new HttpError(
        400,
        "Yeni sakin hesabı için en az 8 karakterli geçici şifre zorunludur."
      );
    }

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
        createdResidentUserId: result.user.id,
        createdResidentEmail: result.user.email,
        apartmentId,
        type,
      },
    });

    response.status(201).json({
      success: true,
      message: "Yeni sakin hesabı oluşturuldu ve daireye bağlandı.",
      data: result.apartmentResident,
    });
  })
);

const updateResidentPasswordSchema = z.object({
  password: z.string().min(8, "Yeni şifre en az 8 karakter olmalıdır."),
});

router.patch(
  "/:apartmentResidentId/resident-password",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const apartmentResidentId = getRequiredParam(request, "apartmentResidentId");

    const validationResult = updateResidentPasswordSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen şifre bilgisi geçersiz.",
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
        user: {
          select: {
            id: true,
            role: true,
            email: true,
          },
        },
      },
    });

    if (!targetApartmentResident) {
      throw new HttpError(404, "Daire sakini kaydı bulunamadı.");
    }

    if (targetApartmentResident.user.role !== "RESIDENT") {
      throw new HttpError(400, "Sadece sakin şifresi değiştirilebilir.");
    }

    if (authenticatedRequest.user.role === "MANAGER") {
      await ensureApartmentIsInsideUserScope({
        userId: authenticatedRequest.user.id,
        userRole: authenticatedRequest.user.role,
        apartmentId: targetApartmentResident.apartmentId,
      });
    }

    const passwordHash = await bcrypt.hash(validationResult.data.password, 12);

    await prisma.user.update({
      where: {
        id: targetApartmentResident.userId,
      },
      data: {
        passwordHash,
      },
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "UPDATE_RESIDENT_PASSWORD",
      entityType: "User",
      entityId: targetApartmentResident.userId,
      metadata: {
        apartmentResidentId: targetApartmentResident.id,
        residentEmail: targetApartmentResident.user.email,
      },
    });

    response.status(200).json({
      success: true,
      message: "Sakin şifresi başarıyla güncellendi.",
    });
  })
);

export default router;












