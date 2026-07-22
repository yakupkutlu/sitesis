import express, { type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import { z } from "zod";

import prisma from "../db/prisma.js";
import { type Prisma } from "../generated/prisma/client.js";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";
import { createAuditLog } from "../services/audit-log.service.js";
import {
  commitResidentImportRows,
  parseResidentWorkbook,
  residentImportRowsRequestSchema,
  validateResidentImportRows,
} from "../services/resident-import.service.js";
import { createResidentImportTemplate } from "../services/resident-import-template.service.js";
import { getManagerScope, hasManagerScope } from "../services/manager-scope.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { optionalInternationalPhoneSchema } from "../utils/phone.js";
import { buildPaginationMeta, getPaginationParams } from "../utils/pagination.js";
const router = express.Router();

router.use(requireAuth);

const residentExcelUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: (_request, file, callback) => {
    const normalizedName = file.originalname.toLowerCase();
    const hasAllowedExtension =
      normalizedName.endsWith(".xlsx") || normalizedName.endsWith(".xls");

    if (!hasAllowedExtension) {
      callback(new HttpError(400, "Yalnızca XLSX veya XLS dosyası yüklenebilir."));
      return;
    }

    callback(null, true);
  },
});

const residentUserSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  status: true,
} satisfies Prisma.UserSelect;

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
      residents: {
        select: {
          id: true,
          apartmentId: true,
          userId: true,
          type: true,
          user: {
            select: residentUserSelect,
          },
        },
        orderBy: [
          {
            type: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
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
    select: residentUserSelect,
  },
} satisfies Prisma.ApartmentResidentInclude;

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
  residentType: "OWNER" | "TENANT";
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

  if (params.residentType === "TENANT") {
    const existingTenantLink = await prisma.apartmentResident.findFirst({
      where: {
        userId: user.id,
        type: "TENANT",
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

    if (existingTenantLink) {
      throw new HttpError(
        409,
        "Bu kullanıcı hesabı zaten başka bir daireye kiracı olarak bağlı. Bir kullanıcı yalnızca bir dairede kiracı olabilir."
      );
    }
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
  const existingSameType = await prisma.apartmentResident.findFirst({
    where: {
      apartmentId: params.apartmentId,
      type: params.type,
      ...(params.ignoreId ? { id: { not: params.ignoreId } } : {}),
    },
    select: {
      id: true,
    },
  });

  if (existingSameType) {
    throw new HttpError(
      409,
      params.type === "OWNER"
        ? "Bu daireye zaten bir ev sahibi atanmış."
        : "Bu daireye zaten bir kiracı atanmış."
    );
  }
}

async function apartmentHasResidentType(params: {
  apartmentId: string;
  type: "OWNER" | "TENANT";
  ignoreId?: string;
}) {
  const resident = await prisma.apartmentResident.findFirst({
    where: {
      apartmentId: params.apartmentId,
      type: params.type,
      ...(params.ignoreId ? { id: { not: params.ignoreId } } : {}),
    },
    select: {
      id: true,
    },
  });

  return Boolean(resident);
}

async function ensureApartmentHasOwner(params: {
  apartmentId: string;
  ignoreId?: string;
}) {
  const hasOwner = await apartmentHasResidentType({
    apartmentId: params.apartmentId,
    type: "OWNER",
    ignoreId: params.ignoreId,
  });

  if (!hasOwner) {
    throw new HttpError(
      409,
      "Kiracı eklenmeden önce bu daireye bir ev sahibi hesabı bağlanmalıdır."
    );
  }
}

const currentOccupantFilter: Prisma.ApartmentResidentWhereInput = {
  OR: [
    {
      type: "TENANT",
    },
    {
      type: "OWNER",
      apartment: {
        residents: {
          none: {
            type: "TENANT",
          },
        },
      },
    },
  ],
};

function isPrismaUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

async function executeResidentMutation<T>(operation: Promise<T>): Promise<T> {
  try {
    return await operation;
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new HttpError(
        409,
        "Aynı daire rolü veya e-posta için çakışan bir kayıt bulundu. Sayfayı yenileyip tekrar deneyin."
      );
    }

    throw error;
  }
}

router.get(
  "/import/template",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const templateBuffer = await createResidentImportTemplate({
      actor: {
        id: authenticatedRequest.user.id,
        role: authenticatedRequest.user.role,
      },
    });

    response.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    response.setHeader(
      "Content-Disposition",
      'attachment; filename="sitesis-sakin-toplu-yukleme-sablonu.xlsx"'
    );
    response.setHeader("Cache-Control", "no-store");
    response.status(200).send(templateBuffer);
  })
);

router.post(
  "/import/preview",
  requireRole("SUPER_ADMIN", "MANAGER"),
  residentExcelUpload.single("file"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    if (!request.file) {
      throw new HttpError(400, "Excel dosyası seçilmelidir.");
    }

    const rows = parseResidentWorkbook(request.file.buffer);
    const validation = await validateResidentImportRows({
      actor: {
        id: authenticatedRequest.user.id,
        role: authenticatedRequest.user.role,
      },
      rows,
    });

    response.status(200).json({
      success: true,
      message: "Excel dosyası okundu. Kayıtları kontrol edip hatalı satırları düzeltin.",
      data: {
        fileName: request.file.originalname,
        ...validation,
      },
    });
  })
);

