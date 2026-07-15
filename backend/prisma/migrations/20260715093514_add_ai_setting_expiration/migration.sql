-- AlterTable
ALTER TABLE "AiSetting" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "AiSetting_expiresAt_idx" ON "AiSetting"("expiresAt");
