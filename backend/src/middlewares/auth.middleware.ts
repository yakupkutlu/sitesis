import { type NextFunction, type Request, type Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

import { accessTokenCookieName } from "../config/cookie.js";
import { env } from "../config/env.js";
import prisma from "../db/prisma.js";

export const accountModes = ["SUPER_ADMIN", "MANAGER", "RESIDENT"] as const;

export type AccountMode = (typeof accountModes)[number];

export type AuthenticatedUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  /** Etkin rol: seçilen hesap moduna göre bütün route kontrollerinde kullanılır. */
  role: AccountMode;
  /** Veritabanındaki değişmeyen asıl hesap rolü. */
  primaryRole: AccountMode;
  accountMode: AccountMode;
  availableModes: AccountMode[];
  hasResidentAccess: boolean;
  canSwitchAccountMode: boolean;
  requiresModeSelection: boolean;
  mustChangePassword: boolean;
  status: "ACTIVE" | "PASSIVE";
  createdAt: Date;
  updatedAt: Date;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

export function isAccountMode(value: unknown): value is AccountMode {
  return (
    typeof value === "string" &&
    (accountModes as readonly string[]).includes(value)
  );
}

export function getAvailableAccountModes(
  primaryRole: AccountMode,
  hasResidentAccess: boolean
): AccountMode[] {
  if (primaryRole === "RESIDENT") {
    return ["RESIDENT"];
  }

  return hasResidentAccess
    ? [primaryRole, "RESIDENT"]
    : [primaryRole];
}

export async function requireAuth(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction
) {
  const token = request.cookies[accessTokenCookieName];

  if (!token) {
    response.status(401).json({
      success: false,
      message: "Oturum bulunamadı.",
    });
    return;
  }

  let payload: string | JwtPayload;

  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    response.status(401).json({
      success: false,
      message: "Oturum geçersiz veya süresi dolmuş.",
    });
    return;
  }

  if (typeof payload === "string" || typeof payload.userId !== "string") {
    response.status(401).json({
      success: false,
      message: "Oturum geçersiz.",
    });
    return;
  }

  const databaseUser = await prisma.user.findUnique({
    where: {
      id: payload.userId,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
      apartmentResidents: {
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!databaseUser) {
    response.status(401).json({
      success: false,
      message: "Kullanıcı bulunamadı.",
    });
    return;
  }

  if (databaseUser.status !== "ACTIVE") {
    response.status(403).json({
      success: false,
      message: "Kullanıcı hesabı aktif değil.",
    });
    return;
  }

  const primaryRole = databaseUser.role as AccountMode;
  const hasResidentAccess =
    primaryRole === "RESIDENT" || databaseUser.apartmentResidents.length > 0;
  const availableModes = getAvailableAccountModes(
    primaryRole,
    hasResidentAccess
  );

  const tokenAccountMode = isAccountMode(payload.accountMode)
    ? payload.accountMode
    : primaryRole;

  /*
   * JWT içindeki mod, güncel veritabanı ilişkileriyle tekrar doğrulanır.
   * Örneğin sakin bağlantısı kaldırılmışsa eski RESIDENT modu kullanılamaz.
   */
  const accountMode = availableModes.includes(tokenAccountMode)
    ? tokenAccountMode
    : primaryRole;

  /* Eski tokenlar geriye dönük uyumluluk için seçilmiş kabul edilir. */
  const modeSelected = payload.modeSelected !== false;
  const canSwitchAccountMode = availableModes.length > 1;
  const requiresModeSelection = canSwitchAccountMode && !modeSelected;

  request.user = {
    id: databaseUser.id,
    fullName: databaseUser.fullName,
    email: databaseUser.email,
    phone: databaseUser.phone,
    role: accountMode,
    primaryRole,
    accountMode,
    availableModes,
    hasResidentAccess,
    canSwitchAccountMode,
    requiresModeSelection,
    mustChangePassword: databaseUser.mustChangePassword,
    status: databaseUser.status,
    createdAt: databaseUser.createdAt,
    updatedAt: databaseUser.updatedAt,
  };

  /*
   * Çift modlu hesap, ilk girişte seçim yapmadan başka bir korumalı API'ye
   * gidemez. Bu kontrol yalnızca frontend yönlendirmesine bırakılmaz.
   */
  const isModeSelectionEndpoint =
    request.baseUrl === "/api/auth" &&
    (request.path === "/me" || request.path === "/select-mode");

  if (requiresModeSelection && !isModeSelectionEndpoint) {
    response.status(409).json({
      success: false,
      message: "Devam etmek için hesap kullanım modunu seçmelisiniz.",
      code: "ACCOUNT_MODE_SELECTION_REQUIRED",
    });
    return;
  }

  /*
   * Kurulum/kurtarma akışıyla oluşturulan hesaplar ilk girişte şifre
   * değiştirmeden diğer korumalı API'lere erişemez.
   */
  const isPasswordChangeExemptEndpoint =
    request.baseUrl === "/api/auth" &&
    (request.path === "/me" || request.path === "/change-password");

  if (databaseUser.mustChangePassword && !isPasswordChangeExemptEndpoint) {
    response.status(403).json({
      success: false,
      message: "Devam etmek için şifrenizi değiştirmelisiniz.",
      code: "PASSWORD_CHANGE_REQUIRED",
    });
    return;
  }

  next();
}

export function requireRole(...allowedRoles: AccountMode[]) {
  return (
    request: AuthenticatedRequest,
    response: Response,
    next: NextFunction
  ) => {
    if (!request.user) {
      response.status(401).json({
        success: false,
        message: "Oturum bulunamadı.",
      });
      return;
    }

    /*
     * request.user.role veritabanındaki asıl rol değil, sunucunun doğruladığı
     * etkin hesap modudur. Böylece sakin modundaki bir yönetici yönetici
     * endpointlerine erişemez.
     */
    if (!allowedRoles.includes(request.user.role)) {
      response.status(403).json({
        success: false,
        message: "Bu işlem için yetkiniz yok.",
      });
      return;
    }

    next();
  };
}
