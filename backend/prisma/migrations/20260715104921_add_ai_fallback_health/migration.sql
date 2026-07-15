-- AlterTable
ALTER TABLE "AiSetting" ADD COLUMN     "consecutiveFailureCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cooldownUntil" TIMESTAMP(3),
ADD COLUMN     "lastFailureAt" TIMESTAMP(3),
ADD COLUMN     "lastFailureCode" TEXT,
ADD COLUMN     "lastFailureMessage" TEXT,
ADD COLUMN     "lastSuccessAt" TIMESTAMP(3),
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 100;

-- CreateIndex
CREATE INDEX "AiSetting_priority_idx" ON "AiSetting"("priority");

-- CreateIndex
CREATE INDEX "AiSetting_cooldownUntil_idx" ON "AiSetting"("cooldownUntil");
