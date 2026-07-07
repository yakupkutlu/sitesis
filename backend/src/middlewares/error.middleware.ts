import { type ErrorRequestHandler } from "express";
import multer from "multer";

import { HttpError } from "../utils/http-error.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.details ? { errors: error.details } : {}),
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      response.status(400).json({
        success: false,
        message: "Dosya boyutu en fazla 10 MB olabilir.",
      });
      return;
    }

    response.status(400).json({
      success: false,
      message: "Dosya yükleme sırasında hata oluştu.",
    });
    return;
  }

  if (error instanceof Error && error.message === "Geçersiz dosya türü.") {
    response.status(400).json({
      success: false,
      message: "Sadece PDF, PNG, JPG, JPEG ve WEBP dosyaları yüklenebilir.",
    });
    return;
  }

  console.error("Beklenmeyen hata:", error);

  response.status(500).json({
    success: false,
    message: "Sunucuda beklenmeyen bir hata oluştu.",
  });
};

