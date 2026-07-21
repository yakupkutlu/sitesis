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
import {
  getAvailableAccountModes,
  requireAuth,
  type AccountMode,
  type AuthenticatedRequest,
  type ResidentApartmentOption,
} from "../middlewares/auth.middleware.js";
import { forgotPasswordLimiter, loginLimiter, resetPasswordLimiter } from "../middlewares/rate-limit.middleware.js";
import { queueEmailNotification } from "../services/notification.service.js";
import { createAuditLog } from "../services/audit-log.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const selectAccountModeSchema = z
  .object({
    mode: z.enum(["SUPER_ADMIN", "MANAGER", "RESIDENT"]),
  })
  .strict();

const selectApartmentSchema = z
  .object({
    apartmentId: z.string().uuid(),
  })
  .strict();

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(32),
  password: z.string().min(8, "Şifre en az 8 karakter olmalıdır."),
});

const updateOwnProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).optional(),
    phone: z.string().trim().nullable().optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "En az bir alan gönderilmelidir.",
  });

const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const ownUserSelectFields = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;


type AuthUserSource = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: AccountMode;
  status: "ACTIVE" | "PASSIVE";
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function createAccessToken(params: {
  userId: string;
  primaryRole: AccountMode;
  accountMode: AccountMode;
  modeSelected: boolean;
  selectedApartmentId?: string | null;
}) {
  const jwtExpiresIn = env.JWT_EXPIRES_IN as SignOptions["expiresIn"];

  return jwt.sign(
    {
      userId: params.userId,
      primaryRole: params.primaryRole,
      accountMode: params.accountMode,
      modeSelected: params.modeSelected,
      selectedApartmentId: params.selectedApartmentId ?? null,
    },
    env.JWT_SECRET,
    {
      expiresIn: jwtExpiresIn,
    }
  );
}

function buildAuthUserData(params: {
  user: AuthUserSource;
  accountMode: AccountMode;
  hasResidentAccess: boolean;
  modeSelected: boolean;
  residentApartments: ResidentApartmentOption[];
  selectedApartmentId?: string | null;
}) {
  const primaryRole = params.user.role;
  const availableModes = getAvailableAccountModes(
    primaryRole,
    params.hasResidentAccess
  );
  const canSwitchAccountMode = availableModes.length > 1;
  const selectedApartment =
    params.accountMode === "RESIDENT"
      ? params.residentApartments.find(
          (item) => item.apartment.id === params.selectedApartmentId
        ) ??
        (params.residentApartments.length === 1
          ? params.residentApartments[0]
          : null)
      : null;
  const selectedApartmentId = selectedApartment?.apartment.id ?? null;
  const requiresModeSelection =
    canSwitchAccountMode && !params.modeSelected;
  const requiresApartmentSelection =
    !requiresModeSelection &&
    params.accountMode === "RESIDENT" &&
    params.residentApartments.length > 1 &&
    !selectedApartment;

  return {
    id: params.user.id,
    fullName: params.user.fullName,
    email: params.user.email,
    phone: params.user.phone,
    role: params.accountMode,
    primaryRole,
    accountMode: params.accountMode,
    availableModes,
    hasResidentAccess: params.hasResidentAccess,
    canSwitchAccountMode,
    requiresModeSelection,
    residentApartments: params.residentApartments,
    selectedApartmentId,
    selectedApartment,
    requiresApartmentSelection,
    mustChangePassword: params.user.mustChangePassword,
    status: params.user.status,
    createdAt: params.user.createdAt,
    updatedAt: params.user.updatedAt,
  };
}


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
      throw new HttpError(400, "E-posta veya şifre hatalı.");
    }

    const { email, password } = validationResult.data;
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      include: {
        apartmentResidents: {
          select: {
            id: true,
            type: true,
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
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!user) {
      throw new HttpError(401, "E-posta veya şifre hatalı.");
    }

    if (user.status !== "ACTIVE") {
      throw new HttpError(403, "Bu kullanıcı hesabı aktif değildir.");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new HttpError(401, "E-posta veya şifre hatalı.");
    }

    const primaryRole = user.role as AccountMode;
    const residentApartments: ResidentApartmentOption[] =
      user.apartmentResidents.map((residentLink) => ({
        residentLinkId: residentLink.id,
        residentType: residentLink.type,
        apartment: residentLink.apartment,
      }));
    const hasResidentAccess =
      primaryRole === "RESIDENT" || residentApartments.length > 0;
    const availableModes = getAvailableAccountModes(
      primaryRole,
      hasResidentAccess
    );

    /* Çift modlu hesaplarda girişten sonra kullanıcı seçim yapmalıdır. */
    const modeSelected = availableModes.length === 1;
    const accountMode = primaryRole;
    const selectedApartmentId =
      modeSelected &&
      accountMode === "RESIDENT" &&
      residentApartments.length === 1
        ? residentApartments[0].apartment.id
        : null;

    const token = createAccessToken({
      userId: user.id,
      primaryRole,
      accountMode,
      modeSelected,
      selectedApartmentId,
    });

    response.cookie(accessTokenCookieName, token, accessTokenCookieOptions);

    response.status(200).json({
      success: true,
      message: "Giriş başarılı.",
      data: {
        user: buildAuthUserData({
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            role: primaryRole,
            status: user.status,
            mustChangePassword: user.mustChangePassword,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          accountMode,
          hasResidentAccess,
          modeSelected,
          residentApartments,
          selectedApartmentId,
        }),
      },
    });
  })
);

