import express, { type Response } from "express";

import prisma from "../db/prisma.js";
import { type Prisma } from "../generated/prisma/client.js";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";
import {
  getManagerScope,
  hasManagerScope,
} from "../services/manager-scope.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

type ManagerScope = Awaited<ReturnType<typeof getManagerScope>>;

function buildManagerSiteWhere(managerScope: ManagerScope) {
  const filters: Prisma.SiteWhereInput[] = [];

  if (managerScope.siteIds.length > 0) {
    filters.push({
      id: {
        in: managerScope.siteIds,
      },
    });
  }

  if (managerScope.blockIds.length > 0) {
    filters.push({
      blocks: {
        some: {
          id: {
            in: managerScope.blockIds,
          },
        },
      },
    });
  }

  return {
    OR: filters,
  } satisfies Prisma.SiteWhereInput;
}

function buildManagerBlockWhere(managerScope: ManagerScope) {
  const filters: Prisma.BlockWhereInput[] = [];

  if (managerScope.siteIds.length > 0) {
    filters.push({
      siteId: {
        in: managerScope.siteIds,
      },
    });
  }

  if (managerScope.blockIds.length > 0) {
    filters.push({
      id: {
        in: managerScope.blockIds,
      },
    });
  }

  return {
    OR: filters,
  } satisfies Prisma.BlockWhereInput;
}

function buildManagerApartmentWhere(managerScope: ManagerScope) {
  return {
    OR: [
      {
        blockId: {
          in: managerScope.blockIds,
        },
      },
      {
        block: {
          siteId: {
            in: managerScope.siteIds,
          },
        },
      },
    ],
  } satisfies Prisma.ApartmentWhereInput;
}

function buildManagerAllocationWhere(managerScope: ManagerScope) {
  return {
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
  } satisfies Prisma.PaymentAllocationWhereInput;
}

function buildManagerRequestWhere(managerScope: ManagerScope) {
  return {
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
  } satisfies Prisma.ResidentRequestWhereInput;
}

function buildActiveAllocationWhere(
  baseWhere: Prisma.PaymentAllocationWhereInput = {}
) {
  return {
    AND: [
      baseWhere,
      {
        status: {
          in: ["PENDING", "PAID"],
        },
      },
    ],
  } satisfies Prisma.PaymentAllocationWhereInput;
}

function buildPendingAllocationWhere(
  baseWhere: Prisma.PaymentAllocationWhereInput = {}
) {
  return {
    AND: [
      baseWhere,
      {
        status: "PENDING",
      },
    ],
  } satisfies Prisma.PaymentAllocationWhereInput;
}

function buildPaidAllocationWhere(
  baseWhere: Prisma.PaymentAllocationWhereInput = {}
) {
  return {
    AND: [
      baseWhere,
      {
        status: "PAID",
      },
    ],
  } satisfies Prisma.PaymentAllocationWhereInput;
}

function buildOverdueAllocationWhere(
  now: Date,
  baseWhere: Prisma.PaymentAllocationWhereInput = {}
) {
  return {
    AND: [
      buildPendingAllocationWhere(baseWhere),
      {
        paymentBatch: {
          dueDate: {
            lt: now,
          },
        },
      },
    ],
  } satisfies Prisma.PaymentAllocationWhereInput;
}

