-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationLogStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "NotificationTargetType" AS ENUM ('SITE', 'BLOCK', 'APARTMENT', 'USER', 'CUSTOM');

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationLogStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "targetType" "NotificationTargetType" NOT NULL DEFAULT 'CUSTOM',
    "targetId" TEXT,
    "siteId" TEXT,
    "blockId" TEXT,
    "apartmentId" TEXT,
    "userId" TEXT,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "createdById" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationLog_channel_idx" ON "NotificationLog"("channel");

-- CreateIndex
CREATE INDEX "NotificationLog_status_idx" ON "NotificationLog"("status");

-- CreateIndex
CREATE INDEX "NotificationLog_siteId_idx" ON "NotificationLog"("siteId");

-- CreateIndex
CREATE INDEX "NotificationLog_blockId_idx" ON "NotificationLog"("blockId");

-- CreateIndex
CREATE INDEX "NotificationLog_apartmentId_idx" ON "NotificationLog"("apartmentId");

-- CreateIndex
CREATE INDEX "NotificationLog_userId_idx" ON "NotificationLog"("userId");

-- CreateIndex
CREATE INDEX "NotificationLog_createdById_idx" ON "NotificationLog"("createdById");

-- CreateIndex
CREATE INDEX "NotificationLog_relatedType_relatedId_idx" ON "NotificationLog"("relatedType", "relatedId");

-- CreateIndex
CREATE INDEX "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");
