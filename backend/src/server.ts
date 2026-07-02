import process from "node:process";
import "dotenv/config";

import app from "./app.js";

const port = process.env.PORT || 5000;

const server = app.listen(port, () => {
  console.log(`Backend server ${port} portunda çalışıyor.`);
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