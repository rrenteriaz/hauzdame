-- AlterTable
ALTER TABLE "Property"
  ADD COLUMN "icalLastSyncedAt" TIMESTAMPTZ,
  ADD COLUMN "icalLastSyncAttemptAt" TIMESTAMPTZ,
  ADD COLUMN "icalSyncInProgressUntil" TIMESTAMPTZ,
  ADD COLUMN "icalLastSyncError" VARCHAR(500);
