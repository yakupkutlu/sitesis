/*
  Warnings:

  - A unique constraint covering the columns `[apartmentId,type]` on the table `ApartmentResident` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ApartmentResident_apartmentId_type_key" ON "ApartmentResident"("apartmentId", "type");
