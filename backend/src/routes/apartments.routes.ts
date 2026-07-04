import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import {requireAuth,requireRole,type AuthenticatedRequest,} from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { getManagerScope, hasManagerScope } from "../services/manager-scope.service.js";
import { createAuditLog } from "../services/audit-log.service.js";
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

    const { blockId } = queryResult.data;
    
        const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    let whereCondition:
      | {
          blockId?: string;
          OR?: Array<{
            blockId?: {
              in: string[];
            };
            block?: {
              siteId: {
                in: string[];
              };
            };
          }>;
        }
      | undefined = blockId
      ? {
          blockId,
        }
      : undefined;

    if (authenticatedRequest.user.role === "MANAGER") {
      const managerScope = await getManagerScope(authenticatedRequest.user.id);

      if (!hasManagerScope(managerScope)) {
        throw new HttpError(403, "Bu yöneticiye atanmış bir site veya blok bulunamadı.");
      }

      if (blockId) {
        const selectedBlock = await prisma.block.findUnique({
          where: {
            id: blockId,
          },
          select: {
            id: true,
            siteId: true,
          },
        });

        if (!selectedBlock) {
          throw new HttpError(404, "Blok/Apartman bulunamadı.");
        }

        const canAccessBlock =
          managerScope.blockIds.includes(selectedBlock.id) ||
          managerScope.siteIds.includes(selectedBlock.siteId);

        if (!canAccessBlock) {
          throw new HttpError(403, "Bu blok/apartmana ait daireleri görüntüleme yetkiniz yok.");
        }

        whereCondition = {
          blockId,
        };
      } else {
        whereCondition = {
          OR: [
            {
              blockId: {
                in: managerScope.blockIds,
              },
            },
            {
              block: {
                siteId: {
                  in: managerScope.siteIds,
                },
              },
            },
          ],
        };
      }
    }

    const apartments = await prisma.apartment.findMany({
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
    });

    response.status(200).json({
      success: true,
      data: apartments,
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

export default router;