router.post(
  "/select-mode",
  requireAuth,
  asyncHandler(async (request: AuthenticatedRequest, response: Response) => {
    if (!request.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const validationResult = selectAccountModeSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Hesap modu bilgisi geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const selectedMode = validationResult.data.mode;

    if (!request.user.availableModes.includes(selectedMode)) {
      throw new HttpError(
        403,
        selectedMode === "RESIDENT"
          ? "Bu hesabın sakin olarak kullanım yetkisi bulunmamaktadır."
          : "Bu hesap modu için yetkiniz bulunmamaktadır."
      );
    }

    const previousMode = request.user.accountMode;
    const selectedApartmentId =
      selectedMode === "RESIDENT" &&
      request.user.residentApartments.length === 1
        ? request.user.residentApartments[0].apartment.id
        : null;
    const selectedApartment =
      request.user.residentApartments.find(
        (item) => item.apartment.id === selectedApartmentId
      ) ?? null;
    const requiresApartmentSelection =
      selectedMode === "RESIDENT" &&
      request.user.residentApartments.length > 1 &&
      !selectedApartment;

    const token = createAccessToken({
      userId: request.user.id,
      primaryRole: request.user.primaryRole,
      accountMode: selectedMode,
      modeSelected: true,
      selectedApartmentId,
    });

    await createAuditLog({
      request,
      userId: request.user.id,
      action: "SELECT_ACCOUNT_MODE",
      entityType: "User",
      entityId: request.user.id,
      metadata: {
        primaryRole: request.user.primaryRole,
        previousMode,
        selectedMode,
      },
    });

    response.cookie(accessTokenCookieName, token, accessTokenCookieOptions);

    response.status(200).json({
      success: true,
      message:
        selectedMode === "RESIDENT"
          ? "Sakin moduna geçildi."
          : selectedMode === "MANAGER"
            ? "Yönetici moduna geçildi."
            : "Süper admin moduna geçildi.",
      data: {
        user: {
          ...request.user,
          role: selectedMode,
          accountMode: selectedMode,
          requiresModeSelection: false,
          selectedApartmentId,
          selectedApartment,
          requiresApartmentSelection,
        },
      },
    });
  })
);

router.post(
  "/select-apartment",
  requireAuth,
  asyncHandler(async (request: AuthenticatedRequest, response: Response) => {
    if (!request.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    if (request.user.accountMode !== "RESIDENT") {
      throw new HttpError(
        403,
        "Daire seçimi yalnızca sakin modunda yapılabilir."
      );
    }

    const validationResult = selectApartmentSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Daire seçim bilgisi geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const selectedApartment = request.user.residentApartments.find(
      (item) => item.apartment.id === validationResult.data.apartmentId
    );

    if (!selectedApartment) {
      throw new HttpError(
        403,
        "Bu daireye sakin olarak erişim yetkiniz bulunmamaktadır."
      );
    }

    const token = createAccessToken({
      userId: request.user.id,
      primaryRole: request.user.primaryRole,
      accountMode: "RESIDENT",
      modeSelected: true,
      selectedApartmentId: selectedApartment.apartment.id,
    });

    await createAuditLog({
      request,
      userId: request.user.id,
      action: "SELECT_RESIDENT_APARTMENT",
      entityType: "Apartment",
      entityId: selectedApartment.apartment.id,
      metadata: {
        previousApartmentId: request.user.selectedApartmentId,
        selectedApartmentId: selectedApartment.apartment.id,
        residentType: selectedApartment.residentType,
      },
    });

    response.cookie(accessTokenCookieName, token, accessTokenCookieOptions);

    response.status(200).json({
      success: true,
      message: "Aktif daire başarıyla seçildi.",
      data: {
        user: {
          ...request.user,
          selectedApartmentId: selectedApartment.apartment.id,
          selectedApartment,
          requiresApartmentSelection: false,
        },
      },
    });
  })
);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  asyncHandler(async (request, response) => {
    const validationResult = forgotPasswordSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen e-posta bilgisi geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { email } = validationResult.data;
    const normalizedEmail = email.toLowerCase();

    const genericMessage =
      "Şifre sıfırlama talebiniz alınmıştır. Eğer e-posta sistemde kayıtlıysa sıfırlama bağlantısı gönderilecektir.";

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
      subject: "Şifre sıfırlama talebi",
      message: `Şifre sıfırlama bağlantınız: ${resetUrl}`,
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
  resetPasswordLimiter,
  asyncHandler(async (request, response) => {
    const validationResult = resetPasswordSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen şifre sıfırlama bilgileri geçersiz.",
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
        "Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş."
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
      subject: "Şifreniz güncellendi",
      message: "Hesabınızın şifresi başarıyla güncellendi.",
      sourceType: "SYSTEM",
      entityType: "User",
      entityId: passwordResetToken.user.id,
      metadata: {
        purpose: "PASSWORD_CHANGED",
      },
    });

    response.status(200).json({
      success: true,
      message: "Şifreniz başarıyla güncellendi.",
    });
  })
);


router.patch(
  "/me",
  requireAuth,
  asyncHandler(async (request: AuthenticatedRequest, response: Response) => {
    if (!request.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const validationResult = updateOwnProfileSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Profil bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { fullName, phone } = validationResult.data;

    const updateData: {
      fullName?: string;
      phone?: string | null;
    } = {};

    if (fullName !== undefined) {
      updateData.fullName = fullName;
    }

    if (phone !== undefined) {
      updateData.phone = phone && phone.length > 0 ? phone : null;
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: request.user.id,
      },
      data: updateData,
      select: ownUserSelectFields,
    });

    await createAuditLog({
      request,
      userId: request.user.id,
      action: "UPDATE_OWN_PROFILE",
      entityType: "User",
      entityId: updatedUser.id,
      metadata: {
        fullNameChanged: fullName !== undefined,
        phoneChanged: phone !== undefined,
      },
    });

    response.status(200).json({
      success: true,
      message: "Profil bilgileri başarıyla güncellendi.",
      data: {
        user: updatedUser,
      },
    });
  })
);

router.patch(
  "/change-password",
  requireAuth,
  asyncHandler(async (request: AuthenticatedRequest, response: Response) => {
    if (!request.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const validationResult = changeOwnPasswordSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Şifre bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { currentPassword, newPassword } = validationResult.data;

    const user = await prisma.user.findUnique({
      where: {
        id: request.user.id,
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        status: true,
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new HttpError(404, "Kullanıcı bulunamadı.");
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new HttpError(400, "Mevcut şifre hatalı.");
    }

    const nextPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash: nextPasswordHash,
        mustChangePassword: false,
      },
    });

    await createAuditLog({
      request,
      userId: request.user.id,
      action: "CHANGE_OWN_PASSWORD",
      entityType: "User",
      entityId: user.id,
      metadata: {
        passwordChanged: true,
      },
    });

    response.status(200).json({
      success: true,
      message: "Şifre başarıyla güncellendi.",
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
    message: "Çıkış başarılı.",
  });
});

export default router;

