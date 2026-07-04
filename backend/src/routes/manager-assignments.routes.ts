import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";
import { createAuditLog } from "../services/audit-log.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

const createManagerAssignmentSchema = z.object({
  managerId: z.string().uuid(),
  scopeType: z.enum(["SITE", "BLOCK"]),
  siteId: z.string().uuid().optional(),
  blockId: z.string().uuid().optional(),
});

router.get(
  "/",
  asyncHandler(async (_request: Request, response: Response) => {
    const assignments = await prisma.managerAssignment.findMany({
      include: {
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
        site: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
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
      orderBy: {
        createdAt: "desc",
      },
    });

    response.status(200).json({
      success: true,
      data: assignments,
    });
  })
);

router.post(
  "/",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const validationResult = createManagerAssignmentSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen yönetici yetki bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { managerId, scopeType, siteId, blockId } = validationResult.data;

    const manager = await prisma.user.findUnique({
      where: {
        id: managerId,
      },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!manager) {
      throw new HttpError(404, "Yönetici kullanıcısı bulunamadı.");
    }

    if (manager.role !== "MANAGER") {
      throw new HttpError(
        400,
        "Sadece MANAGER rolündeki kullanıcılar yönetici olarak atanabilir."
      );
    }

    if (manager.status !== "ACTIVE") {
      throw new HttpError(400, "Pasif yöneticiye yetki atanamaz.");
    }

    if (scopeType === "SITE") {
      if (!siteId) {
        throw new HttpError(400, "Site yetkisi için site seçimi zorunludur.");
      }

      if (blockId) {
        throw new HttpError(400, "Site yetkisinde blockId gönderilmemelidir.");
      }

      const site = await prisma.site.findUnique({
        where: {
          id: siteId,
        },
        select: {
          id: true,
        },
      });

      if (!site) {
        throw new HttpError(404, "Site bulunamadı.");
      }

      const existingAssignment = await prisma.managerAssignment.findFirst({
        where: {
          managerId,
          scopeType: "SITE",
          siteId,
        },
        select: {
          id: true,
        },
      });

      if (existingAssignment) {
        throw new HttpError(409, "Bu yönetici zaten bu siteye atanmış.");
      }

      const assignment = await prisma.managerAssignment.create({
        data: {
          managerId,
          scopeType,
          siteId,
        },
        include: {
          manager: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              status: true,
            },
          },
          site: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
        },
      });

      await createAuditLog({
        request,
        userId: authenticatedRequest.user.id,
        action: "CREATE_MANAGER_ASSIGNMENT",
        entityType: "ManagerAssignment",
        entityId: assignment.id,
        metadata: {
          managerId: assignment.managerId,
          scopeType: assignment.scopeType,
          siteId: assignment.siteId,
        },
      });

      response.status(201).json({
        success: true,
        message: "Yönetici siteye başarıyla atandı.",
        data: assignment,
      });

      return;
    }

    if (!blockId) {
      throw new HttpError(400, "Blok/Apartman yetkisi için block seçimi zorunludur.");
    }

    if (siteId) {
      throw new HttpError(400, "Blok yetkisinde siteId gönderilmemelidir.");
    }

    const block = await prisma.block.findUnique({
      where: {
        id: blockId,
      },
      select: {
        id: true,
      },
    });

    if (!block) {
      throw new HttpError(404, "Blok/Apartman bulunamadı.");
    }

    const existingAssignment = await prisma.managerAssignment.findFirst({
      where: {
        managerId,
        scopeType: "BLOCK",
        blockId,
      },
      select: {
        id: true,
      },
    });

    if (existingAssignment) {
      throw new HttpError(409, "Bu yönetici zaten bu blok/apartmana atanmış.");
    }

    const assignment = await prisma.managerAssignment.create({
      data: {
        managerId,
        scopeType,
        blockId,
      },
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            status: true,
          },
        },
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
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "CREATE_MANAGER_ASSIGNMENT",
      entityType: "ManagerAssignment",
      entityId: assignment.id,
      metadata: {
        managerId: assignment.managerId,
        scopeType: assignment.scopeType,
        blockId: assignment.blockId,
      },
    });

    response.status(201).json({
      success: true,
      message: "Yönetici blok/apartmana başarıyla atandı.",
      data: assignment,
    });
  })
);

export default router;