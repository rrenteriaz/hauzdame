-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "inactivatedAt" TIMESTAMP(3),
ADD COLUMN     "inactivatedByUserId" TEXT,
ADD COLUMN     "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE';

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_inactivatedByUserId_fkey" FOREIGN KEY ("inactivatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
