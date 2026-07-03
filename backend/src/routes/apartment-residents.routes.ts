import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

const createApartmentResidentSchema = z.object({
  apartmentId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(["OWNER", "TENANT"]),
});

router.get("/", async (_request: Request, response: Response) => {
  const apartmentResidents = await prisma.apartmentResident.findMany({
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
});

router.post("/", async (request: Request, response: Response) => {
  const validationResult = createApartmentResidentSchema.safeParse(request.body);

  if (!validationResult.success) {
    response.status(400).json({
      success: false,
      message: "Gönderilen daire-sakin bilgileri geçersiz.",
      errors: validationResult.error.flatten().fieldErrors,
    });
    return;
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
    response.status(404).json({
      success: false,
      message: "Daire bulunamadı.",
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user) {
    response.status(404).json({
      success: false,
      message: "Kullanıcı bulunamadı.",
    });
    return;
  }

  if (user.role !== "RESIDENT") {
    response.status(400).json({
      success: false,
      message: "Daireye sadece RESIDENT rolündeki kullanıcı atanabilir.",
    });
    return;
  }

  const existingRelation = await prisma.apartmentResident.findUnique({
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

  if (existingRelation) {
    response.status(409).json({
      success: false,
      message: "Bu kullanıcı zaten bu daireye aynı türde atanmış.",
    });
    return;
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
});

export default router;