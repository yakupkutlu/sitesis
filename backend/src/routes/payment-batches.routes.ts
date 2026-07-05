import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import { type Prisma } from "../generated/prisma/client.js";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
  type AuthenticatedUser,
} from "../middlewares/auth.middleware.js";
import { createAuditLog } from "../services/audit-log.service.js";
import { getManagerScope, hasManagerScope } from "../services/manager-scope.service.js";
import {
  distributeAmountToApartments,
  excludeExemptApartments,
  findInvalidExemptApartments,
} from "../services/payment-distribution.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

router.use(requireAuth);

const paymentBatchInclude = {
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
} as const;

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

const updatePaymentBatchSchema = z
  .object({
    title: z.string().trim().min(2).optional(),
    description: z.string().trim().nullable().optional(),
    dueDate: z.coerce.date().optional(),
  })
  .strict()
  .refine(
    (data) => {
      return Object.values(data).some((value) => value !== undefined);
    },
    {
      message: "En az bir alan gönderilmelidir.",
    }
  );

const paymentBatchParamsSchema = z.object({
  paymentBatchId: z.string().uuid(),
});

const allocationParamsSchema = z.object({
  allocationId: z.string().uuid(),
});

function getUniqueIds(ids: string[] = []) {
  return Array.from(new Set(ids));
}

async function ensureManagerCanCreatePayment(params: {
  managerId: string;
  scopeType: "SITE" | "BLOCK" | "APARTMENTS";
  siteId?: string;
  apartmentIds: string[];
}) {
  const managerScope = await getManagerScope(params.managerId);

  if (!hasManagerScope(managerScope)) {
    throw new HttpError(403, "Bu yöneticiye atanmış bir site veya blok bulunamadı.");
  }

  if (params.scopeType === "SITE") {
    if (!params.siteId || !managerScope.siteIds.includes(params.siteId)) {
      throw new HttpError(403, "Bu site için ödeme oluşturma yetkiniz yok.");
    }
  }

  const apartments = await prisma.apartment.findMany({
    where: {
      id: {
        in: params.apartmentIds,
      },
    },
    select: {
      id: true,
      blockId: true,
      block: {
        select: {
          siteId: true,
        },
      },
    },
  });

  const inaccessibleApartment = apartments.find((apartment) => {
    const canAccessByBlock = managerScope.blockIds.includes(apartment.blockId);
    const canAccessBySite = managerScope.siteIds.includes(apartment.block.siteId);

    return !canAccessByBlock && !canAccessBySite;
  });

  if (inaccessibleApartment) {
    throw new HttpError(403, "Bu ödeme kapsamındaki bazı daireler için yetkiniz yok.");
  }
}

