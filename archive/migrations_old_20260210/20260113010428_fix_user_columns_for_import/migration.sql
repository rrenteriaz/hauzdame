/*
  Warnings:

  - A unique constraint covering the columns `[coverMediaId]` on the table `Property` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[avatarMediaId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CleaningAssigneeStatus" AS ENUM ('ASSIGNED', 'DECLINED');

-- CreateEnum: ChecklistArea (puede ya existir si fue creado en 20250121000000 o 20251216000000)
DO $$ BEGIN
  CREATE TYPE "ChecklistArea" AS ENUM ('SALA', 'COMEDOR', 'COCINA', 'HABITACIONES', 'BANOS', 'PATIO', 'JARDIN', 'COCHERA', 'OTROS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
CREATE TYPE "NotCompletedReasonCode" AS ENUM ('NO_HABIA_INSUMOS', 'NO_TUVE_ACCESO', 'SE_ROMPIO_O_FALLO', 'NO_HUBO_TIEMPO', 'OTRO');

-- CreateEnum
CREATE TYPE "PropertyOpeningStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('CLEANING');

-- CreateEnum
CREATE TYPE "PropertyApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CleanerVerificationDocumentType" AS ENUM ('INE');

-- CreateEnum
CREATE TYPE "CleanerVerificationDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CleanerWorkFlagStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');

-- AlterEnum
ALTER TYPE "AssetProvider" ADD VALUE 'AWS';

-- AlterEnum
ALTER TYPE "AssetVariant" ADD VALUE 'THUMB_256';

-- DropIndex
DROP INDEX "InventoryLine_isActive_idx";

-- AlterTable
ALTER TABLE "Cleaning" ALTER COLUMN "scheduledAtPlanned" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "coverAssetGroupId" TEXT,
ADD COLUMN     "coverMediaId" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarMediaId" TEXT,
ALTER COLUMN "tenantId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CleanerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'MX',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "serviceRadiusKm" INTEGER,
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "lastAvailableAt" TIMESTAMP(3),
    "avgRating" DOUBLE PRECISION DEFAULT 0,
    "ratingsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleanerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleanerVerificationDocument" (
    "id" TEXT NOT NULL,
    "cleanerProfileId" TEXT NOT NULL,
    "documentType" "CleanerVerificationDocumentType" NOT NULL,
    "assetId" TEXT NOT NULL,
    "status" "CleanerVerificationDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleanerVerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleanerAvailabilitySlot" (
    "id" TEXT NOT NULL,
    "cleanerProfileId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleanerAvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleanerReview" (
    "id" TEXT NOT NULL,
    "cleanerUserId" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(500),
    "relatedCleaningId" TEXT,
    "relatedPropertyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleanerReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleanerWorkFlag" (
    "id" TEXT NOT NULL,
    "cleanerProfileId" TEXT NOT NULL,
    "status" "CleanerWorkFlagStatus" NOT NULL DEFAULT 'ACTIVE',
    "desiredWorkType" "WorkType" NOT NULL DEFAULT 'CLEANING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleanerWorkFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningAssignee" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cleaningId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "CleaningAssigneeStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedByUserId" TEXT,

    CONSTRAINT "CleaningAssignee_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PropertyChecklistItem (puede ya existir si fue creada antes)
CREATE TABLE IF NOT EXISTS "PropertyChecklistItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "area" "ChecklistArea" NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requiresValue" BOOLEAN NOT NULL DEFAULT false,
    "valueLabel" TEXT,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "PropertyChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningChecklistItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cleaningId" TEXT NOT NULL,
    "area" "ChecklistArea" NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "notCompletedReasonCode" "NotCompletedReasonCode",
    "notCompletedReasonNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requiresValue" BOOLEAN NOT NULL DEFAULT false,
    "valueLabel" TEXT,
    "valueNumber" INTEGER,

    CONSTRAINT "CleaningChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningMedia" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cleaningId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleaningMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyOpening" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "workType" "WorkType" NOT NULL DEFAULT 'CLEANING',
    "status" "PropertyOpeningStatus" NOT NULL DEFAULT 'ACTIVE',
    "zoneLabel" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyOpening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyApplication" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "openingId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "applicantUserId" TEXT NOT NULL,
    "status" "PropertyApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CleanerProfile_userId_key" ON "CleanerProfile"("userId");

-- CreateIndex
CREATE INDEX "CleanerProfile_userId_idx" ON "CleanerProfile"("userId");

-- CreateIndex
CREATE INDEX "CleanerProfile_isAvailable_idx" ON "CleanerProfile"("isAvailable");

-- CreateIndex
CREATE INDEX "CleanerVerificationDocument_cleanerProfileId_idx" ON "CleanerVerificationDocument"("cleanerProfileId");

-- CreateIndex
CREATE INDEX "CleanerVerificationDocument_status_idx" ON "CleanerVerificationDocument"("status");

-- CreateIndex
CREATE INDEX "CleanerVerificationDocument_assetId_idx" ON "CleanerVerificationDocument"("assetId");

-- CreateIndex
CREATE INDEX "CleanerAvailabilitySlot_cleanerProfileId_idx" ON "CleanerAvailabilitySlot"("cleanerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "CleanerAvailabilitySlot_cleanerProfileId_dayOfWeek_key" ON "CleanerAvailabilitySlot"("cleanerProfileId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "CleanerReview_cleanerUserId_idx" ON "CleanerReview"("cleanerUserId");

-- CreateIndex
CREATE INDEX "CleanerReview_reviewerUserId_idx" ON "CleanerReview"("reviewerUserId");

-- CreateIndex
CREATE INDEX "CleanerReview_rating_idx" ON "CleanerReview"("rating");

-- CreateIndex
CREATE INDEX "CleanerReview_createdAt_idx" ON "CleanerReview"("createdAt");

-- CreateIndex
CREATE INDEX "CleanerWorkFlag_cleanerProfileId_idx" ON "CleanerWorkFlag"("cleanerProfileId");

-- CreateIndex
CREATE INDEX "CleanerWorkFlag_status_idx" ON "CleanerWorkFlag"("status");

-- CreateIndex
CREATE INDEX "CleanerWorkFlag_desiredWorkType_idx" ON "CleanerWorkFlag"("desiredWorkType");

-- CreateIndex
CREATE UNIQUE INDEX "CleanerWorkFlag_cleanerProfileId_desiredWorkType_key" ON "CleanerWorkFlag"("cleanerProfileId", "desiredWorkType");

-- CreateIndex
CREATE INDEX "CleaningAssignee_tenantId_idx" ON "CleaningAssignee"("tenantId");

-- CreateIndex
CREATE INDEX "CleaningAssignee_cleaningId_idx" ON "CleaningAssignee"("cleaningId");

-- CreateIndex
CREATE INDEX "CleaningAssignee_memberId_idx" ON "CleaningAssignee"("memberId");

-- CreateIndex
CREATE INDEX "CleaningAssignee_status_idx" ON "CleaningAssignee"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CleaningAssignee_cleaningId_memberId_key" ON "CleaningAssignee"("cleaningId", "memberId");

-- CreateIndex: PropertyChecklistItem (pueden ya existir si fue creada antes)
CREATE INDEX IF NOT EXISTS "PropertyChecklistItem_tenantId_idx" ON "PropertyChecklistItem"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PropertyChecklistItem_propertyId_idx" ON "PropertyChecklistItem"("propertyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PropertyChecklistItem_propertyId_isActive_idx" ON "PropertyChecklistItem"("propertyId", "isActive");

-- CreateIndex
CREATE INDEX "CleaningChecklistItem_tenantId_idx" ON "CleaningChecklistItem"("tenantId");

-- CreateIndex
CREATE INDEX "CleaningChecklistItem_cleaningId_idx" ON "CleaningChecklistItem"("cleaningId");

-- CreateIndex
CREATE INDEX "CleaningChecklistItem_cleaningId_area_idx" ON "CleaningChecklistItem"("cleaningId", "area");

-- CreateIndex
CREATE INDEX "CleaningMedia_tenantId_idx" ON "CleaningMedia"("tenantId");

-- CreateIndex
CREATE INDEX "CleaningMedia_cleaningId_idx" ON "CleaningMedia"("cleaningId");

-- CreateIndex
CREATE INDEX "CleaningMedia_assetId_idx" ON "CleaningMedia"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "CleaningMedia_cleaningId_assetId_key" ON "CleaningMedia"("cleaningId", "assetId");

-- CreateIndex
CREATE INDEX "PropertyOpening_tenantId_idx" ON "PropertyOpening"("tenantId");

-- CreateIndex
CREATE INDEX "PropertyOpening_propertyId_idx" ON "PropertyOpening"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyOpening_status_idx" ON "PropertyOpening"("status");

-- CreateIndex
CREATE INDEX "PropertyOpening_workType_idx" ON "PropertyOpening"("workType");

-- CreateIndex
CREATE INDEX "PropertyApplication_tenantId_idx" ON "PropertyApplication"("tenantId");

-- CreateIndex
CREATE INDEX "PropertyApplication_openingId_idx" ON "PropertyApplication"("openingId");

-- CreateIndex
CREATE INDEX "PropertyApplication_propertyId_idx" ON "PropertyApplication"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyApplication_applicantUserId_idx" ON "PropertyApplication"("applicantUserId");

-- CreateIndex
CREATE INDEX "PropertyApplication_status_idx" ON "PropertyApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyApplication_openingId_applicantUserId_key" ON "PropertyApplication"("openingId", "applicantUserId");

-- CreateIndex
CREATE INDEX "Cleaning_teamId_idx" ON "Cleaning"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Property_coverMediaId_key" ON "Property"("coverMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "User_avatarMediaId_key" ON "User"("avatarMediaId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatarMediaId_fkey" FOREIGN KEY ("avatarMediaId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanerProfile" ADD CONSTRAINT "CleanerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanerVerificationDocument" ADD CONSTRAINT "CleanerVerificationDocument_cleanerProfileId_fkey" FOREIGN KEY ("cleanerProfileId") REFERENCES "CleanerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanerVerificationDocument" ADD CONSTRAINT "CleanerVerificationDocument_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanerVerificationDocument" ADD CONSTRAINT "CleanerVerificationDocument_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanerAvailabilitySlot" ADD CONSTRAINT "CleanerAvailabilitySlot_cleanerProfileId_fkey" FOREIGN KEY ("cleanerProfileId") REFERENCES "CleanerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanerReview" ADD CONSTRAINT "CleanerReview_cleanerUserId_fkey" FOREIGN KEY ("cleanerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanerReview" ADD CONSTRAINT "CleanerReview_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanerReview" ADD CONSTRAINT "CleanerReview_relatedCleaningId_fkey" FOREIGN KEY ("relatedCleaningId") REFERENCES "Cleaning"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanerReview" ADD CONSTRAINT "CleanerReview_relatedPropertyId_fkey" FOREIGN KEY ("relatedPropertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanerWorkFlag" ADD CONSTRAINT "CleanerWorkFlag_cleanerProfileId_fkey" FOREIGN KEY ("cleanerProfileId") REFERENCES "CleanerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cleaning" ADD CONSTRAINT "Cleaning_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningAssignee" ADD CONSTRAINT "CleaningAssignee_cleaningId_fkey" FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningAssignee" ADD CONSTRAINT "CleaningAssignee_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningAssignee" ADD CONSTRAINT "CleaningAssignee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PropertyChecklistItem (pueden ya existir si fue creada antes)
DO $$ BEGIN
  ALTER TABLE "PropertyChecklistItem" ADD CONSTRAINT "PropertyChecklistItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PropertyChecklistItem" ADD CONSTRAINT "PropertyChecklistItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
ALTER TABLE "CleaningChecklistItem" ADD CONSTRAINT "CleaningChecklistItem_cleaningId_fkey" FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningChecklistItem" ADD CONSTRAINT "CleaningChecklistItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLine" ADD CONSTRAINT "InventoryLine_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReview" ADD CONSTRAINT "InventoryReview_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningMedia" ADD CONSTRAINT "CleaningMedia_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningMedia" ADD CONSTRAINT "CleaningMedia_cleaningId_fkey" FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningMedia" ADD CONSTRAINT "CleaningMedia_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOpening" ADD CONSTRAINT "PropertyOpening_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOpening" ADD CONSTRAINT "PropertyOpening_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOpening" ADD CONSTRAINT "PropertyOpening_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyApplication" ADD CONSTRAINT "PropertyApplication_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyApplication" ADD CONSTRAINT "PropertyApplication_openingId_fkey" FOREIGN KEY ("openingId") REFERENCES "PropertyOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyApplication" ADD CONSTRAINT "PropertyApplication_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyApplication" ADD CONSTRAINT "PropertyApplication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "PropertyApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvite" ADD CONSTRAINT "TeamInvite_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "InventoryLine_propertyId_areaNormalized_itemId_variantKey_varia" RENAME TO "InventoryLine_propertyId_areaNormalized_itemId_variantKey_v_key";
