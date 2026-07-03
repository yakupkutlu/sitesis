import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

const getBlocksQuerySchema = z.object({
  siteId: z.string().uuid().optional(),
});

const createBlockSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  siteId: z.string().uuid(),
});

router.get(
  "/",
  asyncHandler(async (request: Request, response: Response) => {
    const queryResult = getBlocksQuerySchema.safeParse(request.query);

    if (!queryResult.success) {
      throw new HttpError(
        400,
        "Blok filtre bilgileri geçersiz.",
        queryResult.error.flatten().fieldErrors
      );
    }

    const { siteId } = queryResult.data;

    const blocks = await prisma.block.findMany({
      where: siteId
        ? {
            siteId,
          }
        : undefined,
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
  asyncHandler(async (request: Request, response: Response) => {
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

    response.status(201).json({
      success: true,
      message: "Blok/Apartman başarıyla oluşturuldu.",
      data: block,
    });
  })
);

export default router;