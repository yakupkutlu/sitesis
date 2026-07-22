-- CreateTable
CREATE TABLE "SiteBankAccount" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branchName" TEXT,
    "accountHolder" TEXT NOT NULL,
    "accountNumber" TEXT,
    "iban" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteBankAccount_siteId_key" ON "SiteBankAccount"("siteId");

-- CreateIndex
CREATE INDEX "SiteBankAccount_iban_idx" ON "SiteBankAccount"("iban");

-- AddForeignKey
ALTER TABLE "SiteBankAccount" ADD CONSTRAINT "SiteBankAccount_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
