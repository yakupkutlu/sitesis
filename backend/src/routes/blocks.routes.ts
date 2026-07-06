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

async function ensureUserCanAccessBlockImage(params: {
  user: AuthenticatedRequest["user"];
  blockId: string;
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
      throw new HttpError(403, "Bu yöneticiye atanmış bir site veya blok bulunamadı.");
    }

    if (managerScope.siteIds.includes(params.siteId)) {
      return;
    }

    if (managerScope.blockIds.includes(params.blockId)) {
      return;
    }
  }

  throw new HttpError(403, "Bu blok/apartman görselini görüntüleme yetkiniz yok.");
}
const getBlocksQuerySchema = z.object({
  siteId: z.string().uuid().optional(),
});

const createBlockSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  imageUrl: z.string().trim().url().optional(),
  siteId: z.string().uuid(),
});

const updateBlockSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    imageUrl: z.string().trim().url().nullable().optional(),
    siteId: z.string().uuid().optional(),
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
    throw new HttpError(400, "Blok id bilgisi zorunludur.");
  }

  return paramValue;
}

router.get(
  "/:blockId/image",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    const blockId = getRequiredParam(request, "blockId");

    const block = await prisma.block.findUnique({
      where: {
        id: blockId,
      },
      select: {
        id: true,
        siteId: true,
        imageUrl: true,
      },
    });

    if (!block) {
      throw new HttpError(404, "Blok/Apartman bulunamadı.");
    }

    await ensureUserCanAccessBlockImage({
      user: authenticatedRequest.user,
      blockId,
      siteId: block.siteId,
    });

    if (!block.imageUrl) {
      throw new HttpError(404, "Blok/Apartman görseli bulunamadı.");
    }

    const imageContentType = getSiteBlockImageContentType(block.imageUrl);
    const imageFilePath = path.join(
      process.cwd(),
      "uploads",
      "site-block-images",
      path.basename(block.imageUrl)
    );

    try {
      const imageBuffer = await fs.readFile(imageFilePath);

      response.setHeader("Content-Type", imageContentType);
      response.status(200).send(imageBuffer);
    } catch {
      throw new HttpError(404, "Blok/Apartman görsel dosyası bulunamadı.");
    }
  })
);
router.get(
  "/",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const queryResult = getBlocksQuerySchema.safeParse(request.query);

    if (!queryResult.success) {
      throw new HttpError(
        400,
        "Blok filtre bilgileri geأ§ersiz.",
        queryResult.error.flatten().fieldErrors
      );
    }

    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadؤ±.");
    }

    const paginationParams = getPaginationParams(request.query);

    if (!paginationParams.success) {
      throw new HttpError(400, "Sayfalama bilgileri geأ§ersiz.", paginationParams.errors);
    }

    const { siteId } = queryResult.data;

    const searchCondition: Prisma.BlockWhereInput = paginationParams.search
      ? {
          OR: [
            {
              name: {
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

    let whereCondition: Prisma.BlockWhereInput = siteId
      ? {
          AND: [
            searchCondition,
            {
              siteId,
            },
          ],
        }
      : searchCondition;

    if (authenticatedRequest.user.role === "MANAGER") {
      const managerScope = await getManagerScope(authenticatedRequest.user.id);

      if (!hasManagerScope(managerScope)) {
        throw new HttpError(403, "Bu yأ¶neticiye atanmؤ±إں bir site veya blok bulunamadؤ±.");
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

      whereCondition = {
        AND: [
          whereCondition,
          {
            OR: managerFilters,
          },
        ],
      };
    }

    const [blocks, totalCount] = await Promise.all([
      prisma.block.findMany({
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
        skip: paginationParams.skip,
        take: paginationParams.limit,
      }),
      prisma.block.count({
        where: whereCondition,
      }),
    ]);

    response.status(200).json({
      success: true,
      data: blocks,
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

    const validationResult = createBlockSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gأ¶nderilen blok bilgileri geأ§ersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { name, description, imageUrl, siteId } = validationResult.data;

    const site = await prisma.site.findUnique({
      where: {
        id: siteId,
      },
      select: {
        id: true,
      },
    });

    if (!site) {
      throw new HttpError(404, "Site bulunamadؤ±.");
    }

    const block = await prisma.block.create({
      data: {
        name,
        description,
        imageUrl,
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
      message: "Blok/Apartman baإںarؤ±yla oluإںturuldu.",
      data: block,
    });
  })
);

router.patch(
  "/:blockId/image",
  requireRole("SUPER_ADMIN"),
  siteBlockImageUpload.single("image"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      await deleteUploadedImage(request.file);
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const blockId = getRequiredParam(request, "blockId");

    const targetBlock = await prisma.block.findUnique({
      where: {
        id: blockId,
      },
      select: {
        id: true,
        imageUrl: true,
      },
    });

    if (!targetBlock) {
      await deleteUploadedImage(request.file);
      throw new HttpError(404, "Blok/Apartman bulunamadı.");
    }

    if (!request.file) {
      throw new HttpError(400, "Blok/Apartman görseli zorunludur.");
    }

    const isAllowedFile = await isAllowedImageFile(
      request.file.path,
      request.file.mimetype
    );

    if (!isAllowedFile) {
      await deleteUploadedImage(request.file);
      throw new HttpError(
        400,
        "Blok/Apartman görseli gerçek PNG, JPG veya WEBP formatında olmalıdır."
      );
    }

    const imageUrl = buildSiteBlockImageUrl(request.file.filename);

    const updatedBlock = await prisma.block.update({
      where: {
        id: blockId,
      },
      data: {
        imageUrl,
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

    await deleteStoredSiteBlockImage(targetBlock.imageUrl);

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "UPDATE_BLOCK_IMAGE",
      entityType: "Block",
      entityId: updatedBlock.id,
      metadata: {
        previousImageUrl: targetBlock.imageUrl,
        currentImageUrl: updatedBlock.imageUrl,
        originalFileName: request.file.originalname,
        mimeType: request.file.mimetype,
        sizeBytes: request.file.size,
      },
    });

    response.status(200).json({
      success: true,
      message: "Blok/Apartman görseli başarıyla güncellendi.",
      data: updatedBlock,
    });
  })
);
router.patch(
  "/:blockId",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadؤ±.");
    }

    const blockId = getRequiredParam(request, "blockId");

    const validationResult = updateBlockSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gأ¶nderilen blok gأ¼ncelleme bilgileri geأ§ersiz.",
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
        imageUrl: true,
        siteId: true,
      },
    });

    if (!targetBlock) {
      throw new HttpError(404, "Blok/Apartman bulunamadؤ±.");
    }

    const { name, description, imageUrl, siteId } = validationResult.data;

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
        throw new HttpError(404, "Site bulunamadؤ±.");
      }
    }

    const updateData: {
      name?: string;
      description?: string | null;
      imageUrl?: string | null;
      siteId?: string;
    } = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (description !== undefined) {
      updateData.description = description && description.length > 0 ? description : null;
    }

    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl && imageUrl.length > 0 ? imageUrl : null;
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
          imageUrl: targetBlock.imageUrl,
          siteId: targetBlock.siteId,
        },
        current: {
          name: updatedBlock.name,
          description: updatedBlock.description,
          imageUrl: updatedBlock.imageUrl,
          siteId: updatedBlock.siteId,
        },
      },
    });

    response.status(200).json({
      success: true,
      message: "Blok/Apartman baإںarؤ±yla gأ¼ncellendi.",
      data: updatedBlock,
    });
  })
);

export default router;

