import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";
import { createAuditLog } from "../services/audit-log.service.js";
import {
  getManagerScope,
  hasManagerScope,
} from "../services/manager-scope.service.js";
import { type Prisma } from "../generated/prisma/client.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { buildPaginationMeta, getPaginationParams } from "../utils/pagination.js";
import { siteBlockImageUpload } from "../uploads/site-block-image-upload.js";
import { isAllowedImageFile } from "../utils/image-signature.js";

const router = express.Router();

router.use(requireAuth);

const createSiteSchema = z.object({
  name: z.string().trim().min(2),
  address: z.string().trim().min(2),
  description: z.string().trim().optional(),
  imageUrl: z.string().trim().url().optional(),
  hasElevator: z.boolean().optional().default(false),
  systems: z.array(z.string().trim().min(1)).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

const optionalManagerIdSchema = z.string().uuid().optional();

const createSiteWithStructureSchema = createSiteSchema
  .extend({
    siteManagerId: optionalManagerIdSchema,
    blocks: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(100),
          description: z.string().trim().max(500).optional(),
          apartmentCount: z.number().int().min(1).max(1000),
          managerId: optionalManagerIdSchema,
        })
      )
      .min(1)
      .max(100),
  })
  .superRefine((data, context) => {
    const normalizedBlockNames = new Set<string>();
    let totalApartmentCount = 0;

    data.blocks.forEach((block, index) => {
      const normalizedName = block.name.toLocaleLowerCase("tr-TR");

      if (normalizedBlockNames.has(normalizedName)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["blocks", index, "name"],
          message: "Aynı isimle birden fazla blok/apartman eklenemez.",
        });
      }

      if (
        data.siteManagerId &&
        block.managerId &&
        data.siteManagerId === block.managerId
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["blocks", index, "managerId"],
          message:
            "Site genel yöneticisi aynı bloğa ayrıca atanamaz. Genel yönetici tüm siteyi görebilir.",
        });
      }

      normalizedBlockNames.add(normalizedName);
      totalApartmentCount += block.apartmentCount;
    });

    if (totalApartmentCount > 5000) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blocks"],
        message: "Bir site için toplam daire sayısı en fazla 5000 olabilir.",
      });
    }
  });

const updateSiteSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    address: z.string().trim().min(2).optional(),
    description: z.string().trim().nullable().optional(),
    imageUrl: z.string().trim().url().nullable().optional(),
    hasElevator: z.boolean().optional(),
    systems: z.array(z.string().trim().min(1)).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "En az bir alan gönderilmelidir.",
  });

function getRequiredParam(request: Request, paramName: string) {
  const paramValue = request.params[paramName];

  if (typeof paramValue !== "string" || paramValue.trim().length === 0) {
    throw new HttpError(400, "Site id bilgisi zorunludur.");
  }

  return paramValue;
}

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

function getSiteBlockImageContentType(imageUrl: string) {
  const fileExtension = path.extname(imageUrl).toLowerCase();

  if (fileExtension === ".png") {
    return "image/png";
  }

  if (fileExtension === ".jpg" || fileExtension === ".jpeg") {
    return "image/jpeg";
  }

  if (fileExtension === ".webp") {
    return "image/webp";
  }

  throw new HttpError(400, "Görsel dosya türü desteklenmiyor.");
}

async function ensureUserCanAccessSiteImage(params: {
  user: AuthenticatedRequest["user"];
  siteId: string;
}) {
  if (!params.user) {
    throw new HttpError(401, "Oturum bulunamadı.");
  }

  if (params.user.role === "SUPER_ADMIN") {
    return;
  }

  if (params.user.role === "MANAGER") {
    const managerScope = await getManagerScope(params.user.id);

    if (!hasManagerScope(managerScope)) {
      throw new HttpError(
        403,
        "Bu yöneticiye atanmış bir site veya blok bulunamadı."
      );
    }

    if (managerScope.siteIds.includes(params.siteId)) {
      return;
    }

    if (managerScope.blockIds.length > 0) {
      const accessibleBlock = await prisma.block.findFirst({
        where: {
          id: {
            in: managerScope.blockIds,
          },
          siteId: params.siteId,
        },
        select: {
          id: true,
        },
      });

      if (accessibleBlock) {
        return;
      }
    }
  }

  throw new HttpError(403, "Bu site görselini görüntüleme yetkiniz yok.");
}

