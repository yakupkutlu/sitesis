-- CreateEnum
CREATE TYPE "ApartmentResidentType" AS ENUM ('OWNER', 'TENANT');

-- CreateTable
CREATE TABLE "ApartmentResident" (
    "id" TEXT NOT NULL,
    "type" "ApartmentResidentType" NOT NULL,
    "apartmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApartmentResident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApartmentResident_apartmentId_idx" ON "ApartmentResident"("apartmentId");

-- CreateIndex
CREATE INDEX "ApartmentResident_userId_idx" ON "ApartmentResident"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ApartmentResident_apartmentId_userId_type_key" ON "ApartmentResident"("apartmentId", "userId", "type");

-- AddForeignKey
ALTER TABLE "ApartmentResident" ADD CONSTRAINT "ApartmentResident_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApartmentResident" ADD CONSTRAINT "ApartmentResident_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
