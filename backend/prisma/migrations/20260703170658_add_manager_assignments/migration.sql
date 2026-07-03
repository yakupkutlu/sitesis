-- CreateEnum
CREATE TYPE "ManagerScopeType" AS ENUM ('SITE', 'BLOCK');

-- CreateTable
CREATE TABLE "ManagerAssignment" (
    "id" TEXT NOT NULL,
    "scopeType" "ManagerScopeType" NOT NULL,
    "managerId" TEXT NOT NULL,
    "siteId" TEXT,
    "blockId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManagerAssignment_managerId_idx" ON "ManagerAssignment"("managerId");

-- CreateIndex
CREATE INDEX "ManagerAssignment_siteId_idx" ON "ManagerAssignment"("siteId");

-- CreateIndex
CREATE INDEX "ManagerAssignment_blockId_idx" ON "ManagerAssignment"("blockId");

-- CreateIndex
CREATE INDEX "ManagerAssignment_scopeType_idx" ON "ManagerAssignment"("scopeType");

-- AddForeignKey
ALTER TABLE "ManagerAssignment" ADD CONSTRAINT "ManagerAssignment_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerAssignment" ADD CONSTRAINT "ManagerAssignment_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerAssignment" ADD CONSTRAINT "ManagerAssignment_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE CASCADE ON UPDATE CASCADE;
