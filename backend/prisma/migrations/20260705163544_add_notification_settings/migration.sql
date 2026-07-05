-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'PASSIVE');

-- CreateEnum
CREATE TYPE "SmsProvider" AS ENUM ('ILETIMERKEZI', 'NETGSM', 'TWILIO');

-- CreateEnum
CREATE TYPE "EmailProvider" AS ENUM ('SMTP', 'SENDGRID');

-- CreateTable
CREATE TABLE "SmsSetting" (
    "id" TEXT NOT NULL,
    "provider" "SmsProvider" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'PASSIVE',
    "senderName" TEXT,
    "apiKeyEncrypted" TEXT,
    "apiSecretEncrypted" TEXT,
    "usernameEncrypted" TEXT,
    "passwordEncrypted" TEXT,
    "accountSidEncrypted" TEXT,
    "authTokenEncrypted" TEXT,
    "fromPhone" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSetting" (
    "id" TEXT NOT NULL,
    "provider" "EmailProvider" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'PASSIVE',
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpUsernameEncrypted" TEXT,
    "smtpPasswordEncrypted" TEXT,
    "sendgridApiKeyEncrypted" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsSetting_provider_idx" ON "SmsSetting"("provider");

-- CreateIndex
CREATE INDEX "SmsSetting_status_idx" ON "SmsSetting"("status");

-- CreateIndex
CREATE INDEX "SmsSetting_createdByUserId_idx" ON "SmsSetting"("createdByUserId");

-- CreateIndex
CREATE INDEX "SmsSetting_updatedByUserId_idx" ON "SmsSetting"("updatedByUserId");

-- CreateIndex
CREATE INDEX "EmailSetting_provider_idx" ON "EmailSetting"("provider");

-- CreateIndex
CREATE INDEX "EmailSetting_status_idx" ON "EmailSetting"("status");

-- CreateIndex
CREATE INDEX "EmailSetting_createdByUserId_idx" ON "EmailSetting"("createdByUserId");

-- CreateIndex
CREATE INDEX "EmailSetting_updatedByUserId_idx" ON "EmailSetting"("updatedByUserId");

-- AddForeignKey
ALTER TABLE "SmsSetting" ADD CONSTRAINT "SmsSetting_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsSetting" ADD CONSTRAINT "SmsSetting_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSetting" ADD CONSTRAINT "EmailSetting_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSetting" ADD CONSTRAINT "EmailSetting_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
