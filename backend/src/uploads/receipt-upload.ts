import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import multer from "multer";

const receiptUploadFolder = path.join(process.cwd(), "uploads", "receipts");

fs.mkdirSync(receiptUploadFolder, {
  recursive: true,
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, receiptUploadFolder);
  },
  filename: (_request, file, callback) => {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const randomName = crypto.randomUUID();

    callback(null, `${randomName}${fileExtension}`);
  },
});

export const receiptUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new Error("Geçersiz dosya türü."));
      return;
    }

    callback(null, true);
  },
});