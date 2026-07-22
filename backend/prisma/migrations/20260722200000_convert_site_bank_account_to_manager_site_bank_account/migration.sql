-- Yönetici + site bazlı banka hesabı tablosu.
CREATE TABLE "ManagerSiteBankAccount" (
    "id" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branchName" TEXT,
    "accountHolder" TEXT NOT NULL,
    "accountNumber" TEXT,
    "iban" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagerSiteBankAccount_pkey" PRIMARY KEY ("id")
);

-- Eski site hesabını yalnızca sitede tek bir farklı yönetici varsa korur.
-- Birden fazla yönetici bulunan sitelerde veri kime ait olduğu belirsiz olduğu
-- için taşınmaz; her yönetici kendi hesabını yeniden tanımlar.
WITH "DistinctManagerSites" AS (
    SELECT DISTINCT
        ma."managerId",
        COALESCE(ma."siteId", b."siteId") AS "siteId"
    FROM "ManagerAssignment" ma
    LEFT JOIN "Block" b ON b."id" = ma."blockId"
    WHERE COALESCE(ma."siteId", b."siteId") IS NOT NULL
),
"UniqueSiteManager" AS (
    SELECT
        "siteId",
        MIN("managerId") AS "managerId"
    FROM "DistinctManagerSites"
    GROUP BY "siteId"
    HAVING COUNT(*) = 1
)
INSERT INTO "ManagerSiteBankAccount" (
    "id",
    "managerId",
    "siteId",
    "bankName",
    "branchName",
    "accountHolder",
    "accountNumber",
    "iban",
    "currency",
    "createdAt",
    "updatedAt"
)
SELECT
    sba."id",
    usm."managerId",
    sba."siteId",
    sba."bankName",
    sba."branchName",
    sba."accountHolder",
    sba."accountNumber",
    sba."iban",
    sba."currency",
    sba."createdAt",
    sba."updatedAt"
FROM "SiteBankAccount" sba
INNER JOIN "UniqueSiteManager" usm
    ON usm."siteId" = sba."siteId";

CREATE UNIQUE INDEX "ManagerSiteBankAccount_managerId_siteId_key"
ON "ManagerSiteBankAccount"("managerId", "siteId");

CREATE INDEX "ManagerSiteBankAccount_siteId_idx"
ON "ManagerSiteBankAccount"("siteId");

CREATE INDEX "ManagerSiteBankAccount_iban_idx"
ON "ManagerSiteBankAccount"("iban");

ALTER TABLE "ManagerSiteBankAccount"
ADD CONSTRAINT "ManagerSiteBankAccount_managerId_fkey"
FOREIGN KEY ("managerId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ManagerSiteBankAccount"
ADD CONSTRAINT "ManagerSiteBankAccount_siteId_fkey"
FOREIGN KEY ("siteId") REFERENCES "Site"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "SiteBankAccount";
