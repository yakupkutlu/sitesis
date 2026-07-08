import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
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

const createContactMessageSchema = z.object({
  fullName: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalıdır.").max(120),
  email: z.string().trim().email("Geçerli bir e-posta adresi giriniz.").max(180),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(5, "Mesaj en az 5 karakter olmalıdır.").max(2000),
});

const updateContactMessageSchema = z
  .object({
    status: z.enum(["NEW", "READ", "ARCHIVED"]),
  })
  .strict();

const contactMessageParamsSchema = z.object({
  contactMessageId: z.string().uuid(),
});

const contactMessageQuerySchema = z.object({
  status: z.enum(["NEW", "READ", "ARCHIVED"]).optional(),
});

function getClientIp(request: Request) {
  const forwardedFor = request.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0]?.trim() || request.ip;
  }

  return request.ip;
}

router.post(
  "/",
  asyncHandler(async (request: Request, response: Response) => {
    const validationResult = createContactMessageSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "İletişim formu bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { fullName, email, phone, message } = validationResult.data;

    const contactMessage = await prisma.contactMessage.create({
      data: {
        fullName,
        email,
        phone: phone?.trim() || null,
        message,
        ipAddress: getClientIp(request),
        userAgent: request.headers["user-agent"] ?? null,
      },
    });

    response.status(201).json({
      success: true,
      message: "Mesajınız başarıyla alındı. En kısa sürede sizinle iletişime geçilecektir.",
      data: {
        id: contactMessage.id,
        createdAt: contactMessage.createdAt,
      },
    });
  })
);

router.get(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (request: Request, response: Response) => {
    const queryResult = contactMessageQuerySchema.safeParse(request.query);

    if (!queryResult.success) {
      throw new HttpError(400, "İletişim mesajı filtre bilgileri geçersiz.");
    }

    const paginationParams = getPaginationParams(request.query);

    if (!paginationParams.success) {
      throw new HttpError(400, "Sayfalama bilgileri geçersiz.", paginationParams.errors);
    }

    const searchCondition = paginationParams.search
      ? {
          OR: [
            {
              fullName: {
                contains: paginationParams.search,
                mode: "insensitive" as const,
              },
            },
            {
              email: {
                contains: paginationParams.search,
                mode: "insensitive" as const,
              },
            },
            {
              phone: {
                contains: paginationParams.search,
                mode: "insensitive" as const,
              },
            },
            {
              message: {
                contains: paginationParams.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {};

    const whereCondition = {
      AND: [
        searchCondition,
        queryResult.data.status ? { status: queryResult.data.status } : {},
      ],
    };

    const [contactMessages, totalCount] = await Promise.all([
      prisma.contactMessage.findMany({
        where: whereCondition,
        orderBy: {
          createdAt: "desc",
        },
        skip: paginationParams.skip,
        take: paginationParams.limit,
      }),
      prisma.contactMessage.count({
        where: whereCondition,
      }),
    ]);

    response.status(200).json({
      success: true,
      data: contactMessages,
      pagination: buildPaginationMeta({
        page: paginationParams.page,
        limit: paginationParams.limit,
        totalCount,
      }),
    });
  })
);

router.patch(
  "/:contactMessageId",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const paramsResult = contactMessageParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throw new HttpError(400, "İletişim mesajı bilgisi geçersiz.");
    }

    const validationResult = updateContactMessageSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(400, "İletişim mesajı güncelleme bilgileri geçersiz.");
    }

    const targetMessage = await prisma.contactMessage.findUnique({
      where: {
        id: paramsResult.data.contactMessageId,
      },
    });

    if (!targetMessage) {
      throw new HttpError(404, "İletişim mesajı bulunamadı.");
    }

    const contactMessage = await prisma.contactMessage.update({
      where: {
        id: targetMessage.id,
      },
      data: {
        status: validationResult.data.status,
      },
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "UPDATE_CONTACT_MESSAGE",
      entityType: "ContactMessage",
      entityId: contactMessage.id,
      metadata: {
        previousStatus: targetMessage.status,
        currentStatus: contactMessage.status,
      },
    });

    response.status(200).json({
      success: true,
      message: "İletişim mesajı güncellendi.",
      data: contactMessage,
    });
  })
);

export default router;
