import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import multer from "multer";

const siteBlockImageUploadFolder = path.join(
  process.cwd(),
  "uploads",
  "site-block-images"
);

fs.mkdirSync(siteBlockImageUploadFolder, {
  recursive: true,
});

const allowedMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, siteBlockImageUploadFolder);
  },
  filename: (_request, file, callback) => {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const randomName = crypto.randomUUID();

    callback(null, `${randomName}${fileExtension}`);
  },
});

export const siteBlockImageUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new Error("Geçersiz görsel dosya türü."));
      return;
    }

    callback(null, true);
  },
});
