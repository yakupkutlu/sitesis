import express, { type Request, type Response } from "express";
import { z } from "zod";

import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";
import { createAuditLog } from "../services/audit-log.service.js";
import { sendManualNotificationBatch } from "../services/manual-notification.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

const MAX_RECIPIENT_COUNT = 100;
const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5_000;

const manualNotificationSchema = z
  .object({
    channel: z.enum(["SMS", "EMAIL"]),
    recipientUserIds: z
      .array(z.string().uuid())
      .max(MAX_RECIPIENT_COUNT)
      .optional()
      .default([]),
    directRecipients: z
      .array(z.string().trim().min(1))
      .max(MAX_RECIPIENT_COUNT)
      .optional()
      .default([]),
    subject: z.string().trim().max(MAX_SUBJECT_LENGTH).optional(),
    message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  })
  .strict()
  .superRefine((data, context) => {
    const requestedRecipientCount =
      data.recipientUserIds.length + data.directRecipients.length;

    if (requestedRecipientCount === 0) {
      context.addIssue({
        code: "custom",
        path: ["recipientUserIds"],
        message: "En az bir kullanıcı veya doğrudan alıcı seçilmelidir.",
      });
    }

    if (requestedRecipientCount > MAX_RECIPIENT_COUNT) {
      context.addIssue({
        code: "custom",
        path: ["recipientUserIds"],
        message: `Tek seferde en fazla ${MAX_RECIPIENT_COUNT} alıcı seçilebilir.`,
      });
    }

    if (data.channel === "EMAIL" && !data.subject?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["subject"],
        message: "E-posta konusu zorunludur.",
      });
    }

    data.directRecipients.forEach((recipient, index) => {
      if (data.channel === "EMAIL") {
        const emailResult = z.string().email().safeParse(recipient);

        if (!emailResult.success) {
          context.addIssue({
            code: "custom",
            path: ["directRecipients", index],
            message: "Geçerli bir e-posta adresi girilmelidir.",
          });
        }

        return;
      }

      if (!/^\+[1-9]\d{7,14}$/.test(recipient)) {
        context.addIssue({
          code: "custom",
          path: ["directRecipients", index],
          message:
            "Telefon numarası + ülke kodu ile uluslararası formatta ve 8-15 rakam olmalıdır.",
        });
      }
    });
  });

router.post(
  "/",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const validationResult = manualNotificationSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Manuel bildirim bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const {
      channel,
      recipientUserIds,
      directRecipients,
      subject,
      message,
    } = validationResult.data;

    const result = await sendManualNotificationBatch({
      channel,
      recipientUserIds,
      directRecipients,
      subject,
      message,
      createdByUserId: authenticatedRequest.user.id,
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "SEND_MANUAL_NOTIFICATION_BATCH",
      entityType: "ManualNotificationBatch",
      entityId: result.batchId,
      metadata: {
        channel: result.channel,
        requestedUserCount: recipientUserIds.length,
        requestedDirectRecipientCount: directRecipients.length,
        unresolvedUserCount: result.unresolvedUserIds.length,
        summary: result.summary,
      },
    });

    const channelLabel = channel === "EMAIL" ? "E-posta" : "SMS";

    response.status(200).json({
      success: true,
      message: `${channelLabel} gönderim işlemi tamamlandı.`,
      data: result,
    });
  })
);

export default router;
