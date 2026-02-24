/* =========================
   BOOTSTRAP CORE SCHEMA
   Replay-safe for Prisma Shadow DB
   ========================= */

-- =========================
-- ENUMS
-- =========================
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'CLEANER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'BLOCKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReservationSource" AS ENUM ('ICAL', 'MANUAL', 'SHEET', 'API', 'GMAIL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CleaningStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LockCodeStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'ERROR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AssetType" AS ENUM ('IMAGE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AssetProvider" AS ENUM ('SUPABASE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AssetVariant" AS ENUM ('ORIGINAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AssetType" AS ENUM ('IMAGE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AssetProvider" AS ENUM ('SUPABASE', 'AWS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AssetVariant" AS ENUM ('ORIGINAL', 'THUMB_256');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ChatThreadContextType" AS ENUM ('REQUEST', 'CLEANING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ChatThreadStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ChatMessageType" AS ENUM ('TEXT', 'IMAGE', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ChatParticipantRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;



-- =========================
-- TABLES
-- =========================

CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "hashedPassword" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Property" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "icalUrl" TEXT,
    "timeZone" TEXT,
    "checkInTime" TEXT,
    "checkOutTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Reservation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "source" "ReservationSource" NOT NULL DEFAULT 'ICAL',
    "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "calendarUid" TEXT,
    "reservationCodeCalendar" TEXT,
    "guestPhoneLast4" TEXT,
    "confirmationCodeEmail" TEXT,
    "guestName" TEXT,
    "guestMessage" TEXT,
    "guestsAdult" INTEGER,
    "guestsChildren" INTEGER,
    "guestsInfants" INTEGER,
    "guestsPets" INTEGER,
    "pricingNightly" DECIMAL(10,2),
    "pricingCleaningFee" DECIMAL(10,2),
    "pricingPetFee" DECIMAL(10,2),
    "pricingHostServiceFee" DECIMAL(10,2),
    "pricingHostPayout" DECIMAL(10,2),
    "pricingCurrency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Cleaning" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "reservationId" TEXT,
    "assignedToId" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" "CleaningStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Cleaning_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Lock" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ttlockId" TEXT NOT NULL,
    "timeZone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Lock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LockCode" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "lockId" TEXT NOT NULL,
    "reservationId" TEXT,
    "code" TEXT NOT NULL,
    "guestPhoneLast4" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "LockCodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LockCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Asset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "AssetType" NOT NULL DEFAULT 'IMAGE',
    "provider" "AssetProvider" NOT NULL DEFAULT 'SUPABASE',
    "variant" "AssetVariant" NOT NULL,
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "publicUrl" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "takenAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- From @@unique([tenantId, bucket, key])
CREATE UNIQUE INDEX IF NOT EXISTS "Asset_tenantId_bucket_key_key"
ON "Asset"("tenantId", "bucket", "key");

-- From @@index([tenantId, groupId])
CREATE INDEX IF NOT EXISTS "Asset_tenantId_groupId_idx"
ON "Asset"("tenantId", "groupId");

-- From @@index([tenantId, type])
CREATE INDEX IF NOT EXISTS "Asset_tenantId_type_idx"
ON "Asset"("tenantId", "type");

-- From @@index([groupId])
CREATE INDEX IF NOT EXISTS "Asset_groupId_idx"
ON "Asset"("groupId");

-- From @@index([createdByUserId])
CREATE INDEX IF NOT EXISTS "Asset_createdByUserId_idx"
ON "Asset"("createdByUserId");


CREATE TABLE IF NOT EXISTS "ChatThread" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "contextType" "ChatThreadContextType" NOT NULL,
    "status" "ChatThreadStatus" NOT NULL DEFAULT 'PENDING',
    "applicationId" TEXT,
    "cleaningId" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamId" TEXT,

    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "ChatThread_applicationId_key" ON "ChatThread"("applicationId");
CREATE UNIQUE INDEX IF NOT EXISTS "ChatThread_cleaningId_key" ON "ChatThread"("cleaningId");

-- Indexes
CREATE INDEX IF NOT EXISTS "ChatThread_tenantId_idx" ON "ChatThread"("tenantId");
CREATE INDEX IF NOT EXISTS "ChatThread_propertyId_idx" ON "ChatThread"("propertyId");
CREATE INDEX IF NOT EXISTS "ChatThread_status_idx" ON "ChatThread"("status");
CREATE INDEX IF NOT EXISTS "ChatThread_lastMessageAt_idx" ON "ChatThread"("lastMessageAt");
CREATE INDEX IF NOT EXISTS "ChatThread_teamId_idx" ON "ChatThread"("teamId");


CREATE TABLE IF NOT EXISTS "ChatParticipant" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "addedByUserId" TEXT,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "ChatParticipantRole" NOT NULL DEFAULT 'MEMBER',

    CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY ("id")
);

-- Unique + Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "ChatParticipant_threadId_userId_key" ON "ChatParticipant"("threadId", "userId");
CREATE INDEX IF NOT EXISTS "ChatParticipant_threadId_idx" ON "ChatParticipant"("threadId");
CREATE INDEX IF NOT EXISTS "ChatParticipant_userId_idx" ON "ChatParticipant"("userId");
CREATE INDEX IF NOT EXISTS "ChatParticipant_threadId_leftAt_idx" ON "ChatParticipant"("threadId", "leftAt");
CREATE INDEX IF NOT EXISTS "ChatParticipant_teamId_idx" ON "ChatParticipant"("teamId");


CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT,
    "type" "ChatMessageType" NOT NULL DEFAULT 'TEXT',
    "assetId" TEXT,
    "clientMessageId" TEXT,
    "clientCreatedAt" TIMESTAMP(3),
    "serverCreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "ChatMessage_clientMessageId_key" ON "ChatMessage"("clientMessageId");
CREATE UNIQUE INDEX IF NOT EXISTS "ChatMessage_threadId_clientMessageId_key" ON "ChatMessage"("threadId", "clientMessageId");

-- Indexes
CREATE INDEX IF NOT EXISTS "ChatMessage_tenantId_idx" ON "ChatMessage"("tenantId");
CREATE INDEX IF NOT EXISTS "ChatMessage_threadId_idx" ON "ChatMessage"("threadId");
CREATE INDEX IF NOT EXISTS "ChatMessage_senderUserId_idx" ON "ChatMessage"("senderUserId");
CREATE INDEX IF NOT EXISTS "ChatMessage_serverCreatedAt_idx" ON "ChatMessage"("serverCreatedAt");
CREATE INDEX IF NOT EXISTS "ChatMessage_clientMessageId_idx" ON "ChatMessage"("clientMessageId");


-- =========================
-- INDEXES
-- =========================
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- =========================
-- FOREIGN KEYS
-- =========================

DO $$ BEGIN
  ALTER TABLE "User"
    ADD CONSTRAINT "User_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Property"
    ADD CONSTRAINT "Property_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Reservation"
    ADD CONSTRAINT "Reservation_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Reservation"
    ADD CONSTRAINT "Reservation_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Cleaning"
    ADD CONSTRAINT "Cleaning_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Cleaning"
    ADD CONSTRAINT "Cleaning_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Cleaning"
    ADD CONSTRAINT "Cleaning_reservationId_fkey"
    FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Cleaning"
    ADD CONSTRAINT "Cleaning_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Lock"
    ADD CONSTRAINT "Lock_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Lock"
    ADD CONSTRAINT "Lock_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LockCode"
    ADD CONSTRAINT "LockCode_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LockCode"
    ADD CONSTRAINT "LockCode_lockId_fkey"
    FOREIGN KEY ("lockId") REFERENCES "Lock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LockCode"
    ADD CONSTRAINT "LockCode_reservationId_fkey"
    FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Asset"
    ADD CONSTRAINT "Asset_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Asset"
    ADD CONSTRAINT "Asset_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChatThread"
    ADD CONSTRAINT "ChatThread_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChatThread"
    ADD CONSTRAINT "ChatThread_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChatThread"
    ADD CONSTRAINT "ChatThread_cleaningId_fkey"
    FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChatParticipant"
    ADD CONSTRAINT "ChatParticipant_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChatParticipant"
    ADD CONSTRAINT "ChatParticipant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChatParticipant"
    ADD CONSTRAINT "ChatParticipant_addedByUserId_fkey"
    FOREIGN KEY ("addedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChatMessage"
    ADD CONSTRAINT "ChatMessage_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChatMessage"
    ADD CONSTRAINT "ChatMessage_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChatMessage"
    ADD CONSTRAINT "ChatMessage_senderUserId_fkey"
    FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChatMessage"
    ADD CONSTRAINT "ChatMessage_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

