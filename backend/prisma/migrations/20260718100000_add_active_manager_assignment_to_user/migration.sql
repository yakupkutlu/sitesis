-- AlterTable
ALTER TABLE "User" ADD COLUMN "activeManagerAssignmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_activeManagerAssignmentId_key" ON "User"("activeManagerAssignmentId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeManagerAssignmentId_fkey" FOREIGN KEY ("activeManagerAssignmentId") REFERENCES "ManagerAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
