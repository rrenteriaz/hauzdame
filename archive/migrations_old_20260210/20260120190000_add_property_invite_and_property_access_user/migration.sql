-- Extend PropertyMemberAccessStatus enum
ALTER TYPE "PropertyMemberAccessStatus" ADD VALUE IF NOT EXISTS 'REMOVED';

-- New enums
DO $$ BEGIN
  CREATE TYPE "PropertyAccessRole" AS ENUM ('CLEANER', 'MANAGER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PropertyInviteStatus" AS ENUM ('PENDING', 'CLAIMED', 'REVOKED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Extend PropertyMemberAccess
ALTER TABLE "PropertyMemberAccess"
  ALTER COLUMN "teamMembershipId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "accessRole" "PropertyAccessRole";

-- FK for userId
DO $$ BEGIN
  ALTER TABLE "PropertyMemberAccess"
    ADD CONSTRAINT "PropertyMemberAccess_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Uniques and indexes
CREATE UNIQUE INDEX IF NOT EXISTS "PropertyMemberAccess_propertyId_userId_key"
  ON "PropertyMemberAccess"("propertyId", "userId");

CREATE INDEX IF NOT EXISTS "PropertyMemberAccess_userId_idx"
  ON "PropertyMemberAccess"("userId");

-- Exactly one identity (teamMembershipId XOR userId)
DO $$ BEGIN
  ALTER TABLE "PropertyMemberAccess"
    ADD CONSTRAINT "PropertyMemberAccess_exactly_one_identity"
    CHECK (
      (("teamMembershipId" IS NOT NULL AND "userId" IS NULL) OR
       ("teamMembershipId" IS NULL AND "userId" IS NOT NULL))
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- PropertyInvite table
CREATE TABLE IF NOT EXISTS "PropertyInvite" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "invitedEmail" TEXT NOT NULL,
  "role" "PropertyAccessRole" NOT NULL,
  "status" "PropertyInviteStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "claimedAt" TIMESTAMP(3),
  "claimedByUserId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PropertyInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PropertyInvite_token_key"
  ON "PropertyInvite"("token");
CREATE INDEX IF NOT EXISTS "PropertyInvite_tenantId_idx"
  ON "PropertyInvite"("tenantId");
CREATE INDEX IF NOT EXISTS "PropertyInvite_propertyId_idx"
  ON "PropertyInvite"("propertyId");
CREATE INDEX IF NOT EXISTS "PropertyInvite_status_idx"
  ON "PropertyInvite"("status");
CREATE INDEX IF NOT EXISTS "PropertyInvite_invitedEmail_idx"
  ON "PropertyInvite"("invitedEmail");

DO $$ BEGIN
  ALTER TABLE "PropertyInvite"
    ADD CONSTRAINT "PropertyInvite_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PropertyInvite"
    ADD CONSTRAINT "PropertyInvite_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PropertyInvite"
    ADD CONSTRAINT "PropertyInvite_claimedByUserId_fkey"
    FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PropertyInvite"
    ADD CONSTRAINT "PropertyInvite_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

