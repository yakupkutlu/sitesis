import express, { type Request, type Response } from "express";

import prisma from "../db/prisma.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

router.get(
  "/dashboard-summary",
  asyncHandler(async (_request: Request, response: Response) => {
    const [
      siteCount,
      blockCount,
      apartmentCount,
      userCount,
      managerCount,
      residentCount,
      pendingReceiptCount,
      paymentAllocations,
    ] = await Promise.all([
      prisma.site.count(),
      prisma.block.count(),
      prisma.apartment.count(),
      prisma.user.count(),
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
      prisma.paymentReceipt.count({
        where: {
          status: "PENDING",
        },
      }),
      prisma.paymentAllocation.findMany({
        select: {
          amountKurus: true,
          status: true,
          paymentBatch: {
            select: {
              dueDate: true,
            },
          },
        },
      }),
    ]);

    const now = new Date();

    let totalDebtKurus = 0;
    let paidAmountKurus = 0;
    let remainingAmountKurus = 0;
    let overduePaymentCount = 0;

    for (const allocation of paymentAllocations) {
      if (allocation.status !== "CANCELLED") {
        totalDebtKurus += allocation.amountKurus;
      }

      if (allocation.status === "PAID") {
        paidAmountKurus += allocation.amountKurus;
      }

      if (allocation.status === "PENDING") {
        remainingAmountKurus += allocation.amountKurus;

        if (allocation.paymentBatch.dueDate < now) {
          overduePaymentCount += 1;
        }
      }
    }

    response.status(200).json({
      success: true,
      data: {
        siteCount,
        blockCount,
        apartmentCount,
        userCount,
        managerCount,
        residentCount,
        totalPaymentCount: paymentAllocations.length,
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