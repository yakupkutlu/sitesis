import nodemailer from "nodemailer";

import prisma from "../db/prisma.js";
import { decryptText } from "../utils/crypto.js";

type SendEmailInput = {
  to: string;
  subject: string;
  message: string;
};

type SendEmailResult = {
  provider: "SMTP";
  providerMessageId?: string;
};

function buildFromAddress(params: {
  fromEmail: string;
  fromName: string | null;
}) {
  if (!params.fromName) {
    return params.fromEmail;
  }

  return `"${params.fromName}" <${params.fromEmail}>`;
}

export async function sendEmailWithActiveSmtp(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const setting = await prisma.emailSetting.findFirst({
    where: {
      provider: "SMTP",
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      fromEmail: true,
      fromName: true,
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      smtpUsernameEncrypted: true,
      smtpPasswordEncrypted: true,
    },
  });

  if (!setting) {
    throw new Error("Aktif SMTP e-posta ayarı bulunamadı.");
  }

  if (
    !setting.smtpHost ||
    !setting.smtpPort ||
    !setting.smtpUsernameEncrypted ||
    !setting.smtpPasswordEncrypted
  ) {
    throw new Error("SMTP e-posta ayarları eksik.");
  }

  const smtpUsername = decryptText(setting.smtpUsernameEncrypted);
  const smtpPassword = decryptText(setting.smtpPasswordEncrypted);

  const transporter = nodemailer.createTransport({
    host: setting.smtpHost,
    port: setting.smtpPort,
    secure: setting.smtpSecure,
    auth: {
      user: smtpUsername,
      pass: smtpPassword,
    },
  });

  const info = await transporter.sendMail({
    from: buildFromAddress({
      fromEmail: setting.fromEmail,
      fromName: setting.fromName,
    }),
    to: input.to,
    subject: input.subject,
    text: input.message,
  });

  return {
    provider: "SMTP",
    providerMessageId: info.messageId,
  };
}

