import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

const createBlockSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  siteId: z.string().uuid(),
});

router.get("/", async (request: Request, response: Response) => {
  const siteId = typeof request.query.siteId === "string" ? request.query.siteId : undefined;

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
});

router.post("/", async (request: Request, response: Response) => {
  const validationResult = createBlockSchema.safeParse(request.body);

  if (!validationResult.success) {
    response.status(400).json({
      success: false,
      message: "Gönderilen blok bilgileri geçersiz.",
      errors: validationResult.error.flatten().fieldErrors,
    });
    return;
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
    response.status(404).json({
      success: false,
      message: "Site bulunamadı.",
    });
    return;
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
        },
      },
    },
  });

  response.status(201).json({
    success: true,
    message: "Blok başarıyla oluşturuldu.",
    data: block,
  });
});

export default router;