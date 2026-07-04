import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import { type Prisma } from "../generated/prisma/client.js";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";
import { getManagerScope, hasManagerScope } from "../services/manager-scope.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

router.use(requireAuth);

const createApartmentResidentSchema = z.object({
  apartmentId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(["OWNER", "TENANT"]),
});

async function getManagerApartmentResidentFilter(managerId: string) {
  const managerScope = await getManagerScope(managerId);

  if (!hasManagerScope(managerScope)) {
    throw new HttpError(403, "Bu yöneticiye atanmış bir site veya blok bulunamadı.");
  }

  const filter: Prisma.ApartmentResidentWhereInput = {
    OR: [
      {
        apartment: {
          blockId: {
            in: managerScope.blockIds,
          },
        },
      },
      {
        apartment: {
          block: {
            siteId: {
              in: managerScope.siteIds,
            },
          },
        },
      },
    ],
  };

  return filter;
}

router.get(
  "/",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    let whereCondition: Prisma.ApartmentResidentWhereInput | undefined;

    if (authenticatedRequest.user.role === "MANAGER") {
      whereCondition = await getManagerApartmentResidentFilter(authenticatedRequest.user.id);
    }

    const apartmentResidents = await prisma.apartmentResident.findMany({
      where: whereCondition,
      include: {
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
                    address: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    response.status(200).json({
      success: true,
      data: apartmentResidents,
    });
  })
);

router.post(
  "/",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (request: Request, response: Response) => {
    const validationResult = createApartmentResidentSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen daire sakini bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { apartmentId, userId, type } = validationResult.data;

    const apartment = await prisma.apartment.findUnique({
      where: {
        id: apartmentId,
      },
      select: {
        id: true,
      },
    });

    if (!apartment) {
      throw new HttpError(404, "Daire bulunamadı.");
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new HttpError(404, "Kullanıcı bulunamadı.");
    }

    if (user.role !== "RESIDENT") {
      throw new HttpError(400, "Sadece RESIDENT rolündeki kullanıcılar daireye atanabilir.");
    }

    if (user.status !== "ACTIVE") {
      throw new HttpError(400, "Pasif kullanıcı daireye atanamaz.");
    }

    const existingApartmentResident = await prisma.apartmentResident.findUnique({
      where: {
        apartmentId_userId_type: {
          apartmentId,
          userId,
          type,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingApartmentResident) {
      throw new HttpError(409, "Bu kullanıcı zaten bu daireye aynı rol ile atanmış.");
    }

    const apartmentResident = await prisma.apartmentResident.create({
      data: {
        apartmentId,
        userId,
        type,
      },
      include: {
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
                    address: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            status: true,
          },
        },
      },
    });

    response.status(201).json({
      success: true,
      message: "Kullanıcı daireye başarıyla atandı.",
      data: apartmentResident,
    });
  })
);

export default router;