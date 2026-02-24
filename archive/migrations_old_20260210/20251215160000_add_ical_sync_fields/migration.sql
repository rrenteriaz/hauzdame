-- AlterTable: Agregar nuevos campos (todos opcionales inicialmente)
ALTER TABLE "Cleaning" ADD COLUMN "scheduledAtOriginal" TIMESTAMP(3),
ADD COLUMN "scheduledAtPlanned" TIMESTAMP(3),
ADD COLUMN "isScheduleOverridden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "scheduleOverriddenAt" TIMESTAMP(3);

-- Migrar datos existentes: scheduledAtPlanned = scheduledDate
UPDATE "Cleaning" SET "scheduledAtPlanned" = "scheduledDate" WHERE "scheduledAtPlanned" IS NULL;

-- AlterTable: hacer scheduledAtPlanned NOT NULL después de migrar datos
ALTER TABLE "Cleaning" ALTER COLUMN "scheduledAtPlanned" SET NOT NULL;

-- CreateIndex: Unique constraint para Reservation (propertyId + calendarUid)
-- En PostgreSQL, NULLs no violan unique constraints (NULL != NULL)
CREATE UNIQUE INDEX "Reservation_propertyId_calendarUid_key" ON "Reservation"("propertyId", "calendarUid");

