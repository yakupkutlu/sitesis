import express, { type Request, type Response } from "express";

import prisma from "../db/prisma.js";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";
import {
  getManagerScope,
  hasManagerScope,
  type ManagerScope,
} from "../services/manager-scope.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("MANAGER"));

function buildManagerApartmentWhere(managerScope: ManagerScope) {
  const filters = [];

  if (managerScope.blockIds.length > 0) {
    filters.push({
      blockId: {
        in: managerScope.blockIds,
      },
    });
  }

  if (managerScope.siteIds.length > 0) {
    filters.push({
      block: {
        siteId: {
          in: managerScope.siteIds,
        },
      },
    });
  }

  return {
    OR: filters,
  };
}

router.get(
  "/dashboard-summary",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const managerScope = await getManagerScope(authenticatedRequest.user.id);

    if (!hasManagerScope(managerScope)) {
      throw new HttpError(403, "Bu yöneticiye atanmış bir site veya blok bulunamadı.");
    }

    const apartmentWhere = buildManagerApartmentWhere(managerScope);

    const apartmentCount = await prisma.apartment.count({
      where: apartmentWhere,
    });

    const residentCount = await prisma.apartmentResident.count({
      where: {
        apartment: apartmentWhere,
      },
    });

    const pendingReceiptCount = await prisma.paymentReceipt.count({
      where: {
        status: "PENDING",
        paymentAllocation: {
          apartment: apartmentWhere,
        },
      },
    });

    const payments = await prisma.paymentAllocation.findMany({
      where: {
        apartment: apartmentWhere,
      },
      select: {
        amountKurus: true,
        status: true,
        paymentBatch: {
          select: {
            dueDate: true,
          },
        },
      },
    });

    const now = new Date();

    let totalDebtKurus = 0;
    let paidAmountKurus = 0;
    let remainingAmountKurus = 0;
    let overduePaymentCount = 0;

    for (const payment of payments) {
      if (payment.status !== "CANCELLED") {
        totalDebtKurus += payment.amountKurus;
      }

      if (payment.status === "PAID") {
        paidAmountKurus += payment.amountKurus;
      }

      if (payment.status === "PENDING") {
        remainingAmountKurus += payment.amountKurus;

        if (payment.paymentBatch.dueDate < now) {
          overduePaymentCount += 1;
        }
      }
    }

    response.status(200).json({
      success: true,
      data: {
        assignedSiteCount: managerScope.siteIds.length,
        assignedBlockCount: managerScope.blockIds.length,
        apartmentCount,
        residentCount,
        totalPaymentCount: payments.length,
        totalDebtKurus,
        paidAmountKurus,
        remainingAmountKurus,
        overduePaymentCount,
        pendingReceiptCount,
      },
    });
  })
);

export default router;