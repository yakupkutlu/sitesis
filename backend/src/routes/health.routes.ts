import express, { type Request, type Response } from "express";

import prisma from "../db/prisma.js";

const router = express.Router();

router.get("/", (_request: Request, response: Response) => {
  response.status(200).json({
    success: true,
    status: "ok",
    message: "Backend çalışıyor.",
  });
});

router.get("/db", async (_request: Request, response: Response) => {
  await prisma.$queryRaw`SELECT 1`;

  response.status(200).json({
    success: true,
    status: "ok",
    message: "Database bağlantısı çalışıyor.",
  });
});

export default router;