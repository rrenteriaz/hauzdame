-- AlterTable
ALTER TABLE "Cleaning" ADD COLUMN "assignedMembershipId" TEXT;

-- Nota: teamId se agrega aquí porque es necesario para el índice compuesto siguiente
-- (teamId se usa en schema.prisma pero no fue agregado en migraciones anteriores)
ALTER TABLE "Cleaning" ADD COLUMN IF NOT EXISTS "teamId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Cleaning_assignedMembershipId_idx" ON "Cleaning"("assignedMembershipId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Cleaning_teamId_assignedMembershipId_idx" ON "Cleaning"("teamId", "assignedMembershipId");

-- AddForeignKey
ALTER TABLE "Cleaning" ADD CONSTRAINT "Cleaning_assignedMembershipId_fkey" FOREIGN KEY ("assignedMembershipId") REFERENCES "TeamMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