router.post(
  "/import/validate",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const validationResult = residentImportRowsRequestSchema.safeParse(
      request.body
    );

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Toplu sakin satırları geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const validation = await validateResidentImportRows({
      actor: {
        id: authenticatedRequest.user.id,
        role: authenticatedRequest.user.role,
      },
      rows: validationResult.data.rows,
    });

    response.status(200).json({
      success: true,
      message:
        validation.summary.error > 0
          ? "Bazı satırlarda hata bulundu. Kırmızı satırları düzeltin."
          : "Tüm satırlar kontrol edildi. Toplu kayıt işlemini başlatabilirsiniz.",
      data: validation,
    });
  })
);

router.post(
  "/import/commit",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const validationResult = residentImportRowsRequestSchema.safeParse(
      request.body
    );

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Toplu sakin satırları geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const importResult = await commitResidentImportRows({
      actor: {
        id: authenticatedRequest.user.id,
        role: authenticatedRequest.user.role,
      },
      rows: validationResult.data.rows,
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "IMPORT_RESIDENTS_FROM_EXCEL",
      entityType: "ApartmentResident",
      entityId: authenticatedRequest.user.id,
      metadata: {
        source: "EXCEL",
        ...importResult,
      },
    });

    response.status(201).json({
      success: true,
      message: importResult.message,
      data: importResult,
    });
  })
);

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

    const includeAllLinks = request.query.includeAllLinks === "true";

    const whereParts: Prisma.ApartmentResidentWhereInput[] = [
      searchCondition,
    ];

    /*
     * Yönetici ve süper admin sakin tabloları, ev sahibinin kiracılı
     * daire bağlantılarını da yönetebilmek için includeAllLinks=true
     * gönderir. Diğer çağrılarda mevcut sakin görünümü korunur.
     */
    if (!includeAllLinks) {
      whereParts.unshift(currentOccupantFilter);
    }

    if (authenticatedRequest.user.role === "MANAGER") {
      const managerFilter = await getManagerApartmentResidentFilter(
        authenticatedRequest.user.id
      );

      whereParts.push(managerFilter);
    }

    const whereCondition: Prisma.ApartmentResidentWhereInput = {
      AND: whereParts,
    };

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
      residentType: type,
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

    if (type === "TENANT") {
      await ensureApartmentHasOwner({ apartmentId });
    }

    const apartmentResident = await executeResidentMutation(
      prisma.apartmentResident.create({
        data: {
          apartmentId,
          userId,
          type,
        },
        include: apartmentResidentInclude,
      })
    );

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

    await ensureUserCanBeLinkedAsResident({
      userId: nextUserId,
      actorRole: authenticatedRequest.user.role,
      residentType: nextType,
      ignoreApartmentResidentId: targetApartmentResident.id,
    });

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

    const removesOwnerFromCurrentApartment =
      targetApartmentResident.type === "OWNER" &&
      (nextType !== "OWNER" ||
        nextApartmentId !== targetApartmentResident.apartmentId);

    if (removesOwnerFromCurrentApartment) {
      const currentApartmentHasTenant = await apartmentHasResidentType({
        apartmentId: targetApartmentResident.apartmentId,
        type: "TENANT",
      });

      if (currentApartmentHasTenant) {
        throw new HttpError(
          409,
          "Bu dairede kiracı bulunduğu için ev sahibi bağlantısı taşınamaz veya kiracıya çevrilemez."
        );
      }
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

    if (nextType === "TENANT") {
      await ensureApartmentHasOwner({
        apartmentId: nextApartmentId,
        ignoreId:
          targetApartmentResident.type === "OWNER"
            ? targetApartmentResident.id
            : undefined,
      });
    }

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

    const updatedApartmentResident = await executeResidentMutation(
      prisma.apartmentResident.update({
        where: {
          id: apartmentResidentId,
        },
        data: updateData,
        include: apartmentResidentInclude,
      })
    );

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


const updateLinkedResidentStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "PASSIVE"]),
  })
  .strict();

