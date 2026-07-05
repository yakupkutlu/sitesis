import express, { type Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import crypto from "node:crypto";

import {
  accessTokenCookieName,
  accessTokenCookieOptions,
  clearAccessTokenCookieOptions,
} from "../config/cookie.js";
import { env } from "../config/env.js";
import prisma from "../db/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { forgotPasswordLimiter, loginLimiter } from "../middlewares/rate-limit.middleware.js";
import { queueEmailNotification } from "../services/notification.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(32),
  password: z.string().min(8, "إ‍ifre en az 8 karakter olmalؤ±dؤ±r."),
});

function createPasswordResetToken() {
  const plainToken = crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(plainToken)
    .digest("hex");

  return {
    plainToken,
    tokenHash,
  };
}

function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

router.post(
  "/login",
  loginLimiter,
  asyncHandler(async (request, response) => {
    const validationResult = loginSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(400, "E-posta veya إںifre hatalؤ±.");
    }

    const { email, password } = validationResult.data;
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      throw new HttpError(401, "E-posta veya إںifre hatalؤ±.");
    }

    if (user.status !== "ACTIVE") {
      throw new HttpError(403, "Bu kullanؤ±cؤ± hesabؤ± aktif deؤںildir.");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new HttpError(401, "E-posta veya إںifre hatalؤ±.");
    }

    const jwtExpiresIn = env.JWT_EXPIRES_IN as SignOptions["expiresIn"];

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      env.JWT_SECRET,
      {
        expiresIn: jwtExpiresIn,
      }
    );

    response.cookie(accessTokenCookieName, token, accessTokenCookieOptions);

    response.status(200).json({
      success: true,
      message: "Giriإں baإںarؤ±lؤ±.",
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  })
);

router.post(
  "/forgot-password",
  asyncHandler(async (request, response) => {
    const validationResult = forgotPasswordSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gأ¶nderilen e-posta bilgisi geأ§ersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { email } = validationResult.data;
    const normalizedEmail = email.toLowerCase();

    const genericMessage =
      "إ‍ifre sؤ±fؤ±rlama talebiniz alؤ±nmؤ±إںtؤ±r. Eؤںer e-posta sistemde kayؤ±tlؤ±ysa sؤ±fؤ±rlama baؤںlantؤ±sؤ± gأ¶nderilecektir.";

    const user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        status: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
        fullName: true,
      },
    });

    if (!user) {
      response.status(200).json({
        success: true,
        message: genericMessage,
      });
      return;
    }

    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    });

    const { plainToken, tokenHash } = createPasswordResetToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15);

    const passwordResetToken = await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${plainToken}`;

    await queueEmailNotification({
      recipientUserId: user.id,
      recipientEmail: user.email,
      subject: "إ‍ifre sؤ±fؤ±rlama talebi",
      message: `إ‍ifre sؤ±fؤ±rlama baؤںlantؤ±nؤ±z: ${resetUrl}`,
      sourceType: "SYSTEM",
      entityType: "PasswordResetToken",
      entityId: passwordResetToken.id,
      metadata: {
        purpose: "PASSWORD_RESET",
        expiresAt: expiresAt.toISOString(),
      },
    });

    response.status(200).json({
      success: true,
      message: genericMessage,
      ...(env.NODE_ENV !== "production"
        ? {
            debug: {
              resetToken: plainToken,
              resetUrl,
            },
          }
        : {}),
    });
  })
);

router.post(
  "/reset-password",
  asyncHandler(async (request, response) => {
    const validationResult = resetPasswordSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gأ¶nderilen إںifre sؤ±fؤ±rlama bilgileri geأ§ersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { token, password } = validationResult.data;
    const tokenHash = hashPasswordResetToken(token);

    const passwordResetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
          },
        },
      },
    });

    if (!passwordResetToken || passwordResetToken.user.status !== "ACTIVE") {
      throw new HttpError(
        400,
        "إ‍ifre sؤ±fؤ±rlama baؤںlantؤ±sؤ± geأ§ersiz veya sأ¼resi dolmuإں."
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: passwordResetToken.user.id,
        },
        data: {
          passwordHash,
        },
      }),
      prisma.passwordResetToken.update({
        where: {
          id: passwordResetToken.id,
        },
        data: {
          usedAt: new Date(),
        },
      }),
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: passwordResetToken.user.id,
          usedAt: null,
          id: {
            not: passwordResetToken.id,
          },
        },
      }),
    ]);

    await queueEmailNotification({
      recipientUserId: passwordResetToken.user.id,
      recipientEmail: passwordResetToken.user.email,
      subject: "إ‍ifreniz gأ¼ncellendi",
      message: "Hesabؤ±nؤ±zؤ±n إںifresi baإںarؤ±yla gأ¼ncellendi.",
      sourceType: "SYSTEM",
      entityType: "User",
      entityId: passwordResetToken.user.id,
      metadata: {
        purpose: "PASSWORD_CHANGED",
      },
    });

    response.status(200).json({
      success: true,
      message: "إ‍ifreniz baإںarؤ±yla gأ¼ncellendi.",
    });
  })
);

router.get("/me", requireAuth, (request: AuthenticatedRequest, response: Response) => {
  response.status(200).json({
    success: true,
    data: {
      user: request.user,
    },
  });
});

router.post("/logout", (_request, response) => {
  response.clearCookie(accessTokenCookieName, clearAccessTokenCookieOptions);

  response.status(200).json({
    success: true,
    message: "أ‡ؤ±kؤ±إں baإںarؤ±lؤ±.",
  });
});

export default router;