router.get(
  "/super-admin",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const now = new Date();

    const [
      sitesCount,
      blocksCount,
      apartmentsCount,
      usersCount,
      superAdminsCount,
      managersCount,
      residentsCount,
      paymentBatchesCount,
      paymentAllocationsCount,
      pendingAllocationsCount,
      paidAllocationsCount,
      overdueAllocationsCount,
      residentRequestsCount,
      openRequestsCount,
      notificationLogsCount,
      pendingNotificationsCount,
      sentNotificationsCount,
      failedNotificationsCount,
    ] = await Promise.all([
      prisma.site.count(),
      prisma.block.count(),
      prisma.apartment.count(),
      prisma.user.count(),
      prisma.user.count({ where: { role: "SUPER_ADMIN" } }),
      prisma.user.count({ where: { role: "MANAGER" } }),
      prisma.user.count({ where: { role: "RESIDENT" } }),
      prisma.paymentBatch.count({
        where: {
          allocations: {
            some: buildActiveAllocationWhere(),
          },
        },
      }),
      prisma.paymentAllocation.count({
        where: buildActiveAllocationWhere(),
      }),
      prisma.paymentAllocation.count({
        where: buildPendingAllocationWhere(),
      }),
      prisma.paymentAllocation.count({
        where: buildPaidAllocationWhere(),
      }),
      prisma.paymentAllocation.count({
        where: buildOverdueAllocationWhere(now),
      }),
      prisma.residentRequest.count(),
      prisma.residentRequest.count({ where: { status: "OPEN" } }),
      prisma.notificationLog.count(),
      prisma.notificationLog.count({ where: { status: "PENDING" } }),
      prisma.notificationLog.count({ where: { status: "SENT" } }),
      prisma.notificationLog.count({ where: { status: "FAILED" } }),
    ]);

    response.status(200).json({
      success: true,
      data: {
        sitesCount,
        blocksCount,
        apartmentsCount,
        usersCount,
        superAdminsCount,
        managersCount,
        residentsCount,
        paymentBatchesCount,
        paymentAllocationsCount,
        pendingAllocationsCount,
        paidAllocationsCount,
        overdueAllocationsCount,
        residentRequestsCount,
        openRequestsCount,
        notificationLogsCount,
        pendingNotificationsCount,
        sentNotificationsCount,
        failedNotificationsCount,
      },
    });
  })
);

router.get(
  "/manager",
  requireAuth,
  requireRole("MANAGER"),
  asyncHandler(async (request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const managerScope = await getManagerScope(authenticatedRequest.user.id);

    if (!hasManagerScope(managerScope)) {
      throw new HttpError(403, "Bu yöneticiye atanmış bir site veya blok bulunamadı.");
    }

    const now = new Date();

    const siteWhere = buildManagerSiteWhere(managerScope);
    const blockWhere = buildManagerBlockWhere(managerScope);
    const apartmentWhere = buildManagerApartmentWhere(managerScope);
    const allocationWhere = buildManagerAllocationWhere(managerScope);
    const requestWhere = buildManagerRequestWhere(managerScope);

    const paymentBatchWhere: Prisma.PaymentBatchWhereInput = {
      allocations: {
        some: buildActiveAllocationWhere(allocationWhere),
      },
    };

    const [
      assignedSitesCount,
      assignedBlocksCount,
      apartmentsCount,
      residentsCount,
      paymentBatchesCount,
      paymentAllocationsCount,
      pendingAllocationsCount,
      paidAllocationsCount,
      overdueAllocationsCount,
      residentRequestsCount,
      openRequestsCount,
      notificationLogsCount,
      pendingNotificationsCount,
      sentNotificationsCount,
      failedNotificationsCount,
    ] = await Promise.all([
      prisma.site.count({ where: siteWhere }),
      prisma.block.count({ where: blockWhere }),
      prisma.apartment.count({ where: apartmentWhere }),
      prisma.user.count({
        where: {
          role: "RESIDENT",
          apartmentResidents: {
            some: {
              apartment: apartmentWhere,
            },
          },
        },
      }),
      prisma.paymentBatch.count({ where: paymentBatchWhere }),
      prisma.paymentAllocation.count({
        where: buildActiveAllocationWhere(allocationWhere),
      }),
      prisma.paymentAllocation.count({
        where: buildPendingAllocationWhere(allocationWhere),
      }),
      prisma.paymentAllocation.count({
        where: buildPaidAllocationWhere(allocationWhere),
      }),
      prisma.paymentAllocation.count({
        where: buildOverdueAllocationWhere(now, allocationWhere),
      }),
      prisma.residentRequest.count({ where: requestWhere }),
      prisma.residentRequest.count({
        where: {
          AND: [requestWhere, { status: "OPEN" }],
        },
      }),
      prisma.notificationLog.count({
        where: {
          createdByUserId: authenticatedRequest.user.id,
        },
      }),
      prisma.notificationLog.count({
        where: {
          createdByUserId: authenticatedRequest.user.id,
          status: "PENDING",
        },
      }),
      prisma.notificationLog.count({
        where: {
          createdByUserId: authenticatedRequest.user.id,
          status: "SENT",
        },
      }),
      prisma.notificationLog.count({
        where: {
          createdByUserId: authenticatedRequest.user.id,
          status: "FAILED",
        },
      }),
    ]);

    response.status(200).json({
      success: true,
      data: {
        assignedSitesCount,
        assignedBlocksCount,
        apartmentsCount,
        residentsCount,
        paymentBatchesCount,
        paymentAllocationsCount,
        pendingAllocationsCount,
        paidAllocationsCount,
        overdueAllocationsCount,
        residentRequestsCount,
        openRequestsCount,
        notificationLogsCount,
        pendingNotificationsCount,
        sentNotificationsCount,
        failedNotificationsCount,
      },
    });
  })
);

