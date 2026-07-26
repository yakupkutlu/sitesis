-- Kısmi ödeme durumunu ekler.
ALTER TYPE "PaymentAllocationStatus" ADD VALUE IF NOT EXISTS 'PARTIAL';

-- Her borç kaydında tahsil edilen toplam tutarı saklar.
ALTER TABLE "PaymentAllocation"
ADD COLUMN "paidAmountKurus" INTEGER NOT NULL DEFAULT 0;

-- Her onaylanan dekontun gerçek ödeme tutarını saklar.
ALTER TABLE "PaymentReceipt"
ADD COLUMN "paymentAmountKurus" INTEGER;

-- Önceden tamamen ödenmiş kayıtların mevcut tutarını korur.
UPDATE "PaymentAllocation"
SET "paidAmountKurus" = "amountKurus"
WHERE "status" = 'PAID';

-- Eski kayıtlarda her allocation için en son onaylanan dekonta tutarı bağlar.
WITH ranked_receipts AS (
  SELECT
    receipt."id",
    receipt."paymentAllocationId",
    ROW_NUMBER() OVER (
      PARTITION BY receipt."paymentAllocationId"
      ORDER BY receipt."reviewedAt" DESC NULLS LAST, receipt."createdAt" DESC
    ) AS row_number
  FROM "PaymentReceipt" AS receipt
  WHERE receipt."status" = 'APPROVED'
)
UPDATE "PaymentReceipt" AS receipt
SET "paymentAmountKurus" = allocation."amountKurus"
FROM ranked_receipts AS ranked
JOIN "PaymentAllocation" AS allocation
  ON allocation."id" = ranked."paymentAllocationId"
WHERE receipt."id" = ranked."id"
  AND ranked.row_number = 1;
