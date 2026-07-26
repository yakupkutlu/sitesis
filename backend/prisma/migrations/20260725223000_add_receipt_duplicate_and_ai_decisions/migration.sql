-- Receipt AI decision states
ALTER TYPE "ReceiptAiStatus" ADD VALUE IF NOT EXISTS 'OVERPAYMENT';
ALTER TYPE "ReceiptAiStatus" ADD VALUE IF NOT EXISTS 'PARTIAL_PAYMENT';
ALTER TYPE "ReceiptAiStatus" ADD VALUE IF NOT EXISTS 'AUTO_REJECTED';

-- AI result and duplicate-detection fields
ALTER TABLE "PaymentReceipt"
  ADD COLUMN IF NOT EXISTS "aiTransactionReference" TEXT,
  ADD COLUMN IF NOT EXISTS "aiOverpaymentAmountKurus" INTEGER,
  ADD COLUMN IF NOT EXISTS "aiShortfallAmountKurus" INTEGER,
  ADD COLUMN IF NOT EXISTS "fileHash" TEXT,
  ADD COLUMN IF NOT EXISTS "transactionAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "transactionReference" TEXT,
  ADD COLUMN IF NOT EXISTS "transactionFingerprint" TEXT,
  ADD COLUMN IF NOT EXISTS "autoRejectReason" TEXT,
  ADD COLUMN IF NOT EXISTS "autoRejectedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "PaymentReceipt_fileHash_idx"
  ON "PaymentReceipt"("fileHash");

CREATE INDEX IF NOT EXISTS "PaymentReceipt_transactionFingerprint_idx"
  ON "PaymentReceipt"("transactionFingerprint");

CREATE INDEX IF NOT EXISTS "PaymentReceipt_transactionAt_idx"
  ON "PaymentReceipt"("transactionAt");

CREATE INDEX IF NOT EXISTS "PaymentReceipt_autoRejectReason_idx"
  ON "PaymentReceipt"("autoRejectReason");
