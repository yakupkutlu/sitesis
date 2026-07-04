import process from "node:process";

import app from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.PORT, () => {
  console.log(`Backend server ${env.PORT} portunda çalışıyor.`);
});

process.on("unhandledRejection", (error) => {
  console.error("Beklenmeyen promise hatası:", error);

  server.close(() => {
    process.exit(1);
  });
});

process.on("uncaughtException", (error) => {
  console.error("Beklenmeyen sistem hatası:", error);
  process.exit(1);
});