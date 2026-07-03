import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

const createSiteSchema = z.object({
  name: z.string().trim().min(2),
  address: z.string().trim().min(5),
  description: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
  hasElevator: z.boolean().default(false),
  systems: z.array(z.string().trim()).default([]),
});

router.get("/", async (_request: Request, response: Response) => {
  const sites = await prisma.site.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  response.status(200).json({
    success: true,
    data: sites,
  });
});

router.post("/", async (request: Request, response: Response) => {
  const validationResult = createSiteSchema.safeParse(request.body);

  if (!validationResult.success) {
    response.status(400).json({
      success: false,
      message: "Gönderilen site bilgileri geçersiz.",
      errors: validationResult.error.flatten().fieldErrors,
    });
    return;
  }

  const site = await prisma.site.create({
    data: validationResult.data,
  });

  response.status(201).json({
    success: true,
    message: "Site başarıyla oluşturuldu.",
    data: site,
  });
});

export default router;