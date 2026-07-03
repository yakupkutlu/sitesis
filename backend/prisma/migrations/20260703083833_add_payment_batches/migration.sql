-- CreateEnum
CREATE TYPE "PaymentScopeType" AS ENUM ('SITE', 'BLOCK', 'APARTMENTS');

-- CreateEnum
CREATE TYPE "PaymentAllocationStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "PaymentBatch" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "totalAmountKurus" INTEGER NOT NULL,
    "scopeType" "PaymentScopeType" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "siteId" TEXT,
    "blockId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "amountKurus" INTEGER NOT NULL,
    "status" "PaymentAllocationStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paymentBatchId" TEXT NOT NULL,
    "apartmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentExemption" (
    "id" TEXT NOT NULL,
    "paymentBatchId" TEXT NOT NULL,
    "apartmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentExemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentBatch_siteId_idx" ON "PaymentBatch"("siteId");

-- CreateIndex
CREATE INDEX "PaymentBatch_blockId_idx" ON "PaymentBatch"("blockId");

-- CreateIndex
CREATE INDEX "PaymentBatch_scopeType_idx" ON "PaymentBatch"("scopeType");

-- CreateIndex
CREATE INDEX "PaymentAllocation_paymentBatchId_idx" ON "PaymentAllocation"("paymentBatchId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_apartmentId_idx" ON "PaymentAllocation"("apartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAllocation_paymentBatchId_apartmentId_key" ON "PaymentAllocation"("paymentBatchId", "apartmentId");

-- CreateIndex
CREATE INDEX "PaymentExemption_paymentBatchId_idx" ON "PaymentExemption"("paymentBatchId");

-- CreateIndex
CREATE INDEX "PaymentExemption_apartmentId_idx" ON "PaymentExemption"("apartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentExemption_paymentBatchId_apartmentId_key" ON "PaymentExemption"("paymentBatchId", "apartmentId");

-- AddForeignKey
ALTER TABLE "PaymentBatch" ADD CONSTRAINT "PaymentBatch_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentBatch" ADD CONSTRAINT "PaymentBatch_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentBatchId_fkey" FOREIGN KEY ("paymentBatchId") REFERENCES "PaymentBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentExemption" ADD CONSTRAINT "PaymentExemption_paymentBatchId_fkey" FOREIGN KEY ("paymentBatchId") REFERENCES "PaymentBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentExemption" ADD CONSTRAINT "PaymentExemption_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
