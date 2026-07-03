import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import {
  distributeAmountToApartments,
  excludeExemptApartments,
  findInvalidExemptApartments,
} from "../services/payment-distribution.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

const createPaymentBatchSchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().optional(),
  totalAmountKurus: z.number().int().positive(),
  scopeType: z.enum(["SITE", "BLOCK", "APARTMENTS"]),
  siteId: z.string().uuid().optional(),
  blockId: z.string().uuid().optional(),
  apartmentIds: z.array(z.string().uuid()).optional(),
  exemptApartmentIds: z.array(z.string().uuid()).optional().default([]),
  dueDate: z.coerce.date(),
});

const allocationParamsSchema = z.object({
  allocationId: z.string().uuid(),
});

function getUniqueIds(ids: string[] = []) {
  return Array.from(new Set(ids));
}

router.get(
  "/",
  asyncHandler(async (_request: Request, response: Response) => {
    const paymentBatches = await prisma.paymentBatch.findMany({
      include: {
        site: {
          select: {
            id: true,
            name: true,
          },
        },
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
        allocations: {
          include: {
            apartment: {
              select: {
                id: true,
                number: true,
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
            },
          },
        },
        exemptions: {
          include: {
            apartment: {
              select: {
                id: true,
                number: true,
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
      data: paymentBatches,
    });
  })
);

router.post(
  "/",
  asyncHandler(async (request: Request, response: Response) => {
    const validationResult = createPaymentBatchSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen ödeme bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const {
      title,
      description,
      totalAmountKurus,
      scopeType,
      siteId,
      blockId,
      apartmentIds,
      exemptApartmentIds,
      dueDate,
    } = validationResult.data;

    let scopedApartmentIds: string[] = [];
    let paymentBatchSiteId: string | undefined;
    let paymentBatchBlockId: string | undefined;

    if (scopeType === "SITE") {
      if (!siteId) {
        throw new HttpError(400, "Site seçimi zorunludur.");
      }

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

      const apartments = await prisma.apartment.findMany({
        where: {
          block: {
            siteId,
          },
        },
        select: {
          id: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      scopedApartmentIds = apartments.map((apartment) => apartment.id);
      paymentBatchSiteId = siteId;
    }

    if (scopeType === "BLOCK") {
      if (!blockId) {
        throw new HttpError(400, "Blok/Apartman seçimi zorunludur.");
      }

      const block = await prisma.block.findUnique({
        where: {
          id: blockId,
        },
        select: {
          id: true,
          siteId: true,
        },
      });

      if (!block) {
        throw new HttpError(404, "Blok/Apartman bulunamadı.");
      }

      const apartments = await prisma.apartment.findMany({
        where: {
          blockId,
        },
        select: {
          id: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      scopedApartmentIds = apartments.map((apartment) => apartment.id);
      paymentBatchSiteId = block.siteId;
      paymentBatchBlockId = blockId;
    }

    if (scopeType === "APARTMENTS") {
      const uniqueApartmentIds = getUniqueIds(apartmentIds);

      if (uniqueApartmentIds.length === 0) {
        throw new HttpError(400, "En az bir daire seçilmelidir.");
      }

      const apartments = await prisma.apartment.findMany({
        where: {
          id: {
            in: uniqueApartmentIds,
          },
        },
        select: {
          id: true,
        },
      });

      if (apartments.length !== uniqueApartmentIds.length) {
        throw new HttpError(404, "Seçilen dairelerden bazıları bulunamadı.");
      }

      scopedApartmentIds = apartments.map((apartment) => apartment.id);
    }

    if (scopedApartmentIds.length === 0) {
      throw new HttpError(400, "Ödeme oluşturulacak daire bulunamadı.");
    }

    const uniqueExemptApartmentIds = getUniqueIds(exemptApartmentIds);

    const invalidExemptApartmentIds = findInvalidExemptApartments(
      scopedApartmentIds,
      uniqueExemptApartmentIds
    );

    if (invalidExemptApartmentIds.length > 0) {
      throw new HttpError(400, "Muaf seçilen daireler ödeme kapsamı içinde değil.", {
        exemptApartmentIds: invalidExemptApartmentIds,
      });
    }

    const payableApartmentIds = excludeExemptApartments(
      scopedApartmentIds,
      uniqueExemptApartmentIds
    );

    if (payableApartmentIds.length === 0) {
      throw new HttpError(400, "Muaf olmayan en az bir daire bulunmalıdır.");
    }

    const distributions = distributeAmountToApartments(
      totalAmountKurus,
      payableApartmentIds
    );

    const paymentBatch = await prisma.paymentBatch.create({
      data: {
        title,
        description,
        totalAmountKurus,
        scopeType,
        dueDate,
        siteId: paymentBatchSiteId,
        blockId: paymentBatchBlockId,
        exemptions: {
          create: uniqueExemptApartmentIds.map((apartmentId) => {
            return {
              apartmentId,
            };
          }),
        },
        allocations: {
          create: distributions.map((distribution) => {
            return {
              apartmentId: distribution.apartmentId,
              amountKurus: distribution.amountKurus,
            };
          }),
        },
      },
      include: {
        allocations: true,
        exemptions: true,
      },
    });

    response.status(201).json({
      success: true,
      message: "Ödeme başarıyla oluşturuldu.",
      data: paymentBatch,
    });
  })
);

router.patch(
  "/allocations/:allocationId/pay",
  asyncHandler(async (request: Request, response: Response) => {
    const paramsResult = allocationParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throw new HttpError(400, "Ödeme kaydı bilgisi geçersiz.");
    }

    const { allocationId } = paramsResult.data;

    const allocation = await prisma.paymentAllocation.findUnique({
      where: {
        id: allocationId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!allocation) {
      throw new HttpError(404, "Ödeme kaydı bulunamadı.");
    }

    if (allocation.status === "PAID") {
      throw new HttpError(409, "Bu ödeme zaten ödenmiş.");
    }

    if (allocation.status === "CANCELLED") {
      throw new HttpError(400, "İptal edilmiş ödeme ödenmiş olarak işaretlenemez.");
    }

    const updatedAllocation = await prisma.paymentAllocation.update({
      where: {
        id: allocationId,
      },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
      include: {
        apartment: {
          include: {
            block: {
              include: {
                site: true,
              },
            },
          },
        },
        paymentBatch: true,
      },
    });

    response.status(200).json({
      success: true,
      message: "Ödeme ödenmiş olarak işaretlendi.",
      data: updatedAllocation,
    });
  })
);

export default router;