router.patch(
  "/:apartmentResidentId/resident-status",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    const authenticatedUser = authenticatedRequest.user;

    if (!authenticatedUser) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const apartmentResidentId = getRequiredParam(
      request,
      "apartmentResidentId"
    );

    const validationResult = updateLinkedResidentStatusSchema.safeParse(
      request.body
    );

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen sakin durum bilgisi geçersiz.",
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
            fullName: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!targetApartmentResident) {
      throw new HttpError(404, "Daire sakini kaydı bulunamadı.");
    }

    if (targetApartmentResident.user.role !== "RESIDENT") {
      throw new HttpError(
        403,
        "Yönetici veya süper admin hesabının durumu sakin ekranından değiştirilemez."
      );
    }

    if (authenticatedUser.role === "MANAGER") {
      await ensureApartmentIsInsideUserScope({
        userId: authenticatedUser.id,
        userRole: authenticatedUser.role,
        apartmentId: targetApartmentResident.apartmentId,
      });
    }

    const nextStatus = validationResult.data.status;

    if (targetApartmentResident.user.status === nextStatus) {
      throw new HttpError(
        409,
        nextStatus === "ACTIVE"
          ? "Sakin hesabı zaten aktif durumda."
          : "Sakin hesabı zaten pasif durumda."
      );
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: targetApartmentResident.userId,
      },
      data: {
        status: nextStatus,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await createAuditLog({
      request,
      userId: authenticatedUser.id,
      action:
        nextStatus === "PASSIVE"
          ? "DEACTIVATE_LINKED_RESIDENT"
          : "ACTIVATE_LINKED_RESIDENT",
      entityType: "User",
      entityId: updatedUser.id,
      metadata: {
        apartmentResidentId: targetApartmentResident.id,
        apartmentId: targetApartmentResident.apartmentId,
        residentEmail: updatedUser.email,
        previousStatus: targetApartmentResident.user.status,
        currentStatus: updatedUser.status,
      },
    });

    response.status(200).json({
      success: true,
      message:
        nextStatus === "PASSIVE"
          ? "Sakin hesabı pasif yapıldı. Daire bağlantısını artık kaldırabilirsiniz."
          : "Sakin hesabı yeniden aktifleştirildi.",
      data: {
        user: updatedUser,
      },
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
            status: true,
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
      targetUserRole === "RESIDENT" &&
      targetApartmentResident.user.status !== "PASSIVE"
    ) {
      throw new HttpError(
        409,
        "Daire bağlantısını kaldırmadan önce sakin hesabını pasif yapmalısınız."
      );
    }

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

    const apartmentHasOwner = await apartmentHasResidentType({
      apartmentId: targetApartmentResident.apartmentId,
      type: "OWNER",
      ignoreId:
        targetApartmentResident.type === "OWNER"
          ? targetApartmentResident.id
          : undefined,
    });
    const apartmentHasTenant = await apartmentHasResidentType({
      apartmentId: targetApartmentResident.apartmentId,
      type: "TENANT",
      ignoreId:
        targetApartmentResident.type === "TENANT"
          ? targetApartmentResident.id
          : undefined,
    });

    if (targetApartmentResident.type === "OWNER" && apartmentHasTenant) {
      throw new HttpError(
        409,
        "Bu dairede kiracı bulunduğu için ev sahibi bağlantısı kaldırılamaz. Önce kiracıyı kaldırın."
      );
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

      return {
        remainingApartmentResidentCount,
        userDeactivated: false,
        userAlreadyPassive:
          targetUserRole === "RESIDENT" &&
          targetApartmentResident.user.status === "PASSIVE",
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
        userAlreadyPassive: deleteResult.userAlreadyPassive,
        remainingApartmentResidentCount:
          deleteResult.remainingApartmentResidentCount,
      },
    });

    const successMessage =
      targetApartmentResident.type === "TENANT" && apartmentHasOwner
        ? "Kiracı bağlantısı kaldırıldı. Ev sahibi artık sakin olarak görüntülenecek."
        : targetApartmentResident.type === "OWNER" && !apartmentHasTenant
          ? "Ev sahibi bağlantısı kaldırıldı. Daire artık boş görünecek."
          : deleteResult.userAlreadyPassive
            ? "Pasif sakin hesabının daire bağlantısı kaldırıldı. Aynı e-posta daha sonra yeniden kullanılabilir."
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
        userAlreadyPassive: deleteResult.userAlreadyPassive,
        protectedAdministrativeAccount,
        accountRole: targetUserRole,
        remainingApartmentResidentCount:
          deleteResult.remainingApartmentResidentCount,
      },
    });
  })
);


