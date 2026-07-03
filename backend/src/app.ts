import process from "node:process";
import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import healthRoutes from "./routes/health.routes.js";

import usersRoutes from "./routes/users.routes.js";

import authRoutes from "./routes/auth.routes.js";

import sitesRoutes from "./routes/sites.routes.js";

import blocksRoutes from "./routes/blocks.routes.js";

import apartmentsRoutes from "./routes/apartments.routes.js";

const app = express();

const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

app.use(helmet());

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    message: "Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.",
  },
});

app.use(generalLimiter);

app.use("/api/health", healthRoutes);

app.use("/api/users", usersRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/sites", sitesRoutes);

app.use("/api/blocks", blocksRoutes);

app.use("/api/apartments", apartmentsRoutes);

app.use((_request: Request, response: Response) => {
  response.status(404).json({
    success: false,
    message: "API adresi bulunamadı.",
  });
});

export default app;