-- CreateEnum (con IF NOT EXISTS usando DO block)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryReviewStatus') THEN
        CREATE TYPE "InventoryReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'RESOLVED');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryChangeReason') THEN
        CREATE TYPE "InventoryChangeReason" AS ENUM ('ROUTINE_COUNT', 'PREVIOUS_ERROR', 'DAMAGED', 'REPLACED', 'LOST', 'MOVED', 'OTHER');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryChangeStatus') THEN
        CREATE TYPE "InventoryChangeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'APPLIED');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryReportType') THEN
        CREATE TYPE "InventoryReportType" AS ENUM ('DAMAGED_WORKS', 'DAMAGED_NOT_WORKING', 'MISSING_PHYSICAL', 'REPLACED_DIFFERENT', 'DETAILS_MISMATCH', 'OTHER');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryReportSeverity') THEN
        CREATE TYPE "InventoryReportSeverity" AS ENUM ('URGENT', 'IMPORTANT', 'INFO');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryReportStatus') THEN
        CREATE TYPE "InventoryReportStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'RESOLVED', 'REJECTED');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryReportResolution') THEN
        CREATE TYPE "InventoryReportResolution" AS ENUM ('REPAIR', 'KEEP_USING', 'REPLACE_AND_DISCARD', 'DISCARD', 'STORE', 'MARK_LOST', 'UPDATE_ITEM_TO_NEW', 'MARK_TO_REPLACE');
    END IF;
END $$;

-- CreateTable (con IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS "InventoryReview" (
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

-- CreateTable (con IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS "InventoryReviewItemChange" (
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

-- CreateTable (con IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS "InventoryReport" (
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

-- CreateTable (con IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS "InventoryEvidence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "changeId" TEXT,
    "reportId" TEXT,
    "assetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (con IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "InventoryReview_tenantId_idx" ON "InventoryReview"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryReview_cleaningId_idx" ON "InventoryReview"("cleaningId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryReview_propertyId_idx" ON "InventoryReview"("propertyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryReview_status_idx" ON "InventoryReview"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryReview_reviewedByUserId_idx" ON "InventoryReview"("reviewedByUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryReviewItemChange_tenantId_idx" ON "InventoryReviewItemChange"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryReviewItemChange_reviewId_idx" ON "InventoryReviewItemChange"("reviewId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryReviewItemChange_itemId_idx" ON "InventoryReviewItemChange"("itemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryReviewItemChange_status_idx" ON "InventoryReviewItemChange"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryReport_tenantId_idx" ON "InventoryReport"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryReport_reviewId_idx" ON "InventoryReport"("reviewId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryReport_cleaningId_idx" ON "InventoryReport"("cleaningId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryReport_itemId_idx" ON "InventoryReport"("itemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryReport_status_idx" ON "InventoryReport"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryReport_createdByUserId_idx" ON "InventoryReport"("createdByUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryEvidence_tenantId_idx" ON "InventoryEvidence"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryEvidence_changeId_idx" ON "InventoryEvidence"("changeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryEvidence_reportId_idx" ON "InventoryEvidence"("reportId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryEvidence_assetId_idx" ON "InventoryEvidence"("assetId");

-- AddForeignKey (solo si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'InventoryReview_tenantId_fkey'
    ) THEN
        ALTER TABLE "InventoryReview" ADD CONSTRAINT "InventoryReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (solo si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryReview_cleaningId_fkey') THEN
        ALTER TABLE "InventoryReview" ADD CONSTRAINT "InventoryReview_cleaningId_fkey" FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryReview_propertyId_fkey') THEN
        ALTER TABLE "InventoryReview" ADD CONSTRAINT "InventoryReview_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryReview_reviewedByUserId_fkey') THEN
        ALTER TABLE "InventoryReview" ADD CONSTRAINT "InventoryReview_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryReviewItemChange_tenantId_fkey') THEN
        ALTER TABLE "InventoryReviewItemChange" ADD CONSTRAINT "InventoryReviewItemChange_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryReviewItemChange_reviewId_fkey') THEN
        ALTER TABLE "InventoryReviewItemChange" ADD CONSTRAINT "InventoryReviewItemChange_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "InventoryReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryReviewItemChange_itemId_fkey') THEN
        ALTER TABLE "InventoryReviewItemChange" ADD CONSTRAINT "InventoryReviewItemChange_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryReport_tenantId_fkey') THEN
        ALTER TABLE "InventoryReport" ADD CONSTRAINT "InventoryReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryReport_reviewId_fkey') THEN
        ALTER TABLE "InventoryReport" ADD CONSTRAINT "InventoryReport_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "InventoryReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryReport_cleaningId_fkey') THEN
        ALTER TABLE "InventoryReport" ADD CONSTRAINT "InventoryReport_cleaningId_fkey" FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryReport_itemId_fkey') THEN
        ALTER TABLE "InventoryReport" ADD CONSTRAINT "InventoryReport_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryReport_createdByUserId_fkey') THEN
        ALTER TABLE "InventoryReport" ADD CONSTRAINT "InventoryReport_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryReport_resolvedByUserId_fkey') THEN
        ALTER TABLE "InventoryReport" ADD CONSTRAINT "InventoryReport_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryEvidence_tenantId_fkey') THEN
        ALTER TABLE "InventoryEvidence" ADD CONSTRAINT "InventoryEvidence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryEvidence_changeId_fkey') THEN
        ALTER TABLE "InventoryEvidence" ADD CONSTRAINT "InventoryEvidence_changeId_fkey" FOREIGN KEY ("changeId") REFERENCES "InventoryReviewItemChange"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryEvidence_reportId_fkey') THEN
        ALTER TABLE "InventoryEvidence" ADD CONSTRAINT "InventoryEvidence_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "InventoryReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryEvidence_assetId_fkey') THEN
        ALTER TABLE "InventoryEvidence" ADD CONSTRAINT "InventoryEvidence_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryReview_cleaningId_key') THEN
        ALTER TABLE "InventoryReview" ADD CONSTRAINT "InventoryReview_cleaningId_key" UNIQUE ("cleaningId");
    END IF;
END $$;

