import { type Request } from "express";

import prisma from "../db/prisma.js";
import { type Prisma } from "../generated/prisma/client.js";

type CreateAuditLogParams = {
  request: Request;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
};

function getRequestIp(request: Request) {
  const forwardedFor = request.headers["x-forwarded-for"];

  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0] || request.ip || null;
  }

  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0]?.trim() || request.ip || null;
  }

  return request.ip || null;
}

function getUserAgent(request: Request) {
  const userAgent = request.headers["user-agent"];

  if (Array.isArray(userAgent)) {
    return userAgent[0] || null;
  }

  return userAgent || null;
}

export async function createAuditLog(params: CreateAuditLogParams) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      ipAddress: getRequestIp(params.request),
      userAgent: getUserAgent(params.request),
      ...(params.metadata !== undefined
        ? {
            metadata: params.metadata,
          }
        : {}),
    },
  });
}