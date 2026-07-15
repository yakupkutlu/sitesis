-- CreateEnum
CREATE TYPE "AccountingExpenseCategory" AS ENUM (
  'ELEVATOR',
  'MAINTENANCE',
  'REPAIR',
  'CLEANING',
  'PERSONNEL',
  'UTILITIES',
  'INSURANCE',
  'TAX',
  'SECURITY',
  'LANDSCAPING',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "AccountingExpenseStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateTable
CREATE TABLE "AccountingExpense" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" "AccountingExpenseCategory" NOT NULL,
  "amountKurus" INTEGER NOT NULL,
  "expenseDate" TIMESTAMP(3) NOT NULL,
  "vendorName" TEXT,
  "invoiceNumber" TEXT,
  "status" "AccountingExpenseStatus" NOT NULL DEFAULT 'ACTIVE',
  "siteId" TEXT NOT NULL,
  "blockId" TEXT,
  "paymentBatchId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "cancelledByUserId" TEXT,
  "cancellationReason" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AccountingExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingExpenseDocument" (
  "id" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "storedFileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "expenseId" TEXT NOT NULL,
  "uploadedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingExpenseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountingExpense_paymentBatchId_key" ON "AccountingExpense"("paymentBatchId");
CREATE INDEX "AccountingExpense_siteId_idx" ON "AccountingExpense"("siteId");
CREATE INDEX "AccountingExpense_blockId_idx" ON "AccountingExpense"("blockId");
CREATE INDEX "AccountingExpense_category_idx" ON "AccountingExpense"("category");
CREATE INDEX "AccountingExpense_status_idx" ON "AccountingExpense"("status");
CREATE INDEX "AccountingExpense_expenseDate_idx" ON "AccountingExpense"("expenseDate");
CREATE INDEX "AccountingExpense_createdByUserId_idx" ON "AccountingExpense"("createdByUserId");
CREATE UNIQUE INDEX "AccountingExpenseDocument_storedFileName_key" ON "AccountingExpenseDocument"("storedFileName");
CREATE INDEX "AccountingExpenseDocument_expenseId_idx" ON "AccountingExpenseDocument"("expenseId");
CREATE INDEX "AccountingExpenseDocument_uploadedByUserId_idx" ON "AccountingExpenseDocument"("uploadedByUserId");

-- AddForeignKey
ALTER TABLE "AccountingExpense"
ADD CONSTRAINT "AccountingExpense_siteId_fkey"
FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingExpense"
ADD CONSTRAINT "AccountingExpense_blockId_fkey"
FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingExpense"
ADD CONSTRAINT "AccountingExpense_paymentBatchId_fkey"
FOREIGN KEY ("paymentBatchId") REFERENCES "PaymentBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AccountingExpense"
ADD CONSTRAINT "AccountingExpense_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingExpense"
ADD CONSTRAINT "AccountingExpense_cancelledByUserId_fkey"
FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AccountingExpenseDocument"
ADD CONSTRAINT "AccountingExpenseDocument_expenseId_fkey"
FOREIGN KEY ("expenseId") REFERENCES "AccountingExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountingExpenseDocument"
ADD CONSTRAINT "AccountingExpenseDocument_uploadedByUserId_fkey"
FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