async function getPaymentBatchForManagement(paymentBatchId: string, user: AuthenticatedUser) {
  const paymentBatch = await prisma.paymentBatch.findUnique({
    where: {
      id: paymentBatchId,
    },
    include: {
      allocations: {
        select: {
          id: true,
          status: true,
          apartment: {
            select: {
              blockId: true,
              block: {
                select: {
                  siteId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!paymentBatch) {
    throw new HttpError(404, "Ödeme bulunamadı.");
  }

  if (user.role === "SUPER_ADMIN") {
    return paymentBatch;
  }

  const managerScope = await getManagerScope(user.id);

  if (!hasManagerScope(managerScope)) {
    throw new HttpError(403, "Bu yöneticiye atanmış bir site veya blok bulunamadı.");
  }

  const inaccessibleAllocation = paymentBatch.allocations.find((allocation) => {
    const canAccessByBlock = managerScope.blockIds.includes(allocation.apartment.blockId);
    const canAccessBySite = managerScope.siteIds.includes(allocation.apartment.block.siteId);

    return !canAccessByBlock && !canAccessBySite;
  });

  if (inaccessibleAllocation) {
    throw new HttpError(403, "Bu ödeme üzerinde işlem yapma yetkiniz yok.");
  }

  return paymentBatch;
}

router.get(
  "/",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    let whereCondition: Prisma.PaymentBatchWhereInput | undefined;

    if (authenticatedRequest.user.role === "MANAGER") {
      const managerScope = await getManagerScope(authenticatedRequest.user.id);

      if (!hasManagerScope(managerScope)) {
        throw new HttpError(403, "Bu yöneticiye atanmış bir site veya blok bulunamadı.");
      }

      const accessibleAllocationFilter: Prisma.PaymentAllocationWhereInput = {
        OR: [
          {
            apartment: {
              blockId: {
                in: managerScope.blockIds,
              },
            },
          },
          {
            apartment: {
              block: {
                siteId: {
                  in: managerScope.siteIds,
                },
              },
            },
          },
        ],
      };

      whereCondition = {
        allocations: {
          some: accessibleAllocationFilter,
          every: accessibleAllocationFilter,
        },
      };
    }

    const paymentBatches = await prisma.paymentBatch.findMany({
      where: whereCondition,
      include: paymentBatchInclude,
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
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

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

    if (authenticatedRequest.user.role === "MANAGER") {
      await ensureManagerCanCreatePayment({
        managerId: authenticatedRequest.user.id,
        scopeType,
        siteId,
        apartmentIds: scopedApartmentIds,
      });
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

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "CREATE_PAYMENT_BATCH",
      entityType: "PaymentBatch",
      entityId: paymentBatch.id,
      metadata: {
        title: paymentBatch.title,
        scopeType: paymentBatch.scopeType,
        totalAmountKurus: paymentBatch.totalAmountKurus,
        allocationCount: paymentBatch.allocations.length,
        exemptionCount: paymentBatch.exemptions.length,
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
  "/:paymentBatchId",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const paramsResult = paymentBatchParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throw new HttpError(400, "Ödeme bilgisi geçersiz.");
    }

    const { paymentBatchId } = paramsResult.data;

    const validationResult = updatePaymentBatchSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen ödeme güncelleme bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const targetPaymentBatch = await getPaymentBatchForManagement(
      paymentBatchId,
      authenticatedRequest.user
    );

    const { title, description, dueDate } = validationResult.data;

    const updateData: Prisma.PaymentBatchUpdateInput = {};

    if (title !== undefined) {
      updateData.title = title;
    }

    if (description !== undefined) {
      updateData.description = description && description.length > 0 ? description : null;
    }

    if (dueDate !== undefined) {
      updateData.dueDate = dueDate;
    }

    const updatedPaymentBatch = await prisma.paymentBatch.update({
      where: {
        id: paymentBatchId,
      },
      data: updateData,
      include: paymentBatchInclude,
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "UPDATE_PAYMENT_BATCH",
      entityType: "PaymentBatch",
      entityId: updatedPaymentBatch.id,
      metadata: {
        previous: {
          title: targetPaymentBatch.title,
          description: targetPaymentBatch.description,
          dueDate: targetPaymentBatch.dueDate,
        },
        current: {
          title: updatedPaymentBatch.title,
          description: updatedPaymentBatch.description,
          dueDate: updatedPaymentBatch.dueDate,
        },
      },
    });

    response.status(200).json({
      success: true,
      message: "Ödeme başarıyla güncellendi.",
      data: updatedPaymentBatch,
    });
  })
);

router.patch(
  "/:paymentBatchId/cancel",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const paramsResult = paymentBatchParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throw new HttpError(400, "Ödeme bilgisi geçersiz.");
    }

    const { paymentBatchId } = paramsResult.data;

    const targetPaymentBatch = await getPaymentBatchForManagement(
      paymentBatchId,
      authenticatedRequest.user
    );

    const hasPaidAllocation = targetPaymentBatch.allocations.some((allocation) => {
      return allocation.status === "PAID";
    });

    if (hasPaidAllocation) {
      throw new HttpError(400, "İçinde ödenmiş kayıt olan ödeme toplu olarak iptal edilemez.");
    }

    const pendingAllocationCount = targetPaymentBatch.allocations.filter((allocation) => {
      return allocation.status === "PENDING";
    }).length;

    if (pendingAllocationCount === 0) {
      throw new HttpError(409, "Bu ödeme zaten tamamen iptal edilmiş.");
    }

    const updatedPaymentBatch = await prisma.$transaction(async (transaction) => {
      await transaction.paymentAllocation.updateMany({
        where: {
          paymentBatchId,
          status: "PENDING",
        },
        data: {
          status: "CANCELLED",
        },
      });

      return transaction.paymentBatch.findUniqueOrThrow({
        where: {
          id: paymentBatchId,
        },
        include: paymentBatchInclude,
      });
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "CANCEL_PAYMENT_BATCH",
      entityType: "PaymentBatch",
      entityId: updatedPaymentBatch.id,
      metadata: {
        title: targetPaymentBatch.title,
        cancelledAllocationCount: pendingAllocationCount,
      },
    });

    response.status(200).json({
      success: true,
      message: "Ödeme başarıyla iptal edildi.",
      data: updatedPaymentBatch,
    });
  })
);

router.patch(
  "/allocations/:allocationId/pay",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

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

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "MARK_PAYMENT_ALLOCATION_PAID",
      entityType: "PaymentAllocation",
      entityId: updatedAllocation.id,
      metadata: {
        paymentBatchId: updatedAllocation.paymentBatchId,
        apartmentId: updatedAllocation.apartmentId,
        previousStatus: allocation.status,
        currentStatus: updatedAllocation.status,
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