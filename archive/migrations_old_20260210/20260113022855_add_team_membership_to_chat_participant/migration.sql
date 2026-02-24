-- AlterTable
ALTER TABLE "ChatParticipant" ADD COLUMN     "teamMembershipId" TEXT;

-- Backfill: Set teamMembershipId para participantes cuyo thread tiene teamId
-- Para cada ChatParticipant cuyo thread.teamId existe:
--   - Buscar TeamMembership ACTIVE para (thread.teamId, userId)
--   - Si existe exactamente una: set teamMembershipId
--   - Si no existe o hay múltiples: dejar null (legacy, no romper)
DO $$
DECLARE
  participant_record RECORD;
  membership_id TEXT;
  membership_count INTEGER;
BEGIN
  FOR participant_record IN
    SELECT 
      cp.id as participant_id,
      cp."threadId",
      cp."userId",
      ct."teamId"
    FROM "ChatParticipant" cp
    INNER JOIN "ChatThread" ct ON cp."threadId" = ct.id
    WHERE ct."teamId" IS NOT NULL
      AND cp."leftAt" IS NULL
      AND cp."teamMembershipId" IS NULL
  LOOP
    -- Buscar TeamMembership ACTIVE para (teamId, userId)
    SELECT COUNT(*), MAX(id) INTO membership_count, membership_id
    FROM "TeamMembership"
    WHERE "teamId" = participant_record."teamId"
      AND "userId" = participant_record."userId"
      AND "status" = 'ACTIVE';
    
    -- Si existe exactamente una membership, setear teamMembershipId
    IF membership_count = 1 AND membership_id IS NOT NULL THEN
      UPDATE "ChatParticipant"
      SET "teamMembershipId" = membership_id
      WHERE id = participant_record.participant_id;
    END IF;
    
    -- Si hay múltiples (edge case), elegir la más reciente y loguear
    IF membership_count > 1 THEN
      SELECT id INTO membership_id
      FROM "TeamMembership"
      WHERE "teamId" = participant_record."teamId"
        AND "userId" = participant_record."userId"
        AND "status" = 'ACTIVE'
      ORDER BY "createdAt" DESC
      LIMIT 1;
      
      IF membership_id IS NOT NULL THEN
        UPDATE "ChatParticipant"
        SET "teamMembershipId" = membership_id
        WHERE id = participant_record.participant_id;
        
        -- Log (en producción, considerar usar una tabla de logs)
        RAISE NOTICE 'Participant %: Multiple memberships found, using most recent: %', 
          participant_record.participant_id, membership_id;
      END IF;
    END IF;
  END LOOP;
END $$;

-- CreateIndex
CREATE INDEX "ChatParticipant_teamMembershipId_idx" ON "ChatParticipant"("teamMembershipId");

-- CreateIndex
CREATE INDEX "ChatParticipant_threadId_teamMembershipId_idx" ON "ChatParticipant"("threadId", "teamMembershipId");

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_teamMembershipId_fkey" FOREIGN KEY ("teamMembershipId") REFERENCES "TeamMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
