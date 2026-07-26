-- CreateEnum
CREATE TYPE "ApartmentBalanceTransactionType" AS ENUM (
  'CREDIT_FROM_OVERPAYMENT',
  'DEBIT_TO_PAYMENT',
  'REVERSAL',
  'ADMIN_ADJUSTMENT'
);

-- CreateTable
CREATE TABLE "ApartmentBalanceAccount" (
  "id" TEXT NOT NULL,
  "availableAmountKurus" INTEGER NOT NULL DEFAULT 0,
  "apartmentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ApartmentBalanceAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApartmentBalanceAccount_amount_nonnegative_check"
    CHECK ("availableAmountKurus" >= 0)
);

-- CreateTable
CREATE TABLE "ApartmentBalanceTransaction" (
  "id" TEXT NOT NULL,
  "type" "ApartmentBalanceTransactionType" NOT NULL,
  "amountKurus" INTEGER NOT NULL,
  "balanceAfterKurus" INTEGER NOT NULL,
  "remainingDebtAfterKurus" INTEGER,
  "paymentStatusAfter" "PaymentAllocationStatus",
  "description" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "balanceAccountId" TEXT NOT NULL,
  "sourceReceiptId" TEXT,
  "paymentAllocationId" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ApartmentBalanceTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApartmentBalanceTransaction_amount_positive_check"
    CHECK ("amountKurus" > 0),
  CONSTRAINT "ApartmentBalanceTransaction_balance_nonnegative_check"
    CHECK ("balanceAfterKurus" >= 0),
  CONSTRAINT "ApartmentBalanceTransaction_debt_nonnegative_check"
    CHECK (
      "remainingDebtAfterKurus" IS NULL OR
      "remainingDebtAfterKurus" >= 0
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "ApartmentBalanceAccount_apartmentId_key"
ON "ApartmentBalanceAccount"("apartmentId");

-- CreateIndex
CREATE INDEX "ApartmentBalanceAccount_availableAmountKurus_idx"
ON "ApartmentBalanceAccount"("availableAmountKurus");

-- CreateIndex
CREATE UNIQUE INDEX "ApartmentBalanceTransaction_idempotencyKey_key"
ON "ApartmentBalanceTransaction"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ApartmentBalanceTransaction_sourceReceiptId_key"
ON "ApartmentBalanceTransaction"("sourceReceiptId");

-- CreateIndex
CREATE INDEX "ApartmentBalanceTransaction_balanceAccountId_idx"
ON "ApartmentBalanceTransaction"("balanceAccountId");

-- CreateIndex
CREATE INDEX "ApartmentBalanceTransaction_type_idx"
ON "ApartmentBalanceTransaction"("type");

-- CreateIndex
CREATE INDEX "ApartmentBalanceTransaction_paymentAllocationId_idx"
ON "ApartmentBalanceTransaction"("paymentAllocationId");

-- CreateIndex
CREATE INDEX "ApartmentBalanceTransaction_createdByUserId_idx"
ON "ApartmentBalanceTransaction"("createdByUserId");

-- CreateIndex
CREATE INDEX "ApartmentBalanceTransaction_createdAt_idx"
ON "ApartmentBalanceTransaction"("createdAt");

-- AddForeignKey
ALTER TABLE "ApartmentBalanceAccount"
ADD CONSTRAINT "ApartmentBalanceAccount_apartmentId_fkey"
FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApartmentBalanceTransaction"
ADD CONSTRAINT "ApartmentBalanceTransaction_balanceAccountId_fkey"
FOREIGN KEY ("balanceAccountId") REFERENCES "ApartmentBalanceAccount"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApartmentBalanceTransaction"
ADD CONSTRAINT "ApartmentBalanceTransaction_sourceReceiptId_fkey"
FOREIGN KEY ("sourceReceiptId") REFERENCES "PaymentReceipt"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApartmentBalanceTransaction"
ADD CONSTRAINT "ApartmentBalanceTransaction_paymentAllocationId_fkey"
FOREIGN KEY ("paymentAllocationId") REFERENCES "PaymentAllocation"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApartmentBalanceTransaction"
ADD CONSTRAINT "ApartmentBalanceTransaction_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
