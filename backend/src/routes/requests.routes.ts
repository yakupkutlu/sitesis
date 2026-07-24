import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import { type Prisma } from "../generated/prisma/client.js";
import {requireAuth,requireRole,type AuthenticatedRequest,type AuthenticatedUser,} from "../middlewares/auth.middleware.js";
import { createAuditLog } from "../services/audit-log.service.js";
import {queueEmailNotification,queueSmsNotification,} from "../services/notification.service.js";
import { getManagerScope, hasManagerScope } from "../services/manager-scope.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { buildPaginationMeta, getPaginationParams } from "../utils/pagination.js";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { requestUpload } from "../uploads/request-upload.js";
import { isAllowedReceiptFile } from "../utils/file-signature.js";
const router = express.Router();

router.use(requireAuth);

const requestInclude = {
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
  createdByUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
    },
  },
  assignedToUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  },
} as const;

const requestCategorySchema = z.enum([
  "Arıza",
  "Bakım",
  "Temizlik",
  "Güvenlik",
  "Otopark",
  "Diğer",
]);

const requestPrioritySchema = z.enum(["Normal", "Önemli", "Acil"]);

const requestContactPreferenceSchema = z.enum([
  "Uygulama üzerinden",
  "SMS ile bilgilendir",
  "E-posta ile bilgilendir",
  "SMS ve E-posta",
]);

const createRequestSchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().min(2),
  type: z.enum(["MAINTENANCE", "COMPLAINT", "SUGGESTION", "GENERAL"]),
  category: requestCategorySchema.optional().default("Diğer"),
  priority: requestPrioritySchema.optional().default("Normal"),
  contactPreference: requestContactPreferenceSchema
    .optional()
    .default("Uygulama üzerinden"),
  apartmentId: z.string().uuid().optional(),
  sendSms: z
  .preprocess((value) => value === "true" || value === true, z.boolean())
  .optional()
  .default(false),
  sendEmail: z
  .preprocess((value) => value === "false" ? false : value === "true" || value === true, z.boolean())
  .optional()
  .default(true),
});

const updateRequestSchema = z
  .object({
    title: z.string().trim().min(2).optional(),
    description: z.string().trim().min(2).optional(),
    category: requestCategorySchema.optional(),
    priority: requestPrioritySchema.optional(),
    contactPreference: requestContactPreferenceSchema.optional(),
    status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "REJECTED"]).optional(),
    assignedToUserId: z.string().uuid().nullable().optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "En az bir alan gönderilmelidir.",
  });
async function deleteUploadedFile(file?: Express.Multer.File) {
  if (!file) {
    return;
  }

  try {
    await fs.unlink(file.path);
  } catch (error) {
    console.error("Yüklenen talep dosyası silinemedi:", error);
  }
}
function normalizeUploadedFileName(fileName: string | undefined | null) {
  if (!fileName) {
    return null;
  }

  const trimmedFileName = fileName.trim();

  if (!trimmedFileName) {
    return null;
  }

  const looksBroken = /[ÃÂÄÅ]/.test(trimmedFileName);

  if (!looksBroken) {
    return trimmedFileName;
  }

  try {
    return Buffer.from(trimmedFileName, "latin1").toString("utf8");
  } catch {
    return trimmedFileName;
  }
}
const requestParamsSchema = z.object({
  requestId: z.string().uuid(),
});

async function getRequestWhereForUser(user: AuthenticatedUser) {
  if (user.role === "SUPER_ADMIN") {
    return {};
  }

  if (user.role === "MANAGER") {
    const managerScope = await getManagerScope(user.id);

    if (!hasManagerScope(managerScope)) {
      throw new HttpError(403, "Bu yöneticiye atanmış bir site veya blok bulunamadı.");
    }

    const whereCondition: Prisma.ResidentRequestWhereInput = {
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
    };

    return whereCondition;
  }

  const selectedApartmentId = user.selectedApartmentId;

  if (!selectedApartmentId) {
    throw new HttpError(
      409,
      "Talepleri görüntülemek için aktif daire seçmelisiniz."
    );
  }

  const whereCondition: Prisma.ResidentRequestWhereInput = {
    apartmentId: selectedApartmentId,
    OR: [
      {
        createdByUserId: user.id,
      },
      {
        apartment: {
          residents: {
            some: {
              userId: user.id,
            },
          },
        },
      },
    ],
  };

  return whereCondition;
}

