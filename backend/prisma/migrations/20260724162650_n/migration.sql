-- AlterTable
ALTER TABLE "ResidentRequest"
ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Genel',
ADD COLUMN "contactPreference" TEXT NOT NULL DEFAULT 'Uygulama üzerinden',
ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'Normal';