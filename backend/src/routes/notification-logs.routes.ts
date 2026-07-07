import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import { type Prisma } from "../generated/prisma/client.js";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";
import { createAuditLog } from "../services/audit-log.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { buildPaginationMeta, getPaginationParams } from "../utils/pagination.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

const notificationLogInclude = {
  recipientUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
    },
  },
  createdByUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  },
} as const;

const notificationLogQuerySchema = z.object({
  channel: z.enum(["SMS", "EMAIL"]).optional(),
  status: z.enum(["PENDING", "SENT", "FAILED", "SKIPPED"]).optional(),
  sourceType: z
    .enum(["MANUAL", "PAYMENT_BATCH", "ANNOUNCEMENT", "RESIDENT_REQUEST", "SYSTEM"])
    .optional(),
  entityType: z.string().trim().optional(),
  entityId: z.string().trim().optional(),
  recipientUserId: z.string().uuid().optional(),
});

const createNotificationLogSchema = z.object({
  channel: z.enum(["SMS", "EMAIL"]),
  status: z.enum(["PENDING", "SENT", "FAILED", "SKIPPED"]).optional().default("PENDING"),
  sourceType: z
    .enum(["MANUAL", "PAYMENT_BATCH", "ANNOUNCEMENT", "RESIDENT_REQUEST", "SYSTEM"])
    .optional()
    .default("MANUAL"),

  recipientUserId: z.string().uuid().optional(),
  recipientEmail: z.string().trim().email().optional(),
  recipientPhone: z.string().trim().optional(),

  subject: z.string().trim().optional(),
  message: z.string().trim().min(1),

  provider: z.string().trim().optional(),
  providerMessageId: z.string().trim().optional(),

  entityType: z.string().trim().optional(),
  entityId: z.string().trim().optional(),

  errorMessage: z.string().trim().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const updateNotificationLogSchema = z
  .object({
    status: z.enum(["PENDING", "SENT", "FAILED", "SKIPPED"]).optional(),
    providerMessageId: z.string().trim().nullable().optional(),
    errorMessage: z.string().trim().nullable().optional(),
    sentAt: z.coerce.date().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "En az bir alan gönderilmelidir.",
  });

const notificationLogParamsSchema = z.object({
  notificationLogId: z.string().uuid(),
});

router.get(
  "/",
  asyncHandler(async (request: Request, response: Response) => {
    const queryResult = notificationLogQuerySchema.safeParse(request.query);

    if (!queryResult.success) {
      throw new HttpError(
        400,
        "Bildirim log filtre bilgileri geçersiz.",
        queryResult.error.flatten().fieldErrors
      );
    }

    const paginationParams = getPaginationParams(request.query);

    if (!paginationParams.success) {
      throw new HttpError(400, "Sayfalama bilgileri geçersiz.", paginationParams.errors);
    }

    const { channel, status, sourceType, entityType, entityId, recipientUserId } =
      queryResult.data;

    const searchCondition: Prisma.NotificationLogWhereInput = paginationParams.search
      ? {
          OR: [
            {
              recipientEmail: {
                contains: paginationParams.search,
                mode: "insensitive",
              },
            },
            {
              recipientPhone: {
                contains: paginationParams.search,
                mode: "insensitive",
              },
            },
            {
              subject: {
                contains: paginationParams.search,
                mode: "insensitive",
              },
            },
            {
              message: {
                contains: paginationParams.search,
                mode: "insensitive",
              },
            },
            {
              provider: {
                contains: paginationParams.search,
                mode: "insensitive",
              },
            },
            {
              errorMessage: {
                contains: paginationParams.search,
                mode: "insensitive",
              },
            },
            {
              recipientUser: {
                fullName: {
                  contains: paginationParams.search,
                  mode: "insensitive",
                },
              },
            },
            {
              recipientUser: {
                email: {
                  contains: paginationParams.search,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {};

    const filterCondition: Prisma.NotificationLogWhereInput = {
      ...(channel !== undefined ? { channel } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(sourceType !== undefined ? { sourceType } : {}),
      ...(entityType !== undefined ? { entityType } : {}),
      ...(entityId !== undefined ? { entityId } : {}),
      ...(recipientUserId !== undefined ? { recipientUserId } : {}),
    };

    const whereCondition: Prisma.NotificationLogWhereInput = {
      AND: [searchCondition, filterCondition],
    };

    const [notificationLogs, totalCount] = await Promise.all([
      prisma.notificationLog.findMany({
        where: whereCondition,
        include: notificationLogInclude,
        orderBy: {
          createdAt: "desc",
        },
        skip: paginationParams.skip,
        take: paginationParams.limit,
      }),
      prisma.notificationLog.count({
        where: whereCondition,
      }),
    ]);

    response.status(200).json({
      success: true,
      data: notificationLogs,
      pagination: buildPaginationMeta({
        page: paginationParams.page,
        limit: paginationParams.limit,
        totalCount,
      }),
    });
  })
);

router.post(
  "/",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const validationResult = createNotificationLogSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen bildirim log bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const {
      channel,
      status,
      sourceType,
      recipientUserId,
      recipientEmail,
      recipientPhone,
      subject,
      message,
      provider,
      providerMessageId,
      entityType,
      entityId,
      errorMessage,
      metadata,
    } = validationResult.data;

    if (!recipientUserId && !recipientEmail && !recipientPhone) {
      throw new HttpError(400, "En az bir alıcı bilgisi gönderilmelidir.");
    }

    if (recipientUserId) {
      const recipientUser = await prisma.user.findUnique({
        where: {
          id: recipientUserId,
        },
        select: {
          id: true,
        },
      });

      if (!recipientUser) {
        throw new HttpError(404, "Alıcı kullanıcı bulunamadı.");
      }
    }

    const notificationLog = await prisma.notificationLog.create({
      data: {
        channel,
        status,
        sourceType,
        recipientUserId,
        recipientEmail,
        recipientPhone,
        subject,
        message,
        provider,
        providerMessageId,
        entityType,
        entityId,
        errorMessage,
        ...(metadata !== undefined
          ? {
              metadata: metadata as Prisma.InputJsonValue,
            }
          : {}),
        createdByUserId: authenticatedRequest.user.id,
        sentAt: status === "SENT" ? new Date() : null,
      },
      include: notificationLogInclude,
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "CREATE_NOTIFICATION_LOG",
      entityType: "NotificationLog",
      entityId: notificationLog.id,
      metadata: {
        channel: notificationLog.channel,
        status: notificationLog.status,
        sourceType: notificationLog.sourceType,
        entityType: notificationLog.entityType,
        entityId: notificationLog.entityId,
      },
    });

    response.status(201).json({
      success: true,
      message: "Bildirim log kaydı başarıyla oluşturuldu.",
      data: notificationLog,
    });
  })
);

router.patch(
  "/:notificationLogId",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const paramsResult = notificationLogParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throw new HttpError(400, "Bildirim log bilgisi geçersiz.");
    }

    const validationResult = updateNotificationLogSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen bildirim log güncelleme bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { notificationLogId } = paramsResult.data;

    const targetNotificationLog = await prisma.notificationLog.findUnique({
      where: {
        id: notificationLogId,
      },
    });

    if (!targetNotificationLog) {
      throw new HttpError(404, "Bildirim log kaydı bulunamadı.");
    }

    const { status, providerMessageId, errorMessage, sentAt, metadata } =
      validationResult.data;

    const notificationLog = await prisma.notificationLog.update({
      where: {
        id: notificationLogId,
      },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(providerMessageId !== undefined ? { providerMessageId } : {}),
        ...(errorMessage !== undefined ? { errorMessage } : {}),
        ...(sentAt !== undefined ? { sentAt } : {}),
        ...(metadata !== undefined
          ? {
              metadata: metadata as Prisma.InputJsonValue,
            }
          : {}),
      },
      include: notificationLogInclude,
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "UPDATE_NOTIFICATION_LOG",
      entityType: "NotificationLog",
      entityId: notificationLog.id,
      metadata: {
        previous: {
          status: targetNotificationLog.status,
          providerMessageId: targetNotificationLog.providerMessageId,
          errorMessage: targetNotificationLog.errorMessage,
          sentAt: targetNotificationLog.sentAt,
        },
        current: {
          status: notificationLog.status,
          providerMessageId: notificationLog.providerMessageId,
          errorMessage: notificationLog.errorMessage,
          sentAt: notificationLog.sentAt,
        },
      },
    });

    response.status(200).json({
      success: true,
      message: "Bildirim log kaydı başarıyla güncellendi.",
      data: notificationLog,
    });
  })
);

export default router;