const residentAccountInputSchema = z
  .object({
    fullName: z.string().trim().min(2).optional(),
    email: z.string().trim().email(),
    phone: optionalInternationalPhoneSchema,
    password: z.string().min(8).optional(),
  })
  .strict();

const createResidentAndAssignSchema = residentAccountInputSchema
  .extend({
    apartmentId: z.string().uuid(),
    type: z.enum(["OWNER", "TENANT"]),
    owner: residentAccountInputSchema.optional(),
  })
  .strict()
  .superRefine((data, context) => {
    if (data.type === "OWNER" && data.owner) {
      context.addIssue({
        code: "custom",
        path: ["owner"],
        message: "Ev sahibi eklenirken ikinci bir ev sahibi bilgisi gönderilemez.",
      });
    }

    if (
      data.type === "TENANT" &&
      data.owner &&
      data.email.toLowerCase() === data.owner.email.toLowerCase()
    ) {
      context.addIssue({
        code: "custom",
        path: ["owner", "email"],
        message: "Kiracı ve ev sahibi aynı e-posta hesabını kullanamaz.",
      });
    }
  });

type ResidentAccountInput = z.infer<typeof residentAccountInputSchema>;
type ActorRole = "SUPER_ADMIN" | "MANAGER" | "RESIDENT";

function normalizeAccountInput(account: ResidentAccountInput) {
  return {
    ...account,
    fullName: account.fullName?.trim(),
    email: account.email.trim().toLowerCase(),
    phone: account.phone && account.phone.length > 0 ? account.phone : undefined,
  };
}

async function preparePasswordHash(account: ResidentAccountInput) {
  return account.password ? bcrypt.hash(account.password, 12) : undefined;
}

