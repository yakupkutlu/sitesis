-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('OPENAI', 'GEMINI', 'CUSTOM');

-- CreateTable
CREATE TABLE "AiSetting" (
    "id" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'PASSIVE',
    "name" TEXT,
    "modelName" TEXT,
    "baseUrl" TEXT,
    "apiKeyEncrypted" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiSetting_provider_idx" ON "AiSetting"("provider");

-- CreateIndex
CREATE INDEX "AiSetting_status_idx" ON "AiSetting"("status");

-- CreateIndex
CREATE INDEX "AiSetting_createdByUserId_idx" ON "AiSetting"("createdByUserId");

-- CreateIndex
CREATE INDEX "AiSetting_updatedByUserId_idx" ON "AiSetting"("updatedByUserId");

-- AddForeignKey
ALTER TABLE "AiSetting" ADD CONSTRAINT "AiSetting_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSetting" ADD CONSTRAINT "AiSetting_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
