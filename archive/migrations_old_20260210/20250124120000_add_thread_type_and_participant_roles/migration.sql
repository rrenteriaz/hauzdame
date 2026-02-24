-- CreateEnum: ThreadType
CREATE TYPE "ThreadType" AS ENUM ('HOST_CLEANER', 'HOST_TEAM', 'TEAM_INTERNAL', 'HOST_HOST');

-- CreateEnum: ThreadParticipantRole
CREATE TYPE "ThreadParticipantRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- AlterTable: ChatThread - Agregar type
ALTER TABLE "ChatThread" ADD COLUMN     "type" "ThreadType" NOT NULL DEFAULT 'HOST_CLEANER';

-- CreateIndex: ChatThread - type
CREATE INDEX IF NOT EXISTS "ChatThread_type_idx" ON "ChatThread"("type");

-- Nota: Los foreign keys ChatThread_teamId_fkey y ChatParticipant_teamId_fkey
-- se agregarán en una migración posterior, después de que se cree la tabla Team
-- (Team se crea en 20251212211235_add_teams_and_team_members)

-- Backfill: Asignar role OWNER al primer participante de cada thread (creador)
-- y MEMBER a los demás
UPDATE "ChatParticipant" cp1
SET "role" = 'OWNER'
WHERE cp1."id" IN (
  SELECT cp2."id"
  FROM "ChatParticipant" cp2
  WHERE cp2."joinedAt" = (
    SELECT MIN(cp3."joinedAt")
    FROM "ChatParticipant" cp3
    WHERE cp3."threadId" = cp2."threadId"
  )
);


