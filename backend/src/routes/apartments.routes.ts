import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import {requireAuth,requireRole,type AuthenticatedRequest,} from "../middlewares/auth.middleware.js";
import { createAuditLog } from "../services/audit-log.service.js";
import { getManagerScope, hasManagerScope } from "../services/manager-scope.service.js";
import { type Prisma } from "../generated/prisma/client.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { buildPaginationMeta, getPaginationParams } from "../utils/pagination.js";

const router = express.Router();

router.use(requireAuth);

const getApartmentsQuerySchema = z.object({
  blockId: z.string().uuid().optional(),
});

const createApartmentSchema = z.object({
  number: z.string().trim().min(1),
  floor: z.number().int().optional(),
  description: z.string().trim().optional(),
  blockId: z.string().uuid(),
});

const updateApartmentSchema = z
  .object({
    number: z.string().trim().min(1).optional(),
    floor: z.number().int().nullable().optional(),
    description: z.string().trim().nullable().optional(),
    blockId: z.string().uuid().optional(),
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
    throw new HttpError(400, "Daire id bilgisi zorunludur.");
  }

  return paramValue;
}

router.get(
  "/",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const queryResult = getApartmentsQuerySchema.safeParse(request.query);

    if (!queryResult.success) {
      throw new HttpError(
        400,
        "Daire filtre bilgileri geçersiz.",
        queryResult.error.flatten().fieldErrors
      );
    }

    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const paginationParams = getPaginationParams(request.query);

    if (!paginationParams.success) {
      throw new HttpError(400, "Sayfalama bilgileri geçersiz.", paginationParams.errors);
    }

    const { blockId } = queryResult.data;

    const searchCondition: Prisma.ApartmentWhereInput = paginationParams.search
      ? {
          OR: [
            {
              number: {
                contains: paginationParams.search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: paginationParams.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {};

    let whereCondition: Prisma.ApartmentWhereInput = blockId
      ? {
          AND: [
            searchCondition,
            {
              blockId,
            },
          ],
        }
      : searchCondition;

    if (authenticatedRequest.user.role === "MANAGER") {
      const managerScope = await getManagerScope(authenticatedRequest.user.id);

      if (!hasManagerScope(managerScope)) {
        throw new HttpError(403, "Bu yöneticiye atanmış bir site veya blok bulunamadı.");
      }

      const managerFilters: Prisma.ApartmentWhereInput[] = [];

      if (managerScope.blockIds.length > 0) {
        managerFilters.push({
          blockId: {
            in: managerScope.blockIds,
          },
        });
      }

      if (managerScope.siteIds.length > 0) {
        managerFilters.push({
          block: {
            siteId: {
              in: managerScope.siteIds,
            },
          },
        });
      }

      whereCondition = {
        AND: [
          whereCondition,
          {
            OR: managerFilters,
          },
        ],
      };
    }

    const [apartments, totalCount] = await Promise.all([
      prisma.apartment.findMany({
        where: whereCondition,
        include: {
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
          _count: {
            select: {
              residents: true,
              paymentAllocations: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: paginationParams.skip,
        take: paginationParams.limit,
      }),
      prisma.apartment.count({
        where: whereCondition,
      }),
    ]);

    response.status(200).json({
      success: true,
      data: apartments,
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

    const validationResult = createApartmentSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen daire bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { number, floor, description, blockId } = validationResult.data;

    const block = await prisma.block.findUnique({
      where: {
        id: blockId,
      },
      select: {
        id: true,
      },
    });

    if (!block) {
      throw new HttpError(404, "Blok/Apartman bulunamadı.");
    }

    const existingApartment = await prisma.apartment.findUnique({
      where: {
        blockId_number: {
          blockId,
          number,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingApartment) {
      throw new HttpError(409, "Bu blok içinde aynı daire numarası zaten var.");
    }

    const apartment = await prisma.apartment.create({
      data: {
        number,
        floor,
        description,
        blockId,
      },
      include: {
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
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "CREATE_APARTMENT",
      entityType: "Apartment",
      entityId: apartment.id,
      metadata: {
        number: apartment.number,
        floor: apartment.floor,
        blockId: apartment.blockId,
      },
    });

    response.status(201).json({
      success: true,
      message: "Daire başarıyla oluşturuldu.",
      data: apartment,
    });
  })
);

router.patch(
  "/:apartmentId",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const apartmentId = getRequiredParam(request, "apartmentId");

    const validationResult = updateApartmentSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen daire güncelleme bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const targetApartment = await prisma.apartment.findUnique({
      where: {
        id: apartmentId,
      },
      select: {
        id: true,
        number: true,
        floor: true,
        description: true,
        blockId: true,
      },
    });

    if (!targetApartment) {
      throw new HttpError(404, "Daire bulunamadı.");
    }

    const { number, floor, description, blockId } = validationResult.data;

    const nextBlockId = blockId ?? targetApartment.blockId;
    const nextNumber = number ?? targetApartment.number;

    if (blockId !== undefined && blockId !== targetApartment.blockId) {
      const block = await prisma.block.findUnique({
        where: {
          id: blockId,
        },
        select: {
          id: true,
        },
      });

      if (!block) {
        throw new HttpError(404, "Blok/Apartman bulunamadı.");
      }
    }

    if (nextBlockId !== targetApartment.blockId || nextNumber !== targetApartment.number) {
      const existingApartment = await prisma.apartment.findUnique({
        where: {
          blockId_number: {
            blockId: nextBlockId,
            number: nextNumber,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingApartment && existingApartment.id !== targetApartment.id) {
        throw new HttpError(409, "Bu blok içinde aynı daire numarası zaten var.");
      }
    }

    const updateData: {
      number?: string;
      floor?: number | null;
      description?: string | null;
      blockId?: string;
    } = {};

    if (number !== undefined) {
      updateData.number = number;
    }

    if (floor !== undefined) {
      updateData.floor = floor;
    }

    if (description !== undefined) {
      updateData.description = description && description.length > 0 ? description : null;
    }

    if (blockId !== undefined) {
      updateData.blockId = blockId;
    }

    const updatedApartment = await prisma.apartment.update({
      where: {
        id: apartmentId,
      },
      data: updateData,
      include: {
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
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "UPDATE_APARTMENT",
      entityType: "Apartment",
      entityId: updatedApartment.id,
      metadata: {
        previous: {
          number: targetApartment.number,
          floor: targetApartment.floor,
          description: targetApartment.description,
          blockId: targetApartment.blockId,
        },
        current: {
          number: updatedApartment.number,
          floor: updatedApartment.floor,
          description: updatedApartment.description,
          blockId: updatedApartment.blockId,
        },
      },
    });

    response.status(200).json({
      success: true,
      message: "Daire başarıyla güncellendi.",
      data: updatedApartment,
    });
  })
);

export default router;
