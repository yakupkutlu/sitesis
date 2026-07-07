-- AlterTable
ALTER TABLE "PaymentReceipt" ADD COLUMN     "aiAmountKurus" INTEGER,
ADD COLUMN     "aiAnalyzedAt" TIMESTAMP(3),
ADD COLUMN     "aiApartmentNumber" TEXT,
ADD COLUMN     "aiConfidence" DOUBLE PRECISION,
ADD COLUMN     "aiDescription" TEXT,
ADD COLUMN     "aiModelName" TEXT,
ADD COLUMN     "aiPayerName" TEXT,
ADD COLUMN     "aiPaymentDate" TEXT,
ADD COLUMN     "aiProvider" "AiProvider";

-- CreateIndex
CREATE INDEX "PaymentReceipt_aiProvider_idx" ON "PaymentReceipt"("aiProvider");

-- CreateIndex
CREATE INDEX "PaymentReceipt_aiAnalyzedAt_idx" ON "PaymentReceipt"("aiAnalyzedAt");
