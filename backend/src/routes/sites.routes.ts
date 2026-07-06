import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

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
import { siteBlockImageUpload } from "../uploads/site-block-image-upload.js";
import { isAllowedImageFile } from "../utils/image-signature.js";
const router = express.Router();

router.use(requireAuth);

async function deleteUploadedImage(file?: Express.Multer.File) {
  if (!file) {
    return;
  }

  try {
    await fs.unlink(file.path);
  } catch (error) {
    console.error("Yüklenen görsel dosyası silinemedi:", error);
  }
}

function buildSiteBlockImageUrl(fileName: string) {
  return "/uploads/site-block-images/" + fileName;
}

async function deleteStoredSiteBlockImage(imageUrl?: string | null) {
  if (!imageUrl || !imageUrl.startsWith("/uploads/site-block-images/")) {
    return;
  }

  const storedFileName = path.basename(imageUrl);

  try {
    await fs.unlink(
      path.join(process.cwd(), "uploads", "site-block-images", storedFileName)
    );
  } catch {
    // Eski görsel dosyası bulunamazsa işlemi durdurmayalım.
  }
}

const createSiteSchema = z.object({
  name: z.string().trim().min(2),
  address: z.string().trim().min(2),
  description: z.string().trim().optional(),
  imageUrl: z.string().trim().url().optional(),
  hasElevator: z.boolean().optional().default(false),
  systems: z.array(z.string().trim().min(1)).optional().default([]),
});

const updateSiteSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    address: z.string().trim().min(2).optional(),
    description: z.string().trim().nullable().optional(),
    imageUrl: z.string().trim().url().nullable().optional(),
    hasElevator: z.boolean().optional(),
    systems: z.array(z.string().trim().min(1)).optional(),
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
    throw new HttpError(400, "Site id bilgisi zorunludur.");
  }

  return paramValue;
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

    let whereCondition: Prisma.SiteWhereInput = paginationParams.search
      ? {
          OR: [
            {
              name: {
                contains: paginationParams.search,
                mode: "insensitive",
              },
            },
            {
              address: {
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

    if (authenticatedRequest.user.role === "MANAGER") {
      const managerScope = await getManagerScope(authenticatedRequest.user.id);

      if (!hasManagerScope(managerScope)) {
        throw new HttpError(403, "Bu yأ¶neticiye atanmؤ±إں bir site veya blok bulunamadؤ±.");
      }

      const managerFilters: Prisma.SiteWhereInput[] = [];

      if (managerScope.siteIds.length > 0) {
        managerFilters.push({
          id: {
            in: managerScope.siteIds,
          },
        });
      }

      if (managerScope.blockIds.length > 0) {
        managerFilters.push({
          blocks: {
            some: {
              id: {
                in: managerScope.blockIds,
              },
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

    const [sites, totalCount] = await Promise.all([
      prisma.site.findMany({
        where: whereCondition,
        include: {
          blocks: {
            select: {
              id: true,
              name: true,
              description: true,
              createdAt: true,
              updatedAt: true,
              _count: {
                select: {
                  apartments: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: paginationParams.skip,
        take: paginationParams.limit,
      }),
      prisma.site.count({
        where: whereCondition,
      }),
    ]);

    response.status(200).json({
      success: true,
      data: sites,
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

    const validationResult = createSiteSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gأ¶nderilen site bilgileri geأ§ersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { name, address, description, imageUrl, hasElevator, systems } =
      validationResult.data;

    const site = await prisma.site.create({
      data: {
        name,
        address,
        description,
        imageUrl,
        hasElevator,
        systems,
      },
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "CREATE_SITE",
      entityType: "Site",
      entityId: site.id,
      metadata: {
        name: site.name,
        address: site.address,
        hasElevator: site.hasElevator,
        systems: site.systems,
      },
    });

    response.status(201).json({
      success: true,
      message: "Site baإںarؤ±yla oluإںturuldu.",
      data: site,
    });
  })
);

router.patch(
  "/:siteId/image",
  requireRole("SUPER_ADMIN"),
  siteBlockImageUpload.single("image"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      await deleteUploadedImage(request.file);
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const siteId = getRequiredParam(request, "siteId");

    const targetSite = await prisma.site.findUnique({
      where: {
        id: siteId,
      },
      select: {
        id: true,
        imageUrl: true,
      },
    });

    if (!targetSite) {
      await deleteUploadedImage(request.file);
      throw new HttpError(404, "Site bulunamadı.");
    }

    if (!request.file) {
      throw new HttpError(400, "Site görseli zorunludur.");
    }

    const isAllowedFile = await isAllowedImageFile(
      request.file.path,
      request.file.mimetype
    );

    if (!isAllowedFile) {
      await deleteUploadedImage(request.file);
      throw new HttpError(
        400,
        "Site görseli gerçek PNG, JPG veya WEBP formatında olmalıdır."
      );
    }

    const imageUrl = buildSiteBlockImageUrl(request.file.filename);

    const updatedSite = await prisma.site.update({
      where: {
        id: siteId,
      },
      data: {
        imageUrl,
      },
    });

    await deleteStoredSiteBlockImage(targetSite.imageUrl);

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "UPDATE_SITE_IMAGE",
      entityType: "Site",
      entityId: updatedSite.id,
      metadata: {
        previousImageUrl: targetSite.imageUrl,
        currentImageUrl: updatedSite.imageUrl,
        originalFileName: request.file.originalname,
        mimeType: request.file.mimetype,
        sizeBytes: request.file.size,
      },
    });

    response.status(200).json({
      success: true,
      message: "Site görseli başarıyla güncellendi.",
      data: updatedSite,
    });
  })
);
router.patch(
  "/:siteId",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadؤ±.");
    }

    const siteId = getRequiredParam(request, "siteId");

    const validationResult = updateSiteSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gأ¶nderilen site gأ¼ncelleme bilgileri geأ§ersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const targetSite = await prisma.site.findUnique({
      where: {
        id: siteId,
      },
    });

    if (!targetSite) {
      throw new HttpError(404, "Site bulunamadؤ±.");
    }

    const { name, address, description, imageUrl, hasElevator, systems } =
      validationResult.data;

    const updateData: Prisma.SiteUpdateInput = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (address !== undefined) {
      updateData.address = address;
    }

    if (description !== undefined) {
      updateData.description = description && description.length > 0 ? description : null;
    }

    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl && imageUrl.length > 0 ? imageUrl : null;
    }

    if (hasElevator !== undefined) {
      updateData.hasElevator = hasElevator;
    }

    if (systems !== undefined) {
      updateData.systems = systems;
    }

    const updatedSite = await prisma.site.update({
      where: {
        id: siteId,
      },
      data: updateData,
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "UPDATE_SITE",
      entityType: "Site",
      entityId: updatedSite.id,
      metadata: {
        previous: {
          name: targetSite.name,
          address: targetSite.address,
          description: targetSite.description,
          imageUrl: targetSite.imageUrl,
          hasElevator: targetSite.hasElevator,
          systems: targetSite.systems,
        },
        current: {
          name: updatedSite.name,
          address: updatedSite.address,
          description: updatedSite.description,
          imageUrl: updatedSite.imageUrl,
          hasElevator: updatedSite.hasElevator,
          systems: updatedSite.systems,
        },
      },
    });

    response.status(200).json({
      success: true,
      message: "Site baإںarؤ±yla gأ¼ncellendi.",
      data: updatedSite,
    });
  })
);

export default router;
