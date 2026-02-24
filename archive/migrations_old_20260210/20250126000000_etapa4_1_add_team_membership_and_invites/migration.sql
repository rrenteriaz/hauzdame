-- CreateEnum: TeamRole
CREATE TYPE "TeamRole" AS ENUM ('OWNER', 'MANAGER', 'AUXILIAR', 'CLEANER', 'HANDYMAN');

-- CreateEnum: TeamMembershipStatus
CREATE TYPE "TeamMembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REMOVED');

-- CreateEnum: TeamInviteStatus
CREATE TYPE "TeamInviteStatus" AS ENUM ('PENDING', 'CLAIMED', 'EXPIRED', 'REVOKED');

-- RenameEnum: ThreadParticipantRole -> ChatParticipantRole (PostgreSQL 10.0+)
-- Si ChatParticipantRole ya existe (bootstrap_core), eliminar ThreadParticipantRole duplicado
-- Si no existe, renombrar ThreadParticipantRole a ChatParticipantRole
DO $$ 
BEGIN
  -- Verificar si ChatParticipantRole ya existe
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChatParticipantRole') THEN
    -- ChatParticipantRole ya existe, eliminar ThreadParticipantRole si existe
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ThreadParticipantRole') THEN
      DROP TYPE "ThreadParticipantRole";
    END IF;
  ELSE
    -- ChatParticipantRole no existe, renombrar ThreadParticipantRole
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ThreadParticipantRole') THEN
      ALTER TYPE "ThreadParticipantRole" RENAME TO "ChatParticipantRole";
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Si algo falla, continuar (el tipo puede no existir o ya estar renombrado)
  NULL;
END $$;

-- CreateTable: TeamMembership
CREATE TABLE "TeamMembership" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL,
    "status" "TeamMembershipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TeamInvite
CREATE TABLE "TeamInvite" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "TeamInviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdByUserId" TEXT NOT NULL,
    "claimedByUserId" TEXT,
    "prefillName" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "TeamInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: TeamMembership
CREATE INDEX "TeamMembership_userId_idx" ON "TeamMembership"("userId");
CREATE INDEX "TeamMembership_teamId_idx" ON "TeamMembership"("teamId");
CREATE INDEX "TeamMembership_teamId_status_idx" ON "TeamMembership"("teamId", "status");
CREATE UNIQUE INDEX "TeamMembership_teamId_userId_key" ON "TeamMembership"("teamId", "userId");

-- CreateIndex: TeamInvite
CREATE UNIQUE INDEX "TeamInvite_token_key" ON "TeamInvite"("token");
CREATE INDEX "TeamInvite_teamId_idx" ON "TeamInvite"("teamId");
CREATE INDEX "TeamInvite_createdByUserId_idx" ON "TeamInvite"("createdByUserId");
CREATE INDEX "TeamInvite_status_idx" ON "TeamInvite"("status");
CREATE INDEX "TeamInvite_token_idx" ON "TeamInvite"("token");

-- AddForeignKey: TeamMembership
-- Nota: TeamMembership_teamId_fkey se agregará en una migración posterior, después de que se cree la tabla Team
-- (Team se crea en 20251212211235_add_teams_and_team_members)
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: TeamInvite
-- Nota: TeamInvite_teamId_fkey se agregará en una migración posterior, después de que se cree la tabla Team
-- (Team se crea en 20251212211235_add_teams_and_team_members)
ALTER TABLE "TeamInvite" ADD CONSTRAINT "TeamInvite_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamInvite" ADD CONSTRAINT "TeamInvite_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

