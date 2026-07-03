import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { receiptUpload } from "../uploads/receipt-upload.js";

const router = express.Router();

router.use(requireAuth);

const uploadReceiptSchema = z.object({
  paymentAllocationId: z.string().uuid(),
  note: z.string().trim().optional(),
});

router.get("/", requireRole("SUPER_ADMIN"), async (_request: Request, response: Response) => {
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
});

router.post(
  "/",
  receiptUpload.single("receipt"),
  async (request: AuthenticatedRequest, response: Response) => {
    const validationResult = uploadReceiptSchema.safeParse(request.body);

    if (!validationResult.success) {
      response.status(400).json({
        success: false,
        message: "Gönderilen dekont bilgileri geçersiz.",
        errors: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    if (!request.file) {
      response.status(400).json({
        success: false,
        message: "Dekont dosyası zorunludur.",
      });
      return;
    }

    if (!request.user) {
      response.status(401).json({
        success: false,
        message: "Oturum bulunamadı.",
      });
      return;
    }

    const { paymentAllocationId, note } = validationResult.data;

    const allocation = await prisma.paymentAllocation.findUnique({
      where: {
        id: paymentAllocationId,
      },
      select: {
        id: true,
      },
    });

    if (!allocation) {
      response.status(404).json({
        success: false,
        message: "Ödeme kaydı bulunamadı.",
      });
      return;
    }

    const receipt = await prisma.paymentReceipt.create({
      data: {
        paymentAllocationId,
        uploadedByUserId: request.user.id,
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
  }
);

const receiptParamsSchema = z.object({
  receiptId: z.string().uuid(),
});

const reviewReceiptSchema = z.object({
  reviewNote: z.string().trim().optional(),
});

router.patch(
  "/:receiptId/approve",
  requireRole("SUPER_ADMIN"),
  async (request: AuthenticatedRequest, response: Response) => {
    const paramsResult = receiptParamsSchema.safeParse(request.params);
    const bodyResult = reviewReceiptSchema.safeParse(request.body);

    if (!paramsResult.success || !bodyResult.success) {
      response.status(400).json({
        success: false,
        message: "Dekont onay bilgileri geçersiz.",
      });
      return;
    }

    if (!request.user) {
      response.status(401).json({
        success: false,
        message: "Oturum bulunamadı.",
      });
      return;
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
      response.status(404).json({
        success: false,
        message: "Dekont bulunamadı.",
      });
      return;
    }

    if (receipt.status === "APPROVED") {
      response.status(409).json({
        success: false,
        message: "Bu dekont zaten onaylanmış.",
      });
      return;
    }

    if (receipt.status === "REJECTED") {
      response.status(409).json({
        success: false,
        message: "Reddedilmiş dekont onaylanamaz.",
      });
      return;
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
          reviewedByUserId: request.user!.id,
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
  }
);

router.patch(
  "/:receiptId/reject",
  requireRole("SUPER_ADMIN"),
  async (request: AuthenticatedRequest, response: Response) => {
    const paramsResult = receiptParamsSchema.safeParse(request.params);
    const bodyResult = reviewReceiptSchema.safeParse(request.body);

    if (!paramsResult.success || !bodyResult.success) {
      response.status(400).json({
        success: false,
        message: "Dekont red bilgileri geçersiz.",
      });
      return;
    }

    if (!request.user) {
      response.status(401).json({
        success: false,
        message: "Oturum bulunamadı.",
      });
      return;
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
      response.status(404).json({
        success: false,
        message: "Dekont bulunamadı.",
      });
      return;
    }

    if (receipt.status === "APPROVED") {
      response.status(409).json({
        success: false,
        message: "Onaylanmış dekont reddedilemez.",
      });
      return;
    }

    if (receipt.status === "REJECTED") {
      response.status(409).json({
        success: false,
        message: "Bu dekont zaten reddedilmiş.",
      });
      return;
    }

    const rejectedReceipt = await prisma.paymentReceipt.update({
      where: {
        id: receiptId,
      },
      data: {
        status: "REJECTED",
        reviewNote,
        reviewedAt: new Date(),
        reviewedByUserId: request.user.id,
      },
    });

    response.status(200).json({
      success: true,
      message: "Dekont reddedildi.",
      data: rejectedReceipt,
    });
  }
);

export default router;