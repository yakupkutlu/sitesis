import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

const createApartmentSchema = z.object({
  number: z.string().trim().min(1),
  floor: z.number().int().optional(),
  description: z.string().trim().optional(),
  blockId: z.string().uuid(),
});

router.get("/", async (request: Request, response: Response) => {
  const blockId = typeof request.query.blockId === "string" ? request.query.blockId : undefined;

  const apartments = await prisma.apartment.findMany({
    where: blockId
      ? {
          blockId,
        }
      : undefined,
    include: {
      block: {
        select: {
          id: true,
          name: true,
          site: {
            select: {
              id: true,
              name: true,
            },
          },
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
});

router.post("/", async (request: Request, response: Response) => {
  const validationResult = createApartmentSchema.safeParse(request.body);

  if (!validationResult.success) {
    response.status(400).json({
      success: false,
      message: "Gönderilen daire bilgileri geçersiz.",
      errors: validationResult.error.flatten().fieldErrors,
    });
    return;
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
    response.status(404).json({
      success: false,
      message: "Blok bulunamadı.",
    });
    return;
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
    response.status(409).json({
      success: false,
      message: "Bu blok içinde aynı daire numarası zaten var.",
    });
    return;
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
            },
          },
        },
      },
    },
  });

  response.status(201).json({
    success: true,
    message: "Daire başarıyla oluşturuldu.",
    data: apartment,
  });
});

export default router;