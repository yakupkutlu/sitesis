-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('MAINTENANCE', 'COMPLAINT', 'SUGGESTION', 'GENERAL');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'REJECTED');

-- CreateTable
CREATE TABLE "ResidentRequest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'OPEN',
    "apartmentId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "assignedToUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResidentRequest_type_idx" ON "ResidentRequest"("type");

-- CreateIndex
CREATE INDEX "ResidentRequest_status_idx" ON "ResidentRequest"("status");

-- CreateIndex
CREATE INDEX "ResidentRequest_apartmentId_idx" ON "ResidentRequest"("apartmentId");

-- CreateIndex
CREATE INDEX "ResidentRequest_createdByUserId_idx" ON "ResidentRequest"("createdByUserId");

-- CreateIndex
CREATE INDEX "ResidentRequest_assignedToUserId_idx" ON "ResidentRequest"("assignedToUserId");

-- CreateIndex
CREATE INDEX "ResidentRequest_createdAt_idx" ON "ResidentRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "ResidentRequest" ADD CONSTRAINT "ResidentRequest_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentRequest" ADD CONSTRAINT "ResidentRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentRequest" ADD CONSTRAINT "ResidentRequest_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
