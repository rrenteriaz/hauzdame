-- AlterTable: Agregar columna assignedMembershipId
ALTER TABLE "Cleaning" ADD COLUMN IF NOT EXISTS "assignedMembershipId" TEXT;

-- CreateIndex: Índice simple
CREATE INDEX IF NOT EXISTS "Cleaning_assignedMembershipId_idx" ON "Cleaning"("assignedMembershipId");

-- CreateIndex: Índice compuesto
CREATE INDEX IF NOT EXISTS "Cleaning_teamId_assignedMembershipId_idx" ON "Cleaning"("teamId", "assignedMembershipId");

-- AddForeignKey: FK a TeamMembership
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'Cleaning_assignedMembershipId_fkey'
  ) THEN
    ALTER TABLE "Cleaning" 
    ADD CONSTRAINT "Cleaning_assignedMembershipId_fkey" 
    FOREIGN KEY ("assignedMembershipId") 
    REFERENCES "TeamMembership"("id") 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;
  END IF;
END $$;
