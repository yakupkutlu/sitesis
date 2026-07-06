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
      prisma.user.count({
        where: {
          role: "SUPER_ADMIN",
        },
      }),
      prisma.user.count({
        where: {
          role: "MANAGER",
        },
      }),
      prisma.user.count({
        where: {
          role: "RESIDENT",
        },
      }),
      prisma.paymentBatch.count(),
      prisma.paymentAllocation.count(),
      prisma.paymentAllocation.count({
        where: {
          status: "PENDING",
        },
      }),
      prisma.paymentAllocation.count({
        where: {
          status: "PAID",
        },
      }),
      prisma.paymentAllocation.count({
        where: {
          status: "PENDING",
          paymentBatch: {
            dueDate: {
              lt: now,
            },
          },
        },
      }),
      prisma.residentRequest.count(),
      prisma.residentRequest.count({
        where: {
          status: "OPEN",
        },
      }),
      prisma.notificationLog.count(),
      prisma.notificationLog.count({
        where: {
          status: "PENDING",
        },
      }),
      prisma.notificationLog.count({
        where: {
          status: "SENT",
        },
      }),
      prisma.notificationLog.count({
        where: {
          status: "FAILED",
        },
      }),
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
        some: allocationWhere,
        every: allocationWhere,
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
      prisma.site.count({
        where: siteWhere,
      }),
      prisma.block.count({
        where: blockWhere,
      }),
      prisma.apartment.count({
        where: apartmentWhere,
      }),
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
      prisma.paymentBatch.count({
        where: paymentBatchWhere,
      }),
      prisma.paymentAllocation.count({
        where: allocationWhere,
      }),
      prisma.paymentAllocation.count({
        where: {
          AND: [
            allocationWhere,
            {
              status: "PENDING",
            },
          ],
        },
      }),
      prisma.paymentAllocation.count({
        where: {
          AND: [
            allocationWhere,
            {
              status: "PAID",
            },
          ],
        },
      }),
      prisma.paymentAllocation.count({
        where: {
          AND: [
            allocationWhere,
            {
              status: "PENDING",
              paymentBatch: {
                dueDate: {
                  lt: now,
                },
              },
            },
          ],
        },
      }),
      prisma.residentRequest.count({
        where: requestWhere,
      }),
      prisma.residentRequest.count({
        where: {
          AND: [
            requestWhere,
            {
              status: "OPEN",
            },
          ],
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

export default router;
