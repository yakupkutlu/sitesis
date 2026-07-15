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

const managerAssignmentInclude = {
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
      siteId: true,
      site: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
    },
  },
} as const;

const createManagerAssignmentSchema = z.object({
  managerId: z.string().uuid(),
  scopeType: z.enum(["SITE", "BLOCK"]),
  siteId: z.string().uuid().optional(),
  blockId: z.string().uuid().optional(),
});

const selectActiveAssignmentSchema = z
  .object({
    assignmentId: z.string().uuid(),
  })
  .strict();

function getAuthenticatedUser(request: Request) {
  const authenticatedRequest = request as AuthenticatedRequest;

  if (!authenticatedRequest.user) {
    throw new HttpError(401, "Oturum bulunamadı.");
  }

  return authenticatedRequest.user;
}

async function makeFirstAssignmentActive(
  managerId: string,
  assignmentId: string
) {
  const assignmentCount = await prisma.managerAssignment.count({
    where: {
      managerId,
    },
  });

  if (assignmentCount !== 1) {
    return;
  }

  await prisma.user.update({
    where: {
      id: managerId,
    },
    data: {
      activeManagerAssignmentId: assignmentId,
    },
  });
}

/*
 * MANAGER ROUTES
 * Bunlar SUPER_ADMIN middleware'inden önce olmalıdır.
 */

router.get(
  "/me",
  requireRole("MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const manager = getAuthenticatedUser(request);

    const managerRecord = await prisma.user.findUnique({
      where: {
        id: manager.id,
      },
      select: {
        activeManagerAssignmentId: true,
        managerAssignments: {
          include: {
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
                siteId: true,
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
            createdAt: "asc",
          },
        },
      },
    });

    if (!managerRecord) {
      throw new HttpError(404, "Yönetici kullanıcısı bulunamadı.");
    }

    const assignments = managerRecord.managerAssignments;

    const savedActiveAssignment = assignments.find(
      (assignment) =>
        assignment.id === managerRecord.activeManagerAssignmentId
    );

    let activeAssignmentId = savedActiveAssignment?.id ?? null;

    if (!activeAssignmentId && assignments.length === 1) {
      activeAssignmentId = assignments[0].id;

      await prisma.user.update({
        where: {
          id: manager.id,
        },
        data: {
          activeManagerAssignmentId: activeAssignmentId,
        },
      });
    }

    response.status(200).json({
      success: true,
      data: {
        assignments,
        activeAssignmentId,
        activeAssignment:
          assignments.find(
            (assignment) => assignment.id === activeAssignmentId
          ) ?? null,
        requiresSelection:
          assignments.length > 1 && activeAssignmentId === null,
      },
    });
  })
);

router.patch(
  "/me/active",
  requireRole("MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const manager = getAuthenticatedUser(request);

    const validationResult = selectActiveAssignmentSchema.safeParse(
      request.body
    );

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Çalışma alanı seçimi geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { assignmentId } = validationResult.data;

    const assignment = await prisma.managerAssignment.findFirst({
      where: {
        id: assignmentId,
        managerId: manager.id,
      },
      include: {
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
            siteId: true,
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

    if (!assignment) {
      throw new HttpError(
        404,
        "Seçilen çalışma alanı bu yöneticiye ait değil."
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        id: manager.id,
      },
      select: {
        activeManagerAssignmentId: true,
      },
    });

    await prisma.user.update({
      where: {
        id: manager.id,
      },
      data: {
        activeManagerAssignmentId: assignment.id,
      },
    });

    await createAuditLog({
      request,
      userId: manager.id,
      action: "SELECT_MANAGER_WORK_SCOPE",
      entityType: "ManagerAssignment",
      entityId: assignment.id,
      metadata: {
        previousAssignmentId:
          currentUser?.activeManagerAssignmentId ?? null,
        currentAssignmentId: assignment.id,
        scopeType: assignment.scopeType,
        siteId: assignment.siteId,
        blockId: assignment.blockId,
      },
    });

    response.status(200).json({
      success: true,
      message: "Çalışma alanı başarıyla seçildi.",
      data: {
        activeAssignmentId: assignment.id,
        activeAssignment: assignment,
      },
    });
  })
);

/*
 * SUPER ADMIN ROUTES
 */

router.use(requireRole("SUPER_ADMIN"));

router.get(
  "/",
  asyncHandler(async (_request: Request, response: Response) => {
    const assignments = await prisma.managerAssignment.findMany({
      include: managerAssignmentInclude,
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

    const validationResult = createManagerAssignmentSchema.safeParse(
      request.body
    );

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
        throw new HttpError(
          400,
          "Site yetkisi için site seçimi zorunludur."
        );
      }

      if (blockId) {
        throw new HttpError(
          400,
          "Site yetkisinde blockId gönderilmemelidir."
        );
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
        throw new HttpError(
          409,
          "Bu yönetici zaten bu siteye atanmış."
        );
      }

      const assignment = await prisma.managerAssignment.create({
        data: {
          managerId,
          scopeType,
          siteId,
        },
        include: managerAssignmentInclude,
      });

      await makeFirstAssignmentActive(managerId, assignment.id);

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
      throw new HttpError(
        400,
        "Blok/Apartman yetkisi için block seçimi zorunludur."
      );
    }

    if (siteId) {
      throw new HttpError(
        400,
        "Blok yetkisinde siteId gönderilmemelidir."
      );
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
      throw new HttpError(
        409,
        "Bu yönetici zaten bu blok/apartmana atanmış."
      );
    }

    const assignment = await prisma.managerAssignment.create({
      data: {
        managerId,
        scopeType,
        blockId,
      },
      include: managerAssignmentInclude,
    });

    await makeFirstAssignmentActive(managerId, assignment.id);

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

router.delete(
  "/:assignmentId",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const assignmentIdParam = request.params.assignmentId;

    if (
      typeof assignmentIdParam !== "string" ||
      assignmentIdParam.trim().length === 0
    ) {
      throw new HttpError(
        400,
        "Yönetici yetki id bilgisi zorunludur."
      );
    }

    const assignment = await prisma.managerAssignment.findUnique({
      where: {
        id: assignmentIdParam,
      },
      select: {
        id: true,
        managerId: true,
        scopeType: true,
        siteId: true,
        blockId: true,
      },
    });

    if (!assignment) {
      throw new HttpError(404, "Yönetici yetki kaydı bulunamadı.");
    }

    await prisma.$transaction([
      prisma.user.updateMany({
        where: {
          activeManagerAssignmentId: assignment.id,
        },
        data: {
          activeManagerAssignmentId: null,
        },
      }),
      prisma.managerAssignment.delete({
        where: {
          id: assignment.id,
        },
      }),
    ]);

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "DELETE_MANAGER_ASSIGNMENT",
      entityType: "ManagerAssignment",
      entityId: assignment.id,
      metadata: {
        managerId: assignment.managerId,
        scopeType: assignment.scopeType,
        siteId: assignment.siteId,
        blockId: assignment.blockId,
      },
    });

    response.status(200).json({
      success: true,
      message: "Yönetici yetkisi başarıyla kaldırıldı.",
    });
  })
);

export default router;