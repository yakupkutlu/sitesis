import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import { type Prisma } from "../generated/prisma/client.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

const auditLogQuerySchema = z.object({
  action: z.string().trim().optional(),
  entityType: z.string().trim().optional(),
  userId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

router.get(
  "/",
  asyncHandler(async (request: Request, response: Response) => {
    const queryResult = auditLogQuerySchema.safeParse(request.query);

    if (!queryResult.success) {
      throw new HttpError(
        400,
        "Audit log filtre bilgileri geçersiz.",
        queryResult.error.flatten().fieldErrors
      );
    }

    const { action, entityType, userId, page, limit } = queryResult.data;

    const whereCondition: Prisma.AuditLogWhereInput = {
      ...(action ? { action } : {}),
      ...(entityType ? { entityType } : {}),
      ...(userId ? { userId } : {}),
    };

    const [totalCount, auditLogs] = await Promise.all([
      prisma.auditLog.count({
        where: whereCondition,
      }),
      prisma.auditLog.findMany({
        where: whereCondition,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    response.status(200).json({
      success: true,
      data: auditLogs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  })
);

export default router;
