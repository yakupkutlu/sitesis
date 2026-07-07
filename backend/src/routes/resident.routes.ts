import express, { type Request, type Response } from "express";

import prisma from "../db/prisma.js";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("RESIDENT"));

router.get(
  "/payments",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const payments = await prisma.paymentAllocation.findMany({
      where: {
        apartment: {
          residents: {
            some: {
              userId: authenticatedRequest.user.id,
            },
          },
        },
      },
      include: {
        paymentBatch: {
          select: {
            id: true,
            title: true,
            description: true,
            totalAmountKurus: true,
            scopeType: true,
            dueDate: true,
            createdAt: true,
          },
        },
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
                    address: true,
                  },
                },
              },
            },
          },
        },
        receipts: {
          select: {
            id: true,
            originalFileName: true,
            mimeType: true,
            sizeBytes: true,
            status: true,
            note: true,
            reviewNote: true,
            reviewedAt: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    response.status(200).json({
      success: true,
      data: payments,
    });
  })
);

router.get(
  "/apartments",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const apartments = await prisma.apartmentResident.findMany({
      where: {
        userId: authenticatedRequest.user.id,
      },
      include: {
        apartment: {
          select: {
            id: true,
            number: true,
            floor: true,
            description: true,
            block: {
              select: {
                id: true,
                name: true,
                description: true,
                site: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                    description: true,
                    hasElevator: true,
                    systems: true,
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
      data: apartments,
    });
  })
);

router.get(
  "/dashboard-summary",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const payments = await prisma.paymentAllocation.findMany({
      where: {
        apartment: {
          residents: {
            some: {
              userId: authenticatedRequest.user.id,
            },
          },
        },
      },
      select: {
        id: true,
        amountKurus: true,
        status: true,
        apartmentId: true,
        paymentBatch: {
          select: {
            dueDate: true,
          },
        },
        receipts: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const apartmentIds = new Set<string>();
    const now = new Date();

    let totalDebtKurus = 0;
    let paidAmountKurus = 0;
    let remainingAmountKurus = 0;
    let overduePaymentCount = 0;
    let pendingReceiptCount = 0;

    for (const payment of payments) {
      apartmentIds.add(payment.apartmentId);

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

      pendingReceiptCount += payment.receipts.filter((receipt) => {
        return receipt.status === "PENDING";
      }).length;
    }

    response.status(200).json({
      success: true,
      data: {
        apartmentCount: apartmentIds.size,
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
