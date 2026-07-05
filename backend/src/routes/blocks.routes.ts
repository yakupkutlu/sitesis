import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";
import { createAuditLog } from "../services/audit-log.service.js";
import { getManagerScope, hasManagerScope } from "../services/manager-scope.service.js";
import { type Prisma } from "../generated/prisma/client.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

router.use(requireAuth);

const getBlocksQuerySchema = z.object({
  siteId: z.string().uuid().optional(),
});

const createBlockSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  siteId: z.string().uuid(),
});

const updateBlockSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    siteId: z.string().uuid().optional(),
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
    throw new HttpError(400, "Blok id bilgisi zorunludur.");
  }

  return paramValue;
}

router.get(
  "/",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const queryResult = getBlocksQuerySchema.safeParse(request.query);

    if (!queryResult.success) {
      throw new HttpError(
        400,
        "Blok filtre bilgileri geçersiz.",
        queryResult.error.flatten().fieldErrors
      );
    }

    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const { siteId } = queryResult.data;

    let whereCondition: Prisma.BlockWhereInput = siteId
      ? {
          siteId,
        }
      : {};

    if (authenticatedRequest.user.role === "MANAGER") {
      const managerScope = await getManagerScope(authenticatedRequest.user.id);

      if (!hasManagerScope(managerScope)) {
        throw new HttpError(403, "Bu yöneticiye atanmış bir site veya blok bulunamadı.");
      }

      const managerFilters: Prisma.BlockWhereInput[] = [];

      if (managerScope.siteIds.length > 0) {
        managerFilters.push({
          siteId: {
            in: managerScope.siteIds,
          },
        });
      }

      if (managerScope.blockIds.length > 0) {
        managerFilters.push({
          id: {
            in: managerScope.blockIds,
          },
        });
      }

      whereCondition = siteId
        ? {
            AND: [
              {
                siteId,
              },
              {
                OR: managerFilters,
              },
            ],
          }
        : {
            OR: managerFilters,
          };
    }

    const blocks = await prisma.block.findMany({
      where: whereCondition,
      include: {
        site: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        _count: {
          select: {
            apartments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    response.status(200).json({
      success: true,
      data: blocks,
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

    const validationResult = createBlockSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen blok bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { name, description, siteId } = validationResult.data;

    const site = await prisma.site.findUnique({
      where: {
        id: siteId,
      },
      select: {
        id: true,
      },
    });

    if (!site) {
      throw new HttpError(404, "Site bulunamadı.");
    }

    const block = await prisma.block.create({
      data: {
        name,
        description,
        siteId,
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "CREATE_BLOCK",
      entityType: "Block",
      entityId: block.id,
      metadata: {
        name: block.name,
        siteId: block.siteId,
      },
    });

    response.status(201).json({
      success: true,
      message: "Blok/Apartman başarıyla oluşturuldu.",
      data: block,
    });
  })
);

router.patch(
  "/:blockId",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const blockId = getRequiredParam(request, "blockId");

    const validationResult = updateBlockSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen blok güncelleme bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const targetBlock = await prisma.block.findUnique({
      where: {
        id: blockId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        siteId: true,
      },
    });

    if (!targetBlock) {
      throw new HttpError(404, "Blok/Apartman bulunamadı.");
    }

    const { name, description, siteId } = validationResult.data;

    if (siteId !== undefined && siteId !== targetBlock.siteId) {
      const site = await prisma.site.findUnique({
        where: {
          id: siteId,
        },
        select: {
          id: true,
        },
      });

      if (!site) {
        throw new HttpError(404, "Site bulunamadı.");
      }
    }

    const updateData: {
      name?: string;
      description?: string | null;
      siteId?: string;
    } = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (description !== undefined) {
      updateData.description = description && description.length > 0 ? description : null;
    }

    if (siteId !== undefined) {
      updateData.siteId = siteId;
    }

    const updatedBlock = await prisma.block.update({
      where: {
        id: blockId,
      },
      data: updateData,
      include: {
        site: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "UPDATE_BLOCK",
      entityType: "Block",
      entityId: updatedBlock.id,
      metadata: {
        previous: {
          name: targetBlock.name,
          description: targetBlock.description,
          siteId: targetBlock.siteId,
        },
        current: {
          name: updatedBlock.name,
          description: updatedBlock.description,
          siteId: updatedBlock.siteId,
        },
      },
    });

    response.status(200).json({
      success: true,
      message: "Blok/Apartman başarıyla güncellendi.",
      data: updatedBlock,
    });
  })
);

export default router;