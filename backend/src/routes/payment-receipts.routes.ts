import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import { type Prisma } from "../generated/prisma/client.js";
import {requireAuth,requireRole,type AuthenticatedRequest,} from "../middlewares/auth.middleware.js";
import { createAuditLog } from "../services/audit-log.service.js";
import {
  analyzeReceiptWithAiFallback,
  type ReceiptAiAnalyzeResult,
} from "../services/receipt-ai.service.js";
import { getManagerScope, hasManagerScope } from "../services/manager-scope.service.js";
import { receiptUpload } from "../uploads/receipt-upload.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { isAllowedReceiptFile } from "../utils/file-signature.js";
import { buildPaginationMeta, getPaginationParams } from "../utils/pagination.js";
const router = express.Router();

router.use(requireAuth);


const managerConfirmReceiptSchema = z.object({
  paymentAllocationId: z.string().uuid(),
  payerName: z.string().trim().optional(),
  bankAccount: z.string().trim().optional(),
  amount: z.coerce.number().positive().optional(),
  paymentOwnerType: z.string().trim().optional(),
  note: z.string().trim().optional(),
});
const uploadReceiptSchema = z.object({
  paymentAllocationId: z.string().uuid(),
  note: z.string().trim().optional(),
});


const analyzeReceiptSchema = z.object({
  payerName: z.string().trim().optional(),
  bankAccount: z.string().trim().optional(),
  amount: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().positive().optional()
  ),
  paymentOwnerType: z.string().trim().optional(),
  manualApartmentId: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().uuid().optional()
  ),
  description: z.string().trim().optional(),
});
const receiptParamsSchema = z.object({
  receiptId: z.string().uuid(),
});

const reviewReceiptSchema = z.object({
  reviewNote: z.string().trim().optional(),
});



