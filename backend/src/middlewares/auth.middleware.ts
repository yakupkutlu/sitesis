import process from "node:process";
import { type NextFunction, type Request, type Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

import prisma from "../db/prisma.js";

export type AuthenticatedUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: "SUPER_ADMIN" | "MANAGER" | "RESIDENT";
  status: "ACTIVE" | "PASSIVE";
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

export async function requireAuth(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction
) {
  const token = request.cookies?.accessToken;

  if (!token) {
    response.status(401).json({
      success: false,
      message: "Oturum bulunamadı.",
    });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    response.status(500).json({
      success: false,
      message: "JWT ayarı bulunamadı.",
    });
    return;
  }

  let payload: string | JwtPayload;

  try {
    payload = jwt.verify(token, jwtSecret);
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

  const user = await prisma.user.findUnique({
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
    },
  });

  if (!user) {
    response.status(401).json({
      success: false,
      message: "Kullanıcı bulunamadı.",
    });
    return;
  }

  if (user.status !== "ACTIVE") {
    response.status(403).json({
      success: false,
      message: "Kullanıcı hesabı aktif değil.",
    });
    return;
  }

  request.user = user;
  next();
}

export function requireRole(...allowedRoles: AuthenticatedUser["role"][]) {
  return (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    if (!request.user) {
      response.status(401).json({
        success: false,
        message: "Oturum bulunamadı.",
      });
      return;
    }

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