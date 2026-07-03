import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

const createSiteSchema = z.object({
  name: z.string().trim().min(2),
  address: z.string().trim().min(2),
  description: z.string().trim().optional(),
  imageUrl: z.string().trim().url().optional(),
  hasElevator: z.boolean().optional().default(false),
  systems: z.array(z.string().trim().min(1)).optional().default([]),
});

router.get(
  "/",
  asyncHandler(async (_request: Request, response: Response) => {
    const sites = await prisma.site.findMany({
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
    });

    response.status(200).json({
      success: true,
      data: sites,
    });
  })
);

router.post(
  "/",
  asyncHandler(async (request: Request, response: Response) => {
    const validationResult = createSiteSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen site bilgileri geçersiz.",
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

    response.status(201).json({
      success: true,
      message: "Site başarıyla oluşturuldu.",
      data: site,
    });
  })
);

export default router;