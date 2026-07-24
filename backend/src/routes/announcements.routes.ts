import express, { type Request, type Response } from "express";
import { z } from "zod";
import prisma from "../db/prisma.js";
import { type Prisma } from "../generated/prisma/client.js";
import { requireAuth, requireRole, type AuthenticatedRequest, type AuthenticatedUser, } from "../middlewares/auth.middleware.js";
import { createAuditLog } from "../services/audit-log.service.js";
import { addNotificationDispatchJob } from "../queues/notification.queues.js";
import { getManagerScope, hasManagerScope } from "../services/manager-scope.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { buildPaginationMeta, getPaginationParams } from "../utils/pagination.js";
const router = express.Router();
router.use(requireAuth);
const announcementInclude = {
    site: {
        select: {
            id: true,
            name: true,
            address: true,
        },
    },
    block: {
        select: {
            id: true,
            name: true,
            siteId: true,
        },
    },
    apartment: {
        select: {
            id: true,
            number: true,
            blockId: true,
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
const createAnnouncementSchema = z.object({
    title: z.string().trim().min(2),
    content: z.string().trim().min(2),
    targetType: z.enum(["ALL", "SITE", "BLOCK", "APARTMENT"]),
    siteId: z.string().uuid().optional(),
    blockId: z.string().uuid().optional(),
    apartmentId: z.string().uuid().optional(),
    sendSms: z.boolean().optional().default(false),
    sendEmail: z.boolean().optional().default(false),
});
const updateAnnouncementSchema = z
    .object({
    title: z.string().trim().min(2).optional(),
    content: z.string().trim().min(2).optional(),
    status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
})
    .strict()
    .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "En az bir alan gönderilmelidir.",
});
const announcementParamsSchema = z.object({
    announcementId: z.string().uuid(),
});
const listAnnouncementFiltersSchema = z.object({
    status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
    targetType: z.enum(["ALL", "SITE", "BLOCK", "APARTMENT"]).optional(),
});
function getQueueErrorMessage(error: unknown) {
    return error instanceof Error
        ? error.message
        : "Bilinmeyen bildirim kuyruğu hatası oluştu.";
}
async function getAnnouncementWhereForUser(user: AuthenticatedUser) {
    if (user.role === "SUPER_ADMIN") {
        return {};
    }
    if (user.role === "MANAGER") {
        const managerScope = await getManagerScope(user.id);
        if (!hasManagerScope(managerScope)) {
            throw new HttpError(403, "Bu yöneticiye atanmış bir site veya blok bulunamadı.");
        }
        const whereCondition: Prisma.AnnouncementWhereInput = {
            OR: [
                {
                    targetType: "ALL",
                },
                {
                    siteId: {
                        in: managerScope.siteIds,
                    },
                },
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
        };
        return whereCondition;
    }
    const selectedApartmentId = user.selectedApartmentId;

    if (!selectedApartmentId) {
        throw new HttpError(
            409,
            "Duyuruları görüntülemek için aktif daire seçmelisiniz."
        );
    }

    const selectedApartment = await prisma.apartment.findFirst({
        where: {
            id: selectedApartmentId,
            residents: {
                some: {
                    userId: user.id,
                },
            },
        },
        select: {
            id: true,
            blockId: true,
            block: {
                select: {
                    siteId: true,
                },
            },
        },
    });

    if (!selectedApartment) {
        throw new HttpError(
            403,
            "Seçili daire için duyuru görüntüleme yetkiniz bulunmamaktadır."
        );
    }

    const whereCondition: Prisma.AnnouncementWhereInput = {
        status: "ACTIVE",
        OR: [
            {
                targetType: "ALL",
            },
            {
                AND: [
                    {
                        targetType: "SITE",
                    },
                    {
                        siteId: selectedApartment.block.siteId,
                    },
                ],
            },
            {
                AND: [
                    {
                        targetType: "BLOCK",
                    },
                    {
                        blockId: selectedApartment.blockId,
                    },
                ],
            },
            {
                AND: [
                    {
                        targetType: "APARTMENT",
                    },
                    {
                        apartmentId: selectedApartment.id,
                    },
                ],
            },
        ],
    };

    return whereCondition;
}
async function ensureTargetIsValidAndAccessible(params: {
    user: AuthenticatedUser;
    targetType: "ALL" | "SITE" | "BLOCK" | "APARTMENT";
    siteId?: string;
    blockId?: string;
    apartmentId?: string;
}) {
    if (params.targetType === "ALL") {
        if (params.user.role !== "SUPER_ADMIN") {
            throw new HttpError(403, "Tüm sisteme duyuru gönderme yetkiniz yok.");
        }
        return {
            siteId: null,
            blockId: null,
            apartmentId: null,
        };
    }
    if (params.targetType === "SITE") {
        if (!params.siteId) {
            throw new HttpError(400, "Site seçimi zorunludur.");
        }
        const site = await prisma.site.findUnique({
            where: {
                id: params.siteId,
            },
            select: {
                id: true,
            },
        });
        if (!site) {
            throw new HttpError(404, "Site bulunamadı.");
        }
        if (params.user.role === "MANAGER") {
            const managerScope = await getManagerScope(params.user.id);
            if (!managerScope.siteIds.includes(params.siteId)) {
                throw new HttpError(403, "Bu siteye duyuru gönderme yetkiniz yok.");
            }
        }
        return {
            siteId: params.siteId,
            blockId: null,
            apartmentId: null,
        };
    }
    if (params.targetType === "BLOCK") {
        if (!params.blockId) {
            throw new HttpError(400, "Blok/Apartman seçimi zorunludur.");
        }
        const block = await prisma.block.findUnique({
            where: {
                id: params.blockId,
            },
            select: {
                id: true,
                siteId: true,
            },
        });
        if (!block) {
            throw new HttpError(404, "Blok/Apartman bulunamadı.");
        }
        if (params.user.role === "MANAGER") {
            const managerScope = await getManagerScope(params.user.id);
            const canAccessBlock = managerScope.blockIds.includes(block.id) || managerScope.siteIds.includes(block.siteId);
            if (!canAccessBlock) {
                throw new HttpError(403, "Bu blok/apartmana duyuru gönderme yetkiniz yok.");
            }
        }
        return {
            siteId: block.siteId,
            blockId: params.blockId,
            apartmentId: null,
        };
    }
    if (!params.apartmentId) {
        throw new HttpError(400, "Daire seçimi zorunludur.");
    }
    const apartment = await prisma.apartment.findUnique({
        where: {
            id: params.apartmentId,
        },
        select: {
            id: true,
            blockId: true,
            block: {
                select: {
                    siteId: true,
                },
            },
        },
    });
    if (!apartment) {
        throw new HttpError(404, "Daire bulunamadı.");
    }
    if (params.user.role === "MANAGER") {
        const managerScope = await getManagerScope(params.user.id);
        const canAccessApartment = managerScope.blockIds.includes(apartment.blockId) ||
            managerScope.siteIds.includes(apartment.block.siteId);
        if (!canAccessApartment) {
            throw new HttpError(403, "Bu daireye duyuru gönderme yetkiniz yok.");
        }
    }
    return {
        siteId: apartment.block.siteId,
        blockId: apartment.blockId,
        apartmentId: params.apartmentId,
    };
}
router.get("/", requireRole("SUPER_ADMIN", "MANAGER", "RESIDENT"), asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    if (!authenticatedRequest.user) {
        throw new HttpError(401, "Oturum bulunamadı.");
    }
    const paginationParams = getPaginationParams(request.query);
    if (!paginationParams.success) {
        throw new HttpError(400, "Sayfalama bilgileri geçersiz.", paginationParams.errors);
    }
    const filtersResult = listAnnouncementFiltersSchema.safeParse({
        status: typeof request.query.status === "string" ? request.query.status : undefined,
        targetType: typeof request.query.targetType === "string"
            ? request.query.targetType
            : undefined,
    });
    if (!filtersResult.success) {
        throw new HttpError(400, "Duyuru filtre bilgileri geçersiz.", filtersResult.error.flatten().fieldErrors);
    }
    const userWhereCondition = await getAnnouncementWhereForUser(authenticatedRequest.user);
    const searchCondition: Prisma.AnnouncementWhereInput = paginationParams.search
        ? {
            OR: [
                {
                    title: {
                        contains: paginationParams.search,
                        mode: "insensitive",
                    },
                },
                {
                    content: {
                        contains: paginationParams.search,
                        mode: "insensitive",
                    },
                },
            ],
        }
        : {};
    const filterCondition: Prisma.AnnouncementWhereInput = {};
    if (filtersResult.data.status) {
        filterCondition.status = filtersResult.data.status;
    }
    if (filtersResult.data.targetType) {
        filterCondition.targetType = filtersResult.data.targetType;
    }
    const whereCondition: Prisma.AnnouncementWhereInput = {
        AND: [userWhereCondition, searchCondition, filterCondition],
    };
    const [announcements, totalCount] = await Promise.all([
        prisma.announcement.findMany({
            where: whereCondition,
            include: announcementInclude,
            orderBy: {
                createdAt: "desc",
            },
            skip: paginationParams.skip,
            take: paginationParams.limit,
        }),
        prisma.announcement.count({
            where: whereCondition,
        }),
    ]);
    const readRecords = authenticatedRequest.user.role === "RESIDENT" && announcements.length > 0
        ? await prisma.announcementRead.findMany({
            where: {
                userId: authenticatedRequest.user.id,
                announcementId: {
                    in: announcements.map((announcement) => announcement.id),
                },
            },
            select: {
                announcementId: true,
                readAt: true,
            },
        })
        : [];
    const readMap = new Map(readRecords.map((readRecord) => [
        readRecord.announcementId,
        readRecord.readAt,
    ]));
    const announcementsWithReadInfo = authenticatedRequest.user.role === "RESIDENT"
        ? announcements.map((announcement) => ({
            ...announcement,
            isRead: readMap.has(announcement.id),
            readAt: readMap.get(announcement.id) ?? null,
        }))
        : announcements;
    response.status(200).json({
        success: true,
        data: announcementsWithReadInfo,
        pagination: buildPaginationMeta({
            page: paginationParams.page,
            limit: paginationParams.limit,
            totalCount,
        }),
    });
}));
router.post("/", requireRole("SUPER_ADMIN", "MANAGER"), asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    if (!authenticatedRequest.user) {
        throw new HttpError(401, "Oturum bulunamadı.");
    }
    const validationResult = createAnnouncementSchema.safeParse(request.body);
    if (!validationResult.success) {
        throw new HttpError(400, "Gönderilen duyuru bilgileri geçersiz.", validationResult.error.flatten().fieldErrors);
    }
    const { title, content, targetType, siteId, blockId, apartmentId, sendSms, sendEmail } = validationResult.data;
    const target = await ensureTargetIsValidAndAccessible({
        user: authenticatedRequest.user,
        targetType,
        siteId,
        blockId,
        apartmentId,
    });
    const announcement = await prisma.announcement.create({
        data: {
            title,
            content,
            targetType,
            siteId: target.siteId,
            blockId: target.blockId,
            apartmentId: target.apartmentId,
            createdByUserId: authenticatedRequest.user.id,
        },
        include: announcementInclude,
    });
    const notificationRequested = sendSms || sendEmail;
    const createdByUserId = authenticatedRequest.user.id;

    // Duyuru veritabanına kaydedildiği anda arayüze cevap dön.
    // Bildirim kuyruğu ve audit kaydı response sonrasında arka planda hazırlanır.
    response.status(201).json({
        success: true,
        message: notificationRequested
            ? "Duyuru başarıyla oluşturuldu. Bildirimler arka planda hazırlanıyor."
            : "Duyuru başarıyla oluşturuldu.",
        data: announcement,
        notificationQueued: notificationRequested,
        notificationDispatchScheduled: notificationRequested,
    });

    setImmediate(() => {
        void (async () => {
            let notificationDispatchQueued = false;
            let notificationDispatchError: string | null = null;

            if (notificationRequested) {
                try {
                    await addNotificationDispatchJob({
                        kind: "ANNOUNCEMENT",
                        announcementId: announcement.id,
                        sendSms,
                        sendEmail,
                        createdByUserId,
                    });

                    notificationDispatchQueued = true;
                }
                catch (error) {
                    notificationDispatchError = getQueueErrorMessage(error);
                    console.error(
                        "Duyuru bildirimleri arka plan kuyruğuna eklenemedi:",
                        error
                    );
                }
            }

            await createAuditLog({
                request,
                userId: createdByUserId,
                action: "CREATE_ANNOUNCEMENT",
                entityType: "Announcement",
                entityId: announcement.id,
                metadata: {
                    title: announcement.title,
                    targetType: announcement.targetType,
                    siteId: announcement.siteId,
                    blockId: announcement.blockId,
                    apartmentId: announcement.apartmentId,
                    sendSms,
                    sendEmail,
                    notificationDispatch: {
                        requested: notificationRequested,
                        queued: notificationDispatchQueued,
                        ...(notificationDispatchError
                            ? { error: notificationDispatchError }
                            : {}),
                    },
                },
            });
        })().catch((error) => {
            console.error(
                "Duyuru oluşturma sonrası arka plan işlemleri tamamlanamadı:",
                error
            );
        });
    });
}));
router.patch("/:announcementId/read", requireRole("RESIDENT"), asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    if (!authenticatedRequest.user) {
        throw new HttpError(401, "Oturum bulunamadı.");
    }
    const paramsResult = announcementParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
        throw new HttpError(400, "Duyuru bilgisi geçersiz.");
    }
    const { announcementId } = paramsResult.data;
    const userWhereCondition = await getAnnouncementWhereForUser(authenticatedRequest.user);
    const announcement = await prisma.announcement.findFirst({
        where: {
            AND: [
                {
                    id: announcementId,
                },
                userWhereCondition,
            ],
        },
        select: {
            id: true,
        },
    });
    if (!announcement) {
        throw new HttpError(404, "Duyuru bulunamadı veya erişim yetkiniz yok.");
    }
    const readRecord = await prisma.announcementRead.upsert({
        where: {
            announcementId_userId: {
                announcementId,
                userId: authenticatedRequest.user.id,
            },
        },
        update: {
            readAt: new Date(),
        },
        create: {
            announcementId,
            userId: authenticatedRequest.user.id,
        },
    });
    response.status(200).json({
        success: true,
        message: "Duyuru okundu olarak işaretlendi.",
        data: {
            announcementId,
            isRead: true,
            readAt: readRecord.readAt,
        },
    });
}));
router.patch("/:announcementId", requireRole("SUPER_ADMIN", "MANAGER"), asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    if (!authenticatedRequest.user) {
        throw new HttpError(401, "Oturum bulunamadı.");
    }
    const paramsResult = announcementParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
        throw new HttpError(400, "Duyuru bilgisi geçersiz.");
    }
    const validationResult = updateAnnouncementSchema.safeParse(request.body);
    if (!validationResult.success) {
        throw new HttpError(400, "Gönderilen duyuru güncelleme bilgileri geçersiz.", validationResult.error.flatten().fieldErrors);
    }
    const { announcementId } = paramsResult.data;
    const targetAnnouncement = await prisma.announcement.findUnique({
        where: {
            id: announcementId,
        },
    });
    if (!targetAnnouncement) {
        throw new HttpError(404, "Duyuru bulunamadı.");
    }
    await ensureTargetIsValidAndAccessible({
        user: authenticatedRequest.user,
        targetType: targetAnnouncement.targetType,
        siteId: targetAnnouncement.siteId ?? undefined,
        blockId: targetAnnouncement.blockId ?? undefined,
        apartmentId: targetAnnouncement.apartmentId ?? undefined,
    });
    const { title, content, status } = validationResult.data;
    const updatedAnnouncement = await prisma.announcement.update({
        where: {
            id: announcementId,
        },
        data: {
            ...(title !== undefined ? { title } : {}),
            ...(content !== undefined ? { content } : {}),
            ...(status !== undefined ? { status } : {}),
        },
        include: announcementInclude,
    });
    await createAuditLog({
        request,
        userId: authenticatedRequest.user.id,
        action: "UPDATE_ANNOUNCEMENT",
        entityType: "Announcement",
        entityId: updatedAnnouncement.id,
        metadata: {
            previous: {
                title: targetAnnouncement.title,
                content: targetAnnouncement.content,
                status: targetAnnouncement.status,
            },
            current: {
                title: updatedAnnouncement.title,
                content: updatedAnnouncement.content,
                status: updatedAnnouncement.status,
            },
        },
    });
    response.status(200).json({
        success: true,
        message: "Duyuru başarıyla güncellendi.",
        data: updatedAnnouncement,
    });
}));
router.patch("/:announcementId/archive", requireRole("SUPER_ADMIN", "MANAGER"), asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    if (!authenticatedRequest.user) {
        throw new HttpError(401, "Oturum bulunamadı.");
    }
    const paramsResult = announcementParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
        throw new HttpError(400, "Duyuru bilgisi geçersiz.");
    }
    const { announcementId } = paramsResult.data;
    const targetAnnouncement = await prisma.announcement.findUnique({
        where: {
            id: announcementId,
        },
    });
    if (!targetAnnouncement) {
        throw new HttpError(404, "Duyuru bulunamadı.");
    }
    if (targetAnnouncement.status === "ARCHIVED") {
        throw new HttpError(409, "Duyuru zaten arşivlenmiş.");
    }
    await ensureTargetIsValidAndAccessible({
        user: authenticatedRequest.user,
        targetType: targetAnnouncement.targetType,
        siteId: targetAnnouncement.siteId ?? undefined,
        blockId: targetAnnouncement.blockId ?? undefined,
        apartmentId: targetAnnouncement.apartmentId ?? undefined,
    });
    const updatedAnnouncement = await prisma.announcement.update({
        where: {
            id: announcementId,
        },
        data: {
            status: "ARCHIVED",
        },
        include: announcementInclude,
    });
    await createAuditLog({
        request,
        userId: authenticatedRequest.user.id,
        action: "ARCHIVE_ANNOUNCEMENT",
        entityType: "Announcement",
        entityId: updatedAnnouncement.id,
        metadata: {
            title: updatedAnnouncement.title,
            targetType: updatedAnnouncement.targetType,
        },
    });
    response.status(200).json({
        success: true,
        message: "Duyuru başarıyla arşivlendi.",
        data: updatedAnnouncement,
    });
}));
export default router;