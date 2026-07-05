/*
  Warnings:

  - You are about to drop the column `apartmentId` on the `NotificationLog` table. All the data in the column will be lost.
  - You are about to drop the column `blockId` on the `NotificationLog` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `NotificationLog` table. All the data in the column will be lost.
  - You are about to drop the column `errorCode` on the `NotificationLog` table. All the data in the column will be lost.
  - You are about to drop the column `recipient` on the `NotificationLog` table. All the data in the column will be lost.
  - You are about to drop the column `relatedId` on the `NotificationLog` table. All the data in the column will be lost.
  - You are about to drop the column `relatedType` on the `NotificationLog` table. All the data in the column will be lost.
  - You are about to drop the column `siteId` on the `NotificationLog` table. All the data in the column will be lost.
  - You are about to drop the column `targetId` on the `NotificationLog` table. All the data in the column will be lost.
  - You are about to drop the column `targetType` on the `NotificationLog` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `NotificationLog` table. All the data in the column will be lost.
  - The `status` column on the `NotificationLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `sourceType` to the `NotificationLog` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "NotificationSourceType" AS ENUM ('MANUAL', 'PAYMENT_BATCH', 'ANNOUNCEMENT', 'RESIDENT_REQUEST', 'SYSTEM');

-- DropIndex
DROP INDEX "NotificationLog_apartmentId_idx";

-- DropIndex
DROP INDEX "NotificationLog_blockId_idx";

-- DropIndex
DROP INDEX "NotificationLog_createdById_idx";

-- DropIndex
DROP INDEX "NotificationLog_relatedType_relatedId_idx";

-- DropIndex
DROP INDEX "NotificationLog_siteId_idx";

-- DropIndex
DROP INDEX "NotificationLog_userId_idx";

-- AlterTable
ALTER TABLE "NotificationLog" DROP COLUMN "apartmentId",
DROP COLUMN "blockId",
DROP COLUMN "createdById",
DROP COLUMN "errorCode",
DROP COLUMN "recipient",
DROP COLUMN "relatedId",
DROP COLUMN "relatedType",
DROP COLUMN "siteId",
DROP COLUMN "targetId",
DROP COLUMN "targetType",
DROP COLUMN "userId",
ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "entityId" TEXT,
ADD COLUMN     "entityType" TEXT,
ADD COLUMN     "providerMessageId" TEXT,
ADD COLUMN     "recipientEmail" TEXT,
ADD COLUMN     "recipientPhone" TEXT,
ADD COLUMN     "recipientUserId" TEXT,
ADD COLUMN     "sourceType" "NotificationSourceType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "NotificationLogStatus";

-- DropEnum
DROP TYPE "NotificationTargetType";

-- CreateIndex
CREATE INDEX "NotificationLog_status_idx" ON "NotificationLog"("status");

-- CreateIndex
CREATE INDEX "NotificationLog_sourceType_idx" ON "NotificationLog"("sourceType");

-- CreateIndex
CREATE INDEX "NotificationLog_recipientUserId_idx" ON "NotificationLog"("recipientUserId");

-- CreateIndex
CREATE INDEX "NotificationLog_createdByUserId_idx" ON "NotificationLog"("createdByUserId");

-- CreateIndex
CREATE INDEX "NotificationLog_entityType_idx" ON "NotificationLog"("entityType");

-- CreateIndex
CREATE INDEX "NotificationLog_entityId_idx" ON "NotificationLog"("entityId");

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
