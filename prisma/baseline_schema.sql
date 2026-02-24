-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PropertyMemberAccessStatus" AS ENUM ('ACTIVE', 'REMOVED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PropertyAccessRole" AS ENUM ('CLEANER', 'MANAGER');

-- CreateEnum
CREATE TYPE "PropertyInviteStatus" AS ENUM ('PENDING', 'CLAIMED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WorkGroupExecutorStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'CLEANER', 'HANDYMAN');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ReservationSource" AS ENUM ('ICAL', 'MANUAL', 'SHEET', 'API', 'GMAIL');

-- CreateEnum
CREATE TYPE "CleaningStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('OPEN', 'ASSIGNED');

-- CreateEnum
CREATE TYPE "CleaningAssigneeStatus" AS ENUM ('ASSIGNED', 'DECLINED');

-- CreateEnum
CREATE TYPE "LockCodeStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'ERROR');

-- CreateEnum
CREATE TYPE "LockProvider" AS ENUM ('TTLOCK', 'TUYA', 'OTHER');

-- CreateEnum
CREATE TYPE "ChecklistArea" AS ENUM ('SALA', 'COMEDOR', 'COCINA', 'HABITACIONES', 'BANOS', 'PATIO', 'JARDIN', 'COCHERA', 'OTROS');

-- CreateEnum
CREATE TYPE "NotCompletedReasonCode" AS ENUM ('NO_HABIA_INSUMOS', 'NO_TUVE_ACCESO', 'SE_ROMPIO_O_FALLO', 'NO_HUBO_TIEMPO', 'OTRO');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('IMAGE');

-- CreateEnum
CREATE TYPE "AssetProvider" AS ENUM ('SUPABASE', 'AWS');

-- CreateEnum
CREATE TYPE "AssetVariant" AS ENUM ('ORIGINAL', 'THUMB_256');

-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('FURNITURE_EQUIPMENT', 'LINENS', 'TABLEWARE_UTENSILS', 'DECOR', 'KITCHEN_ACCESSORIES', 'KEYS_ACCESS', 'CONSUMABLES', 'OTHER');

-- CreateEnum
CREATE TYPE "InventoryCondition" AS ENUM ('NEW', 'USED_LT_1Y', 'USED_GT_1Y');

-- CreateEnum
CREATE TYPE "InventoryPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "InventoryReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "InventoryChangeReason" AS ENUM ('ROUTINE_COUNT', 'PREVIOUS_ERROR', 'DAMAGED', 'REPLACED', 'LOST', 'MOVED', 'OTHER');

-- CreateEnum
CREATE TYPE "InventoryChangeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'APPLIED');

-- CreateEnum
CREATE TYPE "InventoryReportType" AS ENUM ('DAMAGED_WORKS', 'DAMAGED_NOT_WORKING', 'MISSING_PHYSICAL', 'REPLACED_DIFFERENT', 'DETAILS_MISMATCH', 'OTHER');

-- CreateEnum
CREATE TYPE "InventoryReportSeverity" AS ENUM ('URGENT', 'IMPORTANT', 'INFO');

-- CreateEnum
CREATE TYPE "InventoryReportStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InventoryCheckStatus" AS ENUM ('OK', 'MISSING', 'DAMAGED');

-- CreateEnum
CREATE TYPE "InventoryReportResolution" AS ENUM ('REPAIR', 'KEEP_USING', 'REPLACE_AND_DISCARD', 'DISCARD', 'STORE', 'MARK_LOST', 'UPDATE_ITEM_TO_NEW', 'MARK_TO_REPLACE');

-- CreateEnum
CREATE TYPE "PropertyOpeningStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('CLEANING');

-- CreateEnum
CREATE TYPE "PropertyApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChatThreadContextType" AS ENUM ('REQUEST', 'CLEANING');

-- CreateEnum
CREATE TYPE "ChatThreadStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChatMessageType" AS ENUM ('TEXT', 'IMAGE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ThreadType" AS ENUM ('HOST_CLEANER', 'HOST_TEAM', 'TEAM_INTERNAL', 'HOST_HOST');

-- CreateEnum
CREATE TYPE "ChatParticipantRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "TeamInviteStatus" AS ENUM ('PENDING', 'CLAIMED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "HostWorkGroupInviteStatus" AS ENUM ('PENDING', 'CLAIMED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "TeamMembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "HostWorkGroupStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('TEAM_LEADER', 'OWNER', 'MANAGER', 'AUXILIAR', 'CLEANER', 'HANDYMAN');

-- CreateEnum
CREATE TYPE "CleanerVerificationDocumentType" AS ENUM ('INE');

-- CreateEnum
CREATE TYPE "CleanerVerificationDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CleanerWorkFlagStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "hashedPassword" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "avatarMediaId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "Property" (
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
    "userId" TEXT NOT NULL,
    "groupName" TEXT,
    "notificationEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "idOld" TEXT,
    "id" TEXT NOT NULL,
    "coverAssetGroupId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "wifiSsid" TEXT,
    "wifiPassword" TEXT,
    "accessCode" TEXT,
    "coverMediaId" TEXT,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyMemberAccess" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "teamMembershipId" TEXT,
    "userId" TEXT,
    "accessRole" "PropertyAccessRole",
    "status" "PropertyMemberAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyMemberAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyInvite" (
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

-- CreateTable
CREATE TABLE "PropertyAdmin" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "PropertyAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyCleaner" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "PropertyCleaner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyHandyman" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "PropertyHandyman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
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
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cleaning" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reservationId" TEXT,
    "assignedToId" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" "CleaningStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "assignedTeamMemberId" TEXT,
    "assignedMemberId" TEXT,
    "assignmentStatus" "AssignmentStatus" NOT NULL DEFAULT 'OPEN',
    "attentionReason" TEXT,
    "needsAttention" BOOLEAN NOT NULL DEFAULT false,
    "scheduledAtOriginal" TIMESTAMP(3),
    "scheduledAtPlanned" TIMESTAMP(3),
    "isScheduleOverridden" BOOLEAN NOT NULL DEFAULT false,
    "scheduleOverriddenAt" TIMESTAMP(3),
    "propertyId" TEXT NOT NULL,
    "teamId" TEXT,
    "assignedMembershipId" TEXT,
    "propertyName" TEXT,
    "propertyShortName" TEXT,
    "propertyAddress" TEXT,

    CONSTRAINT "Cleaning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lock" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT,
    "ttlockId" TEXT,
    "timeZone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "provider" "LockProvider" NOT NULL DEFAULT 'TTLOCK',
    "providerConfig" JSONB,
    "providerLockId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "Lock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LockCode" (
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

-- CreateTable
CREATE TABLE "MetricEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE',
    "inactivatedAt" TIMESTAMP(3),
    "inactivatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workingDays" TEXT[],
    "workingEndTime" TEXT,
    "workingStartTime" TEXT,
    "userId" TEXT,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMemberScheduleDay" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isWorking" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TEXT,
    "endTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMemberScheduleDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyTeam" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "PropertyTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostWorkGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "HostWorkGroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostWorkGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostWorkGroupProperty" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workGroupId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostWorkGroupProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkGroupExecutor" (
    "id" TEXT NOT NULL,
    "hostTenantId" TEXT NOT NULL,
    "workGroupId" TEXT NOT NULL,
    "servicesTenantId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "status" "WorkGroupExecutorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkGroupExecutor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostWorkGroupInvite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workGroupId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "HostWorkGroupInviteStatus" NOT NULL DEFAULT 'PENDING',
    "prefillName" TEXT,
    "message" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "claimedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "HostWorkGroupInvite_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "CleaningView" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cleaningId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleaningView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyChecklistItem" (
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
CREATE TABLE "Asset" (
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

-- CreateTable
CREATE TABLE "InventoryItemAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryItemAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItemAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistItemAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" "InventoryCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "defaultBrand" TEXT,
    "defaultModel" TEXT,
    "defaultColor" TEXT,
    "defaultSize" TEXT,
    "isReplacable" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "defaultVariantKey" TEXT,
    "defaultVariantLabel" TEXT,
    "defaultVariantOptions" JSONB,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalCatalogItem" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'es-MX',
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "defaultCategory" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "areaNormalized" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "expectedQty" INTEGER NOT NULL,
    "condition" "InventoryCondition" NOT NULL DEFAULT 'USED_LT_1Y',
    "priority" "InventoryPriority" NOT NULL DEFAULT 'MEDIUM',
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "color" TEXT,
    "size" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "variantKey" TEXT,
    "variantValue" TEXT,
    "variantValueNormalized" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "InventoryLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cleaningId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "status" "InventoryReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCheck" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "cleaningId" TEXT NOT NULL,
    "inventoryLineId" TEXT NOT NULL,
    "status" "InventoryCheckStatus" NOT NULL DEFAULT 'OK',
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "inventoryItemId" TEXT,

    CONSTRAINT "InventoryCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReviewItemChange" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantityBefore" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "reason" "InventoryChangeReason" NOT NULL,
    "reasonOtherText" TEXT,
    "note" VARCHAR(200),
    "status" "InventoryChangeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryReviewItemChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reviewId" TEXT,
    "cleaningId" TEXT,
    "itemId" TEXT NOT NULL,
    "type" "InventoryReportType" NOT NULL,
    "severity" "InventoryReportSeverity" NOT NULL DEFAULT 'INFO',
    "description" TEXT,
    "status" "InventoryReportStatus" NOT NULL DEFAULT 'PENDING',
    "managerResolution" "InventoryReportResolution",
    "createdByUserId" TEXT NOT NULL,
    "resolvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryReport_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "InventoryEvidence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "changeId" TEXT,
    "reportId" TEXT,
    "assetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryEvidence_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "ChatThread" (
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
    "type" "ThreadType" NOT NULL DEFAULT 'HOST_CLEANER',

    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatParticipant" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "addedByUserId" TEXT,
    "teamId" TEXT,
    "teamMembershipId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "ChatParticipantRole" NOT NULL DEFAULT 'MEMBER',

    CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
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

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_avatarMediaId_key" ON "User"("avatarMediaId");

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
CREATE UNIQUE INDEX "Property_idOld_key" ON "Property"("idOld");

-- CreateIndex
CREATE UNIQUE INDEX "Property_coverMediaId_key" ON "Property"("coverMediaId");

-- CreateIndex
CREATE INDEX "Property_tenantId_idx" ON "Property"("tenantId");

-- CreateIndex
CREATE INDEX "PropertyMemberAccess_teamMembershipId_idx" ON "PropertyMemberAccess"("teamMembershipId");

-- CreateIndex
CREATE INDEX "PropertyMemberAccess_propertyId_idx" ON "PropertyMemberAccess"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyMemberAccess_userId_idx" ON "PropertyMemberAccess"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyMemberAccess_propertyId_teamMembershipId_key" ON "PropertyMemberAccess"("propertyId", "teamMembershipId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyMemberAccess_propertyId_userId_key" ON "PropertyMemberAccess"("propertyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyInvite_token_key" ON "PropertyInvite"("token");

-- CreateIndex
CREATE INDEX "PropertyInvite_tenantId_idx" ON "PropertyInvite"("tenantId");

-- CreateIndex
CREATE INDEX "PropertyInvite_propertyId_idx" ON "PropertyInvite"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyInvite_status_idx" ON "PropertyInvite"("status");

-- CreateIndex
CREATE INDEX "PropertyInvite_invitedEmail_idx" ON "PropertyInvite"("invitedEmail");

-- CreateIndex
CREATE INDEX "PropertyAdmin_tenantId_idx" ON "PropertyAdmin"("tenantId");

-- CreateIndex
CREATE INDEX "PropertyAdmin_propertyId_idx" ON "PropertyAdmin"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyAdmin_propertyId_userId_key" ON "PropertyAdmin"("propertyId", "userId");

-- CreateIndex
CREATE INDEX "PropertyCleaner_tenantId_idx" ON "PropertyCleaner"("tenantId");

-- CreateIndex
CREATE INDEX "PropertyCleaner_propertyId_idx" ON "PropertyCleaner"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyCleaner_propertyId_userId_key" ON "PropertyCleaner"("propertyId", "userId");

-- CreateIndex
CREATE INDEX "PropertyHandyman_tenantId_idx" ON "PropertyHandyman"("tenantId");

-- CreateIndex
CREATE INDEX "PropertyHandyman_propertyId_idx" ON "PropertyHandyman"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyHandyman_propertyId_userId_key" ON "PropertyHandyman"("propertyId", "userId");

-- CreateIndex
CREATE INDEX "Reservation_tenantId_idx" ON "Reservation"("tenantId");

-- CreateIndex
CREATE INDEX "Reservation_propertyId_idx" ON "Reservation"("propertyId");

-- CreateIndex
CREATE INDEX "Reservation_startDate_idx" ON "Reservation"("startDate");

-- CreateIndex
CREATE INDEX "Reservation_endDate_idx" ON "Reservation"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_propertyId_calendarUid_key" ON "Reservation"("propertyId", "calendarUid");

-- CreateIndex
CREATE INDEX "Cleaning_tenantId_idx" ON "Cleaning"("tenantId");

-- CreateIndex
CREATE INDEX "Cleaning_propertyId_idx" ON "Cleaning"("propertyId");

-- CreateIndex
CREATE INDEX "Cleaning_reservationId_idx" ON "Cleaning"("reservationId");

-- CreateIndex
CREATE INDEX "Cleaning_assignedToId_idx" ON "Cleaning"("assignedToId");

-- CreateIndex
CREATE INDEX "Cleaning_assignedTeamMemberId_idx" ON "Cleaning"("assignedTeamMemberId");

-- CreateIndex
CREATE INDEX "Cleaning_assignmentStatus_idx" ON "Cleaning"("assignmentStatus");

-- CreateIndex
CREATE INDEX "Cleaning_assignedMemberId_idx" ON "Cleaning"("assignedMemberId");

-- CreateIndex
CREATE INDEX "Cleaning_teamId_idx" ON "Cleaning"("teamId");

-- CreateIndex
CREATE INDEX "Cleaning_assignedMembershipId_idx" ON "Cleaning"("assignedMembershipId");

-- CreateIndex
CREATE INDEX "Cleaning_teamId_assignedMembershipId_idx" ON "Cleaning"("teamId", "assignedMembershipId");

-- CreateIndex
CREATE INDEX "Lock_tenantId_idx" ON "Lock"("tenantId");

-- CreateIndex
CREATE INDEX "Lock_propertyId_idx" ON "Lock"("propertyId");

-- CreateIndex
CREATE INDEX "Lock_tenantId_provider_providerLockId_idx" ON "Lock"("tenantId", "provider", "providerLockId");

-- CreateIndex
CREATE UNIQUE INDEX "Lock_tenantId_provider_providerLockId_key" ON "Lock"("tenantId", "provider", "providerLockId");

-- CreateIndex
CREATE INDEX "LockCode_tenantId_idx" ON "LockCode"("tenantId");

-- CreateIndex
CREATE INDEX "LockCode_lockId_idx" ON "LockCode"("lockId");

-- CreateIndex
CREATE INDEX "LockCode_reservationId_idx" ON "LockCode"("reservationId");

-- CreateIndex
CREATE INDEX "LockCode_startsAt_idx" ON "LockCode"("startsAt");

-- CreateIndex
CREATE INDEX "LockCode_endsAt_idx" ON "LockCode"("endsAt");

-- CreateIndex
CREATE INDEX "MetricEvent_tenantId_type_idx" ON "MetricEvent"("tenantId", "type");

-- CreateIndex
CREATE INDEX "Team_tenantId_idx" ON "Team"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_tenantId_name_key" ON "Team"("tenantId", "name");

-- CreateIndex
CREATE INDEX "TeamMember_tenantId_idx" ON "TeamMember"("tenantId");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");

-- CreateIndex
CREATE INDEX "TeamMemberScheduleDay_tenantId_idx" ON "TeamMemberScheduleDay"("tenantId");

-- CreateIndex
CREATE INDEX "TeamMemberScheduleDay_memberId_idx" ON "TeamMemberScheduleDay"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMemberScheduleDay_memberId_dayOfWeek_key" ON "TeamMemberScheduleDay"("memberId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "PropertyTeam_tenantId_idx" ON "PropertyTeam"("tenantId");

-- CreateIndex
CREATE INDEX "PropertyTeam_propertyId_idx" ON "PropertyTeam"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyTeam_teamId_idx" ON "PropertyTeam"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyTeam_propertyId_teamId_key" ON "PropertyTeam"("propertyId", "teamId");

-- CreateIndex
CREATE INDEX "HostWorkGroup_tenantId_idx" ON "HostWorkGroup"("tenantId");

-- CreateIndex
CREATE INDEX "HostWorkGroup_status_idx" ON "HostWorkGroup"("status");

-- CreateIndex
CREATE INDEX "HostWorkGroupProperty_tenantId_idx" ON "HostWorkGroupProperty"("tenantId");

-- CreateIndex
CREATE INDEX "HostWorkGroupProperty_propertyId_idx" ON "HostWorkGroupProperty"("propertyId");

-- CreateIndex
CREATE INDEX "HostWorkGroupProperty_workGroupId_idx" ON "HostWorkGroupProperty"("workGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "HostWorkGroupProperty_tenantId_workGroupId_propertyId_key" ON "HostWorkGroupProperty"("tenantId", "workGroupId", "propertyId");

-- CreateIndex
CREATE INDEX "WorkGroupExecutor_hostTenantId_workGroupId_idx" ON "WorkGroupExecutor"("hostTenantId", "workGroupId");

-- CreateIndex
CREATE INDEX "WorkGroupExecutor_hostTenantId_idx" ON "WorkGroupExecutor"("hostTenantId");

-- CreateIndex
CREATE INDEX "WorkGroupExecutor_servicesTenantId_idx" ON "WorkGroupExecutor"("servicesTenantId");

-- CreateIndex
CREATE INDEX "WorkGroupExecutor_teamId_idx" ON "WorkGroupExecutor"("teamId");

-- CreateIndex
CREATE INDEX "WorkGroupExecutor_workGroupId_idx" ON "WorkGroupExecutor"("workGroupId");

-- CreateIndex
CREATE INDEX "WorkGroupExecutor_status_idx" ON "WorkGroupExecutor"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkGroupExecutor_hostTenantId_workGroupId_teamId_key" ON "WorkGroupExecutor"("hostTenantId", "workGroupId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "HostWorkGroupInvite_token_key" ON "HostWorkGroupInvite"("token");

-- CreateIndex
CREATE INDEX "HostWorkGroupInvite_tenantId_idx" ON "HostWorkGroupInvite"("tenantId");

-- CreateIndex
CREATE INDEX "HostWorkGroupInvite_workGroupId_idx" ON "HostWorkGroupInvite"("workGroupId");

-- CreateIndex
CREATE INDEX "HostWorkGroupInvite_status_idx" ON "HostWorkGroupInvite"("status");

-- CreateIndex
CREATE INDEX "HostWorkGroupInvite_token_idx" ON "HostWorkGroupInvite"("token");

-- CreateIndex
CREATE INDEX "HostWorkGroupInvite_createdByUserId_idx" ON "HostWorkGroupInvite"("createdByUserId");

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

-- CreateIndex
CREATE INDEX "CleaningView_tenantId_idx" ON "CleaningView"("tenantId");

-- CreateIndex
CREATE INDEX "CleaningView_cleaningId_idx" ON "CleaningView"("cleaningId");

-- CreateIndex
CREATE INDEX "CleaningView_memberId_idx" ON "CleaningView"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "CleaningView_cleaningId_memberId_key" ON "CleaningView"("cleaningId", "memberId");

-- CreateIndex
CREATE INDEX "PropertyChecklistItem_tenantId_idx" ON "PropertyChecklistItem"("tenantId");

-- CreateIndex
CREATE INDEX "PropertyChecklistItem_propertyId_idx" ON "PropertyChecklistItem"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyChecklistItem_propertyId_isActive_idx" ON "PropertyChecklistItem"("propertyId", "isActive");

-- CreateIndex
CREATE INDEX "CleaningChecklistItem_tenantId_idx" ON "CleaningChecklistItem"("tenantId");

-- CreateIndex
CREATE INDEX "CleaningChecklistItem_cleaningId_idx" ON "CleaningChecklistItem"("cleaningId");

-- CreateIndex
CREATE INDEX "CleaningChecklistItem_cleaningId_area_idx" ON "CleaningChecklistItem"("cleaningId", "area");

-- CreateIndex
CREATE INDEX "Asset_tenantId_groupId_idx" ON "Asset"("tenantId", "groupId");

-- CreateIndex
CREATE INDEX "Asset_tenantId_type_idx" ON "Asset"("tenantId", "type");

-- CreateIndex
CREATE INDEX "Asset_groupId_idx" ON "Asset"("groupId");

-- CreateIndex
CREATE INDEX "Asset_createdByUserId_idx" ON "Asset"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_tenantId_bucket_key_key" ON "Asset"("tenantId", "bucket", "key");

-- CreateIndex
CREATE INDEX "InventoryItemAsset_tenantId_itemId_idx" ON "InventoryItemAsset"("tenantId", "itemId");

-- CreateIndex
CREATE INDEX "InventoryItemAsset_tenantId_assetId_idx" ON "InventoryItemAsset"("tenantId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItemAsset_tenantId_itemId_position_key" ON "InventoryItemAsset"("tenantId", "itemId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItemAsset_tenantId_itemId_assetId_key" ON "InventoryItemAsset"("tenantId", "itemId", "assetId");

-- CreateIndex
CREATE INDEX "ChecklistItemAsset_tenantId_checklistItemId_idx" ON "ChecklistItemAsset"("tenantId", "checklistItemId");

-- CreateIndex
CREATE INDEX "ChecklistItemAsset_tenantId_assetId_idx" ON "ChecklistItemAsset"("tenantId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItemAsset_tenantId_checklistItemId_position_key" ON "ChecklistItemAsset"("tenantId", "checklistItemId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItemAsset_tenantId_checklistItemId_assetId_key" ON "ChecklistItemAsset"("tenantId", "checklistItemId", "assetId");

-- CreateIndex
CREATE INDEX "InventoryItem_tenantId_idx" ON "InventoryItem"("tenantId");

-- CreateIndex
CREATE INDEX "InventoryItem_tenantId_category_idx" ON "InventoryItem"("tenantId", "category");

-- CreateIndex
CREATE INDEX "InventoryItem_tenantId_category_archivedAt_idx" ON "InventoryItem"("tenantId", "category", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_tenantId_nameNormalized_key" ON "InventoryItem"("tenantId", "nameNormalized");

-- CreateIndex
CREATE INDEX "GlobalCatalogItem_locale_isActive_idx" ON "GlobalCatalogItem"("locale", "isActive");

-- CreateIndex
CREATE INDEX "GlobalCatalogItem_nameNormalized_idx" ON "GlobalCatalogItem"("nameNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalCatalogItem_locale_nameNormalized_key" ON "GlobalCatalogItem"("locale", "nameNormalized");

-- CreateIndex
CREATE INDEX "InventoryLine_tenantId_propertyId_idx" ON "InventoryLine"("tenantId", "propertyId");

-- CreateIndex
CREATE INDEX "InventoryLine_propertyId_areaNormalized_idx" ON "InventoryLine"("propertyId", "areaNormalized");

-- CreateIndex
CREATE INDEX "InventoryLine_propertyId_itemId_idx" ON "InventoryLine"("propertyId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLine_propertyId_areaNormalized_itemId_variantKey_v_key" ON "InventoryLine"("propertyId", "areaNormalized", "itemId", "variantKey", "variantValueNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryReview_cleaningId_key" ON "InventoryReview"("cleaningId");

-- CreateIndex
CREATE INDEX "InventoryReview_tenantId_idx" ON "InventoryReview"("tenantId");

-- CreateIndex
CREATE INDEX "InventoryReview_cleaningId_idx" ON "InventoryReview"("cleaningId");

-- CreateIndex
CREATE INDEX "InventoryReview_propertyId_idx" ON "InventoryReview"("propertyId");

-- CreateIndex
CREATE INDEX "InventoryReview_status_idx" ON "InventoryReview"("status");

-- CreateIndex
CREATE INDEX "InventoryReview_reviewedByUserId_idx" ON "InventoryReview"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "InventoryCheck_tenantId_idx" ON "InventoryCheck"("tenantId");

-- CreateIndex
CREATE INDEX "InventoryCheck_cleaningId_idx" ON "InventoryCheck"("cleaningId");

-- CreateIndex
CREATE INDEX "InventoryCheck_propertyId_idx" ON "InventoryCheck"("propertyId");

-- CreateIndex
CREATE INDEX "InventoryCheck_inventoryLineId_idx" ON "InventoryCheck"("inventoryLineId");

-- CreateIndex
CREATE INDEX "InventoryCheck_status_idx" ON "InventoryCheck"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCheck_cleaningId_inventoryLineId_key" ON "InventoryCheck"("cleaningId", "inventoryLineId");

-- CreateIndex
CREATE INDEX "InventoryReviewItemChange_tenantId_idx" ON "InventoryReviewItemChange"("tenantId");

-- CreateIndex
CREATE INDEX "InventoryReviewItemChange_reviewId_idx" ON "InventoryReviewItemChange"("reviewId");

-- CreateIndex
CREATE INDEX "InventoryReviewItemChange_itemId_idx" ON "InventoryReviewItemChange"("itemId");

-- CreateIndex
CREATE INDEX "InventoryReviewItemChange_status_idx" ON "InventoryReviewItemChange"("status");

-- CreateIndex
CREATE INDEX "InventoryReport_tenantId_idx" ON "InventoryReport"("tenantId");

-- CreateIndex
CREATE INDEX "InventoryReport_reviewId_idx" ON "InventoryReport"("reviewId");

-- CreateIndex
CREATE INDEX "InventoryReport_cleaningId_idx" ON "InventoryReport"("cleaningId");

-- CreateIndex
CREATE INDEX "InventoryReport_itemId_idx" ON "InventoryReport"("itemId");

-- CreateIndex
CREATE INDEX "InventoryReport_status_idx" ON "InventoryReport"("status");

-- CreateIndex
CREATE INDEX "InventoryReport_createdByUserId_idx" ON "InventoryReport"("createdByUserId");

-- CreateIndex
CREATE INDEX "CleaningMedia_tenantId_idx" ON "CleaningMedia"("tenantId");

-- CreateIndex
CREATE INDEX "CleaningMedia_cleaningId_idx" ON "CleaningMedia"("cleaningId");

-- CreateIndex
CREATE INDEX "CleaningMedia_assetId_idx" ON "CleaningMedia"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "CleaningMedia_cleaningId_assetId_key" ON "CleaningMedia"("cleaningId", "assetId");

-- CreateIndex
CREATE INDEX "InventoryEvidence_tenantId_idx" ON "InventoryEvidence"("tenantId");

-- CreateIndex
CREATE INDEX "InventoryEvidence_changeId_idx" ON "InventoryEvidence"("changeId");

-- CreateIndex
CREATE INDEX "InventoryEvidence_reportId_idx" ON "InventoryEvidence"("reportId");

-- CreateIndex
CREATE INDEX "InventoryEvidence_assetId_idx" ON "InventoryEvidence"("assetId");

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
CREATE UNIQUE INDEX "ChatThread_applicationId_key" ON "ChatThread"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatThread_cleaningId_key" ON "ChatThread"("cleaningId");

-- CreateIndex
CREATE INDEX "ChatThread_tenantId_idx" ON "ChatThread"("tenantId");

-- CreateIndex
CREATE INDEX "ChatThread_propertyId_idx" ON "ChatThread"("propertyId");

-- CreateIndex
CREATE INDEX "ChatThread_status_idx" ON "ChatThread"("status");

-- CreateIndex
CREATE INDEX "ChatThread_lastMessageAt_idx" ON "ChatThread"("lastMessageAt");

-- CreateIndex
CREATE INDEX "ChatThread_type_idx" ON "ChatThread"("type");

-- CreateIndex
CREATE INDEX "ChatThread_teamId_idx" ON "ChatThread"("teamId");

-- CreateIndex
CREATE INDEX "ChatParticipant_threadId_idx" ON "ChatParticipant"("threadId");

-- CreateIndex
CREATE INDEX "ChatParticipant_userId_idx" ON "ChatParticipant"("userId");

-- CreateIndex
CREATE INDEX "ChatParticipant_threadId_leftAt_idx" ON "ChatParticipant"("threadId", "leftAt");

-- CreateIndex
CREATE INDEX "ChatParticipant_teamId_idx" ON "ChatParticipant"("teamId");

-- CreateIndex
CREATE INDEX "ChatParticipant_teamMembershipId_idx" ON "ChatParticipant"("teamMembershipId");

-- CreateIndex
CREATE INDEX "ChatParticipant_threadId_teamMembershipId_idx" ON "ChatParticipant"("threadId", "teamMembershipId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatParticipant_threadId_userId_key" ON "ChatParticipant"("threadId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessage_clientMessageId_key" ON "ChatMessage"("clientMessageId");

-- CreateIndex
CREATE INDEX "ChatMessage_tenantId_idx" ON "ChatMessage"("tenantId");

-- CreateIndex
CREATE INDEX "ChatMessage_threadId_idx" ON "ChatMessage"("threadId");

-- CreateIndex
CREATE INDEX "ChatMessage_senderUserId_idx" ON "ChatMessage"("senderUserId");

-- CreateIndex
CREATE INDEX "ChatMessage_serverCreatedAt_idx" ON "ChatMessage"("serverCreatedAt");

-- CreateIndex
CREATE INDEX "ChatMessage_clientMessageId_idx" ON "ChatMessage"("clientMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessage_threadId_clientMessageId_key" ON "ChatMessage"("threadId", "clientMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvite_token_key" ON "TeamInvite"("token");

-- CreateIndex
CREATE INDEX "TeamInvite_createdByUserId_idx" ON "TeamInvite"("createdByUserId");

-- CreateIndex
CREATE INDEX "TeamInvite_status_idx" ON "TeamInvite"("status");

-- CreateIndex
CREATE INDEX "TeamInvite_teamId_idx" ON "TeamInvite"("teamId");

-- CreateIndex
CREATE INDEX "TeamInvite_token_idx" ON "TeamInvite"("token");

-- CreateIndex
CREATE INDEX "TeamMembership_teamId_idx" ON "TeamMembership"("teamId");

-- CreateIndex
CREATE INDEX "TeamMembership_teamId_status_idx" ON "TeamMembership"("teamId", "status");

-- CreateIndex
CREATE INDEX "TeamMembership_userId_idx" ON "TeamMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMembership_teamId_userId_key" ON "TeamMembership"("teamId", "userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatarMediaId_fkey" FOREIGN KEY ("avatarMediaId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "Property" ADD CONSTRAINT "Property_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyMemberAccess" ADD CONSTRAINT "PropertyMemberAccess_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyMemberAccess" ADD CONSTRAINT "PropertyMemberAccess_teamMembershipId_fkey" FOREIGN KEY ("teamMembershipId") REFERENCES "TeamMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyMemberAccess" ADD CONSTRAINT "PropertyMemberAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyInvite" ADD CONSTRAINT "PropertyInvite_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyInvite" ADD CONSTRAINT "PropertyInvite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyInvite" ADD CONSTRAINT "PropertyInvite_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyInvite" ADD CONSTRAINT "PropertyInvite_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAdmin" ADD CONSTRAINT "PropertyAdmin_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAdmin" ADD CONSTRAINT "PropertyAdmin_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAdmin" ADD CONSTRAINT "PropertyAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyCleaner" ADD CONSTRAINT "PropertyCleaner_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyCleaner" ADD CONSTRAINT "PropertyCleaner_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyCleaner" ADD CONSTRAINT "PropertyCleaner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyHandyman" ADD CONSTRAINT "PropertyHandyman_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyHandyman" ADD CONSTRAINT "PropertyHandyman_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyHandyman" ADD CONSTRAINT "PropertyHandyman_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cleaning" ADD CONSTRAINT "Cleaning_assignedMemberId_fkey" FOREIGN KEY ("assignedMemberId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cleaning" ADD CONSTRAINT "Cleaning_assignedMembershipId_fkey" FOREIGN KEY ("assignedMembershipId") REFERENCES "TeamMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cleaning" ADD CONSTRAINT "Cleaning_assignedTeamMemberId_fkey" FOREIGN KEY ("assignedTeamMemberId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cleaning" ADD CONSTRAINT "Cleaning_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cleaning" ADD CONSTRAINT "Cleaning_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cleaning" ADD CONSTRAINT "Cleaning_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cleaning" ADD CONSTRAINT "Cleaning_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cleaning" ADD CONSTRAINT "Cleaning_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lock" ADD CONSTRAINT "Lock_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lock" ADD CONSTRAINT "Lock_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LockCode" ADD CONSTRAINT "LockCode_lockId_fkey" FOREIGN KEY ("lockId") REFERENCES "Lock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LockCode" ADD CONSTRAINT "LockCode_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LockCode" ADD CONSTRAINT "LockCode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricEvent" ADD CONSTRAINT "MetricEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_inactivatedByUserId_fkey" FOREIGN KEY ("inactivatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMemberScheduleDay" ADD CONSTRAINT "TeamMemberScheduleDay_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMemberScheduleDay" ADD CONSTRAINT "TeamMemberScheduleDay_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTeam" ADD CONSTRAINT "PropertyTeam_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTeam" ADD CONSTRAINT "PropertyTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTeam" ADD CONSTRAINT "PropertyTeam_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostWorkGroup" ADD CONSTRAINT "HostWorkGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostWorkGroupProperty" ADD CONSTRAINT "HostWorkGroupProperty_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostWorkGroupProperty" ADD CONSTRAINT "HostWorkGroupProperty_workGroupId_fkey" FOREIGN KEY ("workGroupId") REFERENCES "HostWorkGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostWorkGroupProperty" ADD CONSTRAINT "HostWorkGroupProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkGroupExecutor" ADD CONSTRAINT "WorkGroupExecutor_hostTenantId_fkey" FOREIGN KEY ("hostTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkGroupExecutor" ADD CONSTRAINT "WorkGroupExecutor_servicesTenantId_fkey" FOREIGN KEY ("servicesTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkGroupExecutor" ADD CONSTRAINT "WorkGroupExecutor_workGroupId_fkey" FOREIGN KEY ("workGroupId") REFERENCES "HostWorkGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkGroupExecutor" ADD CONSTRAINT "WorkGroupExecutor_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostWorkGroupInvite" ADD CONSTRAINT "HostWorkGroupInvite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostWorkGroupInvite" ADD CONSTRAINT "HostWorkGroupInvite_workGroupId_fkey" FOREIGN KEY ("workGroupId") REFERENCES "HostWorkGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostWorkGroupInvite" ADD CONSTRAINT "HostWorkGroupInvite_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostWorkGroupInvite" ADD CONSTRAINT "HostWorkGroupInvite_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningAssignee" ADD CONSTRAINT "CleaningAssignee_cleaningId_fkey" FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningAssignee" ADD CONSTRAINT "CleaningAssignee_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningAssignee" ADD CONSTRAINT "CleaningAssignee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningView" ADD CONSTRAINT "CleaningView_cleaningId_fkey" FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningView" ADD CONSTRAINT "CleaningView_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningView" ADD CONSTRAINT "CleaningView_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyChecklistItem" ADD CONSTRAINT "PropertyChecklistItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyChecklistItem" ADD CONSTRAINT "PropertyChecklistItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningChecklistItem" ADD CONSTRAINT "CleaningChecklistItem_cleaningId_fkey" FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningChecklistItem" ADD CONSTRAINT "CleaningChecklistItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItemAsset" ADD CONSTRAINT "InventoryItemAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItemAsset" ADD CONSTRAINT "InventoryItemAsset_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItemAsset" ADD CONSTRAINT "InventoryItemAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItemAsset" ADD CONSTRAINT "ChecklistItemAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItemAsset" ADD CONSTRAINT "ChecklistItemAsset_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "PropertyChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItemAsset" ADD CONSTRAINT "ChecklistItemAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLine" ADD CONSTRAINT "InventoryLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLine" ADD CONSTRAINT "InventoryLine_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLine" ADD CONSTRAINT "InventoryLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReview" ADD CONSTRAINT "InventoryReview_cleaningId_fkey" FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReview" ADD CONSTRAINT "InventoryReview_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReview" ADD CONSTRAINT "InventoryReview_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReview" ADD CONSTRAINT "InventoryReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCheck" ADD CONSTRAINT "InventoryCheck_cleaningId_fkey" FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCheck" ADD CONSTRAINT "InventoryCheck_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCheck" ADD CONSTRAINT "InventoryCheck_inventoryLineId_fkey" FOREIGN KEY ("inventoryLineId") REFERENCES "InventoryLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCheck" ADD CONSTRAINT "InventoryCheck_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCheck" ADD CONSTRAINT "InventoryCheck_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCheck" ADD CONSTRAINT "InventoryCheck_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReviewItemChange" ADD CONSTRAINT "InventoryReviewItemChange_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReviewItemChange" ADD CONSTRAINT "InventoryReviewItemChange_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "InventoryReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReviewItemChange" ADD CONSTRAINT "InventoryReviewItemChange_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReport" ADD CONSTRAINT "InventoryReport_cleaningId_fkey" FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReport" ADD CONSTRAINT "InventoryReport_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReport" ADD CONSTRAINT "InventoryReport_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReport" ADD CONSTRAINT "InventoryReport_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReport" ADD CONSTRAINT "InventoryReport_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "InventoryReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReport" ADD CONSTRAINT "InventoryReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningMedia" ADD CONSTRAINT "CleaningMedia_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningMedia" ADD CONSTRAINT "CleaningMedia_cleaningId_fkey" FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningMedia" ADD CONSTRAINT "CleaningMedia_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEvidence" ADD CONSTRAINT "InventoryEvidence_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEvidence" ADD CONSTRAINT "InventoryEvidence_changeId_fkey" FOREIGN KEY ("changeId") REFERENCES "InventoryReviewItemChange"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEvidence" ADD CONSTRAINT "InventoryEvidence_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "InventoryReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEvidence" ADD CONSTRAINT "InventoryEvidence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_cleaningId_fkey" FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_teamMembershipId_fkey" FOREIGN KEY ("teamMembershipId") REFERENCES "TeamMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvite" ADD CONSTRAINT "TeamInvite_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvite" ADD CONSTRAINT "TeamInvite_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvite" ADD CONSTRAINT "TeamInvite_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

