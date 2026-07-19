import process from "node:process";

import app from "./app.js";
import { env } from "./config/env.js";
import {
  closeNotificationQueues,
  initializeNotificationQueues,
} from "./queues/notification.queues.js";
import {
  closeNotificationWorkers,
  startNotificationWorkers,
} from "./workers/notification.workers.js";

let server: ReturnType<typeof app.listen> | undefined;
let isShuttingDown = false;

async function startServer() {
  await initializeNotificationQueues();
  startNotificationWorkers();

  server = app.listen(env.PORT, () => {
    console.log(`Backend server ${env.PORT} portunda çalışıyor.`);
    console.log("SMS ve e-posta kuyruk worker'ları çalışıyor.");
  });
}

async function closeBackgroundServices() {
  await closeNotificationWorkers();
  await closeNotificationQueues();
}

async function shutdown(reason: string, exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`Sistem kapatılıyor: ${reason}`);

  const forceExitTimer = setTimeout(() => {
    console.error("Zorunlu kapatma süresi doldu.");
    process.exit(1);
  }, 15_000);

  forceExitTimer.unref();

  const finishShutdown = async () => {
    try {
      await closeBackgroundServices();
    } catch (error) {
      console.error("Arka plan servisleri kapatılırken hata oluştu:", error);
      exitCode = 1;
    } finally {
      clearTimeout(forceExitTimer);
      process.exit(exitCode);
    }
  };

  if (!server) {
    await finishShutdown();
    return;
  }

  server.close(() => {
    void finishShutdown();
  });
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("unhandledRejection", (error) => {
  console.error("Beklenmeyen promise hatası:", error);
  void shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (error) => {
  console.error("Beklenmeyen sistem hatası:", error);
  void shutdown("uncaughtException", 1);
});

startServer().catch((error) => {
  console.error("Backend başlatılamadı:", error);
  void shutdown("startup-error", 1);
});
