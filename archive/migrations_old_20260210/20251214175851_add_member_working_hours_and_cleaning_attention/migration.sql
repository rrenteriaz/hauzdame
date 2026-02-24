-- AlterTable
ALTER TABLE "Cleaning" ADD COLUMN     "attentionReason" TEXT,
ADD COLUMN     "needsAttention" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "workingDays" TEXT[],
ADD COLUMN     "workingEndTime" TEXT,
ADD COLUMN     "workingStartTime" TEXT;
