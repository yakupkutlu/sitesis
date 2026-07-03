import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

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
  apartmentIds: z.array(z.string().uuid()).default([]),
  exemptApartmentIds: z.array(z.string().uuid()).default([]),
  dueDate: z.string().datetime(),
});

function getDistributedAmounts(totalAmountKurus: number, count: number) {
  const baseAmount = Math.floor(totalAmountKurus / count);
  const remainder = totalAmountKurus % count;

  return Array.from({ length: count }, (_item, index) => {
    return baseAmount + (index < remainder ? 1 : 0);
  });
}

router.get("/", async (_request: Request, response: Response) => {
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
        },
      },
      allocations: {
        include: {
          apartment: {
            select: {
              id: true,
              number: true,
              floor: true,
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
});

router.post("/", async (request: Request, response: Response) => {
  const validationResult = createPaymentBatchSchema.safeParse(request.body);

  if (!validationResult.success) {
    response.status(400).json({
      success: false,
      message: "Gönderilen ödeme bilgileri geçersiz.",
      errors: validationResult.error.flatten().fieldErrors,
    });
    return;
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

  let targetApartments: Array<{ id: string }> = [];

  if (scopeType === "SITE") {
    if (!siteId) {
      response.status(400).json({
        success: false,
        message: "Site kapsamı için siteId zorunludur.",
      });
      return;
    }

    targetApartments = await prisma.apartment.findMany({
      where: {
        block: {
          siteId,
        },
      },
      select: {
        id: true,
      },
    });
  }

  if (scopeType === "BLOCK") {
    if (!blockId) {
      response.status(400).json({
        success: false,
        message: "Blok kapsamı için blockId zorunludur.",
      });
      return;
    }

    targetApartments = await prisma.apartment.findMany({
      where: {
        blockId,
      },
      select: {
        id: true,
      },
    });
  }

  if (scopeType === "APARTMENTS") {
    if (apartmentIds.length === 0) {
      response.status(400).json({
        success: false,
        message: "Belirli daireler kapsamı için en az bir daire seçilmelidir.",
      });
      return;
    }

    targetApartments = await prisma.apartment.findMany({
      where: {
        id: {
          in: apartmentIds,
        },
      },
      select: {
        id: true,
      },
    });
  }

  if (targetApartments.length === 0) {
    response.status(400).json({
      success: false,
      message: "Ödeme için uygun daire bulunamadı.",
    });
    return;
  }

  const targetApartmentIds = [...new Set(targetApartments.map((apartment) => apartment.id))];
  const targetApartmentIdSet = new Set(targetApartmentIds);

  const uniqueExemptApartmentIds = [...new Set(exemptApartmentIds)];

  const invalidExemptApartmentIds = uniqueExemptApartmentIds.filter((apartmentId) => {
    return !targetApartmentIdSet.has(apartmentId);
  });

  if (invalidExemptApartmentIds.length > 0) {
    response.status(400).json({
      success: false,
      message: "Muaf seçilen dairelerden bazıları ödeme kapsamı içinde değil.",
    });
    return;
  }

  const payableApartmentIds = targetApartmentIds.filter((apartmentId) => {
    return !uniqueExemptApartmentIds.includes(apartmentId);
  });

  if (payableApartmentIds.length === 0) {
    response.status(400).json({
      success: false,
      message: "Muaf dairelerden sonra ödeme atanacak daire kalmadı.",
    });
    return;
  }

  const distributedAmounts = getDistributedAmounts(totalAmountKurus, payableApartmentIds.length);

  const paymentBatch = await prisma.paymentBatch.create({
    data: {
      title,
      description,
      totalAmountKurus,
      scopeType,
      dueDate: new Date(dueDate),
      siteId: scopeType === "SITE" ? siteId : undefined,
      blockId: scopeType === "BLOCK" ? blockId : undefined,
      exemptions: {
        create: uniqueExemptApartmentIds.map((apartmentId) => ({
          apartmentId,
        })),
      },
      allocations: {
        create: payableApartmentIds.map((apartmentId, index) => ({
          apartmentId,
          amountKurus: distributedAmounts[index],
        })),
      },
    },
    include: {
      allocations: {
        include: {
          apartment: {
            select: {
              id: true,
              number: true,
              floor: true,
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
            },
          },
        },
      },
    },
  });

  response.status(201).json({
    success: true,
    message: "Ödeme başarıyla oluşturuldu ve dairelere dağıtıldı.",
    data: paymentBatch,
  });
});

const paymentAllocationParamsSchema = z.object({
  allocationId: z.string().uuid(),
});

router.patch("/allocations/:allocationId/pay", async (request: Request, response: Response) => {
  const paramsResult = paymentAllocationParamsSchema.safeParse(request.params);

  if (!paramsResult.success) {
    response.status(400).json({
      success: false,
      message: "Ödeme kaydı bilgisi geçersiz.",
    });
    return;
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
    response.status(404).json({
      success: false,
      message: "Ödeme kaydı bulunamadı.",
    });
    return;
  }

  if (allocation.status === "PAID") {
    response.status(409).json({
      success: false,
      message: "Bu ödeme zaten ödenmiş.",
    });
    return;
  }

  if (allocation.status === "CANCELLED") {
    response.status(400).json({
      success: false,
      message: "İptal edilmiş ödeme ödenmiş olarak işaretlenemez.",
    });
    return;
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
        select: {
          id: true,
          number: true,
          floor: true,
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
      paymentBatch: {
        select: {
          id: true,
          title: true,
          totalAmountKurus: true,
          dueDate: true,
        },
      },
    },
  });

  response.status(200).json({
    success: true,
    message: "Ödeme başarıyla ödenmiş olarak işaretlendi.",
    data: updatedAllocation,
  });
});

export default router;