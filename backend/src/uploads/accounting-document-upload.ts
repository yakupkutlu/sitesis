import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import multer from "multer";

export const accountingDocumentFolder = path.join(
  process.cwd(),
  "uploads",
  "accounting-expenses"
);

fs.mkdirSync(accountingDocumentFolder, {
  recursive: true,
});

const mimeTypeToExtension = new Map([
  ["application/pdf", ".pdf"],
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
]);

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, accountingDocumentFolder);
  },
  filename: (_request, file, callback) => {
    const fileExtension = mimeTypeToExtension.get(file.mimetype);

    if (!fileExtension) {
      callback(new Error("Geçersiz dosya türü."), "");
      return;
    }

    callback(null, `${crypto.randomUUID()}${fileExtension}`);
  },
});

export const accountingDocumentUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (_request, file, callback) => {
    if (!mimeTypeToExtension.has(file.mimetype)) {
      callback(new Error("Geçersiz dosya türü."));
      return;
    }

    callback(null, true);
  },
});
