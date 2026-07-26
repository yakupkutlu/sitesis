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

function decodeMojibakeUtf8(value: string) {
  if (!/[ÃÄÅÂ]/.test(value)) {
    return value;
  }

  try {
    const decodedValue = Buffer.from(value, "latin1").toString("utf8");

    return decodedValue.includes("\uFFFD") ? value : decodedValue;
  } catch {
    return value;
  }
}

function normalizeUploadedFileName(value: string) {
  let normalizedValue = value;

  /*
   * Çift kodlanmış dosya adlarını da düzeltmek için en fazla üç kez
   * latin1 → UTF-8 dönüşümü uygulanır.
   */
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const decodedValue = decodeMojibakeUtf8(normalizedValue);

    if (decodedValue === normalizedValue) {
      break;
    }

    normalizedValue = decodedValue;
  }

  return normalizedValue
    .replaceAll("Ý", "İ")
    .replaceAll("ý", "ı")
    .replaceAll("Þ", "Ş")
    .replaceAll("þ", "ş")
    .replaceAll("Ð", "Ğ")
    .replaceAll("ð", "ğ")
    .normalize("NFC");
}

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, receiptUploadFolder);
  },
  filename: (_request, file, callback) => {
    file.originalname = normalizeUploadedFileName(file.originalname);

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
