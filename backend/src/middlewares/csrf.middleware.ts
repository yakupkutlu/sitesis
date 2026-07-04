import crypto from "node:crypto";

import { type NextFunction, type Request, type Response } from "express";

import { csrfCookieName, csrfHeaderName } from "../config/csrf.js";
import { env } from "../config/env.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

function createSignature(tokenValue: string) {
  return crypto.createHmac("sha256", env.JWT_SECRET).update(tokenValue).digest("hex");
}

function buildSignedToken(tokenValue: string) {
  const signature = createSignature(tokenValue);

  return `${tokenValue}.${signature}`;
}

function isValidSignedToken(signedToken: string) {
  const [tokenValue, signature] = signedToken.split(".");

  if (!tokenValue || !signature) {
    return false;
  }

  const expectedSignature = createSignature(tokenValue);

  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedSignatureBuffer = Buffer.from(expectedSignature, "hex");

  if (signatureBuffer.length !== expectedSignatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer);
}

export function generateCsrfToken() {
  const tokenValue = crypto.randomBytes(32).toString("hex");

  return buildSignedToken(tokenValue);
}

export function csrfProtection(request: Request, response: Response, next: NextFunction) {
  if (safeMethods.has(request.method)) {
    next();
    return;
  }

  const cookieToken = request.cookies[csrfCookieName];
  const headerToken = request.headers[csrfHeaderName];

  if (
    typeof cookieToken !== "string" ||
    typeof headerToken !== "string" ||
    cookieToken !== headerToken ||
    !isValidSignedToken(cookieToken)
  ) {
    response.status(403).json({
      success: false,
      message: "CSRF doğrulaması başarısız.",
    });
    return;
  }

  next();
}