async function ensureApartmentIsAccessible(params: {
  user: AuthenticatedUser;
  apartmentId: string;
}) {
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
      residents: {
        where: {
          userId: params.user.id,
        },
        select: {
          id: true,
        },
      },
    },
  });

  if (!apartment) {
    throw new HttpError(404, "Daire bulunamadı.");
  }

  if (params.user.role === "SUPER_ADMIN") {
    return apartment;
  }

  if (params.user.role === "MANAGER") {
    const managerScope = await getManagerScope(params.user.id);

    const canAccessApartment =
      managerScope.blockIds.includes(apartment.blockId) ||
      managerScope.siteIds.includes(apartment.block.siteId);

    if (!canAccessApartment) {
      throw new HttpError(403, "Bu daire için işlem yapma yetkiniz yok.");
    }

    return apartment;
  }

  if (
    !params.user.selectedApartmentId ||
    apartment.id !== params.user.selectedApartmentId
  ) {
    throw new HttpError(
      403,
      "Bu daire aktif olarak seçtiğiniz daire değildir."
    );
  }

  if (apartment.residents.length === 0) {
    throw new HttpError(403, "Bu daire için talep oluşturma yetkiniz yok.");
  }

  return apartment;
}

async function ensureRequestIsAccessible(params: {
  user: AuthenticatedUser;
  requestId: string;
}) {
  const residentRequest = await prisma.residentRequest.findUnique({
    where: {
      id: params.requestId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      category: true,
      priority: true,
      contactPreference: true,
      status: true,
      apartmentId: true,
      createdByUserId: true,
      assignedToUserId: true,
      apartment: {
        select: {
          blockId: true,
          block: {
            select: {
              siteId: true,
            },
          },
          residents: {
            where: {
              userId: params.user.id,
            },
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (!residentRequest) {
    throw new HttpError(404, "Talep bulunamadı.");
  }

  if (params.user.role === "SUPER_ADMIN") {
    return residentRequest;
  }

  if (params.user.role === "MANAGER") {
    const managerScope = await getManagerScope(params.user.id);

    const canAccessRequest =
      managerScope.blockIds.includes(residentRequest.apartment.blockId) ||
      managerScope.siteIds.includes(residentRequest.apartment.block.siteId);

    if (!canAccessRequest) {
      throw new HttpError(403, "Bu talep üzerinde işlem yapma yetkiniz yok.");
    }

    return residentRequest;
  }

  if (
    !params.user.selectedApartmentId ||
    residentRequest.apartmentId !== params.user.selectedApartmentId
  ) {
    throw new HttpError(
      403,
      "Bu talep aktif olarak seçtiğiniz daireye ait değildir."
    );
  }

  const isOwnerOfRequest = residentRequest.createdByUserId === params.user.id;
  const isApartmentResident = residentRequest.apartment.residents.length > 0;

  if (!isOwnerOfRequest && !isApartmentResident) {
    throw new HttpError(403, "Bu talebi görüntüleme yetkiniz yok.");
  }

  return residentRequest;
}

async function ensureAssigneeIsValid(assignedToUserId: string | null | undefined) {
  if (assignedToUserId === undefined || assignedToUserId === null) {
    return;
  }

  const assignee = await prisma.user.findUnique({
    where: {
      id: assignedToUserId,
    },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (!assignee) {
    throw new HttpError(404, "Atanacak kullanıcı bulunamadı.");
  }

  if (assignee.status !== "ACTIVE") {
    throw new HttpError(400, "Pasif kullanıcıya talep atanamaz.");
  }

  if (assignee.role !== "MANAGER" && assignee.role !== "SUPER_ADMIN") {
    throw new HttpError(400, "Talep sadece yönetici veya süper admine atanabilir.");
  }
}


type RequestNotificationRecipient = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
};

function buildResidentRequestMessage(params: {
  actionText: string;
  title: string;
  type: string;
  status: string;
  apartmentNumber: string;
  blockName: string;
  siteName: string;
}) {
  return (
    `${params.actionText}: ${params.title}. ` +
    `Tip: ${params.type}. ` +
    `Durum: ${params.status}. ` +
    `Daire: ${params.apartmentNumber}. ` +
    `Blok: ${params.blockName}. ` +
    `Site: ${params.siteName}.`
  );
}

function mergeNotificationSummaries(
  first: {
    recipientCount: number;
    emailNotificationCount: number;
    smsNotificationCount: number;
  },
  second: {
    recipientCount: number;
    emailNotificationCount: number;
    smsNotificationCount: number;
  }
) {
  return {
    recipientCount: first.recipientCount + second.recipientCount,
    emailNotificationCount: first.emailNotificationCount + second.emailNotificationCount,
    smsNotificationCount: first.smsNotificationCount + second.smsNotificationCount,
  };
}

async function getManagerRecipientsForApartment(apartmentId: string) {
  const apartment = await prisma.apartment.findUnique({
    where: {
      id: apartmentId,
    },
    select: {
      blockId: true,
      block: {
        select: {
          siteId: true,
        },
      },
    },
  });

  if (!apartment) {
    return [];
  }

  const assignments = await prisma.managerAssignment.findMany({
    where: {
      OR: [
        {
          blockId: apartment.blockId,
        },
        {
          siteId: apartment.block.siteId,
        },
      ],
    },
    select: {
      manager: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
        },
      },
    },
  });

  const recipientMap = new Map<string, RequestNotificationRecipient>();

  for (const assignment of assignments) {
    if (assignment.manager.status !== "ACTIVE") {
      continue;
    }

    if (assignment.manager.role !== "MANAGER") {
      continue;
    }

    recipientMap.set(assignment.manager.id, {
      id: assignment.manager.id,
      fullName: assignment.manager.fullName,
      email: assignment.manager.email,
      phone: assignment.manager.phone,
    });
  }

  return Array.from(recipientMap.values());
}

async function queueRequestNotificationsToRecipients(params: {
  recipients: RequestNotificationRecipient[];
  sendSms: boolean;
  sendEmail: boolean;
  subject: string;
  message: string;
  entityId: string;
  metadata: Prisma.InputJsonValue;
  createdByUserId: string;
}) {
  const summary = {
    recipientCount: params.recipients.length,
    emailNotificationCount: 0,
    smsNotificationCount: 0,
  };

  const notificationJobs: Promise<unknown>[] = [];

  for (const recipient of params.recipients) {
    if (params.sendEmail && recipient.email) {
      summary.emailNotificationCount += 1;

      notificationJobs.push(
        queueEmailNotification({
          recipientUserId: recipient.id,
          recipientEmail: recipient.email,
          subject: params.subject,
          message: params.message,
          sourceType: "RESIDENT_REQUEST",
          entityType: "ResidentRequest",
          entityId: params.entityId,
          metadata: params.metadata,
          createdByUserId: params.createdByUserId,
        })
      );
    }

    if (params.sendSms && recipient.phone) {
      summary.smsNotificationCount += 1;

      notificationJobs.push(
        queueSmsNotification({
          recipientUserId: recipient.id,
          recipientPhone: recipient.phone,
          message: params.message,
          sourceType: "RESIDENT_REQUEST",
          entityType: "ResidentRequest",
          entityId: params.entityId,
          metadata: params.metadata,
          createdByUserId: params.createdByUserId,
        })
      );
    }
  }

  await Promise.all(notificationJobs);

  return summary;
}

async function queueResidentRequestCreatedNotifications(params: {
  residentRequest: {
    id: string;
    title: string;
    type: string;
    status: string;
    apartmentId: string;
    apartment: {
      number: string;
      block: {
        name: string;
        site: {
          name: string;
        };
      };
    };
  };
  sendSms: boolean;
  sendEmail: boolean;
  createdByUserId: string;
}) {
  const managerRecipients = await getManagerRecipientsForApartment(
    params.residentRequest.apartmentId
  );

  const recipients = managerRecipients.filter((recipient) => {
    return recipient.id !== params.createdByUserId;
  });

  const message = buildResidentRequestMessage({
    actionText: "Yeni sakin talebi oluşturuldu",
    title: params.residentRequest.title,
    type: params.residentRequest.type,
    status: params.residentRequest.status,
    apartmentNumber: params.residentRequest.apartment.number,
    blockName: params.residentRequest.apartment.block.name,
    siteName: params.residentRequest.apartment.block.site.name,
  });

  return queueRequestNotificationsToRecipients({
    recipients,
    sendSms: params.sendSms,
    sendEmail: params.sendEmail,
    subject: "Yeni sakin talebi",
    message,
    entityId: params.residentRequest.id,
    metadata: {
      purpose: "RESIDENT_REQUEST_CREATED",
      requestId: params.residentRequest.id,
      apartmentId: params.residentRequest.apartmentId,
      type: params.residentRequest.type,
      status: params.residentRequest.status,
    },
    createdByUserId: params.createdByUserId,
  });
}

async function queueResidentRequestUpdatedNotifications(params: {
  previousRequest: {
    status: string;
    assignedToUserId: string | null;
  };
  updatedRequest: {
    id: string;
    title: string;
    type: string;
    status: string;
    apartmentId: string;
    createdByUserId: string;
    assignedToUserId: string | null;
    apartment: {
      number: string;
      block: {
        name: string;
        site: {
          name: string;
        };
      };
    };
    createdByUser: RequestNotificationRecipient;
    assignedToUser: RequestNotificationRecipient | null;
  };
  updatedByUserId: string;
}) {
  let summary = {
    recipientCount: 0,
    emailNotificationCount: 0,
    smsNotificationCount: 0,
  };

  const message = buildResidentRequestMessage({
    actionText: "Talep güncellendi",
    title: params.updatedRequest.title,
    type: params.updatedRequest.type,
    status: params.updatedRequest.status,
    apartmentNumber: params.updatedRequest.apartment.number,
    blockName: params.updatedRequest.apartment.block.name,
    siteName: params.updatedRequest.apartment.block.site.name,
  });

  if (params.updatedByUserId !== params.updatedRequest.createdByUserId) {
    const ownerSummary = await queueRequestNotificationsToRecipients({
      recipients: [params.updatedRequest.createdByUser],
      sendSms: false,
      sendEmail: true,
      subject: "Talebiniz güncellendi",
      message,
      entityId: params.updatedRequest.id,
      metadata: {
        purpose: "RESIDENT_REQUEST_UPDATED_FOR_RESIDENT",
        requestId: params.updatedRequest.id,
        apartmentId: params.updatedRequest.apartmentId,
        previousStatus: params.previousRequest.status,
        currentStatus: params.updatedRequest.status,
      },
      createdByUserId: params.updatedByUserId,
    });

    summary = mergeNotificationSummaries(summary, ownerSummary);
  }

  const assignedUserChanged =
    params.previousRequest.assignedToUserId !== params.updatedRequest.assignedToUserId;

  if (
    assignedUserChanged &&
    params.updatedRequest.assignedToUser &&
    params.updatedRequest.assignedToUser.id !== params.updatedByUserId &&
    params.updatedRequest.assignedToUser.id !== params.updatedRequest.createdByUserId
  ) {
    const assigneeSummary = await queueRequestNotificationsToRecipients({
      recipients: [params.updatedRequest.assignedToUser],
      sendSms: false,
      sendEmail: true,
      subject: "Size yeni bir talep atandı",
      message,
      entityId: params.updatedRequest.id,
      metadata: {
        purpose: "RESIDENT_REQUEST_ASSIGNED",
        requestId: params.updatedRequest.id,
        apartmentId: params.updatedRequest.apartmentId,
        previousAssignedToUserId: params.previousRequest.assignedToUserId,
        currentAssignedToUserId: params.updatedRequest.assignedToUserId,
      },
      createdByUserId: params.updatedByUserId,
    });

    summary = mergeNotificationSummaries(summary, assigneeSummary);
  }

  return summary;
}


router.get(
  "/",
  requireRole("SUPER_ADMIN", "MANAGER", "RESIDENT"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const paginationParams = getPaginationParams(request.query);

    if (!paginationParams.success) {
      throw new HttpError(400, "Sayfalama bilgileri geçersiz.", paginationParams.errors);
    }

    const userWhereCondition = await getRequestWhereForUser(authenticatedRequest.user);

    const searchCondition: Prisma.ResidentRequestWhereInput = paginationParams.search
      ? {
          OR: [
            {
              title: {
                contains: paginationParams.search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: paginationParams.search,
                mode: "insensitive",
              },
            },
            {
              createdByUser: {
                fullName: {
                  contains: paginationParams.search,
                  mode: "insensitive",
                },
              },
            },
            {
              apartment: {
                number: {
                  contains: paginationParams.search,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {};

    const whereCondition: Prisma.ResidentRequestWhereInput = {
      AND: [userWhereCondition, searchCondition],
    };

    const [residentRequests, totalCount] = await Promise.all([
      prisma.residentRequest.findMany({
        where: whereCondition,
        include: requestInclude,
        orderBy: {
          createdAt: "desc",
        },
        skip: paginationParams.skip,
        take: paginationParams.limit,
      }),
      prisma.residentRequest.count({
        where: whereCondition,
      }),
    ]);

    response.status(200).json({
      success: true,
      data: residentRequests,
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
  requireRole("SUPER_ADMIN", "MANAGER", "RESIDENT"),
  requestUpload.single("attachment"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    const uploadedFile = request.file;
    let shouldDeleteUploadedFile = Boolean(uploadedFile);

    try {
      if (!authenticatedRequest.user) {
        throw new HttpError(401, "Oturum bulunamadı.");
      }

      const validationResult = createRequestSchema.safeParse(request.body);

      if (!validationResult.success) {
        throw new HttpError(
          400,
          "Gönderilen talep bilgileri geçersiz.",
          validationResult.error.flatten().fieldErrors
        );
      }

      const {
        title,
        description,
        type,
        category,
        priority,
        contactPreference,
        apartmentId,
        sendSms,
        sendEmail,
      } = validationResult.data;

      let resolvedApartmentId = apartmentId;

      if (authenticatedRequest.user.role === "RESIDENT") {
        const selectedApartmentId =
          authenticatedRequest.user.selectedApartmentId;

        if (!selectedApartmentId) {
          throw new HttpError(
            409,
            "Talep oluşturmak için aktif daire seçmelisiniz."
          );
        }

        if (apartmentId && apartmentId !== selectedApartmentId) {
          throw new HttpError(
            403,
            "Talep yalnızca aktif olarak seçtiğiniz daire için oluşturulabilir."
          );
        }

        resolvedApartmentId = selectedApartmentId;
      }

      if (!resolvedApartmentId) {
        throw new HttpError(400, "Daire seçimi zorunludur.");
      }

      if (uploadedFile) {
        const isAllowedFile = await isAllowedReceiptFile(
          uploadedFile.path,
          uploadedFile.mimetype
        );

        if (!isAllowedFile) {
          throw new HttpError(
            400,
            "Talep dosyası gerçek PDF, PNG, JPG veya WEBP formatında olmalıdır."
          );
        }
      }

      await ensureApartmentIsAccessible({
        user: authenticatedRequest.user,
        apartmentId: resolvedApartmentId,
      });

      const originalAttachmentFileName = normalizeUploadedFileName(
  uploadedFile?.originalname
);

const residentRequest = await prisma.residentRequest.create({
  data: {
    title,
    description,
    type,
    category,
    priority,
    contactPreference,
    apartmentId: resolvedApartmentId,
    createdByUserId: authenticatedRequest.user.id,
    attachmentOriginalFileName: originalAttachmentFileName,
    attachmentStoredFileName: uploadedFile?.filename ?? null,
    attachmentMimeType: uploadedFile?.mimetype ?? null,
    attachmentSizeBytes: uploadedFile?.size ?? null,
  },
    include: requestInclude,
  });
      shouldDeleteUploadedFile = false;

      await createAuditLog({
        request,
        userId: authenticatedRequest.user.id,
        action: "CREATE_RESIDENT_REQUEST",
        entityType: "ResidentRequest",
        entityId: residentRequest.id,
        metadata: {
          title: residentRequest.title,
          type: residentRequest.type,
          category: residentRequest.category,
          priority: residentRequest.priority,
          contactPreference: residentRequest.contactPreference,
          apartmentId: residentRequest.apartmentId,
          attachmentOriginalFileName: residentRequest.attachmentOriginalFileName,
          attachmentMimeType: residentRequest.attachmentMimeType,
          attachmentSizeBytes: residentRequest.attachmentSizeBytes,
          sendSms,
          sendEmail,
        },
      });

      response.status(201).json({
        success: true,
        message: "Talep başarıyla oluşturuldu.",
        data: residentRequest,
      });
    } finally {
      if (shouldDeleteUploadedFile) {
        await deleteUploadedFile(uploadedFile);
      }
    }
  })
);
router.get(
  "/:requestId/attachment",
  requireRole("SUPER_ADMIN", "MANAGER", "RESIDENT"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const paramsResult = requestParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throw new HttpError(400, "Talep bilgisi geçersiz.");
    }

    const { requestId } = paramsResult.data;

    await ensureRequestIsAccessible({
      user: authenticatedRequest.user,
      requestId,
    });

    const residentRequest = await prisma.residentRequest.findUnique({
      where: {
        id: requestId,
      },
      select: {
        attachmentOriginalFileName: true,
        attachmentStoredFileName: true,
        attachmentMimeType: true,
      },
    });

    if (!residentRequest?.attachmentStoredFileName) {
      throw new HttpError(404, "Talep dosyası bulunamadı.");
    }

    const filePath = path.join(
      process.cwd(),
      "uploads",
      "requests",
      residentRequest.attachmentStoredFileName
    );

    try {
      await fs.access(filePath);
    } catch {
      throw new HttpError(404, "Talep dosyası sunucuda bulunamadı.");
    }

    const originalFileName =
      residentRequest.attachmentOriginalFileName || "talep-dosyasi";

    response.setHeader(
      "Content-Type",
      residentRequest.attachmentMimeType || "application/octet-stream"
    );

    response.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(originalFileName)}`
    );

    response.sendFile(filePath);
  })
);
router.patch(
  "/:requestId",
  requireRole("SUPER_ADMIN", "MANAGER", "RESIDENT"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const paramsResult = requestParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throw new HttpError(400, "Talep bilgisi geçersiz.");
    }

    const validationResult = updateRequestSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen talep güncelleme bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { requestId } = paramsResult.data;

    const targetRequest = await ensureRequestIsAccessible({
      user: authenticatedRequest.user,
      requestId,
    });

    const {
      title,
      description,
      category,
      priority,
      contactPreference,
      status,
      assignedToUserId,
    } = validationResult.data;

    if (authenticatedRequest.user.role === "RESIDENT") {
      if (status !== undefined || assignedToUserId !== undefined) {
        throw new HttpError(403, "Talep durumu veya ataması sadece yönetim tarafından değiştirilebilir.");
      }

      if (targetRequest.status !== "OPEN") {
        throw new HttpError(400, "Sadece açık durumdaki talepler güncellenebilir.");
      }
    }

    await ensureAssigneeIsValid(assignedToUserId);

    const updatedRequest = await prisma.residentRequest.update({
      where: {
        id: requestId,
      },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(contactPreference !== undefined
          ? { contactPreference }
          : {}),
        ...(status !== undefined ? { status } : {}),
        ...(assignedToUserId !== undefined ? { assignedToUserId } : {}),
      },
      include: requestInclude,
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "UPDATE_RESIDENT_REQUEST",
      entityType: "ResidentRequest",
      entityId: updatedRequest.id,
      metadata: {
        previous: {
          title: targetRequest.title,
          description: targetRequest.description,
          category: targetRequest.category,
          priority: targetRequest.priority,
          contactPreference: targetRequest.contactPreference,
          status: targetRequest.status,
          assignedToUserId: targetRequest.assignedToUserId,
        },
        current: {
          title: updatedRequest.title,
          description: updatedRequest.description,
          category: updatedRequest.category,
          priority: updatedRequest.priority,
          contactPreference: updatedRequest.contactPreference,
          status: updatedRequest.status,
          assignedToUserId: updatedRequest.assignedToUserId,
        },
      },
    });

    response.status(200).json({
      success: true,
      message: "Talep başarıyla güncellendi.",
      data: updatedRequest,
    });
  })
);

export default router;