async function resolveResidentAccount(params: {
  transaction: Prisma.TransactionClient;
  account: ResidentAccountInput;
  passwordHash?: string;
  actorRole: ActorRole;
  residentType: "OWNER" | "TENANT";
}) {
  const normalizedAccount = normalizeAccountInput(params.account);

  const existingUser = await params.transaction.user.findUnique({
    where: {
      email: normalizedAccount.email,
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
    if (existingUser.role === "SUPER_ADMIN" && params.actorRole !== "SUPER_ADMIN") {
      throw new HttpError(
        403,
        "Süper admin hesabını sakin olarak yalnızca süper admin bağlayabilir."
      );
    }

    if (params.residentType === "TENANT") {
      const existingTenantLink =
        await params.transaction.apartmentResident.findFirst({
          where: {
            userId: existingUser.id,
            type: "TENANT",
          },
          select: {
            id: true,
          },
        });

      if (existingTenantLink) {
        throw new HttpError(
          409,
          "Bu kullanıcı hesabı zaten başka bir daireye kiracı olarak bağlı. Bir kullanıcı yalnızca bir dairede kiracı olabilir."
        );
      }
    }

    if (existingUser.status === "PASSIVE") {
      if (existingUser.role !== "RESIDENT") {
        throw new HttpError(
          409,
          "Pasif yönetim hesabı otomatik olarak aktifleştirilemez. Önce süper admin hesap durumunu aktifleştirmelidir."
        );
      }

      const reactivatedUser = await params.transaction.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          status: "ACTIVE",
          ...(normalizedAccount.fullName
            ? { fullName: normalizedAccount.fullName }
            : {}),
          ...(normalizedAccount.phone !== undefined
            ? { phone: normalizedAccount.phone }
            : {}),
          ...(params.passwordHash
            ? {
                passwordHash: params.passwordHash,
                mustChangePassword: true,
              }
            : {}),
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

      return {
        user: reactivatedUser,
        created: false,
        reactivated: true,
      };
    }

    return {
      user: existingUser,
      created: false,
      reactivated: false,
    };
  }

  if (!normalizedAccount.fullName) {
    throw new HttpError(400, "Yeni kullanıcı hesabı için ad soyad zorunludur.");
  }

  if (!params.passwordHash) {
    throw new HttpError(
      400,
      "Yeni kullanıcı hesabı için en az 8 karakterli geçici şifre zorunludur."
    );
  }

  const user = await params.transaction.user.create({
    data: {
      fullName: normalizedAccount.fullName,
      email: normalizedAccount.email,
      phone: normalizedAccount.phone ?? null,
      passwordHash: params.passwordHash,
      mustChangePassword: true,
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
    },
  });

  return {
    user,
    created: true,
    reactivated: false,
  };
}

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
    const authenticatedUser = authenticatedRequest.user;

    if (!authenticatedUser) {
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

    const { apartmentId, type, owner, ...residentAccount } =
      validationResult.data;

    await ensureApartmentIsInsideUserScope({
      userId: authenticatedUser.id,
      userRole: authenticatedUser.role,
      apartmentId,
    });

    const [residentPasswordHash, ownerPasswordHash] = await Promise.all([
      preparePasswordHash(residentAccount),
      owner ? preparePasswordHash(owner) : Promise.resolve(undefined),
    ]);

    const result = await executeResidentMutation(
      prisma.$transaction(async (transaction) => {
        const existingLinks = await transaction.apartmentResident.findMany({
          where: {
            apartmentId,
          },
          select: {
            id: true,
            type: true,
            userId: true,
            user: {
              select: {
                status: true,
              },
            },
          },
        });

        const existingOwner = existingLinks.find(
          (link) => link.type === "OWNER"
        );
        const existingTenant = existingLinks.find(
          (link) => link.type === "TENANT"
        );

        if (type === "OWNER" && existingOwner) {
          throw new HttpError(409, "Bu daireye zaten bir ev sahibi atanmış.");
        }

        if (type === "TENANT" && existingTenant) {
          throw new HttpError(409, "Bu daireye zaten bir kiracı atanmış.");
        }

        if (
          type === "TENANT" &&
          existingOwner &&
          existingOwner.user.status !== "ACTIVE"
        ) {
          throw new HttpError(
            409,
            "Dairenin ev sahibi hesabı aktif değil. Kiracı eklemeden önce ev sahibi hesabını aktifleştirin."
          );
        }

        if (type === "TENANT" && existingOwner && owner) {
          throw new HttpError(
            409,
            "Bu dairede kayıtlı ev sahibi bulunduğu için yeni ev sahibi bilgisi gönderilemez."
          );
        }

        if (type === "TENANT" && !existingOwner && !owner) {
          throw new HttpError(
            400,
            "Boş daireye kiracı eklemek için ev sahibi hesap bilgileri zorunludur."
          );
        }

        let ownerResult:
          | Awaited<ReturnType<typeof resolveResidentAccount>>
          | undefined;
        let ownerLinkId: string | undefined;

        if (type === "TENANT" && !existingOwner && owner) {
          ownerResult = await resolveResidentAccount({
            transaction,
            account: owner,
            passwordHash: ownerPasswordHash,
            actorRole: authenticatedUser.role,
            residentType: "OWNER",
          });

          const ownerLink = await transaction.apartmentResident.create({
            data: {
              apartmentId,
              userId: ownerResult.user.id,
              type: "OWNER",
            },
            select: {
              id: true,
            },
          });

          ownerLinkId = ownerLink.id;
        }

        const residentResult = await resolveResidentAccount({
          transaction,
          account: residentAccount,
          passwordHash: residentPasswordHash,
          actorRole: authenticatedUser.role,
          residentType: type,
        });

        const apartmentResident = await transaction.apartmentResident.create({
          data: {
            apartmentId,
            userId: residentResult.user.id,
            type,
          },
          include: apartmentResidentInclude,
        });

        return {
          apartmentResident,
          residentUser: residentResult.user,
          residentAccountCreated: residentResult.created,
          residentAccountReactivated: residentResult.reactivated,
          ownerUser: ownerResult?.user,
          ownerAccountCreated: ownerResult?.created ?? false,
          ownerAccountReactivated: ownerResult?.reactivated ?? false,
          ownerLinkId,
          usedExistingOwner: type === "TENANT" && Boolean(existingOwner),
        };
      })
    );

    await createAuditLog({
      request,
      userId: authenticatedUser.id,
      action:
        type === "TENANT"
          ? "CREATE_TENANT_AND_ASSIGN_APARTMENT"
          : "CREATE_OWNER_AND_ASSIGN_APARTMENT",
      entityType: "ApartmentResident",
      entityId: result.apartmentResident.id,
      metadata: {
        apartmentId,
        type,
        linkedUserId: result.residentUser.id,
        linkedUserEmail: result.residentUser.email,
        linkedUserRole: result.residentUser.role,
        residentAccountCreated: result.residentAccountCreated,
        residentAccountReactivated: result.residentAccountReactivated,
        ownerLinkId: result.ownerLinkId,
        ownerUserId: result.ownerUser?.id,
        ownerUserEmail: result.ownerUser?.email,
        ownerAccountCreated: result.ownerAccountCreated,
        ownerAccountReactivated: result.ownerAccountReactivated,
        usedExistingOwner: result.usedExistingOwner,
      },
    });

    const message = result.residentAccountReactivated
      ? type === "TENANT"
        ? "Eski pasif kiracı hesabı yeniden aktifleştirildi ve seçilen daireye bağlandı."
        : "Eski pasif ev sahibi hesabı yeniden aktifleştirildi ve seçilen daireye bağlandı."
      : type === "TENANT"
        ? result.usedExistingOwner
          ? "Kiracı hesabı mevcut ev sahibinin dairesine bağlandı."
          : "Ev sahibi ve kiracı hesapları daireye bağlandı. Kiracı sakin olarak gösterilecek."
        : "Ev sahibi hesabı daireye bağlandı ve sakin olarak gösterilecek.";

    response.status(201).json({
      success: true,
      message,
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
