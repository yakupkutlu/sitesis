-- AlterTable
ALTER TABLE "ResidentRequest" ADD COLUMN     "attachmentMimeType" TEXT,
ADD COLUMN     "attachmentOriginalFileName" TEXT,
ADD COLUMN     "attachmentSizeBytes" INTEGER,
ADD COLUMN     "attachmentStoredFileName" TEXT;
