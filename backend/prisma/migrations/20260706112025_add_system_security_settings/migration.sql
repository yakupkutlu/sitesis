-- CreateTable
CREATE TABLE "SystemSecuritySetting" (
    "id" TEXT NOT NULL,
    "sessionDurationMinutes" INTEGER NOT NULL DEFAULT 60,
    "minPasswordLength" INTEGER NOT NULL DEFAULT 8,
    "loginAttemptLimit" INTEGER NOT NULL DEFAULT 5,
    "lockDurationMinutes" INTEGER NOT NULL DEFAULT 15,
    "requireStrongPassword" BOOLEAN NOT NULL DEFAULT true,
    "enableTwoFactor" BOOLEAN NOT NULL DEFAULT false,
    "allowPublicRegister" BOOLEAN NOT NULL DEFAULT false,
    "logSecurityEvents" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSecuritySetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemSecuritySetting_createdByUserId_idx" ON "SystemSecuritySetting"("createdByUserId");

-- CreateIndex
CREATE INDEX "SystemSecuritySetting_updatedByUserId_idx" ON "SystemSecuritySetting"("updatedByUserId");

-- AddForeignKey
ALTER TABLE "SystemSecuritySetting" ADD CONSTRAINT "SystemSecuritySetting_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSecuritySetting" ADD CONSTRAINT "SystemSecuritySetting_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
