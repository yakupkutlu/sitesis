import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";

import healthRoutes from "./routes/health.routes.js";
import usersRoutes from "./routes/users.routes.js";
import authRoutes from "./routes/auth.routes.js";
import sitesRoutes from "./routes/sites.routes.js";
import blocksRoutes from "./routes/blocks.routes.js";
import apartmentsRoutes from "./routes/apartments.routes.js";
import apartmentResidentsRoutes from "./routes/apartment-residents.routes.js";
import managerAssignmentsRoutes from "./routes/manager-assignments.routes.js";
import paymentBatchesRoutes from "./routes/payment-batches.routes.js";
import paymentReceiptsRoutes from "./routes/payment-receipts.routes.js";
import residentRoutes from "./routes/resident.routes.js";
import managerDashboardRoutes from "./routes/manager-dashboard.routes.js";
import superAdminDashboardRoutes from "./routes/super-admin-dashboard.routes.js";
import auditLogsRoutes from "./routes/audit-logs.routes.js";
import csrfRoutes from "./routes/csrf.routes.js";
import { csrfProtection } from "./middlewares/csrf.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

app.use(cookieParser());

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === "production" ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.",
  },
});

app.use(generalLimiter);

app.use("/api/csrf-token", csrfRoutes);
app.use(csrfProtection);

app.use("/api/health", healthRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/sites", sitesRoutes);
app.use("/api/blocks", blocksRoutes);
app.use("/api/apartments", apartmentsRoutes);
app.use("/api/apartment-residents", apartmentResidentsRoutes);
app.use("/api/manager-assignments", managerAssignmentsRoutes);
app.use("/api/payment-batches", paymentBatchesRoutes);
app.use("/api/payment-receipts", paymentReceiptsRoutes);
app.use("/api/resident", residentRoutes);
app.use("/api/manager", managerDashboardRoutes);
app.use("/api/super-admin", superAdminDashboardRoutes);
app.use("/api/audit-logs", auditLogsRoutes);

app.use((_request: Request, response: Response) => {
  response.status(404).json({
    success: false,
    message: "API adresi bulunamadı.",
  });
});

app.use(errorHandler);

export default app;