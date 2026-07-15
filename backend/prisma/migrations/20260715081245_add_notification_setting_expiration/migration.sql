-- AlterTable
ALTER TABLE "EmailSetting" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SmsSetting" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "EmailSetting_expiresAt_idx" ON "EmailSetting"("expiresAt");

-- CreateIndex
CREATE INDEX "SmsSetting_expiresAt_idx" ON "SmsSetting"("expiresAt");
