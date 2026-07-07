import crypto from "node:crypto";

import { env } from "../config/env.js";

const algorithm = "aes-256-gcm";

function getEncryptionKey() {
  return crypto.createHash("sha256").update(env.CONFIG_ENCRYPTION_KEY).digest();
}

export function encryptText(plainText: string) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(algorithm, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptText(encryptedText: string) {
  const [ivHex, authTagHex, encryptedHex] = encryptedText.split(":");

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Şifrelenmiş veri formatı geçersiz.");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
