import express, { type Response } from "express";

import prisma from "../db/prisma.js";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

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

export default router;
