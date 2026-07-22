CREATE TYPE "ReceiptAiStatus" AS ENUM (
  'NOT_CHECKED',
  'PROCESSING',
  'MATCHED',
  'REVIEW_REQUIRED',
  'FAILED'
);

ALTER TABLE "PaymentReceipt"
ADD COLUMN "aiStatus" "ReceiptAiStatus" NOT NULL DEFAULT 'NOT_CHECKED',
ADD COLUMN "aiRecipientIban" TEXT,
ADD COLUMN "aiExpectedAmountKurus" INTEGER,
ADD COLUMN "aiExpectedIban" TEXT,
ADD COLUMN "aiAmountMatches" BOOLEAN,
ADD COLUMN "aiIbanMatches" BOOLEAN,
ADD COLUMN "aiReasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "aiErrorMessage" TEXT,
ADD COLUMN "aiVerifiedAt" TIMESTAMP(3);

CREATE INDEX "PaymentReceipt_aiStatus_idx"
ON "PaymentReceipt"("aiStatus");

CREATE INDEX "PaymentReceipt_aiVerifiedAt_idx"
ON "PaymentReceipt"("aiVerifiedAt");
