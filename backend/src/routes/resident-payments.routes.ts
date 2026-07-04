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

export default router;