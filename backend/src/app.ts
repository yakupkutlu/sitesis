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
import announcementsRoutes from "./routes/announcements.routes.js";
import requestsRoutes from "./routes/requests.routes.js";
import smsSettingsRoutes from "./routes/sms-settings.routes.js";
import emailSettingsRoutes from "./routes/email-settings.routes.js";
import notificationLogsRoutes from "./routes/notification-logs.routes.js";
import contactMessagesRoutes from "./routes/contact-messages.routes.js";
import aiSettingsRoutes from "./routes/ai-settings.routes.js";
import systemSettingsRoutes from "./routes/system-settings.routes.js";
import dashboardSummaryRoutes from "./routes/dashboard-summary.routes.js";
import systemSecuritySettingsRoutes from "./routes/system-security-settings.routes.js";
import accountingRoutes from "./routes/accounting.routes.js";
const app = express();

app.disable("x-powered-by");

if (env.TRUST_PROXY) {
  app.set("trust proxy", 1);
}

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
    message: "Cok fazla istek gonderildi. Lutfen daha sonra tekrar deneyin.",
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
app.use("/api/announcements", announcementsRoutes);
app.use("/api/requests", requestsRoutes);
app.use("/api/sms-settings", smsSettingsRoutes);
app.use("/api/email-settings", emailSettingsRoutes);
app.use("/api/notification-logs", notificationLogsRoutes);
app.use("/api/contact-messages", contactMessagesRoutes);
app.use("/api/ai-settings", aiSettingsRoutes);
app.use("/api/system-settings", systemSettingsRoutes);
app.use("/api/dashboard-summary", dashboardSummaryRoutes);
app.use("/api/system-security-settings", systemSecuritySettingsRoutes);
app.use("/api/accounting", accountingRoutes);

app.use((_request: Request, response: Response) => {
  response.status(404).json({
    success: false,
    message: "API adresi bulunamadi.",
  });
});

app.use(errorHandler);

export default app;






