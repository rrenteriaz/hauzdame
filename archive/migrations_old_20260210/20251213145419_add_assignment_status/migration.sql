-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('OPEN', 'ASSIGNED');

-- AlterTable
ALTER TABLE "Cleaning" ADD COLUMN     "assignedMemberId" TEXT,
ADD COLUMN     "assignmentStatus" "AssignmentStatus" NOT NULL DEFAULT 'OPEN';

-- CreateIndex
CREATE INDEX "Cleaning_assignmentStatus_idx" ON "Cleaning"("assignmentStatus");

-- CreateIndex
CREATE INDEX "Cleaning_assignedMemberId_idx" ON "Cleaning"("assignedMemberId");

-- AddForeignKey
ALTER TABLE "Cleaning" ADD CONSTRAINT "Cleaning_assignedMemberId_fkey" FOREIGN KEY ("assignedMemberId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
