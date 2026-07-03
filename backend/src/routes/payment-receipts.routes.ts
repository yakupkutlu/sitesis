import fs from "node:fs/promises";

import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";
import { receiptUpload } from "../uploads/receipt-upload.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

router.use(requireAuth);

const uploadReceiptSchema = z.object({
  paymentAllocationId: z.string().uuid(),
  note: z.string().trim().optional(),
});

const receiptParamsSchema = z.object({
  receiptId: z.string().uuid(),
});

const reviewReceiptSchema = z.object({
  reviewNote: z.string().trim().optional(),
});

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

router.get(
  "/",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (_request: Request, response: Response) => {
    const receipts = await prisma.paymentReceipt.findMany({
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
    });

    response.status(200).json({
      success: true,
      data: receipts,
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

    response.status(201).json({
      success: true,
      message: "Dekont başarıyla yüklendi ve onay bekliyor.",
      data: receipt,
    });
  })
);

router.patch(
  "/:receiptId/approve",
  requireRole("SUPER_ADMIN"),
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

    response.status(200).json({
      success: true,
      message: "Dekont onaylandı ve ödeme ödenmiş olarak işaretlendi.",
      data: result,
    });
  })
);

router.patch(
  "/:receiptId/reject",
  requireRole("SUPER_ADMIN"),
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

    response.status(200).json({
      success: true,
      message: "Dekont reddedildi.",
      data: rejectedReceipt,
    });
  })
);

export default router;