router.get(
  "/:siteId/image",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    const siteId = getRequiredParam(request, "siteId");

    const site = await prisma.site.findUnique({
      where: {
        id: siteId,
      },
      select: {
        id: true,
        imageUrl: true,
      },
    });

    if (!site) {
      throw new HttpError(404, "Site bulunamadı.");
    }

    await ensureUserCanAccessSiteImage({
      user: authenticatedRequest.user,
      siteId,
    });

    if (!site.imageUrl) {
      throw new HttpError(404, "Site görseli bulunamadı.");
    }

    const imageContentType = getSiteBlockImageContentType(site.imageUrl);
    const imageFilePath = path.join(
      process.cwd(),
      "uploads",
      "site-block-images",
      path.basename(site.imageUrl)
    );

    try {
      const imageBuffer = await fs.readFile(imageFilePath);

      response.setHeader("Content-Type", imageContentType);
      response.status(200).send(imageBuffer);
    } catch {
      throw new HttpError(404, "Site görsel dosyası bulunamadı.");
    }
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
      throw new HttpError(
        400,
        "Sayfalama bilgileri geçersiz.",
        paginationParams.errors
      );
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
        throw new HttpError(
          403,
          "Bu yöneticiye atanmış bir site veya blok bulunamadı."
        );
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
  "/with-structure",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const validationResult = createSiteWithStructureSchema.safeParse(
      request.body
    );

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen site, blok, daire veya yönetici bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const {
      name,
      address,
      description,
      imageUrl,
      hasElevator,
      systems,
      isActive,
      siteManagerId,
      blocks,
    } = validationResult.data;

    const requestedManagerIds = Array.from(
      new Set(
        [siteManagerId, ...blocks.map((block) => block.managerId)].filter(
          (managerId): managerId is string => Boolean(managerId)
        )
      )
    );

    const site = await prisma.$transaction(async (transaction) => {
      if (requestedManagerIds.length > 0) {
        const validManagers = await transaction.user.findMany({
          where: {
            id: {
              in: requestedManagerIds,
            },
            role: "MANAGER",
            status: "ACTIVE",
          },
          select: {
            id: true,
          },
        });

        if (validManagers.length !== requestedManagerIds.length) {
          throw new HttpError(
            400,
            "Seçilen yöneticilerden biri bulunamadı, pasif veya MANAGER rolünde değil."
          );
        }
      }

      const createdSite = await transaction.site.create({
        data: {
          name,
          address,
          description,
          imageUrl,
          hasElevator,
          systems,
          isActive,
        },
      });

      if (siteManagerId) {
        await transaction.managerAssignment.create({
          data: {
            managerId: siteManagerId,
            scopeType: "SITE",
            siteId: createdSite.id,
          },
        });
      }

      for (const blockInput of blocks) {
        const createdBlock = await transaction.block.create({
          data: {
            siteId: createdSite.id,
            name: blockInput.name,
            description: blockInput.description,
          },
        });

        const apartmentRows = Array.from(
          { length: blockInput.apartmentCount },
          (_, index) => {
            const apartmentNumber = index + 1;

            return {
              blockId: createdBlock.id,
              number: String(apartmentNumber),
              floor: Math.ceil(apartmentNumber / 4),
            };
          }
        );

        await transaction.apartment.createMany({
          data: apartmentRows,
        });

        if (blockInput.managerId) {
          await transaction.managerAssignment.create({
            data: {
              managerId: blockInput.managerId,
              scopeType: "BLOCK",
              blockId: createdBlock.id,
            },
          });
        }
      }

      for (const managerId of requestedManagerIds) {
        const managerAssignments =
          await transaction.managerAssignment.findMany({
            where: {
              managerId,
            },
            select: {
              id: true,
            },
            orderBy: {
              createdAt: "asc",
            },
            take: 2,
          });

        const [onlyAssignment] = managerAssignments;

        if (managerAssignments.length === 1 && onlyAssignment) {
          await transaction.user.update({
            where: {
              id: managerId,
            },
            data: {
              activeManagerAssignmentId: onlyAssignment.id,
            },
          });
        }
      }

      return transaction.site.findUniqueOrThrow({
        where: {
          id: createdSite.id,
        },
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
              managerAssignments: {
                include: {
                  manager: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
          managerAssignments: {
            where: {
              scopeType: "SITE",
            },
            include: {
              manager: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    });

    const totalApartmentCount = blocks.reduce(
      (total, block) => total + block.apartmentCount,
      0
    );

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "CREATE_SITE_WITH_STRUCTURE",
      entityType: "Site",
      entityId: site.id,
      metadata: {
        name: site.name,
        address: site.address,
        siteManagerId: siteManagerId ?? null,
        blockCount: blocks.length,
        totalApartmentCount,
        blocks: blocks.map((block) => ({
          name: block.name,
          apartmentCount: block.apartmentCount,
          managerId: block.managerId ?? null,
        })),
      },
    });

    response.status(201).json({
      success: true,
      message:
        "Site, bloklar, daireler ve yönetici atamaları başarıyla oluşturuldu.",
      data: site,
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

    const validationResult = createSiteSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen site bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const {
      name,
      address,
      description,
      imageUrl,
      hasElevator,
      systems,
      isActive,
    } = validationResult.data;

    const site = await prisma.site.create({
      data: {
        name,
        address,
        description,
        imageUrl,
        hasElevator,
        systems,
        isActive,
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
        isActive: site.isActive,
      },
    });

    response.status(201).json({
      success: true,
      message: "Site başarıyla oluşturuldu.",
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
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const siteId = getRequiredParam(request, "siteId");

    const validationResult = updateSiteSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen site güncelleme bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const targetSite = await prisma.site.findUnique({
      where: {
        id: siteId,
      },
    });

    if (!targetSite) {
      throw new HttpError(404, "Site bulunamadı.");
    }

    const {
      name,
      address,
      description,
      imageUrl,
      hasElevator,
      systems,
      isActive,
    } = validationResult.data;

    const updateData: Prisma.SiteUpdateInput = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (address !== undefined) {
      updateData.address = address;
    }

    if (description !== undefined) {
      updateData.description =
        description && description.length > 0 ? description : null;
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

    if (isActive !== undefined) {
      updateData.isActive = isActive;
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
          isActive: targetSite.isActive,
        },
        current: {
          name: updatedSite.name,
          address: updatedSite.address,
          description: updatedSite.description,
          imageUrl: updatedSite.imageUrl,
          hasElevator: updatedSite.hasElevator,
          systems: updatedSite.systems,
          isActive: updatedSite.isActive,
        },
      },
    });

    response.status(200).json({
      success: true,
      message: "Site başarıyla güncellendi.",
      data: updatedSite,
    });
  })
);

export default router;

