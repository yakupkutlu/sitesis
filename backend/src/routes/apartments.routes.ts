import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

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
  asyncHandler(async (request: Request, response: Response) => {
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

    response.status(201).json({
      success: true,
      message: "Daire başarıyla oluşturuldu.",
      data: apartment,
    });
  })
);

export default router;