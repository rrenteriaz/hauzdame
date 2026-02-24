-- CreateEnum: UserRole (idempotente - ya existe en bootstrap_core)
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'CLEANER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: ReservationStatus (idempotente - ya existe en bootstrap_core)
DO $$ BEGIN
  CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'BLOCKED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: ReservationSource (idempotente - ya existe en bootstrap_core)
DO $$ BEGIN
  CREATE TYPE "ReservationSource" AS ENUM ('ICAL', 'MANUAL', 'SHEET', 'API', 'GMAIL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: CleaningStatus (idempotente - ya existe en bootstrap_core)
DO $$ BEGIN
  CREATE TYPE "CleaningStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: LockCodeStatus (idempotente - ya existe en bootstrap_core)
DO $$ BEGIN
  CREATE TYPE "LockCodeStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'ERROR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Reservation_tenantId_idx" ON "Reservation"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Reservation_propertyId_idx" ON "Reservation"("propertyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Reservation_startDate_idx" ON "Reservation"("startDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Reservation_endDate_idx" ON "Reservation"("endDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Cleaning_tenantId_idx" ON "Cleaning"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Cleaning_propertyId_idx" ON "Cleaning"("propertyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Cleaning_reservationId_idx" ON "Cleaning"("reservationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Cleaning_assignedToId_idx" ON "Cleaning"("assignedToId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lock_tenantId_idx" ON "Lock"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lock_propertyId_idx" ON "Lock"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Lock_tenantId_ttlockId_key" ON "Lock"("tenantId", "ttlockId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LockCode_tenantId_idx" ON "LockCode"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LockCode_lockId_idx" ON "LockCode"("lockId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LockCode_reservationId_idx" ON "LockCode"("reservationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LockCode_startsAt_idx" ON "LockCode"("startsAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LockCode_endsAt_idx" ON "LockCode"("endsAt");

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Property" ADD CONSTRAINT "Property_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Cleaning" ADD CONSTRAINT "Cleaning_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Cleaning" ADD CONSTRAINT "Cleaning_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Cleaning" ADD CONSTRAINT "Cleaning_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Cleaning" ADD CONSTRAINT "Cleaning_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Lock" ADD CONSTRAINT "Lock_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Lock" ADD CONSTRAINT "Lock_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "LockCode" ADD CONSTRAINT "LockCode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "LockCode" ADD CONSTRAINT "LockCode_lockId_fkey" FOREIGN KEY ("lockId") REFERENCES "Lock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "LockCode" ADD CONSTRAINT "LockCode_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;