function buildAiAnalyzeMessage(aiResult: ReceiptAiAnalyzeResult) {
  if (!aiResult.provider) {
    return "AI bilgisi bulunamadı. Manuel bilgilerle eşleştirme yapıldı.";
  }

  return `${aiResult.provider} ile dekont bilgileri okundu.`;
}
function formatKurusAsTry(amountKurus: number) {
  return (amountKurus / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
async function deleteUploadedFile(file?: Express.Multer.File) {
  if (!file) {
    return;
  }

  try {
    await fs.unlink(file.path);
  } catch (error) {
    console.error("Yüklenen dosya silinemedi:", error);
  }
}

async function getManagerReceiptAccessFilter(managerId: string) {
  const managerScope = await getManagerScope(managerId);

  if (!hasManagerScope(managerScope)) {
    throw new HttpError(403, "Bu yöneticiye atanmış bir site veya blok bulunamadı.");
  }

  const filter: Prisma.PaymentReceiptWhereInput = {
    OR: [
      {
        paymentAllocation: {
          apartment: {
            blockId: {
              in: managerScope.blockIds,
            },
          },
        },
      },
      {
        paymentAllocation: {
          apartment: {
            block: {
              siteId: {
                in: managerScope.siteIds,
              },
            },
          },
        },
      },
    ],
  };

  return filter;
}

async function ensureManagerCanAccessReceipt(params: {
  managerId: string;
  receiptId: string;
}) {
  const managerReceiptFilter = await getManagerReceiptAccessFilter(params.managerId);

  const receipt = await prisma.paymentReceipt.findFirst({
    where: {
      id: params.receiptId,
      AND: [managerReceiptFilter],
    },
    select: {
      id: true,
    },
  });

  if (!receipt) {
    throw new HttpError(403, "Bu dekont için işlem yapma yetkiniz yok.");
  }
}

async function ensureUserCanDownloadReceipt(params: {
  user: AuthenticatedRequest["user"];
  receiptId: string;
}) {
  if (!params.user) {
    throw new HttpError(401, "Oturum bulunamadı.");
  }

  const receipt = await prisma.paymentReceipt.findUnique({
    where: {
      id: params.receiptId,
    },
    select: {
      id: true,
      originalFileName: true,
      storedFileName: true,
      mimeType: true,
      paymentAllocation: {
        select: {
          apartment: {
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
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!receipt) {
    throw new HttpError(404, "Dekont bulunamadı.");
  }

  if (params.user.role === "SUPER_ADMIN") {
    return receipt;
  }

  if (params.user.role === "RESIDENT") {
    const isResidentOfApartment =
      receipt.paymentAllocation.apartment.residents.length > 0;

    if (!isResidentOfApartment) {
      throw new HttpError(403, "Bu dekontu indirme yetkiniz yok.");
    }

    return receipt;
  }

  if (params.user.role === "MANAGER") {
    const managerScope = await getManagerScope(params.user.id);

    if (!hasManagerScope(managerScope)) {
      throw new HttpError(403, "Bu yöneticiye atanmış bir site veya blok bulunamadı.");
    }

    const canAccessByBlock = managerScope.blockIds.includes(
      receipt.paymentAllocation.apartment.blockId
    );

    const canAccessBySite = managerScope.siteIds.includes(
      receipt.paymentAllocation.apartment.block.siteId
    );

    if (!canAccessByBlock && !canAccessBySite) {
      throw new HttpError(403, "Bu dekontu indirme yetkiniz yok.");
    }

    return receipt;
  }

  throw new HttpError(403, "Bu dekontu indirme yetkiniz yok.");
}


router.post(
  "/analyze",
  requireRole("SUPER_ADMIN", "MANAGER"),
  receiptUpload.single("receipt"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    const uploadedFile = request.file;

    try {
      if (!authenticatedRequest.user) {
        throw new HttpError(401, "Oturum bulunamadı.");
      }

      if (!uploadedFile) {
        throw new HttpError(400, "Dekont dosyası zorunludur.");
      }

      const validationResult = analyzeReceiptSchema.safeParse(request.body);

      if (!validationResult.success) {
        throw new HttpError(
          400,
          "Dekont analiz bilgileri geçersiz.",
          validationResult.error.flatten().fieldErrors
        );
      }

      const isAllowedFile = await isAllowedReceiptFile(
        uploadedFile.path,
        uploadedFile.mimetype
      );

      if (!isAllowedFile) {
        throw new HttpError(
          400,
          "Dekont dosyası gerçek PDF, PNG, JPG veya WEBP formatında olmalıdır."
        );
      }

      const {
        payerName,
        amount,
        paymentOwnerType,
        manualApartmentId,
        description,
      } = validationResult.data;

      const aiResult = await analyzeReceiptWithAiFallback({
        filePath: uploadedFile.path,
        mimeType: uploadedFile.mimetype,
        originalFileName: uploadedFile.originalname,
      });

      const serializedAiResult = {
        ...aiResult,
        message: buildAiAnalyzeMessage(aiResult),
      };

      const effectiveAmount = amount ?? aiResult.amount;

      if (effectiveAmount === null || effectiveAmount === undefined) {
        response.status(200).json({
          success: true,
          message:
            "AI dekont tutarını okuyamadı. Lütfen tutarı manuel girip tekrar deneyin.",
          data: {
            status: "Eşleşme bulunamadı",
            message:
              "Dekont tutarı okunamadığı için ödeme eşleştirmesi yapılamadı.",
            apartment: null,
            suggestions: [],
            ai: {
              ...aiResult,
              message: buildAiAnalyzeMessage(aiResult),
            },
          },
        });

        return;
      }

      const amountKurus = Math.round(effectiveAmount * 100);

      let managerAccessFilter: Prisma.PaymentAllocationWhereInput = {};

      if (authenticatedRequest.user.role === "MANAGER") {
        const managerScope = await getManagerScope(authenticatedRequest.user.id);

        if (!hasManagerScope(managerScope)) {
          throw new HttpError(
            403,
            "Bu yöneticiye atanmış bir site veya blok bulunamadı."
          );
        }

        managerAccessFilter = {
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
      }

      const allocations = await prisma.paymentAllocation.findMany({
        where: {
          status: "PENDING",
          amountKurus,
          receipts: {
            none: {
              status: "PENDING",
            },
          },
          ...(manualApartmentId ? { apartmentId: manualApartmentId } : {}),
          ...managerAccessFilter,
        },
        include: {
          paymentBatch: {
            select: {
              id: true,
              title: true,
              dueDate: true,
            },
          },
          apartment: {
            select: {
              id: true,
              number: true,
              block: {
                select: {
                  id: true,
                  name: true,
                  site: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              residents: {
                select: {
                  type: true,
                  user: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                    },
                  },
                },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      });

      if (allocations.length === 0) {
        response.status(200).json({
          success: true,
          data: {
            ai: serializedAiResult,
            status: "Eşleşme bulunamadı",
            message:
              "Bu tutar ve seçimlere uygun bekleyen ödeme bulunamadı. Daire, tutar veya açıklamayı kontrol edin.",
            apartment: null,
            suggestions: [],
            extracted: {
              payerName: payerName ?? null,
              amountKurus,
              paymentOwnerType: paymentOwnerType ?? null,
              description: description ?? null,
            },
          },
        });

        return;
      }

      const bestMatch = allocations[0];
      const resident = bestMatch.apartment.residents[0];

      const apartmentLabel = `${bestMatch.apartment.block.site.name} / ${bestMatch.apartment.block.name} / Daire ${bestMatch.apartment.number}`;

      response.status(200).json({
        success: true,
        data: {
          ai: serializedAiResult,
          status: "Eşleşme bulundu",
          message:
            "Dekont bilgileri bekleyen ödeme kaydı ile eşleşti. Sonraki adımda yönetici bu eşleşmeyi onaylayacak.",
          apartment: {
            id: bestMatch.apartment.id,
            label: apartmentLabel,
            residentName: resident?.user.fullName ?? "-",
            residentRole: resident?.type === "OWNER" ? "Ev Sahibi" : "Kiracı",
            expectedAmountText: `${formatKurusAsTry(bestMatch.amountKurus)} TL`,
            paymentTitle: bestMatch.paymentBatch.title,
            paymentAllocationId: bestMatch.id,
          },
          suggestions: allocations.map((allocation) => {
            return {
              paymentAllocationId: allocation.id,
              paymentTitle: allocation.paymentBatch.title,
              apartmentLabel: `${allocation.apartment.block.site.name} / ${allocation.apartment.block.name} / Daire ${allocation.apartment.number}`,
              amountKurus: allocation.amountKurus,
            };
          }),
          extracted: {
            payerName: payerName ?? null,
            amountKurus,
            paymentOwnerType: paymentOwnerType ?? null,
            description: description ?? null,
          },
        },
      });
    } finally {
      await deleteUploadedFile(uploadedFile);
    }
  })
);

router.get(
  "/",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const paginationParams = getPaginationParams(request.query);

    if (!paginationParams.success) {
      throw new HttpError(400, "Sayfalama bilgileri geçersiz.", paginationParams.errors);
    }

    const searchCondition: Prisma.PaymentReceiptWhereInput = paginationParams.search
      ? {
          OR: [
            {
              originalFileName: {
                contains: paginationParams.search,
                mode: "insensitive",
              },
            },
            {
              note: {
                contains: paginationParams.search,
                mode: "insensitive",
              },
            },
            {
              uploadedByUser: {
                fullName: {
                  contains: paginationParams.search,
                  mode: "insensitive",
                },
              },
            },
            {
              uploadedByUser: {
                email: {
                  contains: paginationParams.search,
                  mode: "insensitive",
                },
              },
            },
            {
              paymentAllocation: {
                paymentBatch: {
                  title: {
                    contains: paginationParams.search,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
      : {};

    let whereCondition: Prisma.PaymentReceiptWhereInput = searchCondition;

    if (authenticatedRequest.user.role === "MANAGER") {
      const managerFilter = await getManagerReceiptAccessFilter(
        authenticatedRequest.user.id
      );

      whereCondition = {
        AND: [searchCondition, managerFilter],
      };
    }

    const [receipts, totalCount] = await Promise.all([
      prisma.paymentReceipt.findMany({
        where: whereCondition,
        include: {
          uploadedByUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          reviewedByUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          paymentAllocation: {
            include: {
              apartment: {
                select: {
                  id: true,
                  number: true,
                  block: {
                    select: {
                      id: true,
                      name: true,
                      site: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
              paymentBatch: {
                select: {
                  id: true,
                  title: true,
                  dueDate: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: paginationParams.skip,
        take: paginationParams.limit,
      }),
      prisma.paymentReceipt.count({
        where: whereCondition,
      }),
    ]);

    response.status(200).json({
      success: true,
      data: receipts,
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
  receiptUpload.single("receipt"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    const validationResult = uploadReceiptSchema.safeParse(request.body);

    if (!validationResult.success) {
      await deleteUploadedFile(request.file);

      throw new HttpError(
        400,
        "Gönderilen dekont bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    if (!request.file) {
      throw new HttpError(400, "Dekont dosyası zorunludur.");
    }
    const isAllowedFile = await isAllowedReceiptFile(
      request.file.path,
      request.file.mimetype
    );
    if (!isAllowedFile) {
     await deleteUploadedFile(request.file);
     throw new HttpError(400, "Dekont dosyası gerçek PDF, PNG, JPG veya WEBP formatında olmalıdır.");
    }
    if (!authenticatedRequest.user) {
      await deleteUploadedFile(request.file);

      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const { paymentAllocationId, note } = validationResult.data;

    const allocation = await prisma.paymentAllocation.findUnique({
      where: {
        id: paymentAllocationId,
      },
      select: {
        id: true,
        status: true,
        apartment: {
          select: {
            residents: {
              where: {
                userId: authenticatedRequest.user.id,
              },
              select: {
                id: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!allocation) {
      await deleteUploadedFile(request.file);

      throw new HttpError(404, "Ödeme kaydı bulunamadı.");
    }

    const isSuperAdmin = authenticatedRequest.user.role === "SUPER_ADMIN";
    const isResidentOwnerOfApartment = allocation.apartment.residents.length > 0;

    if (!isSuperAdmin && !isResidentOwnerOfApartment) {
      await deleteUploadedFile(request.file);

      throw new HttpError(403, "Bu ödeme kaydı için dekont yükleme yetkiniz yok.");
    }

    if (allocation.status === "PAID") {
      await deleteUploadedFile(request.file);

      throw new HttpError(409, "Bu ödeme zaten ödenmiş. Yeni dekont yüklenemez.");
    }

    if (allocation.status === "CANCELLED") {
      await deleteUploadedFile(request.file);

      throw new HttpError(400, "İptal edilmiş ödeme için dekont yüklenemez.");
    }

    const existingPendingReceipt = await prisma.paymentReceipt.findFirst({
      where: {
        paymentAllocationId,
        status: "PENDING",
      },
      select: {
        id: true,
      },
    });

    if (existingPendingReceipt) {
      await deleteUploadedFile(request.file);

      throw new HttpError(
        409,
        "Bu ödeme için zaten onay bekleyen bir dekont var. Yönetici onaylayana veya reddedene kadar tekrar yükleyemezsiniz."
      );
    }

    const receipt = await prisma.paymentReceipt.create({
      data: {
        paymentAllocationId,
        uploadedByUserId: authenticatedRequest.user.id,
        originalFileName: request.file.originalname,
        storedFileName: request.file.filename,
        mimeType: request.file.mimetype,
        sizeBytes: request.file.size,
        note,
      },
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "UPLOAD_PAYMENT_RECEIPT",
      entityType: "PaymentReceipt",
      entityId: receipt.id,
      metadata: {
        paymentAllocationId: receipt.paymentAllocationId,
        originalFileName: receipt.originalFileName,
        mimeType: receipt.mimeType,
        sizeBytes: receipt.sizeBytes,
        status: receipt.status,
      },
    });

    response.status(201).json({
      success: true,
      message: "Dekont başarıyla yüklendi ve onay bekliyor.",
      data: receipt,
    });
  })
);

router.get(
  "/:receiptId/download",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    const paramsResult = receiptParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throw new HttpError(400, "Dekont bilgisi geçersiz.");
    }

    const { receiptId } = paramsResult.data;

    const receipt = await ensureUserCanDownloadReceipt({
      user: authenticatedRequest.user,
      receiptId,
    });

    const receiptFilePath = path.join(
      process.cwd(),
      "uploads",
      "receipts",
      receipt.storedFileName
    );

    try {
      await fs.access(receiptFilePath);
    } catch {
      throw new HttpError(404, "Dekont dosyası bulunamadı.");
    }

    response.setHeader("Content-Type", receipt.mimeType);
    response.download(receiptFilePath, receipt.originalFileName);
  })
);

router.patch(
  "/:receiptId/approve",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    const paramsResult = receiptParamsSchema.safeParse(request.params);
    const bodyResult = reviewReceiptSchema.safeParse(request.body);

    if (!paramsResult.success || !bodyResult.success) {
      throw new HttpError(400, "Dekont onay bilgileri geçersiz.");
    }

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const { receiptId } = paramsResult.data;
    const { reviewNote } = bodyResult.data;

    if (authenticatedRequest.user.role === "MANAGER") {
      await ensureManagerCanAccessReceipt({
        managerId: authenticatedRequest.user.id,
        receiptId,
      });
    }

    const receipt = await prisma.paymentReceipt.findUnique({
      where: {
        id: receiptId,
      },
      select: {
        id: true,
        status: true,
        paymentAllocationId: true,
      },
    });

    if (!receipt) {
      throw new HttpError(404, "Dekont bulunamadı.");
    }

    if (receipt.status === "APPROVED") {
      throw new HttpError(409, "Bu dekont zaten onaylanmış.");
    }

    if (receipt.status === "REJECTED") {
      throw new HttpError(409, "Reddedilmiş dekont onaylanamaz.");
    }

    const result = await prisma.$transaction(async (transaction) => {
      const approvedReceipt = await transaction.paymentReceipt.update({
        where: {
          id: receiptId,
        },
        data: {
          status: "APPROVED",
          reviewNote,
          reviewedAt: new Date(),
          reviewedByUserId: authenticatedRequest.user!.id,
        },
      });

      const updatedAllocation = await transaction.paymentAllocation.update({
        where: {
          id: receipt.paymentAllocationId,
        },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      });

      return {
        receipt: approvedReceipt,
        paymentAllocation: updatedAllocation,
      };
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "APPROVE_PAYMENT_RECEIPT",
      entityType: "PaymentReceipt",
      entityId: receiptId,
      metadata: {
        paymentAllocationId: receipt.paymentAllocationId,
        reviewNote,
        paymentAllocationStatus: result.paymentAllocation.status,
      },
    });

    response.status(200).json({
      success: true,
      message: "Dekont onaylandı ve ödeme ödenmiş olarak işaretlendi.",
      data: result,
    });
  })
);

router.patch(
  "/:receiptId/reject",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    const paramsResult = receiptParamsSchema.safeParse(request.params);
    const bodyResult = reviewReceiptSchema.safeParse(request.body);

    if (!paramsResult.success || !bodyResult.success) {
      throw new HttpError(400, "Dekont red bilgileri geçersiz.");
    }

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const { receiptId } = paramsResult.data;
    const { reviewNote } = bodyResult.data;

    if (authenticatedRequest.user.role === "MANAGER") {
      await ensureManagerCanAccessReceipt({
        managerId: authenticatedRequest.user.id,
        receiptId,
      });
    }

    const receipt = await prisma.paymentReceipt.findUnique({
      where: {
        id: receiptId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!receipt) {
      throw new HttpError(404, "Dekont bulunamadı.");
    }

    if (receipt.status === "APPROVED") {
      throw new HttpError(409, "Onaylanmış dekont reddedilemez.");
    }

    if (receipt.status === "REJECTED") {
      throw new HttpError(409, "Bu dekont zaten reddedilmiş.");
    }

    const rejectedReceipt = await prisma.paymentReceipt.update({
      where: {
        id: receiptId,
      },
      data: {
        status: "REJECTED",
        reviewNote,
        reviewedAt: new Date(),
        reviewedByUserId: authenticatedRequest.user.id,
      },
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "REJECT_PAYMENT_RECEIPT",
      entityType: "PaymentReceipt",
      entityId: rejectedReceipt.id,
      metadata: {
        reviewNote,
        status: rejectedReceipt.status,
      },
    });

    response.status(200).json({
      success: true,
      message: "Dekont reddedildi.",
      data: rejectedReceipt,
    });
  })
);


router.post(
  "/manager-confirm",
  requireRole("SUPER_ADMIN", "MANAGER"),
  receiptUpload.single("receipt"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    const uploadedFile = request.file;
    let shouldDeleteUploadedFile = true;

    try {
      if (!authenticatedRequest.user) {
        throw new HttpError(401, "Oturum bulunamadı.");
      }

      if (!uploadedFile) {
        throw new HttpError(400, "Dekont dosyası zorunludur.");
      }

      const validationResult = managerConfirmReceiptSchema.safeParse(request.body);

      if (!validationResult.success) {
        throw new HttpError(
          400,
          "Dekont eşleştirme bilgileri geçersiz.",
          validationResult.error.flatten().fieldErrors
        );
      }

      const isAllowedFile = await isAllowedReceiptFile(
        uploadedFile.path,
        uploadedFile.mimetype
      );

      if (!isAllowedFile) {
        throw new HttpError(
          400,
          "Dekont dosyası gerçek PDF, PNG, JPG veya WEBP formatında olmalıdır."
        );
      }

      const {
        paymentAllocationId,
        amount,
        note,
        payerName,
        bankAccount,
        paymentOwnerType,
      } = validationResult.data;

      let managerAccessFilter: Prisma.PaymentAllocationWhereInput = {};

      if (authenticatedRequest.user.role === "MANAGER") {
        const managerScope = await getManagerScope(authenticatedRequest.user.id);

        if (!hasManagerScope(managerScope)) {
          throw new HttpError(
            403,
            "Bu yöneticiye atanmış bir site veya blok bulunamadı."
          );
        }

        managerAccessFilter = {
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
      }

      const allocation = await prisma.paymentAllocation.findFirst({
        where: {
          id: paymentAllocationId,
          ...managerAccessFilter,
        },
        select: {
          id: true,
          amountKurus: true,
          status: true,
        },
      });

      if (!allocation) {
        throw new HttpError(404, "Eşleşen ödeme kaydı bulunamadı.");
      }

      if (allocation.status === "PAID") {
        throw new HttpError(409, "Bu ödeme zaten ödenmiş.");
      }

      if (allocation.status === "CANCELLED") {
        throw new HttpError(400, "İptal edilmiş ödeme onaylanamaz.");
      }

      if (amount !== undefined) {
        const aiResult = await analyzeReceiptWithAiFallback({
        filePath: uploadedFile.path,
        mimeType: uploadedFile.mimetype,
        originalFileName: uploadedFile.originalname,
      });

      const effectiveAmount = amount ?? aiResult.amount;

      if (effectiveAmount === null || effectiveAmount === undefined) {
        response.status(200).json({
          success: true,
          message:
            "AI dekont tutarını okuyamadı. Lütfen tutarı manuel girip tekrar deneyin.",
          data: {
            status: "Eşleşme bulunamadı",
            message:
              "Dekont tutarı okunamadığı için ödeme eşleştirmesi yapılamadı.",
            apartment: null,
            suggestions: [],
            ai: {
              ...aiResult,
              message: buildAiAnalyzeMessage(aiResult),
            },
          },
        });

        return;
      }

      const amountKurus = Math.round(effectiveAmount * 100);

        if (amountKurus !== allocation.amountKurus) {
          throw new HttpError(
            400,
            "Dekont tutarı ile ödeme tutarı eşleşmiyor."
          );
        }
      }

      const existingPendingReceipt = await prisma.paymentReceipt.findFirst({
        where: {
          paymentAllocationId,
          status: "PENDING",
        },
        select: {
          id: true,
        },
      });

      if (existingPendingReceipt) {
        throw new HttpError(
          409,
          "Bu ödeme için zaten onay bekleyen bir dekont var."
        );
      }

      const fallbackNote = [
        payerName ? `Ödeyen: ${payerName}` : null,
        bankAccount ? `Hesap/IBAN: ${bankAccount}` : null,
        paymentOwnerType ? `Tip: ${paymentOwnerType}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const result = await prisma.$transaction(async (transaction) => {
        const approvedReceipt = await transaction.paymentReceipt.create({
          data: {
            paymentAllocationId,
            uploadedByUserId: authenticatedRequest.user!.id,
            originalFileName: uploadedFile.originalname,
            storedFileName: uploadedFile.filename,
            mimeType: uploadedFile.mimetype,
            sizeBytes: uploadedFile.size,
            note: note || fallbackNote || null,
            status: "APPROVED",
            reviewNote: "Yönetici tarafından eşleştirilerek onaylandı.",
            reviewedAt: new Date(),
            reviewedByUserId: authenticatedRequest.user!.id,
          },
        });

        const updatedAllocation = await transaction.paymentAllocation.update({
          where: {
            id: paymentAllocationId,
          },
          data: {
            status: "PAID",
            paidAt: new Date(),
          },
        });

        return {
          receipt: approvedReceipt,
          paymentAllocation: updatedAllocation,
        };
      });

      shouldDeleteUploadedFile = false;

      await createAuditLog({
        request,
        userId: authenticatedRequest.user.id,
        action: "MANAGER_CONFIRM_PAYMENT_RECEIPT",
        entityType: "PaymentReceipt",
        entityId: result.receipt.id,
        metadata: {
          paymentAllocationId,
          amountKurus: allocation.amountKurus,
          payerName,
          bankAccount,
          paymentOwnerType,
        },
      });

      response.status(201).json({
        success: true,
        message:
          "Dekont eşleştirildi, onaylandı ve ödeme ödendi olarak işaretlendi.",
        data: result,
      });
    } finally {
      if (shouldDeleteUploadedFile) {
        await deleteUploadedFile(uploadedFile);
      }
    }
  })
);

export default router;