router.get(
  "/resident",
  requireAuth,
  requireRole("RESIDENT"),
  asyncHandler(async (request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const residentUserId = authenticatedRequest.user.id;
    const now = new Date();

    const residentApartmentWhere = {
      residents: {
        some: {
          userId: residentUserId,
        },
      },
    } satisfies Prisma.ApartmentWhereInput;

    const residentAllocationWhere = {
      apartment: residentApartmentWhere,
    } satisfies Prisma.PaymentAllocationWhereInput;

    const residentRequestWhere = {
      AND: [
        {
          createdByUserId: residentUserId,
        },
        {
          apartment: residentApartmentWhere,
        },
      ],
    } satisfies Prisma.ResidentRequestWhereInput;

    const [
      apartmentsCount,
      paymentBatchesCount,
      paymentAllocationsCount,
      pendingAllocationsCount,
      paidAllocationsCount,
      overdueAllocationsCount,
      totalDebtAggregation,
      paidTotalAggregation,
      remainingDebtAggregation,
      residentRequestsCount,
      openRequestsCount,
      notificationLogsCount,
      pendingNotificationsCount,
      sentNotificationsCount,
      failedNotificationsCount,
    ] = await Promise.all([
      prisma.apartment.count({
        where: residentApartmentWhere,
      }),
      prisma.paymentBatch.count({
        where: {
          allocations: {
            some: buildActiveAllocationWhere(residentAllocationWhere),
          },
        },
      }),
      prisma.paymentAllocation.count({
        where: buildActiveAllocationWhere(residentAllocationWhere),
      }),
      prisma.paymentAllocation.count({
        where: buildPendingAllocationWhere(residentAllocationWhere),
      }),
      prisma.paymentAllocation.count({
        where: buildPaidAllocationWhere(residentAllocationWhere),
      }),
      prisma.paymentAllocation.count({
        where: buildOverdueAllocationWhere(now, residentAllocationWhere),
      }),
      prisma.paymentAllocation.aggregate({
        where: buildActiveAllocationWhere(residentAllocationWhere),
        _sum: {
          amountKurus: true,
        },
      }),
      prisma.paymentAllocation.aggregate({
        where: buildPaidAllocationWhere(residentAllocationWhere),
        _sum: {
          amountKurus: true,
        },
      }),
      prisma.paymentAllocation.aggregate({
        where: buildPendingAllocationWhere(residentAllocationWhere),
        _sum: {
          amountKurus: true,
        },
      }),
      prisma.residentRequest.count({
        where: residentRequestWhere,
      }),
      prisma.residentRequest.count({
        where: {
          AND: [residentRequestWhere, { status: "OPEN" }],
        },
      }),
      prisma.notificationLog.count({
        where: {
          recipientUserId: residentUserId,
        },
      }),
      prisma.notificationLog.count({
        where: {
          recipientUserId: residentUserId,
          status: "PENDING",
        },
      }),
      prisma.notificationLog.count({
        where: {
          recipientUserId: residentUserId,
          status: "SENT",
        },
      }),
      prisma.notificationLog.count({
        where: {
          recipientUserId: residentUserId,
          status: "FAILED",
        },
      }),
    ]);

    response.status(200).json({
      success: true,
      data: {
        apartmentsCount,
        paymentBatchesCount,
        paymentAllocationsCount,
        pendingAllocationsCount,
        paidAllocationsCount,
        overdueAllocationsCount,
        totalDebtKurus: totalDebtAggregation._sum?.amountKurus ?? 0,
        paidTotalKurus: paidTotalAggregation._sum?.amountKurus ?? 0,
        remainingDebtKurus: remainingDebtAggregation._sum?.amountKurus ?? 0,
        residentRequestsCount,
        openRequestsCount,
        notificationLogsCount,
        pendingNotificationsCount,
        sentNotificationsCount,
        failedNotificationsCount,
      },
    });
  })
);

export default router;
